
"""
NASA LOLA terrain horizon-profile analyzer.

Calculates approximate terrain skyline obstruction around PNS01, PNS02
and PNS03 using the Site07 5 m/pixel lunar elevation raster.

NASA products:
- SURF: Surface elevation (metres)
- LDEC: LOLA measurement count
- TOTERR: Total elevation uncertainty (metres RMS)

Important:
- Azimuth 0 degrees = local north (towards the lunar south pole).
- Azimuth increases clockwise; 90 degrees = local east.
- Terrain coverage is limited to the downloaded raster.
- Elevations may contain interpolated pixels.
- LDEC records measurement spots, not complete DEM accuracy.
- TOTERR is reported for the horizon-producing DEM cell.
- This is terrain geometry analysis, not a landing-safety assessment.
"""

import json
import math
import sys
from pathlib import Path

import numpy as np
import rasterio


# ---------------------------------------------------------
# PATHS AND CONFIGURATION
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parents[3]

INPUT_JSON = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "lola_site07_terrain.json"
)

DEM_PATH = (
    PROJECT_ROOT
    / "data"
    / "lola"
    / "site07"
    / "Site07_final_adj_5mpp_surf.tif"
)

LDEC_PATH = (
    PROJECT_ROOT
    / "data"
    / "lola"
    / "site07"
    / "Site07_final_adj_5mpp_ldec.tif"
)

ELEVATION_UNCERTAINTY_PATH = (
    PROJECT_ROOT
    / "data"
    / "lola"
    / "site07"
    / "Site07_final_adj_5mpp_toterr.tif"
)

OUTPUT_PATH = (
    PROJECT_ROOT
    / "data"
    / "processed"
    / "lola_site07_horizon.json"
)

MOON_REFERENCE_RADIUS_METERS = 1_737_400.0

AZIMUTH_STEP_DEGREES = 1
SAMPLE_STEP_METERS = 5.0
MAX_DISTANCE_METERS = 5_000.0

EXPECTED_RESOLUTION_METERS = 5.0

EARTH_AZIMUTH_CONVENTION = (
    "Clockwise from local north; 0 degrees north, "
    "90 degrees east, 180 degrees south, 270 degrees west"
)


# ---------------------------------------------------------
# VALIDATION HELPERS
# ---------------------------------------------------------

def require_file(path):
    if not path.is_file():
        raise FileNotFoundError(
            f"Required file not found: {path}"
        )


def validate_rasters(dem, ldec, uncertainty):
    """
    Verify that LDEC and elevation uncertainty rasters
    are spatially aligned with the elevation DEM.
    """

    rasters = {
        "LDEC": ldec,
        "elevation uncertainty": uncertainty,
    }

    for name, raster in rasters.items():

        if (
            dem.width != raster.width
            or dem.height != raster.height
        ):
            raise ValueError(
                f"DEM and {name} dimensions do not match."
            )

        if dem.transform != raster.transform:
            raise ValueError(
                f"DEM and {name} raster transforms do not match."
            )

        if dem.crs != raster.crs:
            raise ValueError(
                f"DEM and {name} CRS definitions do not match."
            )

    pixel_width = abs(dem.transform.a)
    pixel_height = abs(dem.transform.e)

    if not math.isclose(
        pixel_width,
        EXPECTED_RESOLUTION_METERS,
        abs_tol=0.001,
    ):
        raise ValueError(
            f"Unexpected horizontal resolution: {pixel_width}"
        )

    if not math.isclose(
        pixel_height,
        EXPECTED_RESOLUTION_METERS,
        abs_tol=0.001,
    ):
        raise ValueError(
            f"Unexpected vertical resolution: {pixel_height}"
        )

    if not math.isclose(
        dem.transform.b,
        0.0,
        abs_tol=1e-9,
    ) or not math.isclose(
        dem.transform.d,
        0.0,
        abs_tol=1e-9,
    ):
        raise ValueError(
            "Rotated rasters are not supported."
        )


