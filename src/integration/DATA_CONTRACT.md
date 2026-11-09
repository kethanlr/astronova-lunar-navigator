# Astro-Nova - Integration Data Contract

## 1. Purpose

This document defines the proposed data structure for integrating astronomy calculations, lunar terrain analysis, and the mission-planning dashboard.

This is a draft. Field names, units, and formats must be confirmed with the respective module owners before implementation.

## 2. Candidate Landing Site

Each candidate site should contain:

- `id` - Unique site identifier.
- `name` - Candidate site name.
- `longitudeEastDeg` - East longitude in degrees (0-360).
- `latitudeDeg` - Latitude in degrees (-90 to +90).
- `altitudeMeters` - Altitude in metres, if available.
- `coordinateSource` - Source of coordinates.

## 3. Mission Scenario

- `scenarioTimeUTC` - Scenario date and time in ISO 8601 UTC format.
- `siteId` - Selected candidate site identifier.

## 4. Astronomy Module - Jennifer

Proposed outputs:

- Sun azimuth and elevation.
- Earth azimuth and elevation.
- Geometric horizon visibility.
- Calculation timestamp.
- Data source and reference frame.

All angular measurements should use degrees.

Important: Geometric visibility must remain separate from terrain-obstructed visibility.

## 5. Terrain Module - Ishwari

Proposed outputs:

- Terrain elevation in metres.
- Surface slope in degrees.
- Terrain horizon profile, if available.
- Data source and spatial resolution.
- Uncertainty or quality information, if available.

## 6. Illumination Data

Historical lunar illumination percentage must be identified separately from instantaneous solar elevation or predicted real-time illumination.

The source, time coverage, and interpretation of the illumination dataset must be documented.

## 7. Assessment Engine - Kethan

The integration layer will eventually combine validated astronomy and terrain outputs.

It must:

- Preserve original source information.
- Validate units and coordinate formats.
- Distinguish missing data from zero values.
- Avoid generating rankings from incomplete or unverified inputs.
- Explain the reason behind every assessment.

## 8. Integration Status

- Astronomy module: Awaiting Jennifer's confirmed output format.
- Terrain module: Awaiting Ishwari's confirmed output format.
- Frontend: Coordinate with Saanwi before changing shared UI components.
- Assessment engine: Pending validated input data.

## 9. Scientific Integrity

No simulated or placeholder values should be presented as real NASA/JPL scientific results. Missing or unavailable measurements must be clearly labelled.