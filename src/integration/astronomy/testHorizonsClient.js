
import {
  fetchHorizonsData,
  fetchSunAndEarthData,
} from "./horizonsClient.js";

const observer = {
  longitudeEastDeg: 134.1060,
  latitudeDeg: -88.9690,
  altitudeMeters: 0,
  startTime: "2026-Nov-14 00:00",
  stopTime: "2026-Nov-14 00:01",
};

async function runTests() {
  console.log("ASTRO-NOVA HORIZONS CLIENT TEST");
  console.log("--------------------------------");

  try {
    console.log("\n1. Testing Sun data...");

    const sun = await fetchHorizonsData({
      ...observer,
      target: "sun",
    });

    console.log("Sun source:", sun.source);
    console.log("Sun rows:", sun.rows.length);
    console.log("Sun first row:", sun.rows[0]);

    if (sun.targetName !== "Sun" || sun.rows.length === 0) {
      throw new Error("Sun data validation failed.");
    }

    console.log("SUN TEST: PASS");

    console.log("\n2. Testing Earth data...");

    const earth = await fetchHorizonsData({
      ...observer,
      target: "earth",
    });

    console.log("Earth source:", earth.source);
    console.log("Earth rows:", earth.rows.length);
    console.log("Earth first row:", earth.rows[0]);

    if (earth.targetName !== "Earth" || earth.rows.length === 0) {
      throw new Error("Earth data validation failed.");
    }

    console.log("EARTH TEST: PASS");

    console.log("\n3. Testing combined request...");

    const combined = await fetchSunAndEarthData(observer);

    if (
      combined.sun.targetName !== "Sun" ||
      combined.earth.targetName !== "Earth"
    ) {
      throw new Error("Combined request validation failed.");
    }

    console.log("Combined Sun rows:", combined.sun.rows.length);
    console.log("Combined Earth rows:", combined.earth.rows.length);
    console.log("COMBINED TEST: PASS");

    console.log("\nALL HORIZONS CLIENT TESTS PASSED!");
  } catch (error) {
    console.error("\nTEST FAILED:", error.message);
  }
}

runTests();
