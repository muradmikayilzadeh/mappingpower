import * as maptilersdk from '@maptiler/sdk';
import React, { useEffect, useState } from 'react';
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

  // Function to update opacity (provided by <Map />)
  const [updateOpacityFn, setUpdateOpacityFn] = useState(() => () => {});
  // Function to fly to location (provided by <Map />)
  const [flyToLocationFn, setFlyToLocationFn] = useState(null);

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
    setSelectedMaps(maps);
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