def is_valid_value(value, nodata):
    if not np.isfinite(value):
        return False

    if nodata is not None and value == nodata:
        return False

    return True


# ---------------------------------------------------------
# LUNAR POLAR STEREOGRAPHIC GEOMETRY
# ---------------------------------------------------------

def projection_scale_factor(latitude_deg):
    """
    Approximate local scale factor for spherical polar
    stereographic projection.

    Scale = 2 / (1 + cos(colatitude))
    """

    colatitude = math.radians(
        90.0 + latitude_deg
    )

    return 2.0 / (
        1.0 + math.cos(colatitude)
    )


def azimuth_direction(longitude_deg, azimuth_deg):
    """
    Convert local compass azimuth into projected X/Y direction.

    Projected coordinates:
        X = radius * sin(longitude)
        Y = radius * cos(longitude)

    Azimuth:
        0   = local north
        90  = local east
        180 = local south
        270 = local west
    """

    longitude = math.radians(longitude_deg)
    azimuth = math.radians(azimuth_deg)

    dx = (
        -math.sin(longitude) * math.cos(azimuth)
        + math.cos(longitude) * math.sin(azimuth)
    )

    dy = (
        -math.cos(longitude) * math.cos(azimuth)
        - math.sin(longitude) * math.sin(azimuth)
    )

    return dx, dy


def apparent_elevation_angle(
    terrain_elevation_m,
    origin_elevation_m,
    ground_distance_m,
):
    """
    Approximate terrain elevation angle relative to the
    candidate's local horizontal tangent plane.

    Lunar curvature correction:
        sag = distance^2 / (2 * effective lunar radius)

    Effective radius includes the candidate's reference
    surface elevation.
    """

    if ground_distance_m <= 0:
        raise ValueError(
            "Ground distance must be positive."
        )

    effective_radius = (
        MOON_REFERENCE_RADIUS_METERS
        + origin_elevation_m
    )

    curvature_sag = (
        ground_distance_m ** 2
        / (2.0 * effective_radius)
    )

    relative_height = (
        terrain_elevation_m
        - origin_elevation_m
        - curvature_sag
    )

    return math.degrees(
        math.atan2(
            relative_height,
            ground_distance_m,
        )
    )


# ---------------------------------------------------------
# SINGLE AZIMUTH RAY
# ---------------------------------------------------------

