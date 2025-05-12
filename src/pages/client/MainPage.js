import * as maptilersdk from '@maptiler/sdk';
import React, { useState } from 'react';
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

  // We'll store the function to update opacity (provided from <Map />).
  const [updateOpacityFn, setUpdateOpacityFn] = useState(() => () => {});
  // We'll store the function to fly to location (provided from <Map />).
  const [flyToLocationFn, setFlyToLocationFn] = useState(null);

  /**
   * Fetch content from Firestore for introduction, bibliography, credits, etc.
   */
  const fetchContent = async (field) => {
    try {
      const docRef = doc(db, 'settings', 'settingsData');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setModalData({
          isOpen: true,
          title: field.charAt(0).toUpperCase() + field.slice(1), // e.g. "Introduction"
          content: data[field],
        });
      } else {
        console.log('No such document!');
      }
    } catch (e) {
      console.error('Error getting document:', e);
    }
  };

  /**
   * Called whenever maps are selected/unselected in <Controller />
   */
  const handleMapSelect = (maps) => {
    setSelectedMaps(maps);
  };

  /**
   * Called whenever user changes opacity slider in <Controller />
   */
  const handleOpacityChange = (mapId, opacity) => {
    if (updateOpacityFn) {
      updateOpacityFn(mapId, opacity);
    }
  };

  /**
   * Called whenever user selects a narrative in <Controller />
   */
  const handleNarrativeSelect = (narrative) => {
    setSelectedNarrative(narrative);
  };

  /**
   * Called when the active chapter changes (scrolling in the narrative)
   */
  const handleActiveChapterChange = (chapterName) => {
    setActiveChapter(chapterName);
  };

  /**
   * Called when any link in the Navbar is clicked.
   * We do a special check for 'share' to show the Share Modal
   */
  const handleLinkClick = (field) => {
    if (field === 'share') {
      // Show the "Share current view" modal at top-right
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
      // For introduction, bibliography, credits, etc., fetch from Firestore
      fetchContent(field);
    }
  };

  /**
   * Called when user clicks "info" icon on a map
   */
  const handleInfoClick = (description) => {
    setModalData({ isOpen: true, title: 'Map Information', content: description });
  };

  /**
   * Closes the currently open modal
   */
  const closeModal = () => {
    setModalData({ isOpen: false, title: '', content: '' });
  };

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
