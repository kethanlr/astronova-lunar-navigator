import SiteComparison from './components/SiteComparison';
import { useState } from 'react'
import './App.css'
import LunarMap from './components/LunarMap';
import SouthPoleMap from './components/SouthPoleMap';

function App() {
    const [siteA, setSiteA] = useState({
    name: 'Candidate A',
    lat: '',
    lon: '',
    alt: ''
  })

  const [siteB, setSiteB] = useState({
    name: 'Candidate B',
    lat: '',
    lon: '',
    alt: ''
  })

  const [activeSite, setActiveSite] = useState('A')
  const [scenarioDate, setScenarioDate] = useState('')
  const [scenarioTime, setScenarioTime] = useState('12:00')
  const [scenarioApplied, setScenarioApplied] = useState(false)

  const updateSite = (which, field, value) => {
    const setter = which === 'A' ? setSiteA : setSiteB
    setter(previous => ({ ...previous, [field]: value }))
    setScenarioApplied(false)
  }
  return (
    <div className="mission-app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">A</div>
          <div>
            <h2>ASTRO-NOVA</h2>
            <span>MISSION SYSTEMS</span>
          </div>
        </div>

        <div className="side-label">MISSION CENTER</div>
        <div className="nav-item active">◈ <span>Mission Overview</span></div>
        <div className="nav-item">◎ <span>Landing Sites</span></div>
        <div className="nav-item">☼ <span>Solar Analysis</span></div>
        <div className="nav-item">◉ <span>Earth Visibility</span></div>
        <div className="nav-item">⌗ <span>Terrain Analysis</span></div>

        <div className="sidebar-bottom">
          <div className="connection-dot"></div>
          <div>
            <strong>LOCAL ENVIRONMENT</strong>
            <span>Development Mode</span>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="breadcrumb">SPACE EXPLORATION / </span>
            <span className="breadcrumb-current">LUNAR NAVIGATOR</span>
          </div>
          <div className="mission-badge">
            <span className="live-dot"></span>
            NASA SPACE APPS 2026
          </div>
        </header>

        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span></span> LUNAR SOUTH POLE EXPLORATION
            </div>

            <h1>
              Beyond the horizon.
              <br />
              <span>Into the unknown.</span>
            </h1>

            <p>
              An intelligent mission-planning interface for exploring
              lunar landing environments, solar conditions and
              Earth communication visibility.
            </p>

            <div className="hero-meta">
              <div>
                <span className="meta-label">MISSION</span>
                <strong>LUNAR LANDING SITE NAVIGATOR</strong>
              </div>
              <div>
               
                <span className="meta-label">TARGET REGION</span>
                <strong>MOON · SOUTH POLE</strong>
              </div>
            </div>
          </div>

          <div className="moon-scene">
            <div className="orbit orbit-one"></div>
            <div className="orbit orbit-two"></div>
            <div className="moon">
              <div className="crater crater-one"></div>
              <div className="crater crater-two"></div>
              <div className="crater crater-three"></div>
              <div className="crater crater-four"></div>
            </div>
            <div className="moon-caption">
              <span>01 / LUNAR ENVIRONMENT</span>
              <strong>THE MOON</strong>
            </div>
            <div className="coordinate-tag">90° S · LUNAR REGION</div>
          </div>
        </section>

        <section className="section-heading">
          <div>
            <span className="section-kicker">MISSION INTELLIGENCE</span>
            <h2>Environmental Assessment</h2>
          </div>
          <span className="data-status">AWAITING SCIENTIFIC DATA</span>
        </section>

        <section className="telemetry-grid">
          <article className="telemetry-card">
            <div className="card-top">
              <span className="card-icon sun-icon">☼</span>
              <span className="card-index">01</span>
            </div>
            <span className="card-label">SOLAR ENVIRONMENT</span>
            <h3>Sun Position</h3>
            <div className="card-value">-- <small>DEG</small></div>
            <p>Solar elevation and azimuth</p>
            <div className="card-line sun-line"></div>
          </article>

          <article className="telemetry-card">
            <div className="card-top">
              <span className="card-icon earth-icon">◎</span>
              <span className="card-index">02</span>
            </div>
            <span className="card-label">COMMUNICATION ENVIRONMENT</span>
            <h3>Earth Visibility</h3>
            <div className="card-value">-- <small>DEG</small></div>
            <p>Earth elevation and azimuth</p>
            <div className="card-line earth-line"></div>
          </article>

          <article className="telemetry-card">
            <div className="card-top">
              <span className="card-icon terrain-icon">⌁</span>
              <span className="card-index">03</span>
            </div>
            <span className="card-label">SURFACE ENVIRONMENT</span>
            <h3>Terrain Intelligence</h3>
            <div className="card-value">-- <small>DATA</small></div>
            <p>Elevation, slope and horizon profile</p>
            <div className="card-line terrain-line"></div>
          </article>
        </section>

      
        <section className="explorer-section">
          <div className="comparison-heading">
            <div>
              <span className="section-kicker">MISSION PLANNING / 01</span>
              <h2>Lunar Landing Site Explorer</h2>
              <LunarMap />
              <SouthPoleMap />

          
              <p className="explorer-description">
                Configure two candidate locations and define an observation scenario.
              </p>
            </div>
            <span className="comparison-tag">SCENARIO WORKSPACE</span>
          </div>

          <div className="explorer-grid">
            <div className="polar-map">
              <div className="map-topline">
                <span>LUNAR POLAR WORKSPACE</span>
                <span>SCHEMATIC · NOT TO SCALE</span>
              </div>
 <SiteComparison />
              <div className="polar-disc">
                <div className="polar-ring ring-a"></div>
                <div className="polar-ring ring-b"></div>
                <div className="polar-ring ring-c"></div>
                <div className="polar-center">SOUTH<br />POLE</div>

                <button
                  className={`map-pin pin-a ${activeSite === 'A' ? 'selected' : ''}`}
                  onClick={() => setActiveSite('A')}
                >
                  A
                </button>

                <button
                  className={`map-pin pin-b ${activeSite === 'B' ? 'selected' : ''}`}
                  onClick={() => setActiveSite('B')}
                >
                  B
                </button>
              </div>

              <div className="map-legend">
                <span><i className="legend-a"></i> SITE A</span>
                <span><i className="legend-b"></i> SITE B</span>
                <span>Illustrative layout only</span>
              </div>
            </div>

            <div className="scenario-controls">
              <span className="section-kicker">OBSERVATION PARAMETERS</span>
              <h3>Mission Scenario</h3>

              <label className="field-label">OBSERVATION DATE</label>
              <input
                type="date"
                value={scenarioDate}
                onChange={e => {
                  setScenarioDate(e.target.value)
                  setScenarioApplied(false)
                }}
              />

              <label className="field-label">OBSERVATION TIME (UTC)</label>
              <input
                type="time"
                value={scenarioTime}
                onChange={e => {
                  setScenarioTime(e.target.value)
                  setScenarioApplied(false)
                }}
              />

              <div className="site-tabs">
                <button
                  className={activeSite === 'A' ? 'site-tab active-tab' : 'site-tab'}
                  onClick={() => setActiveSite('A')}
                >
                  CANDIDATE A
                </button>
                <button
                  className={activeSite === 'B' ? 'site-tab active-tab' : 'site-tab'}
                  onClick={() => setActiveSite('B')}
                >
                  CANDIDATE B
                </button>
              </div>

              <p className="active-site-label">
                EDITING SITE {activeSite}
              </p>

              <label className="field-label">SITE NAME</label>
              <input
                type="text"
                value={activeSite === 'A' ? siteA.name : siteB.name}
                onChange={e => updateSite(activeSite, 'name', e.target.value)}
                placeholder="Enter candidate name"
              />

              <div className="coordinate-grid">
                <div>
                  <label className="field-label">LATITUDE (°)</label>
                  <input
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    value={activeSite === 'A' ? siteA.lat : siteB.lat}
                    onChange={e => updateSite(activeSite, 'lat', e.target.value)}
                    placeholder="e.g. -85"
                  />
                </div>

                <div>
                  <label className="field-label">EAST LONGITUDE (°)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    max="360"
                    value={activeSite === 'A' ? siteA.lon : siteB.lon}
                    onChange={e => updateSite(activeSite, 'lon', e.target.value)}
                    placeholder="0–360"
                  />
                </div>
              </div>

              <label className="field-label">ALTITUDE ABOVE REFERENCE (m)</label>
              <input
                type="number"
                step="any"
                value={activeSite === 'A' ? siteA.alt : siteB.alt}
                onChange={e => updateSite(activeSite, 'alt', e.target.value)}
                placeholder="Enter altitude"
              />

              <button
                className="apply-button"
                onClick={() => setScenarioApplied(true)}
                disabled={
                  !scenarioDate ||
                  !siteA.lat || !siteA.lon ||
                  !siteB.lat || !siteB.lon ||
                  Number(siteA.lat) < -90 || Number(siteA.lat) > 90 ||
                  Number(siteB.lat) < -90 || Number(siteB.lat) > 90 ||
                  Number(siteA.lon) < 0 || Number(siteA.lon) > 360 ||
                  Number(siteB.lon) < 0 || Number(siteB.lon) > 360
                }
              >
                APPLY MISSION SCENARIO →
              </button>
            </div>
          </div>

          {scenarioApplied && (
            <div className="scenario-confirmation">
              <span className="confirmation-dot"></span>
              <div>
                <strong>Scenario parameters saved locally</strong>
                <p>
                  {scenarioDate} · {scenarioTime} UTC ·
                  {` ${siteA.name} vs ${siteB.name}`}
                </p>
                <small>
                  Ready for scientific data integration. No astronomy
                  calculations have been performed yet.
                </small>
              </div>
            </div>
          )}
        </section>


        <footer className="footer">
          <span>ASTRO-NOVA · LUNAR EXPLORATION SYSTEM</span>
          <span>BUILT FOR NASA SPACE APPS CHALLENGE 2026</span>
        </footer>
      </main>
    </div>
  )
}

export default App