def analyze_ray(
    site,
    dem,
    elevation_array,
    ldec_array,
    uncertainty_array,
    dem_nodata,
    ldec_nodata,
    uncertainty_nodata,
    origin_elevation_m,
    projection_scale,
    azimuth_deg,
):
    coordinates = site["projectedCoordinatesMeters"]

    origin_x = float(coordinates["x"])
    origin_y = float(coordinates["y"])

    longitude = float(
        site["coordinates"]["longitudeEastDeg"]
    )

    direction_x, direction_y = azimuth_direction(
        longitude,
        azimuth_deg,
    )

    max_angle = None
    max_angle_distance = None
    max_angle_elevation = None
    max_angle_ldec = None
    max_angle_uncertainty = None
    max_angle_row = None
    max_angle_column = None

    # Exclude the candidate's own raster cell.
    # The first ray sample may still fall inside this cell.
    previous_pixel = dem.index(
        origin_x,
        origin_y,
    )

    unique_sample_count = 0
    measured_pixel_count = 0
    unmeasured_pixel_count = 0

    coverage_distance = 0.0
    termination_reason = "maximum_requested_distance"

    for projected_distance in np.arange(
        SAMPLE_STEP_METERS,
        MAX_DISTANCE_METERS + SAMPLE_STEP_METERS,
        SAMPLE_STEP_METERS,
    ):

        ground_distance = (
            projected_distance / projection_scale
        )

        x = (
            origin_x
            + direction_x * projected_distance
        )

        y = (
            origin_y
            + direction_y * projected_distance
        )

        row, column = dem.index(x, y)

        if (
            row < 0
            or row >= dem.height
            or column < 0
            or column >= dem.width
        ):
            termination_reason = "raster_boundary"
            break

        current_pixel = (
            row,
            column,
        )

        # Count each raster cell only once.
        if current_pixel == previous_pixel:
            continue

        previous_pixel = current_pixel

        elevation = float(
            elevation_array[row, column]
        )

        measurement_count = float(
            ldec_array[row, column]
        )

        uncertainty = float(
            uncertainty_array[row, column]
        )

        if not is_valid_value(
            elevation,
            dem_nodata,
        ):
            termination_reason = "elevation_nodata"
            break

        if not is_valid_value(
            measurement_count,
            ldec_nodata,
        ):
            termination_reason = "ldec_nodata"
            break

        unique_sample_count += 1
        coverage_distance = ground_distance

        if measurement_count > 0:
            measured_pixel_count += 1
        else:
            unmeasured_pixel_count += 1

        # DEM elevation represents a 5 m x 5 m cell.
        # Use its centre as the representative terrain location.
        cell_center_x, cell_center_y = dem.xy(
            row,
            column,
            offset="center",
        )

        projected_center_distance = math.hypot(
            cell_center_x - origin_x,
            cell_center_y - origin_y,
        )

        terrain_ground_distance = (
            projected_center_distance / projection_scale
        )

        angle = apparent_elevation_angle(
            terrain_elevation_m=elevation,
            origin_elevation_m=origin_elevation_m,
            ground_distance_m=terrain_ground_distance,
        )

        if max_angle is None or angle > max_angle:

            max_angle_row = row
            max_angle_column = column
            max_angle = angle
            max_angle_distance = terrain_ground_distance
            max_angle_elevation = elevation
            max_angle_ldec = measurement_count

            # TOTERR is reported only when valid.
            # An invalid uncertainty value does not invalidate
            # an otherwise valid DEM terrain observation.
            if is_valid_value(
                uncertainty,
                uncertainty_nodata,
            ):
                max_angle_uncertainty = uncertainty
            else:
                max_angle_uncertainty = None

    coverage_complete = (
        termination_reason == "maximum_requested_distance"
    )

    return {
        "azimuthDeg": azimuth_deg,

        "horizonElevationDeg": max_angle,

        "horizonDistanceMeters": max_angle_distance,

        "horizonTerrainElevationMeters": (
            max_angle_elevation
        ),

        "horizonPointLolaMeasurementCount": (
            max_angle_ldec
        ),

        "horizonPointElevationUncertaintyMetersRms": (
            max_angle_uncertainty
        ),

        "horizonRasterRow": max_angle_row,
"horizonRasterColumn": max_angle_column,

        "uniqueTerrainPixelsSampled": unique_sample_count,

        "pixelsWithLolaMeasurements": (
            measured_pixel_count
        ),

        "pixelsWithoutLolaMeasurements": (
            unmeasured_pixel_count
        ),

        "measurementCoveragePercent": (
            round(
                measured_pixel_count
                / unique_sample_count
                * 100.0,
                3,
            )
            if unique_sample_count > 0
            else None
        ),

        "coverageDistanceMeters": round(
            coverage_distance,
            3,
        ),

        "requestedDistanceMeters": MAX_DISTANCE_METERS,

        "coverageComplete": coverage_complete,

        "terminationReason": termination_reason,
    }


# ---------------------------------------------------------
# PROCESS ALL CANDIDATE SITES
# ---------------------------------------------------------

