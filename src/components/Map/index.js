
import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import '@maptiler/sdk/dist/maptiler-sdk.css';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import styles from './style.module.css';
import pinDirectional from './pin-directional.png';
import pin from './pin.png';

const fetchMapData = async (sourceMapId) => {
  try {
    const docRef = doc(db, 'maps', sourceMapId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.error('No such map document found!');
      return null;
    }
  } catch (error) {
    console.error('Error fetching map data:', error);
    return null;
  }
};

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
}) {
  const mapContainer = useRef(null);
  const map = useRef(null);

  // Default location
  const [location, setLocation] = useState({ lng: -122.4194, lat: 37.7749 });
  const [zoom, setZoom] = useState(12);

  // Replace placeholder with your real MapTiler key
  maptilersdk.config.apiKey = 'llr35dKpffrGaP9ECLL8';

  // The function that updates layer opacity (called from parent)
  const updateOpacity = (mapId, opacity) => {
    if (!map.current) return;

    // Raster
    const sourceId = `aerial-source-${mapId}`;
    const layerId = `overlay-${mapId}`;
    if (map.current.getSource(sourceId) && map.current.getLayer(layerId)) {
      map.current.setPaintProperty(layerId, 'raster-opacity', opacity);
    }

    // Vector
    const vectorSourceId = `vector-source-${mapId}`;
    const vectorLayerId = `vector-layer-${mapId}`;
    if (map.current.getSource(vectorSourceId) && map.current.getLayer(vectorLayerId)) {
      map.current.setPaintProperty(vectorLayerId, 'icon-opacity', opacity);
    }
  };

  // Give this function to the parent
  useEffect(() => {
    if (onUpdateOpacity) {
      onUpdateOpacity(() => updateOpacity);
    }
  }, [onUpdateOpacity]);

  // The function used to fly the map
  const flyToLocation = ([lng, lat], zoomLevel = 14) => {
    if (map.current) {
      map.current.flyTo({
        center: [lng, lat],
        zoom: zoomLevel,
        essential: true,
      });
    }
  };

  // Provide the flyToLocation function to the parent
  useEffect(() => {
    if (onFlyToLocation) {
      onFlyToLocation(() => flyToLocation);
    }
  }, [onFlyToLocation]);

  // Fetch initial location & zoom from Firestore "settingsData"
  useEffect(() => {
    const fetchInitialSettings = async () => {
      const settings = await fetchSettingsData();
      if (settings) {
        const { geolocation, mapZoom } = settings;
        if (geolocation && geolocation.length === 2) {
          setLocation({ lng: geolocation[1], lat: geolocation[0] });
        }
        if (mapZoom !== undefined) {
          setZoom(mapZoom);
        }
      }
    };
    fetchInitialSettings();
  }, []);

  // Initialize the map
  useEffect(() => {
    if (!mapContainer.current) return;

    map.current = new maptilersdk.Map({
      container: mapContainer.current,
      style: mapStyle,
      center: [location.lng, location.lat],
      zoom,
    });

    map.current.on('load', () => {
      // Add custom images for pins
      if (!map.current.hasImage('arrow-icon')) {
        const img = new Image();
        img.src = pin;
        img.onload = () => {
          map.current.addImage('arrow-icon', img);
        };
      }
      if (!map.current.hasImage('arrow-icon-directional')) {
        const imgDirectional = new Image();
        imgDirectional.src = pinDirectional;
        imgDirectional.onload = () => {
          map.current.addImage('arrow-icon-directional', imgDirectional);
        };
      }

      if (selectedMaps.length) {
        renderMaps(selectedMaps);
      }
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapContainer, mapStyle, location, zoom]);

  // Re-render maps when selectedMaps changes
  useEffect(() => {
    if (!map.current) return;
    if (map.current.isStyleLoaded()) {
      renderMaps(selectedMaps);
    } else {
      // Wait for the style to load
      const onStyleLoad = () => {
        renderMaps(selectedMaps);
        map.current.off('style.load', onStyleLoad);
      };
      map.current.on('style.load', onStyleLoad);
    }
  }, [selectedMaps]);

  /**
   * Ensure vector (pin) layers are on top by:
   * 1) Adding all raster layers first
   * 2) Adding all vector layers second
   */
  const renderMaps = (maps) => {
    if (!map.current) return;

    // Remove any old sources/layers not in the new `maps`
    const existingSources = map.current.getStyle().sources;
    Object.keys(existingSources).forEach((sourceId) => {
      const isAerial = sourceId.startsWith('aerial-source-');
      const isVector = sourceId.startsWith('vector-source-');
      if (!isAerial && !isVector) return;

      const rawId = isAerial
        ? sourceId.replace('aerial-source-', '')
        : sourceId.replace('vector-source-', '');
      // Check if this ID is still needed
      const stillNeeded = maps.some((m) => m.id === rawId);
      if (!stillNeeded) {
        const layerId = isAerial ? `overlay-${rawId}` : `vector-layer-${rawId}`;
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        map.current.removeSource(sourceId);
      }
    });

    // Separate raster vs. vector so we can add them in order
    const rasterMaps = maps.filter(
      (m) => m.image_bounds_coords && Array.isArray(m.image_bounds_coords)
    );
    const vectorMaps = maps.filter(
      (m) => m.vector_points && Array.isArray(m.vector_points)
    );

    // 1) Add raster overlays first
    rasterMaps.forEach((mapDetails) => {
      const { id, opacity = 1, image_bounds_coords, raster_image } = mapDetails;
      const coordinates = image_bounds_coords.map((coord) =>
        coord.split(',').map(Number)
      );
      const sourceId = `aerial-source-${id}`;
      const layerId = `overlay-${id}`;

      // Remove old if present
      if (map.current.getSource(sourceId)) {
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        map.current.removeSource(sourceId);
      }

      // Add new
      map.current.addSource(sourceId, {
        type: 'image',
        url: raster_image,
        coordinates,
      });
      map.current.addLayer({
        id: layerId,
        source: sourceId,
        type: 'raster',
        paint: {
          'raster-opacity': opacity,
        },
      });
    });

    // 2) Add vector pins second => on top of raster
    vectorMaps.forEach((mapDetails) => {
      const { id, opacity = 1, vector_points } = mapDetails;
      const sourceId = `vector-source-${id}`;
      const layerId = `vector-layer-${id}`;

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

      // Remove old
      if (map.current.getSource(sourceId)) {
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
        map.current.removeSource(sourceId);
      }

      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geojson,
      });
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
        paint: {
          'icon-opacity': opacity,
        },
      });

      // Popup on click
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
    });
  };

  // If using narratives with chapters that have center/zoom
  useEffect(() => {
    if (!map.current || !selectedNarrative || !activeChapter) return;
    const chapter = selectedNarrative.chapters[activeChapter];
    if (!chapter) return;

    const { center, zoom: chapterZoom, source_map_id } = chapter;
    if (center && center.length === 2) {
      map.current.flyTo({ center, zoom: chapterZoom, essential: true });
    }

    // Optionally fetch a source map doc
    if (source_map_id) {
      (async () => {
        const mapData = await fetchMapData(source_map_id);
        if (!mapData) return;
        // Potentially add or update it in the same manner as above
      })();
    }
  }, [activeChapter, selectedNarrative]);

  return (
    <div className={styles.mapWrap}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}
