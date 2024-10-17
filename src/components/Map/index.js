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

export default function Map({ selectedMaps, mapStyle, selectedNarrative, activeChapter }) { 
  const mapContainer = useRef(null);
  const map = useRef(null);
  const sanFrancisco = { lng: -122.4194, lat: 37.7749 };
  const [zoom] = useState(10);
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
          paint: {
            'raster-opacity': mapDetails.opacity !== undefined ? mapDetails.opacity : 1
          }
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
      } else {
        console.warn(`Skipping map with id ${mapDetails.id} due to missing or invalid data.`);
      }
    });
  };

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
    if (selectedNarrative && activeChapter && selectedNarrative.chapters[activeChapter]) {
      const chapter = selectedNarrative.chapters[activeChapter];
      updateMapWithNarrative(selectedNarrative, chapter); // Fetch and update map with chapter data
    }
  }, [activeChapter, selectedNarrative]); // Update map whenever activeChapter or selectedNarrative changes

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
