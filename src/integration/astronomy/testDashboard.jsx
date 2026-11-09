
import { createRoot } from "react-dom/client";
import HorizonsDashboard from "./HorizonsDashboard.jsx";

const testSite = {
  id: "PNS01",
  name: "Peak Near Shackleton 01",
  longitudeEastDeg: 134.1060,
  latitudeDeg: -88.9690,
  altitudeMeters: 0,
};

function TestDashboard() {
  return (
    <main style={{
      maxWidth: "900px",
      margin: "30px auto",
      padding: "16px",
    }}>
      <HorizonsDashboard
        site={testSite}
        startTime="2026-Nov-14 00:00"
        stopTime="2026-Nov-14 00:01"
      />
    </main>
  );
}

createRoot(document.getElementById("root")).render(<TestDashboard />);
