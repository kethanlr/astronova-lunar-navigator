# Astro-Nova - Integration Data Contract

## 1. Purpose

This document defines the implementation-level data contract for the
Astro-Nova Lunar Landing Site Navigator.

The project is being independently implemented by Kethan, including
astronomy, terrain processing, illumination integration, frontend,
backend, assessment logic, testing, and documentation.

The contract distinguishes implemented functionality from planned work.
Scientific measurements, derived calculations, historical datasets,
and unavailable information must never be presented as interchangeable.

## 2. Candidate Landing Sites

Current provisional candidate definitions:

| Site ID | Longitude East | Latitude |
|---|---:|---:|
| PNS01 | 134.1060° | -88.9690° |
| PNS02 | 128.4420° | -89.0610° |
| PNS03 | 126.9920° | -88.8520° |

Candidate site fields:

- `id`: Unique candidate identifier.
- `name`: Human-readable site name.
- `longitudeEastDeg`: East longitude in degrees.
- `latitudeDeg`: Latitude in degrees.
- `altitudeMeters`: Altitude in metres, only when a verified value is available.
- `coordinateSource`: Provenance of the coordinates.

The current candidate coordinates are provisional project inputs.
They must not be described as independently surveyed landing coordinates.

An altitude input of zero used during API testing is a test assumption,
not a measured elevation.

## 3. Mission Scenario

The mission scenario must identify:

- Selected candidate site.
- Scenario start and stop timestamps.
- UTC time standard.
- Requested calculation interval.
- Observer altitude in metres, when supplied.

Date/time inputs must be valid calendar timestamps.
Invalid coordinates, negative altitude, and invalid time intervals
must be rejected before scientific calculations are requested.

## 4. Astronomy Integration

### Implementation

The astronomy integration is independently implemented.

Main files:

- `src/integration/astronomy/horizonsParser.js`
- `src/integration/astronomy/validateMissionScenario.js`
- `src/integration/astronomy/compareCandidateSites.js`
- `src/integration/astronomy/horizonsClient.js`
- `src/integration/astronomy/HorizonsDashboard.jsx`
- `server/server.js`

Backend endpoint:

- `POST /api/horizons`

Supported targets:

- Sun: JPL Horizons target ID `10`.
- Earth: JPL Horizons target ID `399`.

The backend accepts a target, site coordinates, observer altitude in
metres, and a UTC start/stop time range. Altitude is converted to
kilometres for the Horizons request.

### Astronomy output interpretation

Astronomy results include:

- UTC timestamp.
- Apparent azimuth in degrees.
- Apparent elevation in degrees.
- Preserved source output markers where available.

Azimuth and elevation are angular quantities in degrees.

Horizons geometric/local-horizon elevation must not be confused with
terrain-obstructed visibility.

A positive geometric elevation does not prove that the target is
visible above the local terrain skyline.

Earth geometric visibility does not independently establish a usable
communications link.

Solar elevation does not independently establish available solar-array
power.

### Validation

The shared mission-scenario validation logic is used by the backend.
Invalid dates, invalid latitude/longitude, negative altitude, and
invalid time intervals must be rejected.

## 5. Terrain Integration - NASA LOLA

### Implementation

The terrain processing pipeline is independently implemented.

Main files:

- `src/integration/terrain/analyzeLolaTerrain.py`
- `src/integration/terrain/testLolaTerrain.py`

NASA source:

https://pgda.gsfc.nasa.gov/products/78

Dataset:

High-Resolution LOLA Topography for Lunar South Pole Sites.

Current raster product:

- Site07 - Peak Near Shackleton.
- GeoTIFF format.
- 5 metres per pixel.
- 3200 x 3200 pixels.
- Five raster products are processed.

### Input raster products

| JSON key | NASA product | Unit |
|---|---|---|
| `elevation` | Surface elevation (`surf`) | metres |
| `slope` | Surface slope (`slp`) | degrees |
| `measurementCount` | LOLA count (`ldec`) | measurement spots per pixel |
| `slopeUncertainty` | Slope uncertainty (`slperr`) | degrees RMS |
| `elevationUncertainty` | Total elevation uncertainty (`toterr`) | metres RMS |

### Processing method

The analyzer:

1. Opens all five NASA raster products.
2. Checks raster dimensions, transforms, and CRS alignment.
3. Projects candidate coordinates into the dataset's lunar
   south-polar stereographic coordinate system.
4. Locates each candidate's raster pixel.
5. Extracts a 21 x 21 pixel neighbourhood.
6. Calculates descriptive statistics and measurement coverage.
7. Exports the results as JSON.

The neighbourhood contains 441 pixels and represents approximately
105 m x 105 m at the nominal raster resolution.

The coordinate projection uses a spherical lunar reference radius
of 1,737,400 metres. The raster's embedded CRS and NASA dataset
documentation must be retained as provenance; this processing
assumption must not be described as an independently verified
geodetic datum transformation.

