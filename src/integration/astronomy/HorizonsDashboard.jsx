
import { useState } from "react";
import "./HorizonsDashboard.css";
import { fetchSunAndEarthData } from "./horizonsClient.js";

const CANDIDATE_SITES = [
  {
    id: "PNS01",
    name: "Peak Near Shackleton 01",
    longitudeEastDeg: 134.1060,
    latitudeDeg: -88.9690,
  },
  {
    id: "PNS02",
    name: "Peak Near Shackleton 02",
    longitudeEastDeg: 128.4420,
    latitudeDeg: -89.0610,
  },
  {
    id: "PNS03",
    name: "Peak Near Shackleton 03",
    longitudeEastDeg: 126.9920,
    latitudeDeg: -88.8520,
  },
];

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function formatHorizonsTime(date) {
  const year = date.getUTCFullYear();
  const month = MONTHS[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export default function HorizonsDashboard() {
  const [siteId, setSiteId] = useState("PNS01");
  const [observationDate, setObservationDate] = useState("2026-11-14");
  const [observationTime, setObservationTime] = useState("00:00");
  const [altitudeMeters, setAltitudeMeters] = useState("0");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scenario, setScenario] = useState(null);

  const selectedSite = CANDIDATE_SITES.find(
    (site) => site.id === siteId
  );

  async function loadEphemeris() {
    setError("");
    setData(null);
    setScenario(null);

    const altitude = Number(altitudeMeters);

    if (
      !selectedSite ||
      !observationDate ||
      !observationTime ||
      altitudeMeters.trim() === "" ||
      !Number.isFinite(altitude) ||
      altitude < 0
    ) {
      setError("Please enter valid mission scenario details.");
      return;
    }

    const startDateTime = new Date(
      `${observationDate}T${observationTime}:00Z`
    );

    if (Number.isNaN(startDateTime.getTime())) {
      setError("Invalid observation date or time.");
      return;
    }

    const stopDateTime = new Date(
      startDateTime.getTime() + 10 * 60 * 1000
    );

    const startTime = formatHorizonsTime(startDateTime);
    const stopTime = formatHorizonsTime(stopDateTime);

    setLoading(true);

    try {
      const result = await fetchSunAndEarthData({
        longitudeEastDeg: selectedSite.longitudeEastDeg,
        latitudeDeg: selectedSite.latitudeDeg,
        altitudeMeters: altitude,
        startTime,
        stopTime,
      });

      setData(result);

      setScenario({
        site: selectedSite,
        altitudeMeters: altitude,
        startTime,
        stopTime,
      });
    } catch (err) {
      setError(err.message || "Unable to load NASA Horizons data.");
    } finally {
      setLoading(false);
    }
  }

  function renderTarget(title, result) {
    if (!result) return null;

    return (
      <section className="horizons-target">
        <h3>{title}</h3>
        <p>Source: {result.source}</p>

        {result.rows.map((row, index) => (
          <div
            className="horizons-row"
            key={`${row.timestampUtc}-${index}`}
          >
            <strong>{row.timestampUtc} UTC</strong>
            <p>Azimuth: {row.azimuthDeg.toFixed(4)}°</p>
            <p>Elevation: {row.elevationDeg.toFixed(4)}°</p>
            <p>
              Geometric horizon:{" "}
              {row.elevationDeg > 0
                ? "Above"
                : row.elevationDeg < 0
                  ? "Below"
                  : "On"}{" "}
              reference horizon
            </p>
          </div>
        ))}
      </section>
    );
  }

  return (
    <section className="horizons-dashboard">
      <h2>NASA / JPL Horizons</h2>
      <p>Lunar Mission Scenario Explorer</p>

      <div className="horizons-controls">
        <h3>MISSION SCENARIO</h3>

        <label htmlFor="landing-site">Landing Site</label>
        <select
          id="landing-site"
          value={siteId}
          onChange={(event) => setSiteId(event.target.value)}
        >
          {CANDIDATE_SITES.map((site) => (
            <option key={site.id} value={site.id}>
              {site.id} — {site.name}
            </option>
          ))}
        </select>

        {selectedSite && (
          <div className="horizons-site-info">
            <p>
              Longitude: {selectedSite.longitudeEastDeg.toFixed(4)}° E
            </p>
            <p>
              Latitude: {selectedSite.latitudeDeg.toFixed(4)}°
            </p>
          </div>
        )}

        <label htmlFor="observation-date">
          Observation Date (UTC)
        </label>
        <input
          id="observation-date"
          type="date"
          value={observationDate}
          onChange={(event) =>
            setObservationDate(event.target.value)
          }
        />

        <label htmlFor="observation-time">
          Observation Time (UTC)
        </label>
        <input
          id="observation-time"
          type="time"
          value={observationTime}
          onChange={(event) =>
            setObservationTime(event.target.value)
          }
        />

        <label htmlFor="observer-altitude">
          Observer Altitude (meters)
        </label>
        <input
          id="observer-altitude"
          type="number"
          min="0"
          step="any"
          value={altitudeMeters}
          onChange={(event) =>
            setAltitudeMeters(event.target.value)
          }
        />

        <p className="horizons-note">
          Enter a verified site altitude when available.
          Zero metres is only a provisional test value.
        </p>

        <button onClick={loadEphemeris} disabled={loading}>
          {loading ? "Fetching NASA data..." : "Load Sun & Earth Data"}
        </button>
      </div>

      {error && <p role="alert">{error}</p>}

      {scenario && (
        <section className="horizons-target">
          <h3>SELECTED MISSION SCENARIO</h3>
          <p>Site: {scenario.site.id}</p>
          <p>Start: {scenario.startTime} UTC</p>
          <p>End: {scenario.stopTime} UTC</p>
          <p>Observer altitude: {scenario.altitudeMeters} m</p>
          <p>Source: NASA/JPL Horizons</p>
        </section>
      )}

      {data && (
        <>
          {renderTarget("SUN EPHEMERIS", data.sun)}
          {renderTarget("EARTH EPHEMERIS", data.earth)}
        </>
      )}

      <p className="horizons-note">
        Elevation is relative to the geometric reference horizon.
        Terrain obstruction, actual illumination and communication
        availability are not evaluated here.
      </p>
    </section>
  );
}