def analyze_site(
    site_id,
    site,
    dem,
    elevation_array,
    ldec_array,
    uncertainty_array,
    dem_nodata,
    ldec_nodata,
    uncertainty_nodata,
):
    print(f"Analyzing {site_id}...")

    raster_pixel = site["rasterPixel"]

    origin_row = int(
        raster_pixel["row"]
    )

    origin_column = int(
        raster_pixel["column"]
    )

    origin_elevation = float(
        elevation_array[
            origin_row,
            origin_column,
        ]
    )

    if not is_valid_value(
        origin_elevation,
        dem_nodata,
    ):
        raise ValueError(
            f"{site_id}: candidate centre elevation is invalid."
        )

    latitude = float(
        site["coordinates"]["latitudeDeg"]
    )

    scale = projection_scale_factor(latitude)

    rays = []

    for azimuth in range(
        0,
        360,
        AZIMUTH_STEP_DEGREES,
    ):

        ray = analyze_ray(
            site=site,
            dem=dem,
            elevation_array=elevation_array,
            ldec_array=ldec_array,
            uncertainty_array=uncertainty_array,
            dem_nodata=dem_nodata,
            ldec_nodata=ldec_nodata,
            uncertainty_nodata=uncertainty_nodata,
            origin_elevation_m=origin_elevation,
            projection_scale=scale,
            azimuth_deg=azimuth,
        )

        rays.append(ray)

    complete_rays = sum(
        1
        for ray in rays
        if ray["coverageComplete"]
    )

    incomplete_rays = (
        len(rays) - complete_rays
    )

    minimum_coverage = min(
        ray["coverageDistanceMeters"]
        for ray in rays
    )

    maximum_coverage = max(
        ray["coverageDistanceMeters"]
        for ray in rays
    )

    result = {
        "coordinates": site["coordinates"],

        "originElevationMeters": origin_elevation,

        "projectionScaleFactor": scale,

        "azimuthConvention": EARTH_AZIMUTH_CONVENTION,

        "summary": {
            "totalAzimuthRays": len(rays),

            "completeCoverageRays": complete_rays,

            "incompleteCoverageRays": incomplete_rays,

            "minimumCoverageDistanceMeters": round(
                minimum_coverage,
                3,
            ),

            "maximumCoverageDistanceMeters": round(
                maximum_coverage,
                3,
            ),

            "requestedDistanceMeters": (
                MAX_DISTANCE_METERS
            ),
        },

        "rays": rays,
    }

    print(
        f"  Complete rays: "
        f"{complete_rays}/{len(rays)}"
    )

    print(
        f"  Coverage range: "
        f"{minimum_coverage:.1f} m to "
        f"{maximum_coverage:.1f} m"
    )

    return result


# ---------------------------------------------------------
# MAIN
# ---------------------------------------------------------

