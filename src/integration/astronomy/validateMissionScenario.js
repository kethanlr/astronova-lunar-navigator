
/**
 * Astro-Nova
 * Mission scenario input validation.
 *
 * Validates UTC timestamps, candidate coordinates,
 * observer altitude and candidate site identifiers.
 */

function parseUtcTimestamp(value) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.match(
    /^(\d{4})-([A-Z][a-z]{2})-(\d{2}) (\d{2}):(\d{2})$/
  );

  if (!match) {
    return null;
  }

  const months = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11,
  };

  const [, yearText, monthText, dayText, hourText, minuteText] = match;

  if (!(monthText in months)) {
    return null;
  }

  const year = Number(yearText);
  const month = months[monthText];
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);

  const date = new Date(
    Date.UTC(year, month, day, hour, minute)
  );

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month ||
    date.getUTCDate() !== day ||
    date.getUTCHours() !== hour ||
    date.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return date.getTime();
}

export function validateUtcInterval(startTime, stopTime) {
  const startTimestamp = parseUtcTimestamp(startTime);
  const stopTimestamp = parseUtcTimestamp(stopTime);

  if (startTimestamp === null || stopTimestamp === null) {
    return {
      valid: false,
      error: "Invalid UTC timestamp. Expected YYYY-MMM-DD HH:mm.",
    };
  }

  if (startTimestamp >= stopTimestamp) {
    return {
      valid: false,
      error: "Start time must be earlier than stop time.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

export function validateCandidateSites(sites) {
  if (!Array.isArray(sites) || sites.length === 0) {
    return {
      valid: false,
      error: "At least one candidate site is required.",
    };
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
      return {
        valid: false,
        error: "Invalid candidate site information.",
      };
    }

    if (siteIds.has(site.id)) {
      return {
        valid: false,
        error: `Duplicate candidate site ID: ${site.id}`,
      };
    }

    siteIds.add(site.id);
  }

  return {
    valid: true,
    error: null,
  };
}

export function validateObserverAltitude(altitudeMeters) {
  if (
    !Number.isFinite(altitudeMeters) ||
    altitudeMeters < 0
  ) {
    return {
      valid: false,
      error: "A valid observer altitude in meters is required.",
    };
  }

  return {
    valid: true,
    error: null,
  };
}

export function validateMissionScenario({
  sites,
  altitudeMeters,
  startTime,
  stopTime,
}) {
  const siteValidation = validateCandidateSites(sites);

  if (!siteValidation.valid) {
    return siteValidation;
  }

  const altitudeValidation =
    validateObserverAltitude(altitudeMeters);

  if (!altitudeValidation.valid) {
    return altitudeValidation;
  }

  const intervalValidation =
    validateUtcInterval(startTime, stopTime);

  if (!intervalValidation.valid) {
    return intervalValidation;
  }

  return {
    valid: true,
    error: null,
  };
}
