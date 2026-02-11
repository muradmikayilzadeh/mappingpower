import * as maptilersdk from '@maptiler/sdk';
import React, { useEffect, useState, useRef } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from '../../components/Navbar';
import Controller from '../../components/Controller';
import Basemaps from '../../components/BaseMaps';
import Map from '../../components/Map';
import Modal from '../../components/Modal';
import styles from './style.module.css';

const MainPage = () => {
  const [modalData, setModalData] = useState({ isOpen: false, title: '', content: '' });
  const [selectedMaps, setSelectedMaps] = useState([]);
  const [mapStyle, setMapStyle] = useState(maptilersdk.MapStyle.BASIC.LIGHT);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [activeChapter, setActiveChapter] = useState(null);
  const [isMapLoading, setIsMapLoading] = useState(false);

  // Function to update opacity (provided by <Map />)
  const [updateOpacityFn, setUpdateOpacityFn] = useState(() => () => {});
  // Function to fly to location (provided by <Map />)
  const [flyToLocationFn, setFlyToLocationFn] = useState(null);
  // Current map view state for minimap
  const [mapView, setMapView] = useState({ center: { lng: -122.4194, lat: 37.7749 }, zoom: 12 });
  // Track previous narrative to detect exit
  const prevNarrativeRef = useRef(null);

  const fetchContent = async (field) => {
    try {
      const docRef = doc(db, 'settings', 'settingsData');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setModalData({
          isOpen: true,
          title: field.charAt(0).toUpperCase() + field.slice(1),
          content: data[field],
        });
      } else {
        console.log('No such document!');
      }
    } catch (e) {
      console.error('Error getting document:', e);
    }
  };

  const handleMapSelect = (maps) => {
    setSelectedMaps(maps || []);
  };

  const handleOpacityChange = (mapId, opacity) => {
    if (updateOpacityFn) updateOpacityFn(mapId, opacity);
  };

  const handleNarrativeSelect = (narrative) => {
    setSelectedNarrative(narrative);
  };

  const handleActiveChapterChange = (chapterName) => {
    setActiveChapter(chapterName);
  };

  const handleLinkClick = (field) => {
    if (field === 'share') {
      setModalData({
        isOpen: true,
        title: 'Share current view',
        content: `
          <p>Copy this link to share: <br />
          <input type="text" style="width: 100%;" value="${window.location.href}" readonly /></p>
          <p>Or share on social media:</p>
          <p>
            <a href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
              window.location.href
            )}" target="_blank">Facebook</a> | 
            <a href="https://twitter.com/intent/tweet?url=${encodeURIComponent(
              window.location.href
            )}" target="_blank">Twitter</a>
          </p>
        `,
      });
    } else {
      fetchContent(field);
    }
  };

  const handleInfoClick = (description) => {
    setModalData({ isOpen: true, title: 'Map Information', content: description });
  };

  const closeModal = () => {
    setModalData({ isOpen: false, title: '', content: '' });
  };

  // When exiting a narrative, reset map to default location from settings
  useEffect(() => {
    // Only reset if we had a narrative before and now we don't (exiting narrative)
    const hadNarrative = prevNarrativeRef.current !== null;
    const hasNarrative = selectedNarrative !== null;
    
    if (hadNarrative && !hasNarrative && flyToLocationFn) {
      const resetToDefaultLocation = async () => {
        try {
          const docRef = doc(db, 'settings', 'settingsData');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            const { geolocation, mapZoom } = data;
            
            if (geolocation && Array.isArray(geolocation) && geolocation.length === 2) {
              // Settings store geolocation as [lat, lng], but flyToLocation expects [lng, lat]
              const [lat, lng] = geolocation;
              const zoom = typeof mapZoom === 'number' ? mapZoom : 10;
              flyToLocationFn([lng, lat], zoom);
            }
          }
        } catch (e) {
          console.error('Error fetching settings for default location:', e);
        }
      };

      resetToDefaultLocation();
      setSelectedMaps([]);
      setActiveChapter(null);
    }
    
    // Update ref for next render
    prevNarrativeRef.current = selectedNarrative;
  }, [selectedNarrative, flyToLocationFn]);

  // Preload all images and map data for narrative chapters
  useEffect(() => {
    if (!selectedNarrative || !selectedNarrative.chapters) return;

    const preloadNarrativeContent = async () => {
      console.log('=== PRELOADING NARRATIVE CONTENT ===');
      const chapters = selectedNarrative.chapters;
      const imageUrls = new Set();
      
      // Helper function to decode HTML entities
      const decodeHtml = (str) => {
        if (!str) return '';
        return String(str)
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
      };

      // Extract all image URLs from chapter content and footnotes
      Object.values(chapters).forEach((chapter) => {
        if (!chapter.content) return;
        
        // Decode HTML entities first
        const decodedContent = decodeHtml(chapter.content);
        
        // Extract img src attributes (handles both single and double quotes)
        const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
        let match;
        while ((match = imgRegex.exec(decodedContent)) !== null) {
          if (match[1]) {
            imageUrls.add(match[1]);
          }
        }
        
        // Also extract images from footnote content
        const footnoteRegex = /<footnote\b[^>]*>([\s\S]*?)<\/footnote\s*>/gi;
        let footnoteMatch;
        while ((footnoteMatch = footnoteRegex.exec(decodedContent)) !== null) {
          const footnoteContent = footnoteMatch[1];
          const contentMatch = /<content\b[^>]*>([\s\S]*?)<\/content\s*>/i.exec(footnoteContent);
          if (contentMatch) {
            const footnoteHtml = decodeHtml(contentMatch[1]);
            const footnoteImgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["']/gi;
            let footnoteImgMatch;
            while ((footnoteImgMatch = footnoteImgRegex.exec(footnoteHtml)) !== null) {
              if (footnoteImgMatch[1]) {
                imageUrls.add(footnoteImgMatch[1]);
              }
            }
          }
        }
      });

      // Preload all images
      console.log(`Preloading ${imageUrls.size} images...`);
      const imagePromises = Array.from(imageUrls).map((url) => {
        return new Promise((resolve) => {
          // Skip data URIs and empty URLs
          if (!url || url.startsWith('data:')) {
            resolve(url);
            return;
          }
          
          const img = new Image();
          img.onload = () => resolve(url);
          img.onerror = () => {
            console.warn(`Failed to preload image: ${url}`);
            resolve(url); // Resolve anyway to not block other images
          };
          img.src = url;
        });
      });
      await Promise.all(imagePromises);
      console.log('All images preloaded');

      // Preload all map data for all chapters
      const allMapIds = new Set();
      Object.values(chapters).forEach((chapter) => {
        if (chapter.maps && Array.isArray(chapter.maps)) {
          chapter.maps.forEach((mapRef) => {
            if (mapRef.id) {
              allMapIds.add(mapRef.id);
            }
          });
        }
      });

      console.log(`Preloading ${allMapIds.size} maps...`);
      const mapPromises = Array.from(allMapIds).map(async (mapId) => {
        try {
          const snap = await getDoc(doc(db, 'maps', mapId));
          if (snap.exists()) {
            return { id: mapId, data: snap.data() };
          }
          return null;
        } catch (e) {
          console.error(`Error preloading map ${mapId}:`, e);
          return null;
        }
      });
      await Promise.all(mapPromises);
      console.log('All maps preloaded');
      console.log('=== PRELOADING COMPLETE ===');
    };

    preloadNarrativeContent();
  }, [selectedNarrative]);

  // Track loading state when maps are selected/deselected (only for controller maps, not narratives)
  const prevMapIdsRef = useRef(null);
  useEffect(() => {
    if (selectedNarrative) {
      setIsMapLoading(false);
      prevMapIdsRef.current = null;
      return;
    }

    const newIds = (selectedMaps || []).map((m) => m.id).sort().join(',');
    const prevIds = prevMapIdsRef.current;

    // Only show loading when the set of map IDs changes (check/uncheck), not on opacity slider changes
    if (newIds !== prevIds) {
      prevMapIdsRef.current = newIds;
      if (selectedMaps && selectedMaps.length > 0) {
        setIsMapLoading(true);
        const timer = setTimeout(() => setIsMapLoading(false), 400);
        return () => clearTimeout(timer);
      } else {
        setIsMapLoading(false);
      }
    }
  }, [selectedMaps, selectedNarrative]);

  // If a narrative is selected and we don't yet have an active chapter,
  // initialize it to the first chapter key so that center/zoom/maps apply immediately.
  useEffect(() => {
    if (!selectedNarrative) return;
    const keys = Object.keys(selectedNarrative.chapters || {});
    if (!keys.length) return;
    if (!activeChapter) {
      setActiveChapter(keys[0]);
    }
  }, [selectedNarrative]); // intentionally not depending on activeChapter to avoid loops

  // Whenever the active chapter changes (or narrative changes), load that chapter's maps
  // and set opacities based on chapter.maps[].opacityVal.
  useEffect(() => {
    const loadChapterMaps = async () => {
      if (!selectedNarrative || !activeChapter) return;
      const chapter = selectedNarrative.chapters?.[activeChapter];
      if (!chapter) return;

      // Expecting: chapter.maps -> [{ id, opacityVal }]
      const mapsList = Array.isArray(chapter.maps) ? chapter.maps : [];
      if (!mapsList.length) {
        setSelectedMaps([]);
        return;
      }

      const mapped = await Promise.all(
        mapsList.map(async (m) => {
          try {
            const snap = await getDoc(doc(db, 'maps', m.id));
            if (!snap.exists()) return null;
            const data = snap.data();
            return {
              id: snap.id,
              ...data,
              opacity: typeof m.opacityVal === 'number' ? m.opacityVal : 1,
            };
          } catch (e) {
            console.error('Error loading map for chapter:', e);
            return null;
          }
        })
      );

      setSelectedMaps(mapped.filter(Boolean));
    };

    loadChapterMaps();
  }, [selectedNarrative, activeChapter]);

  return (
    <div className={styles.App}>
      {/* Header (Navbar) */}
      <div className={styles.header}>
        <Navbar onLinkClick={handleLinkClick} />
      </div>

      {/* Main Map */}
      <Map
        selectedMaps={selectedMaps}
        mapStyle={mapStyle}
        selectedNarrative={selectedNarrative}
        activeChapter={activeChapter}
        onUpdateOpacity={setUpdateOpacityFn}
        onFlyToLocation={setFlyToLocationFn}
        onMapViewChange={(center, zoom) => setMapView({ center, zoom })}
        isMapLoading={isMapLoading}
      />

      {/* Left/Right Panels */}
      <div className={styles.mapController}>
        <Controller
          onMapSelect={handleMapSelect}
          onNarrativeSelect={handleNarrativeSelect}
          onInfoClick={handleInfoClick}
          onActiveChapterChange={handleActiveChapterChange}
          onUpdateOpacity={handleOpacityChange}
          flyToLocation={flyToLocationFn}
          mapView={mapView}
          mapStyle={mapStyle}
        />
      </div>

      <div className={styles.basemaps}>
        <Basemaps onStyleChange={setMapStyle} />
      </div>

      {/* Reusable Modal - top-right if title === 'Share current view' */}
      <Modal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.title}
        content={modalData.content}
        type={modalData.title === 'Share current view' ? 'share' : 'default'}
      />
    </div>
  );
};

export default MainPage;
