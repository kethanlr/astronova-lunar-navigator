
import { useEffect, useRef, useState } from 'react';

import proj4 from 'proj4';
import { register } from 'ol/proj/proj4.js';
import { get, transform } from 'ol/proj.js';

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';

import Feature from 'ol/Feature.js';
import Point from 'ol/geom/Point.js';
import VectorSource from 'ol/source/Vector.js';
import VectorLayer from 'ol/layer/Vector.js';
import Select from 'ol/interaction/Select.js';
import { singleClick } from 'ol/events/condition.js';

import {
  Style,
  Circle as CircleStyle,
  Fill,
  Stroke,
  Text,
} from 'ol/style.js';

import 'ol/ol.css';
import './SouthPoleMap.css';

// ---------------------------------------------
// 1. REGISTER LUNAR PROJECTIONS
// ---------------------------------------------

proj4.defs(
  'ESRI:104903',
  '+proj=longlat +R=1737400 +no_defs'
);

proj4.defs(
  'IAU2000:30166',
  '+proj=stere +lat_0=-90 +lon_0=0 ' +
    '+k=1 +x_0=0 +y_0=0 ' +
    '+R=1737400 +units=m +no_defs'
);

register(proj4);

const moonProjection = get('ESRI:104903');
const southPoleProjection = get('IAU2000:30166');

southPoleProjection.setExtent([
  -1095930,
  -1095930,
  1095930,
  1095930,
]);

moonProjection.setExtent([
  -180,
  -90,
  180,
  90,
]);

// ---------------------------------------------
// 2. GLOBAL MOON IMAGERY TILE GRID
// ---------------------------------------------

const globalResolutions = Array.from(
  { length: 9 },
  (_, z) => 360 / (512 * Math.pow(2, z))
);

const globalMatrixIds = Array.from(
  { length: 9 },
  (_, z) => String(z)
);

const globalMatrixSizes = Array.from(
  { length: 9 },
  (_, z) => [
    2 * Math.pow(2, z),
    Math.pow(2, z),
  ]
);

// ---------------------------------------------
// 3. NASA SOUTH-POLE ILLUMINATION TILE GRID
// ---------------------------------------------

const illuminationScaleDenominators = [
  3.0578404017857101e7,
  1.5289202008928550e7,
  7.6446010044642752e6,
  3.8223005022321376e6,
  1.9111502511160688e6,
  9.5557512555803440e5,
];

const illuminationResolutions =
  illuminationScaleDenominators.map(
    (scale) => scale * 0.00028
  );

const illuminationMatrixIds = Array.from(
  { length: 6 },
  (_, z) => String(z)
);

const illuminationMatrixSizes = Array.from(
  { length: 6 },
  (_, z) => [
    2 * Math.pow(2, z),
    Math.pow(2, z),
  ]
);

const illuminationTileGrid = new WMTSTileGrid({
  origin: [-1095930, 1095930],
  resolutions: illuminationResolutions,
  matrixIds: illuminationMatrixIds,
  sizes: illuminationMatrixSizes,
});

// ---------------------------------------------
// 4. CANDIDATE LANDING SITES
// ---------------------------------------------

