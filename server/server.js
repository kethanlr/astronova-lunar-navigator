import { createServer } from "node:http";
import { parseHorizonsObserverResult } from "../src/integration/astronomy/horizonsParser.js";
import { validateMissionScenario } from "../src/integration/astronomy/validateMissionScenario.js";

const PORT = 3001;
const HORIZONS_API = "https://ssd.jpl.nasa.gov/api/horizons.api";

const allowedTargets = {
  sun: "10",
  earth: "399",
};

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function sendJson(response, status, data) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });

  response.end(JSON.stringify(data));
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > 10_000) {
      throw new HttpError(413, "Request body too large.");
    }
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new HttpError(400, "Request body must contain valid JSON.");
  }
}

function validateRequest(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpError(400, "Request body must be a JSON object.");
  }

const target = Object.hasOwn(allowedTargets, data.target)
  ? allowedTargets[data.target]
  : null;
  if (!target) {
    throw new HttpError(400, "Target must be 'sun' or 'earth'.");
  }

  const {
    longitudeEastDeg,
    latitudeDeg,
    altitudeMeters,
    startTime,
    stopTime,
  } = data;

  const validation = validateMissionScenario({
    sites: [
      {
        id: "horizons-request",
        longitudeEastDeg,
        latitudeDeg,
      },
    ],
    altitudeMeters,
    startTime,
    stopTime,
  });

  if (!validation.valid) {
    throw new HttpError(400, validation.error);
  }

  return {
    target,
    longitudeEastDeg,
    latitudeDeg,
    altitudeMeters,
    startTime,
    stopTime,
  };
}

async function getHorizonsData(data) {
  const query = new URLSearchParams({
    format: "json",
    COMMAND: `'${data.target}'`,
    OBJ_DATA: "NO",
    MAKE_EPHEM: "YES",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${data.longitudeEastDeg},${data.latitudeDeg},${data.altitudeMeters / 1000}'`,
    START_TIME: `'${data.startTime}'`,
    STOP_TIME: `'${data.stopTime}'`,
    STEP_SIZE: "'1 m'",
    QUANTITIES: "'4'",
    TIME_TYPE: "'UT'",
    TIME_DIGITS: "'SECONDS'",
    ANG_FORMAT: "'DEG'",
    APPARENT: "'AIRLESS'",
  });

  const url = `${HORIZONS_API}?${query}`;

  let apiResponse;

  try {
    apiResponse = await fetch(url, {
      headers: {
        "User-Agent": "Astro-Nova/0.1 (educational research project)",
      },
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    if (error.name === "TimeoutError") {
      throw new HttpError(
        504,
        "NASA Horizons request timed out. Please try again."
      );
    }

    throw new HttpError(
      502,
      "Unable to connect to NASA Horizons. Please try again later."
    );
  }

  if (!apiResponse.ok) {
    throw new HttpError(
      502,
      `NASA Horizons returned HTTP ${apiResponse.status}.`
    );
  }

  let payload;

  try {
    payload = await apiResponse.json();
  } catch {
    throw new HttpError(
      502,
      "NASA Horizons returned an unreadable response."
    );
  }

  if (payload.error || typeof payload.result !== "string") {
    throw new HttpError(
      502,
      "NASA Horizons returned an unexpected response."
    );
  }

  let parsed;

  try {
    parsed = parseHorizonsObserverResult(payload.result);
  } catch (error) {
    console.error("Horizons parser error:", error.message);
    throw new HttpError(
      502,
      "Unable to interpret the NASA Horizons response."
    );
  }

  return {
    ...parsed,
    target: data.target,
    targetName: data.target === "10" ? "Sun" : "Earth",
    observer: {
      centerBody: "Moon (301)",
      coordinateType: "GEODETIC",
      longitudeEastDeg: data.longitudeEastDeg,
      latitudeDeg: data.latitudeDeg,
      altitudeMeters: data.altitudeMeters,
    },
    requestedTimeUTC: {
      start: data.startTime,
      stop: data.stopTime,
    },
  };
}

const server = createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://localhost:${PORT}`);

  if (requestUrl.pathname !== "/api/horizons") {
    return sendJson(response, 404, {
      success: false,
      error: "Route not found.",
    });
  }

  if (request.method !== "POST") {
    return sendJson(response, 405, {
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const body = await readJsonBody(request);
    const validatedData = validateRequest(body);
    const result = await getHorizonsData(validatedData);

    return sendJson(response, 200, {
      success: true,
      data: result,
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;

    console.error("Astro-Nova backend error:", error.message);

    return sendJson(response, status, {
      success: false,
      error:
        status === 500
          ? "An unexpected backend error occurred."
          : error.message,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Astro-Nova backend running at http://localhost:${PORT}`);
});