### Output file

`data/processed/lola_site07_terrain.json`

Top-level structure:

- `metadata`
- `sites`

Each site contains:

- `coordinates`
- `projectedCoordinatesMeters`
- `rasterPixel`
- `products`

Each product contains:

- `unit`
- `description`
- `centrePixel`
- `neighbourhood`

The measurement-count product additionally contains
`measurementCoverage`, including:

- `pixelsWithMeasurements`
- `pixelsWithoutMeasurements`
- `coveragePercent`
- `countDistribution`

Neighbourhood statistics include minimum, median, mean, maximum,
standard deviation, and valid pixel count.

### Scientific limitations

- A valid elevation pixel is not necessarily a direct LOLA measurement.
- LDEC zero means no LOLA measurement spot is recorded in that pixel.
- Interpolated elevation values must not be described as direct
  measurements.
- Nonzero LDEC does not independently establish landing safety.
- Uncertainty values must be retained when interpreting terrain data.
- Neighbourhood statistics do not replace detailed hazard mapping.
- No landing suitability score is currently calculated by this module.

### Terrain Horizon Analysis

#### Implementation

The terrain horizon pipeline independently analyzes the surrounding LOLA elevation model for each candidate landing site.

Main files:

- `src/integration/terrain/analyzeTerrainHorizon.py`
- `src/integration/terrain/testTerrainHorizon.py`

Input products:

- Site07 surface elevation (`surf`).
- Site07 LOLA measurement count (`ldec`).
- Site07 total elevation uncertainty (`toterr`).

#### Processing method

For each candidate site, the analyzer:

1. Loads and validates the alignment of the DEM, LDEC and TOTERR rasters.
2. Uses the candidate's projected raster location and centre-pixel elevation as the origin.
3. Samples 360 radial directions at 1-degree azimuth intervals.
4. Samples the terrain at nominal 5-metre intervals, up to a requested maximum ground distance of 5,000 metres.
5. Uses the DEM cell centre as the representative terrain location.
6. Calculates apparent terrain elevation angles relative to the candidate origin elevation.
7. Applies an approximate spherical lunar curvature correction.
8. Tracks raster coverage, unique terrain pixels and LOLA measurement coverage independently for every azimuth.
9. Extracts the TOTERR value from the DEM cell producing the maximum apparent terrain elevation angle.
10. Exports the results as JSON.

Azimuth convention:

- 0 degrees: local north.
- 90 degrees: local east.
- 180 degrees: local south.
- 270 degrees: local west.

The convention is clockwise from local north. Its orientation must be independently verified against reference geometry before operational use.

#### Horizon calculation interpretation

`horizonElevationDeg` represents the maximum apparent elevation angle of sampled terrain relative to the candidate origin pixel elevation, using the approximate curvature correction.

`horizonDistanceMeters` is the radial ground distance from the candidate origin to the centre of the DEM cell producing that maximum angle.

These values describe sampled terrain geometry. They are not direct measurements of Sun or Earth visibility.

A negative horizon elevation angle is valid when all sampled terrain points along that ray remain below the candidate's local tangent-plane reference after the applied correction.

#### Coverage and data quality

Each azimuth ray independently records:

- Requested maximum distance.
- Actual terrain coverage distance.
- Whether the requested distance was fully covered.
- The reason sampling terminated.
- Number of unique terrain pixels sampled.
- Pixels with and without recorded LOLA measurements.
- LOLA measurement coverage percentage.

A ray terminating at the raster boundary is incomplete. Its result must not be interpreted as a complete 5-kilometre terrain horizon.

The Site07 raster does not provide equal directional coverage for every candidate:

- PNS01: 191 of 360 rays have complete 5-kilometre coverage.
- PNS02: 187 of 360 rays have complete 5-kilometre coverage.
- PNS03: 360 of 360 rays have complete 5-kilometre coverage.

#### Elevation uncertainty

`horizonPointElevationUncertaintyMetersRms` contains the NASA TOTERR value from the same raster cell that produces the maximum apparent terrain elevation angle.

The value is elevation uncertainty in metres RMS. It is not horizon-angle uncertainty.

The uncertainty value is not propagated through the horizon-angle calculation.

`horizonRasterRow` and `horizonRasterColumn` identify the corresponding source raster cell, allowing independent verification against the NASA TOTERR GeoTIFF.

#### Output file

`data/processed/lola_site07_horizon.json`

Top-level structure:

- `metadata`
- `sites`

Metadata records the NASA source, input raster names, resolution, lunar reference radius, azimuth interval, sampling interval, requested maximum distance, azimuth convention, curvature correction, projection assumption, horizon-distance definition, uncertainty processing and scientific limitations.

Each site contains:

