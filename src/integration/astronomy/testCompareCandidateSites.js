
import assert from "node:assert/strict";
import { compareCandidateSites } from "./compareCandidateSites.js";

const sites = [
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

const options = {
  sites,
  altitudeMeters: 0,
  startTime: "2026-Nov-14 00:00",
  stopTime: "2026-Nov-14 00:10",
};

function createMockResponse(target, shouldFail = false) {
  if (shouldFail) {
    return {
      ok: false,
      status: 502,
      json: async () => ({
        success: false,
        error: "Simulated test failure.",
      }),
    };
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({
      success: true,
      data: {
        source: "NASA/JPL Horizons",
        quantity: "Observer azimuth and elevation",
        angleUnit: "degrees",
        rows: [
          {
            timestampUtc: "2026-Nov-14 00:00",
            azimuthDeg: target === "sun" ? 120 : 240,
            elevationDeg: target === "sun" ? 15 : 25,
            presenceMarkers: "",
          },
        ],
      },
    }),
  };
}

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

async function testSuccessfulComparison() {
  const originalFetch = globalThis.fetch;
  const requests = [];

  globalThis.fetch = async (_url, requestOptions) => {
    const body = JSON.parse(requestOptions.body);
    requests.push(body);

    return createMockResponse(body.target);
  };

  try {
    const result = await compareCandidateSites(options);

    assert.equal(result.source, "NASA/JPL Horizons");
    assert.equal(result.results.length, 3);
    assert.equal(requests.length, 6);

    for (const siteResult of result.results) {
      assert.equal(siteResult.sun.status, "success");
      assert.equal(siteResult.earth.status, "success");
      assert.equal(siteResult.sun.data.rows.length, 1);
      assert.equal(siteResult.earth.data.rows.length, 1);
      assert.equal(siteResult.observerAltitudeMeters, 0);
    }

    for (const request of requests) {
      assert.equal(request.altitudeMeters, 0);
      assert.equal(request.startTime, options.startTime);
      assert.equal(request.stopTime, options.stopTime);
    }

    assert.equal(result.requestedInterval.timeStandard, "UTC");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testPartialFailure() {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (_url, requestOptions) => {
    const body = JSON.parse(requestOptions.body);

    const shouldFail =
      body.longitudeEastDeg === 134.1060 &&
      body.target === "earth";

    return createMockResponse(body.target, shouldFail);
  };

  try {
    const result = await compareCandidateSites(options);

    const firstSite = result.results.find(
      (item) => item.site.id === "PNS01"
    );

    assert.equal(firstSite.sun.status, "success");
    assert.equal(firstSite.earth.status, "error");
    assert.equal(firstSite.earth.data, null);

    assert.equal(result.results[1].sun.status, "success");
    assert.equal(result.results[1].earth.status, "success");
    assert.equal(result.results[2].sun.status, "success");
    assert.equal(result.results[2].earth.status, "success");
  } finally {
    globalThis.fetch = originalFetch;
  }
}

async function testInvalidInput() {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;

  globalThis.fetch = async () => {
    requestCount++;
    return createMockResponse("sun");
  };

  try {
    await assert.rejects(
      compareCandidateSites({
        ...options,
        sites: [],
      }),
      /At least one candidate site/
    );

    await assert.rejects(
      compareCandidateSites({
        ...options,
        altitudeMeters: -1,
      }),
      /observer altitude/
    );

    await assert.rejects(
      compareCandidateSites({
        ...options,
        sites: [
          sites[0],
          sites[0],
        ],
      }),
      /Duplicate candidate site ID/
    );

    await assert.rejects(
      compareCandidateSites({
        ...options,
        sites: [
          {
            ...sites[0],
            latitudeDeg: -100,
          },
        ],
      }),
      /Invalid candidate site/
    );

    assert.equal(requestCount, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

console.log("\nASTRO-NOVA MULTI-SITE COMPARISON TEST\n");

await runTest("Three-site successful comparison (six requests)", testSuccessfulComparison);
await runTest("Partial failure preserves remaining results", testPartialFailure);
await runTest("Invalid input is rejected before requests", testInvalidInput);

if (process.exitCode !== 1) {
  console.log("\nALL COMPARISON TESTS PASSED!");
}
