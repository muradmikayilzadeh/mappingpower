import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import styles from './style.module.css';
import pinDirectional from './pin-directional.png';
import pin from './pin.png';

const fetchSettingsData = async () => {
  try {
    const docRef = doc(db, 'settings', 'settingsData');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.error('No such document!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching settings data:', error);
    return null;
  }
};

export default function Map({
  selectedMaps,
  mapStyle,
  selectedNarrative,
  activeChapter,
  onUpdateOpacity,
  onFlyToLocation,
  onMapViewChange,
  isMapLoading,
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  const [location, setLocation] = useState({ lng: -122.4194, lat: 37.7749 });
  const [zoom, setZoom] = useState(12);

  const [liveCenter, setLiveCenter] = useState({ lng: -122.4194, lat: 37.7749 });
  const [liveZoom, setLiveZoom] = useState(12);

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [copyStatus, setCopyStatus] = useState('');

  // Keep a ref of what we think is on the map (ids)
  const mountedIdsRef = useRef(new Set());

  maptilersdk.config.apiKey = 'llr35dKpffrGaP9ECLL8';

  const updateOpacity = (mapId, opacity) => {
    if (!map.current) return;

    const rasterLayerId = `overlay-${mapId}`;
    if (map.current.getLayer(rasterLayerId)) {
      map.current.setPaintProperty(rasterLayerId, 'raster-opacity', opacity);
    }

    const vectorLayerId = `vector-layer-${mapId}`;
    if (map.current.getLayer(vectorLayerId)) {
      map.current.setPaintProperty(vectorLayerId, 'icon-opacity', opacity);
    }
  };

  useEffect(() => {
    if (onUpdateOpacity) onUpdateOpacity(() => updateOpacity);
  }, [onUpdateOpacity]);

  /**
   * Programmatically adjust the main map view.
   *
   * Usage patterns:
   * - flyToLocation([lng, lat], zoomLevel:number) -> simple flyTo
   * - flyToLocation([lng, lat], { bounds: [[swLng, swLat], [neLng, neLat]], padding }) -> fit map to bounds
   */
  const flyToLocation = (target, zoomOrOptions) => {
    if (!map.current || !target) return;

    // Bounds-based zoom (preferred for "zoom to map" behavior)
    if (zoomOrOptions && typeof zoomOrOptions === 'object' && zoomOrOptions.bounds) {
      const { bounds, padding } = zoomOrOptions;

      try {
        map.current.fitBounds(bounds, {
          // Give extra padding on the left to visually center the map
          // to the right of the screen where the left sidebar sits.
          padding:
            padding || {
              top: 40,
              bottom: 40,
              left: 260,
              right: 40,
            },
          essential: true,
        });
        return;
      } catch (e) {
        console.error('Error fitting bounds, falling back to flyTo:', e);
      }
    }

    // Simple center/zoom behavior
    if (Array.isArray(target) && target.length === 2) {
      const [lng, lat] = target;
      const zoomLevel =
        typeof zoomOrOptions === 'number' && !Number.isNaN(zoomOrOptions)
          ? zoomOrOptions
          : 14;

      map.current.flyTo({ center: [lng, lat], zoom: zoomLevel, essential: true });
    }
  };
  useEffect(() => {
    if (onFlyToLocation) onFlyToLocation(() => flyToLocation);
  }, [onFlyToLocation]);

  useEffect(() => {
    const readAuth = () => {
      setIsAuthorized(localStorage.getItem('isAuthorized') === 'true');
    };
    readAuth();
    const onStorage = (e) => {
      if (e.key === 'isAuthorized') readAuth();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const fetchInitialSettings = async () => {
      const settings = await fetchSettingsData();
      if (settings) {
        const { geolocation, mapZoom } = settings;
        if (geolocation && geolocation.length === 2) {
          setLocation({ lng: geolocation[1], lat: geolocation[0] });
          setLiveCenter({ lng: geolocation[1], lat: geolocation[0] });
        }
        if (mapZoom !== undefined) {
          setZoom(mapZoom);
          setLiveZoom(mapZoom);
        }
      }
    };
    fetchInitialSettings();
  }, []);

  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [location.lng, location.lat],
      zoom,
    });

    const updateLiveState = () => {
      const c = map.current.getCenter();
      const newCenter = { lng: Number(c.lng.toFixed(6)), lat: Number(c.lat.toFixed(6)) };
      const newZoom = Number(map.current.getZoom().toFixed(2));
      setLiveCenter(newCenter);
      setLiveZoom(newZoom);
      // Notify parent component of view changes
      if (onMapViewChange) {
        onMapViewChange(newCenter, newZoom);
      }
    };

    map.current.on('load', () => {
      if (!map.current.hasImage('arrow-icon')) {
        const img = new Image();
        img.src = pin;
        img.onload = () => {
          if (!map.current.hasImage('arrow-icon')) {
            map.current.addImage('arrow-icon', img);
          }
        };
      }
      if (!map.current.hasImage('arrow-icon-directional')) {
        const imgDirectional = new Image();
        imgDirectional.src = pinDirectional;
        imgDirectional.onload = () => {
          if (!map.current.hasImage('arrow-icon-directional')) {
            map.current.addImage('arrow-icon-directional', imgDirectional);
          }
        };
      }

      if (selectedMaps.length) {
        renderMaps(selectedMaps);
      }
      updateLiveState();
      // Also update on initial load
      if (onMapViewChange) {
        const c = map.current.getCenter();
        onMapViewChange(
          { lng: Number(c.lng.toFixed(6)), lat: Number(c.lat.toFixed(6)) },
          Number(map.current.getZoom().toFixed(2))
        );
      }
    });

    map.current.on('moveend', updateLiveState);
    map.current.on('zoomend', updateLiveState);

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
        mountedIdsRef.current = new Set();
      }
    };
  }, [mapContainer, mapStyle, location, zoom]);

  // Only update/add/remove as needed (no full re-add)
  useEffect(() => {
    if (!map.current) return;
    if (map.current.isStyleLoaded()) {
      renderMaps(selectedMaps);
    } else {
      const onStyleLoad = () => {
        renderMaps(selectedMaps);
        map.current.off('style.load', onStyleLoad);
      };
      map.current.on('style.load', onStyleLoad);
    }
  }, [selectedMaps]);

  useEffect(() => {
    if (!map.current || !selectedNarrative || !activeChapter) return;
    const chapter = selectedNarrative.chapters?.[activeChapter];
    if (!chapter) return;

    const { center, zoom: chapterZoom } = chapter;

    if (Array.isArray(center) && center.length === 2 && typeof chapterZoom === 'number') {
      map.current.flyTo({ center, zoom: chapterZoom, essential: true });
    } else if (Array.isArray(center) && center.length === 2) {
      map.current.flyTo({ center, essential: true });
    } else if (typeof chapterZoom === 'number') {
      map.current.flyTo({ zoom: chapterZoom, essential: true });
    }
  }, [activeChapter, selectedNarrative]);

  const renderMaps = (maps) => {
    if (!map.current) return;

    const desiredIds = new Set((maps || []).map((m) => m.id));
    const style = map.current.getStyle();
    const existingSources = style?.sources || {};

    // Remove deselected
    Object.keys(existingSources).forEach((sourceId) => {
      const isAerial = sourceId.startsWith('aerial-source-');
      const isVector = sourceId.startsWith('vector-source-');
      if (!isAerial && !isVector) return;

      const rawId = isAerial
        ? sourceId.substring('aerial-source-'.length)
        : sourceId.substring('vector-source-'.length);

      if (!desiredIds.has(rawId)) {
        const layerId = isAerial ? `overlay-${rawId}` : `vector-layer-${rawId}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
        mountedIdsRef.current.delete(rawId);
      }
    });

    // Add or update
    maps.forEach((mapDetails) => {
      const { id, opacity = 1, image_bounds_coords, raster_image, vector_points } = mapDetails;

      const isRaster = image_bounds_coords && Array.isArray(image_bounds_coords);
      const isVector = vector_points && Array.isArray(vector_points);

      if (isRaster) {
        const sourceId = `aerial-source-${id}`;
        const layerId = `overlay-${id}`;

        if (!map.current.getSource(sourceId)) {
          // Add new raster source/layer
          const coordinates = image_bounds_coords.map((coord) => coord.split(',').map(Number));
          map.current.addSource(sourceId, {
            type: 'image',
            url: raster_image,
            coordinates,
          });
          map.current.addLayer({
            id: layerId,
            source: sourceId,
            type: 'raster',
            paint: { 'raster-opacity': opacity },
          });
          mountedIdsRef.current.add(id);
        } else {
          // Update opacity only (no remove/re-add)
          if (map.current.getLayer(layerId)) {
            map.current.setPaintProperty(layerId, 'raster-opacity', opacity);
          }
        }
      }

      if (isVector) {
        const sourceId = `vector-source-${id}`;
        const layerId = `vector-layer-${id}`;

        if (!map.current.getSource(sourceId)) {
          const geojson = {
            type: 'FeatureCollection',
            features: vector_points.map((point) => ({
              type: 'Feature',
              geometry: {
                type: 'Point',
                coordinates: point.coordinates.split(',').map(Number),
              },
              properties: {
                bearing: Number(point.bearing),
                image: point.image,
                caption: point.description,
                is_directional: point.is_directional,
              },
            })),
          };

          map.current.addSource(sourceId, { type: 'geojson', data: geojson });
          map.current.addLayer({
            id: layerId,
            type: 'symbol',
            source: sourceId,
            layout: {
              'icon-image': [
                'case',
                ['==', ['get', 'is_directional'], true],
                'arrow-icon-directional',
                'arrow-icon',
              ],
              'icon-size': 0.3,
              'icon-rotate': ['get', 'bearing'],
              'icon-allow-overlap': true,
              'icon-anchor': 'center',
            },
            paint: { 'icon-opacity': opacity },
          });

          // Attach popup once per layer
          map.current.on('click', layerId, (e) => {
            const { image, caption } = e.features[0].properties;
            const coords = e.features[0].geometry.coordinates;
            new maptilersdk.Popup({ maxWidth: '400px', closeButton: true })
              .setLngLat(coords)
              .setHTML(`
                <div style="text-align:center; width:100%;">
                  <img
                    src="${image}"
                    alt="Marker"
                    style="width:100%; height:auto; border-radius:5px;"
                  />
                  <p style="margin-top:10px; font-size:14px; color:#333;">${caption}</p>
                </div>
              `)
              .addTo(map.current);
          });

          mountedIdsRef.current.add(id);
        } else {
          // Update opacity only
          if (map.current.getLayer(layerId)) {
            map.current.setPaintProperty(layerId, 'icon-opacity', opacity);
          }
        }
      }
    });
  };

  const jsonOverlay = JSON.stringify(
    {
      currentMapFocusLocation: [
        Number(liveCenter.lng.toFixed(6)),
        Number(liveCenter.lat.toFixed(6)),
      ],
      currentZoomLevel: Number(liveZoom.toFixed(2)),
      maps: (selectedMaps || []).map((m) => ({
        id: m.id,
        opacityVal: typeof m.opacity === 'number' ? Number(m.opacity.toFixed(2)) : 1,
      })),
    },
    null,
    2
  );

  const handleUnauthorize = () => {
    localStorage.removeItem('isAuthorized');
    window.location.reload();
  };

  const handleCopyJson = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(jsonOverlay);
      } else {
        const ta = document.createElement('textarea');
        ta.value = jsonOverlay;
        ta.style.position = 'fixed';
        ta.style.top = '-1000px';
        ta.style.left = '-1000px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }
      setCopyStatus('Copied!');
      setTimeout(() => setCopyStatus(''), 1500);
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyStatus('Copy failed');
      setTimeout(() => setCopyStatus(''), 1500);
    }
  };

  return (
    <div className={styles.mapWrap} style={{ position: 'relative' }}>
      {isAuthorized && (
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            maxWidth: 380,
            zIndex: 10,
            background: 'rgba(255,255,255,0.92)',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 8,
            padding: '10px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontFamily:
              'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontSize: 12,
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'auto',
            maxHeight: 260,
            cursor: 'text',
            userSelect: 'text',
          }}
          title="Click and copy"
        >
          {jsonOverlay}

          <div
            style={{
              marginTop: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <button
              type="button"
              onClick={handleCopyJson}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                textDecoration: 'underline',
                color: '#1d4ed8',
                cursor: 'pointer',
                fontSize: 12,
              }}
              aria-label="Copy JSON to clipboard"
              title="Copy JSON to clipboard"
            >
              copy json
            </button>

            <button
              type="button"
              onClick={handleUnauthorize}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                textDecoration: 'underline',
                color: '#b91c1c',
                cursor: 'pointer',
                fontSize: 12,
              }}
              aria-label="Unauthorize this session"
              title="Remove authorization flag and refresh"
            >
              unauthorize
            </button>

            {copyStatus && (
              <span style={{ fontSize: 12, color: '#16a34a' }}>{copyStatus}</span>
            )}
          </div>
        </div>
      )}

      <div ref={mapContainer} className={styles.map} />
      
      {/* Loading Spinner Overlay - only for maps/plans selection, not narratives */}
      {isMapLoading && !selectedNarrative && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            <div className={styles.loadingText}>Loading maps...</div>
          </div>
        </div>
      )}
    </div>
  );
}
