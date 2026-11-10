import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUTPUT = ROOT / "data" / "processed" / "lola_site07_terrain.json"

EXPECTED_SITES = {"PNS01", "PNS02", "PNS03"}

EXPECTED_PRODUCTS = {
    "elevation",
    "slope",
    "measurementCount",
    "slopeUncertainty",
    "elevationUncertainty",
}


class TestLolaTerrainOutput(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        if not OUTPUT.is_file():
            raise FileNotFoundError(f"Terrain output missing: {OUTPUT}")

        cls.data = json.loads(OUTPUT.read_text(encoding="utf-8"))

    def test_nasa_provenance(self):
        metadata = self.data["metadata"]

        self.assertIn("NASA", metadata["source"])
        self.assertEqual(metadata["resolutionMetersPerPixel"], 5)
        self.assertEqual(metadata["siteProduct"], "Site07 - Peak Near Shackleton")

    def test_all_candidate_sites_exist(self):
        self.assertEqual(set(self.data["sites"].keys()), EXPECTED_SITES)

    def test_all_products_exist_for_each_site(self):
        for site_id, site in self.data["sites"].items():
            with self.subTest(site=site_id):
                self.assertEqual(
                    set(site["products"].keys()),
                    EXPECTED_PRODUCTS,
                )

    def test_neighbourhood_statistics(self):
        for site_id, site in self.data["sites"].items():
            for product_name, product in site["products"].items():
                with self.subTest(site=site_id, product=product_name):
                    stats = product["neighbourhood"]

                    self.assertEqual(stats["validPixels"], 441)
                    self.assertLessEqual(stats["minimum"], stats["median"])
                    self.assertLessEqual(stats["median"], stats["maximum"])
                    self.assertGreaterEqual(stats["standardDeviation"], 0)

    def test_measurement_coverage(self):
        for site_id, site in self.data["sites"].items():
            coverage = site["products"]["measurementCount"]["measurementCoverage"]

            with self.subTest(site=site_id):
                self.assertEqual(
                    coverage["pixelsWithMeasurements"]
                    + coverage["pixelsWithoutMeasurements"],
                    441,
                )
                self.assertGreaterEqual(coverage["coveragePercent"], 0)
                self.assertLessEqual(coverage["coveragePercent"], 100)

    def test_centre_pixels_have_zero_ldec(self):
        for site_id, site in self.data["sites"].items():
            with self.subTest(site=site_id):
                self.assertEqual(
                    site["products"]["measurementCount"]["centrePixel"],
                    0,
                )


if __name__ == "__main__":
    unittest.main(verbosity=2)