def main():

    require_file(INPUT_JSON)
    require_file(DEM_PATH)
    require_file(LDEC_PATH)
    require_file(ELEVATION_UNCERTAINTY_PATH)

    with INPUT_JSON.open(
        "r",
        encoding="utf-8",
    ) as file:
        terrain_data = json.load(file)

    sites = terrain_data.get("sites")

    if not isinstance(sites, dict) or not sites:
        raise ValueError(
            "Expected terrain JSON sites to be a non-empty dictionary."
        )

    print("Opening NASA LOLA rasters...")

    with (
        rasterio.open(DEM_PATH) as dem,
        rasterio.open(LDEC_PATH) as ldec,
        rasterio.open(ELEVATION_UNCERTAINTY_PATH) as uncertainty,
    ):

        validate_rasters(
            dem,
            ldec,
            uncertainty,
        )

        elevation_array = dem.read(1)

        ldec_array = ldec.read(1)

        uncertainty_array = uncertainty.read(1)

        output_sites = {}

        for site_id, site in sites.items():

            output_sites[site_id] = analyze_site(
                site_id=site_id,
                site=site,
                dem=dem,
                elevation_array=elevation_array,
                ldec_array=ldec_array,
                uncertainty_array=uncertainty_array,
                dem_nodata=dem.nodata,
                ldec_nodata=ldec.nodata,
                uncertainty_nodata=uncertainty.nodata,
            )

    output = {
        "metadata": {
            "source": terrain_data["metadata"]["source"],

            "sourceUrl": terrain_data["metadata"]["sourceUrl"],

            "dataset": terrain_data["metadata"]["dataset"],

            "siteProduct": terrain_data["metadata"]["siteProduct"],

            "elevationRaster": DEM_PATH.name,

            "measurementCountRaster": LDEC_PATH.name,

            "elevationUncertaintyRaster": (
                ELEVATION_UNCERTAINTY_PATH.name
            ),

            "elevationUncertaintyUnit": (
                "metres RMS"
            ),

            "resolutionMetersPerPixel": (
                EXPECTED_RESOLUTION_METERS
            ),

            "moonReferenceRadiusMeters": (
                MOON_REFERENCE_RADIUS_METERS
            ),

            "azimuthStepDegrees": (
                AZIMUTH_STEP_DEGREES
            ),

            "sampleStepMeters": (
                SAMPLE_STEP_METERS
            ),

            "maximumRequestedDistanceMeters": (
                MAX_DISTANCE_METERS
            ),

            "azimuthConvention": (
                EARTH_AZIMUTH_CONVENTION
            ),

            "curvatureCorrection": (
                "Approximate spherical tangent-plane correction "
                "using distance squared divided by twice the "
                "effective lunar radius."
            ),

            "projectionAssumption": (
                "Local distances are approximated using the "
                "spherical polar stereographic scale factor."
            ),

            "horizonDistanceDefinition": (
                "Radial ground distance from the candidate origin "
                "to the centre of the DEM cell producing the "
                "maximum apparent terrain elevation angle."
            ),

            "terrainCellRepresentation": (
                "Each elevation value represents a 5 m x 5 m "
                "raster cell. The cell centre is used as the "
                "representative terrain location; the exact "
                "location of a terrain feature within the cell "
                "is unknown."
            ),

            "processing": (
                "DEM radial sampling at 5 m intervals, apparent "
                "elevation-angle calculation using DEM cell-centre "
                "distances, and per-azimuth raster coverage tracking."
            ),

            "uncertaintyProcessing": (
                "The TOTERR value is extracted from the same "
                "DEM cell that produces the maximum apparent "
                "terrain elevation angle. It is reported as "
                "elevation uncertainty in metres RMS and is "
                "not propagated into horizon-angle uncertainty."
            ),

            "limitations": [
                "Terrain coverage is restricted to the downloaded Site07 raster.",

                "Incomplete azimuth rays must not be treated as complete terrain horizons.",

                "Elevation products may contain interpolated pixels.",

                "LDEC records LOLA measurement spots, not a complete measure of DEM accuracy.",

                "The horizon calculation is an approximate spherical geometric model.",

                "The local azimuth orientation must be verified against independent reference geometry before operational use.",

                "Horizon distance refers to the representative DEM cell centre, not the exact location of a terrain feature.",

                "The 5 m raster resolution limits the spatial precision of near-field horizon distances.",

                "The horizon elevation angle is calculated relative to the candidate origin pixel elevation.",

                "TOTERR represents elevation uncertainty and is not equivalent to horizon-angle uncertainty.",

                "No uncertainty propagation into the horizon angle is performed.",

                "No atmospheric refraction is modelled.",

                "No landing suitability score is calculated.",

                "No Sun or Earth ephemeris comparison is performed in this processing step.",
            ],
        },

        "sites": output_sites,
    }

    OUTPUT_PATH.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with OUTPUT_PATH.open(
        "w",
        encoding="utf-8",
    ) as file:

        json.dump(
            output,
            file,
            indent=2,
            allow_nan=False,
        )

    print("\nHorizon analysis completed.")

    print(f"Output: {OUTPUT_PATH}")

    for site_id, site_result in output_sites.items():

        summary = site_result["summary"]

        print(
            f"{site_id}: "
            f"{summary['completeCoverageRays']}/"
            f"{summary['totalAzimuthRays']} complete rays"
        )


if __name__ == "__main__":

    try:
        main()

    except Exception as error:

        print(
            f"\nERROR: {error}",
            file=sys.stderr,
        )

        raise
