
import importlib.util
import json
import math
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[3]

ANALYZER_PATH = (
    ROOT / "src" / "integration" / "terrain"
    / "analyzeTerrainHorizon.py"
)

OUTPUT_PATH = (
    ROOT / "data" / "processed"
    / "lola_site07_horizon.json"
)


spec = importlib.util.spec_from_file_location(
    "terrain_horizon",
    ANALYZER_PATH,
)

analyzer = importlib.util.module_from_spec(spec)
spec.loader.exec_module(analyzer)


class TestTerrainHorizon(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        with OUTPUT_PATH.open("r", encoding="utf-8") as file:
            cls.data = json.load(file)

    def test_nasa_provenance(self):
        metadata = self.data["metadata"]

        self.assertIn("NASA", metadata["source"])
        self.assertEqual(
            metadata["resolutionMetersPerPixel"],
            5.0,
        )
        self.assertEqual(
            metadata["maximumRequestedDistanceMeters"],
            5000.0,
        )

    def test_all_candidate_sites_present(self):
        self.assertEqual(
            set(self.data["sites"].keys()),
            {"PNS01", "PNS02", "PNS03"},
        )

    def test_each_site_has_360_unique_azimuths(self):
        for site_id, site in self.data["sites"].items():
            rays = site["rays"]

            self.assertEqual(
                len(rays),
                360,
                msg=site_id,
            )

            azimuths = [
                ray["azimuthDeg"] for ray in rays
            ]

            self.assertEqual(
                sorted(azimuths),
                list(range(360)),
                msg=site_id,
            )

    def test_horizon_values_are_valid(self):
        for site_id, site in self.data["sites"].items():
            for ray in site["rays"]:

                angle = ray["horizonElevationDeg"]
                distance = ray["horizonDistanceMeters"]
                coverage = ray["coverageDistanceMeters"]

                self.assertIsNotNone(
                    angle,
                    msg=f"{site_id}, azimuth {ray['azimuthDeg']}",
                )

                self.assertTrue(math.isfinite(angle))
                self.assertGreaterEqual(angle, -90.0)
                self.assertLessEqual(angle, 90.0)

                self.assertIsNotNone(distance)
                self.assertGreater(distance, 0.0)
                self.assertLessEqual(distance, coverage + 0.001)

    def test_coverage_and_termination_consistency(self):
        allowed_reasons = {
            "maximum_requested_distance",
            "raster_boundary",
            "elevation_nodata",
            "ldec_nodata",
        }

        for site_id, site in self.data["sites"].items():
            for ray in site["rays"]:

                reason = ray["terminationReason"]

                self.assertIn(reason, allowed_reasons)

                self.assertEqual(
                    ray["coverageComplete"],
                    reason == "maximum_requested_distance",
                    msg=f"{site_id}, azimuth {ray['azimuthDeg']}",
                )

                self.assertGreaterEqual(
                    ray["coverageDistanceMeters"],
                    0.0,
                )

                self.assertLessEqual(
                    ray["coverageDistanceMeters"],
                    5000.0,
                )

    def test_summary_matches_ray_data(self):
        for site_id, site in self.data["sites"].items():
            rays = site["rays"]
            summary = site["summary"]

            complete = sum(
                ray["coverageComplete"] for ray in rays
            )

            self.assertEqual(
                summary["totalAzimuthRays"],
                360,
            )

            self.assertEqual(
                summary["completeCoverageRays"],
                complete,
                msg=site_id,
            )

            self.assertEqual(
                summary["incompleteCoverageRays"],
                360 - complete,
                msg=site_id,
            )

    def test_cardinal_direction_vectors(self):
        longitude = 134.106

        north = np.array(
            analyzer.azimuth_direction(longitude, 0)
        )

        east = np.array(
            analyzer.azimuth_direction(longitude, 90)
        )

        south = np.array(
            analyzer.azimuth_direction(longitude, 180)
        )

        west = np.array(
            analyzer.azimuth_direction(longitude, 270)
        )

        for vector in [north, east, south, west]:
            self.assertAlmostEqual(
                np.linalg.norm(vector),
                1.0,
                places=10,
            )

        self.assertAlmostEqual(
            np.dot(north, east),
            0.0,
            places=10,
        )

        np.testing.assert_allclose(
            south,
            -north,
            atol=1e-10,
        )

        np.testing.assert_allclose(
            west,
            -east,
            atol=1e-10,
        )
    def test_azimuth_orientation_matches_geographic_projection(self):
        radius = analyzer.MOON_REFERENCE_RADIUS_METERS
        longitude_deg = 134.106
        latitude_deg = -88.969
        epsilon = 0.001

        def independent_projection(lon_deg, lat_deg):
            lon = math.radians(lon_deg)
            colat = math.radians(90.0 + lat_deg)

            radial_distance = (
                2.0 * radius * math.tan(colat / 2.0)
            )

            return np.array([
                radial_distance * math.sin(lon),
                radial_distance * math.cos(lon),
            ])

        origin = independent_projection(
            longitude_deg,
            latitude_deg,
        )

        # Moving farther south means moving towards the pole.
        geographic_north = (
            independent_projection(
                longitude_deg,
                latitude_deg - epsilon,
            ) - origin
        )
        geographic_north /= np.linalg.norm(geographic_north)

               # Central difference gives a more accurate eastward direction.
        geographic_east = (
            independent_projection(
                longitude_deg + epsilon,
                latitude_deg,
            )
            - independent_projection(
                longitude_deg - epsilon,
                latitude_deg,
            )
        )
        geographic_east /= np.linalg.norm(geographic_east)

        calculated_north = np.array(
            analyzer.azimuth_direction(longitude_deg, 0)
        )

        calculated_east = np.array(
            analyzer.azimuth_direction(longitude_deg, 90)
        )

        np.testing.assert_allclose(
            calculated_north,
            geographic_north,
            atol=1e-6,
        )

        np.testing.assert_allclose(
            calculated_east,
            geographic_east,
            atol=1e-6,
        )

    def test_lunar_curvature_correction(self):
        radius = analyzer.MOON_REFERENCE_RADIUS_METERS
        distance = 1000.0
        origin = 1000.0

        angle = analyzer.apparent_elevation_angle(
            terrain_elevation_m=origin,
            origin_elevation_m=origin,
            ground_distance_m=distance,
        )

        expected_sag = (
            distance ** 2 / (2.0 * (radius + origin))
        )

        expected_angle = math.degrees(
            math.atan2(-expected_sag, distance)
        )

        self.assertAlmostEqual(
            angle,
            expected_angle,
            places=10,
        )

        self.assertLess(angle, 0.0)

    def test_no_landing_score_is_generated(self):
        for site in self.data["sites"].values():
            self.assertNotIn("landingScore", site)
            self.assertNotIn("suitabilityScore", site)


if __name__ == "__main__":
    unittest.main(verbosity=2)
