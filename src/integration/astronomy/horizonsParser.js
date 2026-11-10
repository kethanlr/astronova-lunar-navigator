
/**
 * Astro-Nova
 * NASA/JPL Horizons observer ephemeris parser.
 *
 * Extracts UTC timestamp, apparent azimuth and elevation
 * from a Horizons API response.
 *
 * Supports timestamps with or without seconds.
 * Angles are returned in degrees.
 */

export function parseHorizonsObserverResult(resultText) {
  if (typeof resultText !== "string" || resultText.trim() === "") {
    throw new Error("Invalid Horizons response: expected non-empty text.");
  }

  const startMarker = "$$SOE";
  const endMarker = "$$EOE";

  const startIndex = resultText.indexOf(startMarker);
  const endIndex = resultText.indexOf(endMarker);

  if (startIndex === -1 || endIndex === -1 || endIndex <= startIndex) {
    throw new Error("Horizons ephemeris table markers were not found.");
  }

  const tableText = resultText.slice(
    startIndex + startMarker.length,
    endIndex
  );

  const lines = tableText.split(/\r?\n/);

  // Supports both HH:MM and HH:MM:SS timestamps.
  // Presence markers are optional.
  const rowPattern =
    /^\s*(\d{4}-[A-Za-z]{3}-\d{2}\s+\d{2}:\d{2}(?::\d{2})?)\s*([*ierst]{0,2})\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s+([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/;

  const rows = [];

  for (const line of lines) {
    const match = line.match(rowPattern);

    if (!match) {
      continue;
    }

    const [, timestampUtc, presenceMarkers, azimuth, elevation] = match;

    const azimuthDeg = Number(azimuth);
    const elevationDeg = Number(elevation);

    if (
      !Number.isFinite(azimuthDeg) ||
      !Number.isFinite(elevationDeg)
    ) {
      throw new Error("Invalid numeric values in Horizons response.");
    }

    if (azimuthDeg < 0 || azimuthDeg >= 360) {
      throw new Error(`Azimuth outside expected range: ${azimuthDeg}`);
    }

    if (elevationDeg < -90 || elevationDeg > 90) {
      throw new Error(`Elevation outside expected range: ${elevationDeg}`);
    }

    rows.push({
      timestampUtc,
      azimuthDeg,
      elevationDeg,

      // Preserve the Horizons marker without interpreting it
      // as target visibility or communication availability.
      presenceMarkers: presenceMarkers || null,
    });
  }

  if (rows.length === 0) {
    throw new Error("No valid ephemeris rows found in Horizons response.");
  }

  return {
    source: "NASA/JPL Horizons",
    quantity: "Apparent azimuth and elevation",
    angleUnit: "degrees",
    rows,
  };
}
