
import { useState } from "react";
import { fetchSunAndEarthData } from "./horizonsClient.js";
import "./HorizonsDashboard.css";

export default function HorizonsDashboard({
  site,
  startTime,
  stopTime,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadEphemeris() {
    if (!site || !startTime || !stopTime) {
      setError("Missing landing site or observation time.");
      return;
    }

    setLoading(true);
    setError("");
    setData(null);

    try {
      const result = await fetchSunAndEarthData({
        longitudeEastDeg: site.longitudeEastDeg,
        latitudeDeg: site.latitudeDeg,
        altitudeMeters: site.altitudeMeters,
        startTime,
        stopTime,
      });

      setData(result);
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
          <div className="horizons-row" key={`${row.timestampUtc}-${index}`}>
            <strong>{row.timestampUtc} UTC</strong>
            <p>Azimuth: {row.azimuthDeg.toFixed(4)}°</p>
            <p>Elevation: {row.elevationDeg.toFixed(4)}°</p>
            <p>
              Geometric horizon:
              {" "}
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
      <p>Sun and Earth observer ephemeris</p>

      <button onClick={loadEphemeris} disabled={loading}>
        {loading ? "Fetching NASA data..." : "Load Sun & Earth Data"}
      </button>

      {error && <p role="alert">{error}</p>}

      {data && (
        <>
          {renderTarget("SUN EPHEMERIS", data.sun)}
          {renderTarget("EARTH EPHEMERIS", data.earth)}
        </>
      )}

      <p className="horizons-note">
        Elevation is relative to the geometric reference horizon.
        Terrain obstruction and communication availability are not
        evaluated by this component.
      </p>
    </section>
  );
}
