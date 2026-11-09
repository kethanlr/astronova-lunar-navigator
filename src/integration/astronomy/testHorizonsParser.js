
import assert from "node:assert/strict";
import { parseHorizonsObserverResult } from "./horizonsParser.js";

// Actual NASA/JPL Horizons Sun response rows for PNS01
const sunResponse = `
$$SOE
2026-Nov-14 00:00:00 *   352.506614   2.578807
2026-Nov-14 00:01:00 *   352.498144   2.578787
$$EOE
`;

// Actual NASA/JPL Horizons Earth response rows for PNS01
const earthResponse = `
$$SOE
2026-Nov-14 00:00:00 *   224.727159  -5.380876
2026-Nov-14 00:01:00 *   224.726188  -5.380187
$$EOE
`;

// Test Sun data
const sun = parseHorizonsObserverResult(sunResponse);

assert.equal(sun.source, "NASA/JPL Horizons");
assert.equal(sun.rows.length, 2);

assert.equal(sun.rows[0].timestampUtc, "2026-Nov-14 00:00:00");
assert.equal(sun.rows[0].azimuthDeg, 352.506614);
assert.equal(sun.rows[0].elevationDeg, 2.578807);
assert.equal(sun.rows[0].presenceMarkers, "*");

assert.equal(sun.rows[1].azimuthDeg, 352.498144);
assert.equal(sun.rows[1].elevationDeg, 2.578787);

// Test Earth data
const earth = parseHorizonsObserverResult(earthResponse);

assert.equal(earth.rows.length, 2);

assert.equal(earth.rows[0].timestampUtc, "2026-Nov-14 00:00:00");
assert.equal(earth.rows[0].azimuthDeg, 224.727159);
assert.equal(earth.rows[0].elevationDeg, -5.380876);
assert.equal(earth.rows[0].presenceMarkers, "*");

assert.equal(earth.rows[1].azimuthDeg, 224.726188);
assert.equal(earth.rows[1].elevationDeg, -5.380187);

// Test invalid response handling
assert.throws(
  () => parseHorizonsObserverResult("Invalid Horizons response"),
  /markers were not found/
);

console.log("======================================");
console.log(" ASTRO-NOVA HORIZONS PARSER TEST");
console.log("======================================");
console.log("Sun response: PASS");
console.log("Earth response: PASS");
console.log("Negative elevation: PASS");
console.log("Timestamp and marker parsing: PASS");
console.log("Invalid response handling: PASS");
console.log("--------------------------------------");
console.log("ALL TESTS PASSED!");
