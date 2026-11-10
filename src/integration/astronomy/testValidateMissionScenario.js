
import assert from "node:assert/strict";

import {
  validateUtcInterval,
  validateCandidateSites,
  validateObserverAltitude,
  validateMissionScenario,
} from "./validateMissionScenario.js";

const validSites = [
  {
    id: "PNS01",
    name: "Candidate Site 01",
    longitudeEastDeg: 134.1060,
    latitudeDeg: -88.9690,
  },
  {
    id: "PNS02",
    name: "Candidate Site 02",
    longitudeEastDeg: 128.4420,
    latitudeDeg: -89.0610,
  },
  {
    id: "PNS03",
    name: "Candidate Site 03",
    longitudeEastDeg: 126.9920,
    latitudeDeg: -88.8520,
  },
];

const validScenario = {
  sites: validSites,
  altitudeMeters: 0,
  startTime: "2026-Nov-14 00:00",
  stopTime: "2026-Nov-14 00:10",
};

async function runTest(name, testFunction) {
  try {
    await testFunction();
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exitCode = 1;
  }
}

async function testValidUtcInterval() {
  const result = validateUtcInterval(
    "2026-Nov-14 00:00",
    "2026-Nov-14 00:10"
  );

  assert.equal(result.valid, true);
  assert.equal(result.error, null);
}

async function testLeapYear() {
  const validLeapYear = validateUtcInterval(
    "2024-Feb-29 12:00",
    "2024-Feb-29 12:10"
  );

  const invalidLeapYear = validateUtcInterval(
    "2025-Feb-29 12:00",
    "2025-Mar-01 12:00"
  );

  assert.equal(validLeapYear.valid, true);
  assert.equal(invalidLeapYear.valid, false);
}

async function testInvalidCalendarDates() {
  const invalidDates = [
    ["2026-Feb-30 12:00", "2026-Mar-01 12:00"],
    ["2026-Apr-31 12:00", "2026-May-01 12:00"],
    ["2026-Nov-00 12:00", "2026-Nov-01 12:00"],
    ["2026-XYZ-14 12:00", "2026-Nov-15 12:00"],
  ];

  for (const [start, stop] of invalidDates) {
    assert.equal(
      validateUtcInterval(start, stop).valid,
      false
    );
  }
}

async function testInvalidClockValues() {
  const invalidTimes = [
    "2026-Nov-14 24:00",
    "2026-Nov-14 12:60",
    "2026-Nov-14 1:00",
    "2026-Nov-14 12:00:00",
  ];

  for (const start of invalidTimes) {
    assert.equal(
      validateUtcInterval(
        start,
        "2026-Nov-15 00:00"
      ).valid,
      false
    );
  }
}

async function testChronologicalInterval() {
  assert.equal(
    validateUtcInterval(
      "2026-Nov-14 00:10",
      "2026-Nov-14 00:00"
    ).valid,
    false
  );

  assert.equal(
    validateUtcInterval(
      "2026-Nov-14 00:00",
      "2026-Nov-14 00:00"
    ).valid,
    false
  );
}

async function testCandidateSites() {
  assert.equal(
    validateCandidateSites(validSites).valid,
    true
  );

  assert.equal(
    validateCandidateSites([]).valid,
    false
  );

  assert.equal(
    validateCandidateSites(null).valid,
    false
  );
}

async function testCoordinateBoundaries() {
  const boundarySites = [
    {
      id: "BOUNDARY01",
      longitudeEastDeg: 0,
      latitudeDeg: -90,
    },
    {
      id: "BOUNDARY02",
      longitudeEastDeg: 360,
      latitudeDeg: 90,
    },
  ];

  assert.equal(
    validateCandidateSites(boundarySites).valid,
    true
  );
}

async function testInvalidCoordinates() {
  const invalidSites = [
    { id: "BAD01", longitudeEastDeg: -1, latitudeDeg: 0 },
    { id: "BAD02", longitudeEastDeg: 361, latitudeDeg: 0 },
    { id: "BAD03", longitudeEastDeg: 0, latitudeDeg: -91 },
    { id: "BAD04", longitudeEastDeg: 0, latitudeDeg: 91 },
    { id: "BAD05", longitudeEastDeg: NaN, latitudeDeg: 0 },
  ];

  for (const site of invalidSites) {
    assert.equal(
      validateCandidateSites([site]).valid,
      false
    );
  }
}

async function testDuplicateSiteIds() {
  const duplicateSites = [
    validSites[0],
    { ...validSites[1], id: validSites[0].id },
  ];

  assert.equal(
    validateCandidateSites(duplicateSites).valid,
    false
  );
}

async function testObserverAltitude() {
  assert.equal(
    validateObserverAltitude(0).valid,
    true
  );

  assert.equal(
    validateObserverAltitude(100).valid,
    true
  );

  assert.equal(
    validateObserverAltitude(-1).valid,
    false
  );

  assert.equal(
    validateObserverAltitude(NaN).valid,
    false
  );

  assert.equal(
    validateObserverAltitude(Infinity).valid,
    false
  );
}

async function testCompleteMissionScenario() {
  assert.equal(
    validateMissionScenario(validScenario).valid,
    true
  );

  assert.equal(
    validateMissionScenario({
      ...validScenario,
      stopTime: "2026-Nov-13 23:00",
    }).valid,
    false
  );

  assert.equal(
    validateMissionScenario({
      ...validScenario,
      altitudeMeters: -5,
    }).valid,
    false
  );
}

console.log("\nASTRO-NOVA MISSION VALIDATION TEST\n");

await runTest("Valid UTC interval", testValidUtcInterval);
await runTest("Leap-year date validation", testLeapYear);
await runTest("Invalid calendar dates", testInvalidCalendarDates);
await runTest("Invalid clock values", testInvalidClockValues);
await runTest("Chronological interval validation", testChronologicalInterval);
await runTest("Candidate site validation", testCandidateSites);
await runTest("Coordinate boundary validation", testCoordinateBoundaries);
await runTest("Invalid coordinate rejection", testInvalidCoordinates);
await runTest("Duplicate site ID rejection", testDuplicateSiteIds);
await runTest("Observer altitude validation", testObserverAltitude);
await runTest("Complete mission scenario validation", testCompleteMissionScenario);

if (process.exitCode !== 1) {
  console.log("\nALL MISSION VALIDATION TESTS PASSED!");
}
