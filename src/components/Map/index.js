import React, { useRef, useEffect, useState } from 'react';
import * as maptilersdk from '@maptiler/sdk';
import "@maptiler/sdk/dist/maptiler-sdk.css";
import { doc, getDoc } from "firebase/firestore"; // Import Firestore functions
import { db } from '../../firebase'; // Import your Firebase configuration
import styles from './style.module.css';
import pinDirectional from './pin-directional.png';
import pin from './pin.png';

// Helper function to fetch map data from the database
const fetchMapData = async (sourceMapId) => {
  try {
    const docRef = doc(db, "maps", sourceMapId); // Access the document in the "maps" collection
    const docSnap = await getDoc(docRef); // Fetch the document
    
    if (docSnap.exists()) {
      return docSnap.data(); // Return the map data
    } else {
      console.error("No such map document found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching map data:", error);
    return null;
  }
};

const fetchSettingsData = async () => {
  try {
    const docRef = doc(db, "settings", "settingsData");
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    } else {
      console.error("No such document!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching settings data:", error);
    return null;
  }
};

export default function Map({ selectedMaps, mapStyle, selectedNarrative, activeChapter, onUpdateOpacity }) { 
  const mapContainer = useRef(null);
  const map = useRef(null);
 
  const [sanFrancisco, setSanFrancisco] = useState({ lng: -122.6928532463798, lat: 45.51385188841452 });
  const [zoom, setZoom] = useState(11);
  maptilersdk.config.apiKey = 'llr35dKpffrGaP9ECLL8';

  const updateMaps = (maps) => {
    const existingSources = map.current.getStyle().sources;

    Object.keys(existingSources).forEach((sourceId) => {
      if (
        (sourceId.startsWith('aerial-source-') && !maps.some(map => `aerial-source-${map.id}` === sourceId)) ||
        (sourceId.startsWith('vector-source-') && !maps.some(map => `vector-source-${map.id}` === sourceId))
      ) {
        const layerId = sourceId.startsWith('aerial-source-')
          ? `overlay-${sourceId.split('aerial-source-')[1]}`
          : `vector-layer-${sourceId.split('vector-source-')[1]}`;
        map.current.removeLayer(layerId);
        map.current.removeSource(sourceId);
      }
    });

    maps.forEach((mapDetails) => {
      console.log(mapDetails);

      const { id, image_bounds_coords, raster_image, opacity = 1, vector_points } = mapDetails;

  
      if (mapDetails.image_bounds_coords && Array.isArray(mapDetails.image_bounds_coords)) {
        console.log(mapDetails);

        // generate alphanumeric id for each map
        mapDetails.id = Math.random().toString(36).substring(7);
        const coordinates = mapDetails.image_bounds_coords.map(coord => coord.split(',').map(Number));
        const sourceId = `aerial-source-${mapDetails.id}`;
        const layerId = `overlay-${mapDetails.id}`;

        if (map.current.getSource(sourceId)) {
          map.current.removeLayer(layerId);
          map.current.removeSource(sourceId);

          // if (map.current.getLayer(layerId)) {
          // }
        }

        map.current.addSource(sourceId, {
          type: 'image',
          url: mapDetails.raster_image,
          coordinates: coordinates
        });

        map.current.addLayer({
          id: layerId,
          source: sourceId,
          type: 'raster',
        });


      } else if (mapDetails.vector_points && Array.isArray(mapDetails.vector_points)) {
        const sourceId = `vector-source-${mapDetails.id}`;
        const layerId = `vector-layer-${mapDetails.id}`;

        const geojson = {
          type: 'FeatureCollection',
          features: mapDetails.vector_points.map(point => ({
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

        if (map.current.getSource(sourceId)) {
          map.current.removeLayer(layerId);
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
              'arrow-icon'
            ],
            'icon-size': 0.3,
            'icon-rotate': ['get', 'bearing'],
            'icon-allow-overlap': true,
            'icon-anchor': 'center',
          },
        });


        // Handle marker click
        map.current.on('click', layerId, (e) => {
          const { image, caption } = e.features[0].properties;
          const coordinates = e.features[0].geometry.coordinates;

          // Create a popup
          new maptilersdk.Popup({ maxWidth: "400px", closeButton: true })
            .setLngLat(coordinates)
            .setHTML(`
              <div style="text-align: center; width: 100%; box-sizing: border-box; position: relative;">
                <img src="${image}" alt="Marker Image" style="width: 100%; height: auto; border-radius: 5px;" />
                <p style="margin-top: 10px; font-size: 14px; color: #333;">${caption}</p>
              </div>
            `)
            .addTo(map.current);

          // Add global CSS for the close button
          const style = document.createElement('style');
          style.innerHTML = `
            .maplibregl-popup-close-button {
              width: auto !important;
            }
          `;
          document.head.appendChild(style);
        });
      } else {
        console.warn(`Skipping map with id ${mapDetails.id} due to missing or invalid data.`);
      }
    });
  };

  const updateOpacity = (mapId, opacity) => {
    if (!map.current) return;
  
    // Handle raster layer opacity
    const sourceId = `aerial-source-${mapId}`;
    const layerId = `overlay-${mapId}`;
  
    if (map.current.getSource(sourceId) && map.current.getLayer(layerId)) {
      map.current.setPaintProperty(layerId, 'raster-opacity', opacity);
    }
  
    // Handle vector layer opacity
    const vectorSourceId = `vector-source-${mapId}`;
    const vectorLayerId = `vector-layer-${mapId}`;
  
    if (map.current.getSource(vectorSourceId) && map.current.getLayer(vectorLayerId)) {
      map.current.setPaintProperty(vectorLayerId, 'icon-opacity', opacity);
    }
  };
  
  useEffect(() => {
    if (selectedMaps.length > 0) {
      selectedMaps.forEach(({ id, opacity }) => updateOpacity(id, opacity || 1));
    }
  }, [selectedMaps]);
  
  
  // Function to handle updating the map based on the selected narrative and chapter
  const updateMapWithNarrative = async (narrative, chapter) => {
    if (!map.current || !narrative || !chapter) return;

    const coordinates = chapter.center;
    map.current.flyTo({ center: coordinates, zoom: chapter.zoom });

    // Fetch the map data using source_map_id
    const mapData = await fetchMapData(chapter.source_map_id);

    if (mapData) {
      // Assuming the mapData includes image_bounds_coords or vector_points
      if (mapData.image_bounds_coords) {
        const coordinates = mapData.image_bounds_coords.map(coord => coord.split(',').map(Number));
        const sourceId = `aerial-source-${mapData.id}`;
        const layerId = `overlay-${mapData.id}`;

        // Remove the old source and layer if they exist
        if (map.current.getSource(sourceId)) {
          map.current.removeLayer(layerId);
          map.current.removeSource(sourceId);
        }

        // Add the new source and layer
        map.current.addSource(sourceId, {
          type: 'image',
          url: mapData.raster_image,
          coordinates: coordinates,
        });

        map.current.addLayer({
          id: layerId,
          source: sourceId,
          type: 'raster',
          paint: {
            'raster-opacity': mapData.opacity !== undefined ? mapData.opacity : 1,
          },
        });
      } else if (mapData.vector_points) {
        const geojson = {
          type: 'FeatureCollection',
          features: mapData.vector_points.map(point => ({
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

        const sourceId = `vector-source-${mapData.id}`;
        const layerId = `vector-layer-${mapData.id}`;

        // Remove the old vector layer and source if they exist
        if (map.current.getSource(sourceId)) {
          map.current.removeLayer(layerId);
          map.current.removeSource(sourceId);
        }

        // Add the new vector source and layer
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
        });

        // Handle marker clicks
        map.current.on('click', layerId, (e) => {
          const { image, caption } = e.features[0].properties;
          const coordinates = e.features[0].geometry.coordinates;

          new maptilersdk.Popup()
            .setLngLat(coordinates)
            .setHTML(`
              <div style="text-align: center;">
                <img src="${image}" alt="Marker Image" style="width: 100px; height: auto;" />
                <p>${caption}</p>
              </div>
            `)
            .addTo(map.current);
        });
      }
    }
  };

  useEffect(() => {
    const fetchInitialSettings = async () => {
      const settings = await fetchSettingsData();
      if (settings) {
        const { geolocation, mapZoom } = settings;
        if (geolocation && geolocation.length === 2 && mapZoom !== undefined) {
          setSanFrancisco({ lng: geolocation[1], lat: geolocation[0] });
          setZoom(mapZoom);
        }
      }
    };

    fetchInitialSettings();
  }, []);

  useEffect(() => {
    if (selectedNarrative && activeChapter && selectedNarrative.chapters[activeChapter]) {
      const chapter = selectedNarrative.chapters[activeChapter];
      updateMapWithNarrative(selectedNarrative, chapter); // Fetch and update map with chapter data
    }
  }, [activeChapter, selectedNarrative]); // Update map whenever activeChapter or selectedNarrative changes

  useEffect(() => {
    if (onUpdateOpacity) {
      onUpdateOpacity(updateOpacity); // Pass the updateOpacity function to the parent
    }
  }, [onUpdateOpacity]);
  

  useEffect(() => {
    if (!mapContainer.current) return;

    const initializeMap = () => {
      map.current = new maptilersdk.Map({
        container: mapContainer.current,
        style: mapStyle, 
        center: [sanFrancisco.lng, sanFrancisco.lat],
        zoom: zoom
      });

      map.current.on('load', () => {
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

        if (selectedMaps.length > 0) {
          updateMaps(selectedMaps);
          updateOpacity(map.id, map.opacity);
        }
      });
    };

    initializeMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [sanFrancisco.lng, sanFrancisco.lat, zoom, mapStyle]); 

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      updateMaps(selectedMaps);
    } else {
      const onStyleLoad = () => {
        updateMaps(selectedMaps);
        map.current.off('style.load', onStyleLoad);
      };
      map.current.on('style.load', onStyleLoad);
    }
  }, [selectedMaps]);

  return (
    <div className={styles.mapWrap}>
      <div ref={mapContainer} className={styles.map} />
    </div>
  );
}
