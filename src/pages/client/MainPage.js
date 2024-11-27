import * as maptilersdk from '@maptiler/sdk';
import React, { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import Navbar from "../../components/Navbar";
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
  const [updateOpacity, setUpdateOpacity] = useState(() => () => {}); // Initialize as a no-op function

  const fetchContent = async (field) => {
    try {
      const docRef = doc(db, "settings", "settingsData");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setModalData({
          isOpen: true,
          title: field.charAt(0).toUpperCase() + field.slice(1),
          content: data[field]
        });
      } else {
        console.log("No such document!");
      }
    } catch (e) {
      console.error("Error getting document:", e);
    }
  };

  const handleMapSelect = (maps) => {
    // Debounce state updates using requestAnimationFrame or similar techniques
    requestAnimationFrame(() => setSelectedMaps(maps));
  };
  
  const handleOpacityChange = (mapId, opacity) => {
    setSelectedMaps((prevMaps) =>
      prevMaps.map((map) =>
        map.id === mapId ? { ...map, opacity } : map
      )
    );
  };
  

  const handleNarrativeSelect = (narrative) => {
    setSelectedNarrative(narrative);
  };

  const handleActiveChapterChange = (chapterName) => {
    setActiveChapter(chapterName);
  };

  const handleLinkClick = (field) => {
    fetchContent(field);
  };

  const handleInfoClick = (description) => {
    setModalData({ isOpen: true, title: 'Map Information', content: description });
  };

  const closeModal = () => {
    setModalData({ isOpen: false, title: '', content: '' });
  };

  return (
    <div className={styles.App}>
      <div className={styles.header}>
        <Navbar onLinkClick={handleLinkClick} />
      </div>

      <Map 
        selectedMaps={selectedMaps}
        mapStyle={mapStyle}
        selectedNarrative={selectedNarrative}
        activeChapter={activeChapter}
        onUpdateOpacity={setUpdateOpacity} // Pass setter to retrieve updateOpacity function
      />

      <div className={styles.mapController}>
        <Controller
          onMapSelect={handleMapSelect}
          onNarrativeSelect={handleNarrativeSelect}
          onInfoClick={handleInfoClick}
          onActiveChapterChange={handleActiveChapterChange}
          onUpdateOpacity={handleOpacityChange}
        />
      </div>

      <div className={styles.basemaps}>
        <Basemaps onStyleChange={setMapStyle} />
      </div>

      <Modal
        isOpen={modalData.isOpen}
        onClose={closeModal}
        title={modalData.title}
        content={modalData.content}
      />
    </div>
  );
};

export default MainPage;
