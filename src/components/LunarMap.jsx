
import { useEffect, useRef } from 'react';

import Map from 'ol/Map.js';
import View from 'ol/View.js';
import TileLayer from 'ol/layer/Tile.js';
import WMTS from 'ol/source/WMTS.js';
import WMTSTileGrid from 'ol/tilegrid/WMTS.js';
import Projection from 'ol/proj/Projection.js';

import 'ol/ol.css';
import './LunarMap.css';

const moonProjection = new Projection({
  code: 'ESRI:104903',
  units: 'degrees',
  extent: [-180, -90, 180, 90],
});

const resolutions = Array.from(
  { length: 9 },
  (_, z) => 360 / (512 * Math.pow(2, z))
);

const matrixIds = Array.from(
  { length: 9 },
  (_, z) => String(z)
);

const matrixSizes = Array.from(
  { length: 9 },
  (_, z) => [
    2 * Math.pow(2, z),
    Math.pow(2, z),
  ]
);

export default function LunarMap() {
  const mapElement = useRef(null);

  useEffect(() => {
    if (!mapElement.current) return;

    const tileGrid = new WMTSTileGrid({
      origin: [-180, 90],
      resolutions,
      matrixIds,
      sizes: matrixSizes,
    });

    const moonLayer = new TileLayer({
      source: new WMTS({
        url:
          'https://trek.nasa.gov/tiles/Moon/EQ/' +
          'LRO_WAC_Mosaic_Global_303ppd_v02/1.0.0//' +
          'default/default028mm/{TileMatrix}/{TileRow}/{TileCol}.jpg',

        layer: 'LRO_WAC_Mosaic_Global_303ppd_v02',
        matrixSet: 'default028mm',
        format: 'image/jpeg',
        projection: moonProjection,
        tileGrid,
        style: 'default',
        requestEncoding: 'REST',
        wrapX: false,
      }),
    });

    const map = new Map({
      target: mapElement.current,
      layers: [moonLayer],
      view: new View({
  projection: moonProjection,
  center: [0, 0],
  zoom: 1,
  minZoom: 0,
  maxZoom: 8,
  constrainResolution: false,
  smoothResolutionConstraint: false,
}),
    });

    return () => map.setTarget(undefined);
  }, []);

  return (
    <div className="lunar-map-wrapper">
      <div className="lunar-map-heading">
        <span>🌕 NASA LRO GLOBAL LUNAR IMAGERY</span>
        <span className="map-data-label">MOON 2000 · WMTS</span>
      </div>

      <div ref={mapElement} className="lunar-map" />

      <div className="lunar-map-footer">
        <span>Source: NASA Moon Trek · LROC WAC</span>
        <span>Drag to explore · Scroll to zoom</span>
      </div>
    </div>
  );
}
