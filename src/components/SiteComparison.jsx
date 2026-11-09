import './SiteComparison.css';
const sites = [
  {
    name: 'PNS01',
    longitude: 134.1060,
    latitude: -88.9690,
    classification: 'Peak Near Shackleton',
  },
  {
    name: 'PNS02',
    longitude: 128.4420,
    latitude: -89.0610,
    classification: 'Peak Near Shackleton',
  },
  {
    name: 'PNS03',
    longitude: 126.9920,
    latitude: -88.8520,
    classification: 'Peak Near Shackleton',
  },
];

const parameters = [
  'Solar illumination',
  'Earth visibility',
  'Terrain assessment',
  'Landing suitability',
];

export default function SiteComparison() {
  return (
    <section className="comparison-wrapper">
      <div className="comparison-heading">
        <div>
          <span className="comparison-eyebrow">
            MISSION ANALYSIS
          </span>
          <h2>Landing Site Comparison</h2>
          <p>
            Compare candidate locations near the lunar south pole.
          </p>
        </div>
        <span className="comparison-status">
          03 SITES
        </span>
      </div>

      <div className="comparison-grid">
        {sites.map((site) => (
          <article className="comparison-card" key={site.name}>
            <div className="comparison-card-top">
              <span className="site-indicator">●</span>
              <span className="site-id">{site.name}</span>
              <span className="pending-badge">ANALYSIS PENDING</span>
            </div>

            <h3>{site.name}</h3>
            <p className="site-classification">
              {site.classification}
            </p>

            <div className="coordinate-block">
              <div>
                <span>LONGITUDE</span>
                <strong>{site.longitude.toFixed(4)}°</strong>
              </div>
              <div>
                <span>LATITUDE</span>
                <strong>{site.latitude.toFixed(4)}°</strong>
              </div>
            </div>

            <div className="parameter-list">
              {parameters.map((parameter) => (
                <div className="parameter-row" key={parameter}>
                  <span>{parameter}</span>
                  <span className="parameter-pending">
                    Awaiting data
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      <div className="comparison-note">
        SCIENTIFIC VALIDATION REQUIRED · No suitability ranking yet
      </div>
    </section>
  );
}
