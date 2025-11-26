import React, { useRef, useEffect } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import styles from './style.module.css';

maptilersdk.config.apiKey = 'llr35dKpffrGaP9ECLL8';

export default function MiniMap({ center, mapStyle, fixedZoom = 10 }) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize the minimap with fixed zoom level
    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: mapStyle || maptilersdk.MapStyle.BASIC.LIGHT,
      center: center ? [center.lng, center.lat] : [-122.4194, 37.7749],
      zoom: fixedZoom, // Always use fixed zoom for overview
      interactive: false, // Make it non-interactive (just for viewing)
      attributionControl: false, // Hide attribution for cleaner look
      navigationControl: false, // Hide navigation controls
    });

    // Remove any existing controls after map loads
    map.current.on('load', () => {
      // Hide all controls and attribution
      const container = map.current.getContainer();
      const controls = container.querySelectorAll('.maplibregl-ctrl');
      controls.forEach(ctrl => {
        ctrl.style.display = 'none';
      });
      const attribution = container.querySelector('.maplibregl-ctrl-attrib');
      if (attribution) {
        attribution.style.display = 'none';
      }
      const logo = container.querySelector('.maplibregl-ctrl-logo');
      if (logo) {
        logo.style.display = 'none';
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapStyle, fixedZoom]);

  // Update minimap center when it changes (but keep zoom fixed)
  useEffect(() => {
    if (!map.current || !center) return;
    
    if (map.current.isStyleLoaded()) {
      map.current.setCenter([center.lng, center.lat]);
      // Always maintain fixed zoom level
      map.current.setZoom(fixedZoom);
    } else {
      map.current.once('style.load', () => {
        map.current.setCenter([center.lng, center.lat]);
        map.current.setZoom(fixedZoom);
      });
    }
  }, [center, fixedZoom]);

  return <div ref={mapContainer} className={styles.miniMap} />;
}