const landingSites = [
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

// ---------------------------------------------
// 5. SOUTH POLE EXPLORER COMPONENT
// ---------------------------------------------

export default function SouthPoleMap() {
  const mapElement = useRef(null);
  const [selectedSite, setSelectedSite] = useState(null);

  useEffect(() => {
    if (!mapElement.current) return;

    // -----------------------------------------
    // BASE LAYER: NASA GLOBAL LUNAR IMAGERY
    // -----------------------------------------

    const globalTileGrid = new WMTSTileGrid({
      origin: [-180, 90],
      resolutions: globalResolutions,
      matrixIds: globalMatrixIds,
      sizes: globalMatrixSizes,
    });

    const lunarLayer = new TileLayer({
      source: new WMTS({
        url:
          'https://trek.nasa.gov/tiles/Moon/EQ/' +
          'LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0//' +
          'default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg',

        layer: 'LRO_WAC_Mosaic_Global_303ppd_v02',
        matrixSet: 'default028mm',
        format: 'image/jpeg',
        projection: moonProjection,
        tileGrid: globalTileGrid,
        style: 'default',
        requestEncoding: 'REST',
        wrapX: false,
      }),
    });

    // -----------------------------------------
    // OVERLAY: NASA SOUTH-POLE ILLUMINATION
    // -----------------------------------------

    const illuminationLayer = new TileLayer({
      source: new WMTS({
        url:
          'https://trek.nasa.gov/tiles/Moon/SP/' +
          'WAC_POLE_ILL_PCT_SOUTH_100M/1.0.0//' +
          'default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.png',

        layer: 'WAC_POLE_ILL_PCT_SOUTH_100M',
        matrixSet: 'default028mm',
        format: 'image/png',
        projection: southPoleProjection,
        tileGrid: illuminationTileGrid,
        style: 'default',
        requestEncoding: 'REST',
        wrapX: false,
      }),

      opacity: 0.65,
    });

    // -----------------------------------------
    // LANDING SITE MARKERS
    // Transform lunar coordinates into the
    // south-polar map coordinate system.
    // -----------------------------------------

    const siteFeatures = landingSites.map((site) => {
      const polarCoordinates = transform(
        [site.longitude, site.latitude],
        moonProjection,
        southPoleProjection
      );

      const feature = new Feature({
        geometry: new Point(polarCoordinates),
        name: site.name,
        siteData: site,
      });

      feature.setStyle(
        new Style({
          image: new CircleStyle({
            radius: 7,
            fill: new Fill({
              color: '#00e5ff',
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 2,
            }),
          }),

          text: new Text({
            text: site.name,
            offsetY: -18,
            font: 'bold 12px sans-serif',
            fill: new Fill({
              color: '#ffffff',
            }),
            stroke: new Stroke({
              color: '#07111f',
              width: 3,
            }),
          }),
        })
      );

      return feature;
    });

    const landingSiteLayer = new VectorLayer({
      source: new VectorSource({
        features: siteFeatures,
      }),
    });

    landingSiteLayer.setZIndex(10);

    // -----------------------------------------
    // CREATE MAP
    // -----------------------------------------

    const mapCenter = transform(
      [130, -88.95],
      moonProjection,
      southPoleProjection
    );

    const map = new Map({
      target: mapElement.current,

      layers: [
        lunarLayer,
        illuminationLayer,
        landingSiteLayer,
      ],

      view: new View({
        projection: southPoleProjection,
        center: mapCenter,
        resolutions: illuminationResolutions,
        zoom: 5,
        minZoom: 0,
        maxZoom: 5,
        constrainResolution: false,
        smoothResolutionConstraint: false,
      }),
    });

    // -----------------------------------------
    // CLICKABLE LANDING SITE SELECTION
    // -----------------------------------------

    const selectInteraction = new Select({
      condition: singleClick,
      layers: [landingSiteLayer],

      style: (feature) =>
        new Style({
          image: new CircleStyle({
            radius: 11,
            fill: new Fill({
              color: '#ffbd4a',
            }),
            stroke: new Stroke({
              color: '#ffffff',
              width: 3,
            }),
          }),

          text: new Text({
            text: feature.get('name'),
            font: 'bold 12px sans-serif',
            offsetY: -23,
            fill: new Fill({
              color: '#ffffff',
            }),
            stroke: new Stroke({
              color: '#07111f',
              width: 3,
            }),
          }),
        }),
    });

    map.addInteraction(selectInteraction);

    selectInteraction.on('select', (event) => {
      const feature = event.selected[0];

      if (feature) {
        setSelectedSite(feature.get('siteData'));
      } else {
        setSelectedSite(null);
      }
    });

    // -----------------------------------------
    // CLEANUP
    // -----------------------------------------

    return () => {
      map.setTarget(undefined);
      selectInteraction.dispose();
    };
  }, []);

  // -------------------------------------------
  // COMPONENT UI
  // -------------------------------------------

  return (
    <div className="south-pole-wrapper">

      <div className="south-pole-heading">
        <span>🌕 SOUTH POLE SURFACE EXPLORER</span>

        <span className="polar-label">
          NASA LRO · ILLUMINATION OVERLAY
        </span>
      </div>

      <div ref={mapElement} className="south-pole-map" />

      {selectedSite && (
        <div className="selected-site-panel">

          <div className="selected-site-title">
            <span>📍 SELECTED LANDING SITE</span>

            <button
              onClick={() => setSelectedSite(null)}
              className="close-site-button"
            >
              ✕
            </button>
          </div>

          <h3>{selectedSite.name}</h3>

          <p>
            Classification: {selectedSite.classification}
          </p>

          <p>
            Longitude: {selectedSite.longitude.toFixed(4)}°
          </p>

          <p>
            Latitude: {selectedSite.latitude.toFixed(4)}°
          </p>

        </div>
      )}

      <div className="south-pole-footer">
        <span>
          Source: NASA Moon Trek · LROC WAC
        </span>

        <span>
          Click a cyan marker to inspect its site
        </span>
      </div>

      <div className="illumination-note">
        <span>☀️ NASA percentage-illumination dataset</span>
        <span>
          Historical illumination data · Not a live sunlight forecast
        </span>
      </div>

    </div>
  );
}
