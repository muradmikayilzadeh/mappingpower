import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDocs, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMapMarkerAlt, faInfo } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../firebase';
import styles from './style.module.css';
import miniMap from '../../images/miniMap.png';

function Controller({ onMapSelect, onInfoClick, onNarrativeSelect,flyToLocation, onActiveChapterChange, onUpdateOpacity }) {
  const [chapters, setChapters] = useState([]);
  const [checkedMaps, setCheckedMaps] = useState({});
  const [sliderValues, setSliderValues] = useState({});
  const [view, setView] = useState('maps');
  const [narratives, setNarratives] = useState([]);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const narrativeRef = useRef(null);

  const handleFlyToLocation = (mapDetails) => {
    if (flyToLocation && mapDetails.center) {
      flyToLocation(mapDetails.center); // Call the function with the map's center coordinates
    } else {
      console.error("Coordinates not available for this map.");
    }
  };

  useEffect(() => {
    const fetchChaptersAndNarratives = async () => {
      try {
        const erasSnapshot = await getDocs(collection(db, 'eras'));
        const eras = erasSnapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((a, b) => a.order - b.order); // Sort by the "order" field in increasing order

        const mapsCollection = collection(db, 'maps');
        const mapGroupsCollection = collection(db, 'map_groups');

        const fetchDetails = async (id, collectionRef) => {
          const docRef = doc(collectionRef, id);
          const docSnap = await getDoc(docRef);
          return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
        };

        const chaptersData = await Promise.all(
          eras.map(async era => {
            const maps = await Promise.all(era.maps.map(mapId => fetchDetails(mapId, mapsCollection)));
            const mapGroups = await Promise.all(era.map_groups.map(mapGroupId => fetchDetails(mapGroupId, mapGroupsCollection)));

            return {
              title: era.title,
              date: era.years,
              description: era.description,
              maps: maps.filter(map => map !== null),
              mapGroups: mapGroups.filter(mapGroup => mapGroup !== null),
              indented: era.indented || [],
            };
          })
        );

        setChapters(chaptersData);

        const narrativesSnapshot = await getDocs(collection(db, 'narratives'));
        const narrativesData = narrativesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setNarratives(narrativesData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchChaptersAndNarratives();
  }, []);

  const handleCheckboxChange = async (mapId, checked) => {
    try {
      const mapRef = doc(db, 'maps', mapId);
      const mapSnap = await getDoc(mapRef);
      if (mapSnap.exists()) {
        const mapDetails = mapSnap.data();
        setCheckedMaps(prev => {
          const newCheckedMaps = { ...prev, [mapId]: checked ? mapDetails : null };
          const filteredMaps = Object.values(newCheckedMaps).filter(Boolean).map(map => ({
            ...map,
            opacity: sliderValues[map.id] ? sliderValues[map.id] / 100 : 1,
          }));
          onMapSelect(filteredMaps);
          return newCheckedMaps;
        });
      } else {
        console.log(`No such document with ID: ${mapId}`);
      }
    } catch (error) {
      console.error('Error fetching map details:', error);
    }
  };

  const handleSliderChange = (mapId, value) => {
    const normalizedValue = value / 100;
  
    setSliderValues((prevSliderValues) => {
      const updatedSliderValues = { ...prevSliderValues, [mapId]: value };
  
      setCheckedMaps((prevCheckedMaps) => {
        const updatedCheckedMaps = { ...prevCheckedMaps };
        if (updatedCheckedMaps[mapId]) {
          updatedCheckedMaps[mapId] = {
            ...updatedCheckedMaps[mapId],
            opacity: normalizedValue,
          };
        }
  
        // Only call `onUpdateOpacity` in response to slider change
        if (typeof onUpdateOpacity === 'function') {
          onUpdateOpacity(mapId, normalizedValue);
        }
  
        onMapSelect(Object.values(updatedCheckedMaps).filter(Boolean));
        return updatedCheckedMaps;
      });
  
      return updatedSliderValues;
    });
  };
  
  
  
  

  const handleInfoClick = description => {
    onInfoClick(description);
  };

  const handleNarrativeSelect = narrative => {
    setSelectedNarrative(narrative);
    onNarrativeSelect(narrative);
  };

  useEffect(() => {
    const observerOptions = {
      root: narrativeRef.current,
      threshold: 1,
    };

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const visibleChapterId = entry.target.id;
          onActiveChapterChange(visibleChapterId);
        }
      });
    }, observerOptions);

    if (narrativeRef.current) {
      const sections = narrativeRef.current.querySelectorAll('section');
      sections.forEach(section => observer.observe(section));
    }

    return () => {
      if (narrativeRef.current) {
        const sections = narrativeRef.current.querySelectorAll('section');
        sections.forEach(section => observer.unobserve(section));
      }
    };
  }, [selectedNarrative]);

  return (
    <div className={styles.controller}>
      <div className={styles.headings}>
        <div className={view === 'maps' ? styles.active : ''} onClick={() => setView('maps')}>
          <span>maps and plans</span>
        </div>
        <div className={view === 'narratives' ? styles.active : ''} onClick={() => setView('narratives')}>
          <span>narratives</span>
        </div>
      </div>

      {view === 'maps' && (
        <div className={styles.sectionInfo}>
          <div className={styles.textArea}>
            <p>
              Historical maps and plans are organized chronologically. Use the slider bars to compare different plans.
              Many maps are accompanied by pin layers that contain ground-level views of how the city looked, or might
              have looked.
            </p>
          </div>
          <div className={styles.miniMap}>
            <img src={miniMap} alt="Mini Map" />
          </div>
        </div>
      )}

      {view === 'maps' && (
        <div className={styles.sectionContent}>
          <div className={styles.chapterList}>
            {chapters.map((chapter, index) => (
              <div className={styles.chapter} key={index}>
                <div className={styles.chapterDetails}>
                  <div className={styles.chapterDateAndTitle}>
                    <div className={`${styles.chapterDate} ${styles.grayText}`}>{chapter.date}</div>
                    <div className={`${styles.chapterTitle} ${styles.leftPaddingMD}`}>{chapter.title}</div>
                  </div>
                  <div
                    className={`${styles.chapterDescription} ${styles.grayTextItalic}`}
                    dangerouslySetInnerHTML={{ __html: chapter.description }}
                  />
                </div>
                <div className={styles.chapterMaps}>
                  <div className={styles.mapList}>
                    {chapter.maps.map((map, index) => (
                      <div className={styles.map} key={index}>
                        <div className={styles.mapDetails}>
                          <input
                            type="checkbox"
                            className={`${styles.checkBox} ${chapter.indented.includes(map.id) ? styles.indentedText : ''}`}
                            onChange={e => handleCheckboxChange(map.id, e.target.checked)}
                          />
                          <span className={`${styles.grayText} ${styles.leftPaddingMD}`}>{map.date}</span>
                          <span className={`${styles.mapDetailTitle} ${styles.leftPaddingMD}`}>{map.title}</span>
                        </div>
                        <div className={styles.mapControls}>
                          {map.map_type !== 'vector' && (
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={sliderValues[map.id] || 100}
                              className={styles.slider}
                              onChange={e => handleSliderChange(map.id, parseInt(e.target.value, 10))}
                            />
                          )}
                          <i className={styles.mapInfo} onClick={() => handleInfoClick(map.description)}>
                            <FontAwesomeIcon icon={faInfo} />
                          </i>
                          {/* map-marker button to fly over to location */}
                          <i className={styles.mapMarker} onClick={() => handleFlyToLocation(map)}>
                            <FontAwesomeIcon icon={faMapMarkerAlt} />
                          </i>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'narratives' && !selectedNarrative && (
        <div className={styles.sectionInfo}>
          <div className={styles.textArea}>
            <h2>Table of Contents</h2>
            <ul className={styles.narrativeList}>
              {narratives.map((narrative, index) => (
                <li key={narrative.id} className={styles.narrativeItem} onClick={() => handleNarrativeSelect(narrative)}>
                  <div className={styles.narrativeTitle}>{narrative.title}</div>
                  <div
                    className={styles.narrativeDescription}
                    dangerouslySetInnerHTML={{ __html: narrative.description }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.miniMap}>
            <img src={miniMap} alt="Mini Map" />
          </div>
        </div>
      )}

      {view === 'narratives' && selectedNarrative && (
        <div className={styles.sectionContent} ref={narrativeRef}>
          {selectedNarrative.chapters ? (
            Object.entries(selectedNarrative.chapters).map(([chapterId, chapter], index) => (
              <section key={chapterId} id={chapterId} className={styles.chapterSection}>
                <p dangerouslySetInnerHTML={{ __html: chapter.content }}></p>
              </section>
            ))
          ) : (
            <p>No chapters available for this narrative.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default Controller;
