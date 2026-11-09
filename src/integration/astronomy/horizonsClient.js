
const HORIZONS_ENDPOINT = "/api/horizons";

/**
 * Fetches NASA/JPL Horizons observer ephemeris data
 * through the Astro-Nova backend.
 *
 * @param {Object} options
 * @param {"sun" | "earth"} options.target
 * @param {number} options.longitudeEastDeg
 * @param {number} options.latitudeDeg
 * @param {number} options.altitudeMeters
 * @param {string} options.startTime
 * @param {string} options.stopTime
 */
export async function fetchHorizonsData({
  target,
  longitudeEastDeg,
  latitudeDeg,
  altitudeMeters,
  startTime,
  stopTime,
}) {
  let response;

  try {
    response = await fetch(HORIZONS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        target,
        longitudeEastDeg,
        latitudeDeg,
        altitudeMeters,
        startTime,
        stopTime,
      }),
    });
  } catch {
    throw new Error(
      "Unable to connect to the Astro-Nova backend. Check that both servers are running."
    );
  }

  let result;

  try {
    result = await response.json();
  } catch {
    throw new Error("The backend returned an invalid response.");
  }

  if (!response.ok || !result.success) {
    throw new Error(
      result.error || `Horizons request failed (HTTP ${response.status}).`
    );
  }

  if (!result.data || !Array.isArray(result.data.rows)) {
    throw new Error("Horizons response is missing valid ephemeris rows.");
  }

  return result.data;
}

/**
 * Fetches both Sun and Earth data for one observer and time interval.
 */
export async function fetchSunAndEarthData(options) {
  const [sun, earth] = await Promise.all([
    fetchHorizonsData({
      ...options,
      target: "sun",
    }),
    fetchHorizonsData({
      ...options,
      target: "earth",
    }),
  ]);

  return {
    sun,
    earth,
  };
}
