
import { fetchHorizonsData } from "./horizonsClient.js";
import { validateMissionScenario } from "./validateMissionScenario.js";

/**
 * Fetches independent Sun and Earth ephemerides for
 * multiple candidate lunar landing sites.
 *
 * Each target request is handled independently so that
 * partial results are preserved when a request fails.
 *
 * Mission inputs are validated before NASA requests begin.
 * altitudeMeters must be explicitly supplied.
 * Zero is allowed only as an explicitly chosen test value.
 */
export async function compareCandidateSites({
  sites,
  altitudeMeters,
  startTime,
  stopTime,
}) {
  const validation = validateMissionScenario({
    sites,
    altitudeMeters,
    startTime,
    stopTime,
  });

  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const results = await Promise.all(
    sites.map(async (site) => {
      const requestOptions = {
        longitudeEastDeg: site.longitudeEastDeg,
        latitudeDeg: site.latitudeDeg,
        altitudeMeters,
        startTime,
        stopTime,
      };

      const [sunResult, earthResult] = await Promise.allSettled([
        fetchHorizonsData({
          ...requestOptions,
          target: "sun",
        }),
        fetchHorizonsData({
          ...requestOptions,
          target: "earth",
        }),
      ]);

      function formatResult(result) {
        if (result.status === "fulfilled") {
          return {
            status: "success",
            data: result.value,
            error: null,
          };
        }

        return {
          status: "error",
          data: null,
          error: result.reason?.message || "Unknown request error.",
        };
      }

      return {
        site: { ...site },
        observerAltitudeMeters: altitudeMeters,
        sun: formatResult(sunResult),
        earth: formatResult(earthResult),
      };
    })
  );

  return {
    source: "NASA/JPL Horizons",
    requestedInterval: {
      startTime,
      stopTime,
      timeStandard: "UTC",
    },
    results,
  };
}
