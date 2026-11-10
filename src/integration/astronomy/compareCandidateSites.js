
import { fetchHorizonsData } from "./horizonsClient.js";

/**
 * Fetches independent Sun and Earth ephemerides for
 * multiple candidate lunar landing sites.
 *
 * Each target request is handled independently so that
 * partial results are preserved when a request fails.
 *
 * altitudeMeters must be explicitly supplied.
 * Zero is allowed only as an explicitly chosen test value.
 */
export async function compareCandidateSites({
  sites,
  altitudeMeters,
  startTime,
  stopTime,
}) {
  if (!Array.isArray(sites) || sites.length === 0) {
    throw new Error("At least one candidate site is required.");
  }

  if (
    !Number.isFinite(altitudeMeters) ||
    altitudeMeters < 0
  ) {
    throw new Error("A valid observer altitude in meters is required.");
  }

  if (
    typeof startTime !== "string" ||
    typeof stopTime !== "string" ||
    !startTime.trim() ||
    !stopTime.trim()
  ) {
    throw new Error("Valid UTC start and stop times are required.");
  }

  const siteIds = new Set();

  for (const site of sites) {
    if (
      !site ||
      typeof site.id !== "string" ||
      !site.id.trim() ||
      !Number.isFinite(site.longitudeEastDeg) ||
      site.longitudeEastDeg < 0 ||
      site.longitudeEastDeg > 360 ||
      !Number.isFinite(site.latitudeDeg) ||
      site.latitudeDeg < -90 ||
      site.latitudeDeg > 90
    ) {
      throw new Error("Invalid candidate site information.");
    }

    if (siteIds.has(site.id)) {
      throw new Error(`Duplicate candidate site ID: ${site.id}`);
    }

    siteIds.add(site.id);
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
