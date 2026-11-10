import json
import math
from pathlib import Path

import numpy as np
import rasterio

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data" / "lola" / "site07"
OUTPUT = ROOT / "data" / "processed" / "lola_site07_terrain.json"

MOON_RADIUS_M = 1737400.0
WINDOW_SIZE = 21

SITES = {
    "PNS01": {
        "longitudeEastDeg": 134.1060,
        "latitudeDeg": -88.9690,
    },
    "PNS02": {
        "longitudeEastDeg": 128.4420,
        "latitudeDeg": -89.0610,
    },
    "PNS03": {
        "longitudeEastDeg": 126.9920,
        "latitudeDeg": -88.8520,
    },
}

PRODUCTS = {
    "elevation": {
        "file": "Site07_final_adj_5mpp_surf.tif",
        "unit": "metres",
        "description": "Interpolated lunar surface elevation",
    },
    "slope": {
        "file": "Site07_final_adj_5mpp_slp.tif",
        "unit": "degrees",
        "description": "Surface slope",
    },
    "measurementCount": {
        "file": "Site07_final_adj_5mpp_ldec.tif",
        "unit": "measurement spots per pixel",
        "description": "LOLA measurement count",
    },
    "slopeUncertainty": {
        "file": "Site07_final_adj_5mpp_slperr.tif",
        "unit": "degrees RMS",
        "description": "Slope uncertainty",
    },
    "elevationUncertainty": {
        "file": "Site07_final_adj_5mpp_toterr.tif",
        "unit": "metres RMS",
        "description": "Total elevation uncertainty",
    },
}

NASA_SOURCE = "https://pgda.gsfc.nasa.gov/products/78"


def project_lunar_coordinates(longitude_deg, latitude_deg):
    longitude = math.radians(longitude_deg)
    colatitude = math.radians(90.0 + latitude_deg)

    radius = 2.0 * MOON_RADIUS_M * math.tan(colatitude / 2.0)

    x = radius * math.sin(longitude)
    y = radius * math.cos(longitude)

    return x, y


def statistics(values):
    values = np.asarray(values, dtype=np.float64)

    if values.size == 0:
        return None

    return {
        "minimum": float(np.min(values)),
        "median": float(np.median(values)),
        "mean": float(np.mean(values)),
        "maximum": float(np.max(values)),
        "standardDeviation": float(np.std(values)),
        "validPixels": int(values.size),
    }


def main():
    datasets = {}

    for key, product in PRODUCTS.items():
        path = DATA / product["file"]

        if not path.is_file():
            raise FileNotFoundError(f"Missing NASA dataset: {path}")

        datasets[key] = rasterio.open(path)

    try:
        reference = datasets["elevation"]

        for key, ds in datasets.items():
            if (
                ds.width != reference.width
                or ds.height != reference.height
                or ds.transform != reference.transform
                or ds.crs != reference.crs
            ):
                raise ValueError(
                    f"Dataset alignment mismatch: {PRODUCTS[key]['file']}"
                )

        results = {
            "metadata": {
                "source": "NASA Goddard Planetary Geodesy and Altimetry Data",
                "sourceUrl": NASA_SOURCE,
                "dataset": "High-Resolution LOLA Topography for Lunar South Pole Sites",
                "siteProduct": "Site07 - Peak Near Shackleton",
                "resolutionMetersPerPixel": 5,
                "moonReferenceRadiusMeters": MOON_RADIUS_M,
                "windowDimensionsPixels": [WINDOW_SIZE, WINDOW_SIZE],
                "windowApproximateSizeMeters": [
                    WINDOW_SIZE * 5,
                    WINDOW_SIZE * 5,
                ],
                "processing": "Local raster extraction and descriptive statistics",
                "limitations": [
                    "Elevation products may contain interpolated pixels.",
                    "LDEC zero means no LOLA measurement spot recorded in that pixel.",
                    "A nonzero LDEC count does not independently establish landing safety.",
                    "Neighbourhood statistics do not replace detailed hazard mapping.",
                    "No landing suitability score is calculated.",
                    "Terrain obstruction and illumination are not evaluated here.",
                ],
            },
            "sites": {},
        }

        for site_id, coordinates in SITES.items():
            longitude = coordinates["longitudeEastDeg"]
            latitude = coordinates["latitudeDeg"]

            x, y = project_lunar_coordinates(longitude, latitude)
            row, col = reference.index(x, y)

            if not (
                0 <= row < reference.height
                and 0 <= col < reference.width
            ):
                raise ValueError(f"{site_id} lies outside the raster")

            half = WINDOW_SIZE // 2
            window = rasterio.windows.Window(
                col - half,
                row - half,
                WINDOW_SIZE,
                WINDOW_SIZE,
            )

            site_result = {
                "coordinates": coordinates,
                "projectedCoordinatesMeters": {
                    "x": x,
                    "y": y,
                },
                "rasterPixel": {
                    "row": row,
                    "column": col,
                },
                "products": {},
            }

            for key, ds in datasets.items():
                centre = float(ds.read(1)[row, col])
                neighbourhood = ds.read(1, window=window, masked=True)
                values = neighbourhood.compressed()

                product_result = {
                    "unit": PRODUCTS[key]["unit"],
                    "description": PRODUCTS[key]["description"],
                    "centrePixel": centre,
                    "neighbourhood": statistics(values),
                }

                if key == "measurementCount":
                    nonzero = int(np.count_nonzero(values > 0))
                    product_result["measurementCoverage"] = {
                        "pixelsWithMeasurements": nonzero,
                        "pixelsWithoutMeasurements": int(
                            values.size - nonzero
                        ),
                        "coveragePercent": (
                            100.0 * nonzero / values.size
                            if values.size else None
                        ),
                        "countDistribution": {
                            str(float(value)): int(count)
                            for value, count in zip(
                                *np.unique(values, return_counts=True)
                            )
                        },
                    }

                site_result["products"][key] = product_result

            results["sites"][site_id] = site_result

        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(
            json.dumps(results, indent=2),
            encoding="utf-8",
        )

        print("LOLA terrain analysis completed.")
        print("Output:", OUTPUT)

        for site_id, site in results["sites"].items():
            print(
                site_id,
                "| elevation:",
                site["products"]["elevation"]["centrePixel"],
                "| slope:",
                site["products"]["slope"]["centrePixel"],
                "| LDEC:",
                site["products"]["measurementCount"]["centrePixel"],
            )

    finally:
        for ds in datasets.values():
            ds.close()


if __name__ == "__main__":
    main()