- `coordinates`
- `originElevationMeters`
- `projectionScaleFactor`
- `azimuthConvention`
- `summary`
- `rays`

Each ray contains:

- `azimuthDeg`
- `horizonElevationDeg`
- `horizonDistanceMeters`
- `horizonTerrainElevationMeters`
- `horizonPointLolaMeasurementCount`
- `horizonPointElevationUncertaintyMetersRms`
- `horizonRasterRow`
- `horizonRasterColumn`
- `uniqueTerrainPixelsSampled`
- `pixelsWithLolaMeasurements`
- `pixelsWithoutLolaMeasurements`
- `measurementCoveragePercent`
- `coverageDistanceMeters`
- `requestedDistanceMeters`
- `coverageComplete`
- `terminationReason`

#### Scientific limitations
- The nominal 5-metre sampling interval does not imply 5-metre
  positional accuracy; reported horizon distances use DEM cell
  centres and an approximate projection scale factor.
- Analysis is restricted to the downloaded Site07 raster coverage.
- The spherical polar stereographic scale-factor approximation is used for ground distances.
- The horizon calculation uses an approximate spherical lunar geometry model.
- The local azimuth orientation requires independent verification.
- A 5-metre raster cell does not identify the exact position of a terrain feature within that cell.
- Repeated azimuth rays may sample the same terrain pixel; they are not independent terrain observations.
- DEM values may be interpolated. LDEC zero indicates no recorded LOLA measurement spot in that pixel.
- Incomplete rays must not be treated as complete horizons.
- TOTERR elevation uncertainty is not propagated into horizon-angle uncertainty.
- Atmospheric refraction is not modelled.
- No Sun/Earth visibility calculation, communications assessment, power assessment or landing suitability score is performed by this module.

## 6. Illumination Integration

NASA south-pole illumination imagery is available through the
NASA Moon Trek WMTS service.

Current layer:

`WAC_POLE_ILL_PCT_SOUTH_100M`

The layer represents historical illumination information and must
not be presented as a live illumination forecast.

Historical illumination percentage must remain distinct from:

- Instantaneous Sun elevation.
- Terrain-obstructed sunlight.
- Predicted illumination at a selected mission timestamp.
- Solar-array power availability.

The layer's projection and coordinate interpretation must be
validated before quantitative spatial calculations are made.

## 7. Assessment Engine

The assessment engine will combine validated inputs from:

- Candidate site definitions.
- JPL Horizons astronomy.
- LOLA terrain products.
- NASA illumination information.
- Mission scenario constraints.

The engine must:

- Preserve source and dataset provenance.
- Preserve units and coordinate reference information.
- Validate input values and expected data structures.
- Distinguish missing data from numerical zero.
- Distinguish direct measurements from interpolated or derived values.
- Retain uncertainty and data-quality information.
- Avoid ranking sites using incomplete or unverified inputs.
- Explain the evidence and limitations behind every assessment.
- Avoid presenting a prototype assessment as a certified landing-safety decision.

No final landing-site ranking is currently established.

## 8. Frontend and Backend Integration

The frontend must consume validated backend and processed-data outputs.

Responsibilities include:

- Candidate-site selection.
- Mission date/time scenario input.
- Lunar map visualization.
- Astronomy result presentation.
- Terrain comparison.
- Illumination visualization.
- Assessment explanations and data provenance.

Scientific calculations must not be replaced with hardcoded
placeholder values in the user interface.

Missing or unavailable results must be clearly labelled.

## 9. Implementation Status

| Module | Current status |
|---|---|
| Mission scenario validation | Implemented and tested |
| JPL Horizons parser | Implemented and tested |
| Horizons backend API | Implemented and live-tested |
| Multi-site astronomy comparison | Implemented and tested |
| NASA LOLA data acquisition | Five products downloaded |
| LOLA terrain analyzer | Implemented and executed |
| Terrain JSON output | Generated |
| Terrain validation tests | 6 tests passing |
| NASA lunar imagery map | Implemented |
| South-pole illumination map layer | Integrated for visualization; further validation required |
| Terrain hazard and horizon analysis | Pending |
| Quantitative illumination forecasting | Pending |
| Assessment engine | Pending |
| Full frontend integration | Pending |
| End-to-end mission validation | Pending |

## 10. Scientific Integrity and Provenance

Every scientific input must identify, wherever available:

- Original source and source URL.
- Dataset and product name.
- Units.
- Spatial resolution.
- Temporal coverage.
- Coordinate reference system.
- Processing assumptions.
- Uncertainty and data-quality limitations.

NASA/JPL source data, derived calculations, historical datasets,
and provisional project inputs must be explicitly distinguished.

No simulated, placeholder, interpolated, or unverified value may be
presented as a directly measured scientific result.

The system is a research and mission-planning prototype.
It is not a certified lunar landing safety system.
