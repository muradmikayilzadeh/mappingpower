import React, { useState, useEffect, useRef } from 'react';
import { collection, doc, getDocs, getDoc } from 'firebase/firestore';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faInfo, faMap } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../firebase';
import styles from './style.module.css';
import miniMap from '../../images/miniMap.png';

function Controller({
  onMapSelect,
  onInfoClick,
  onNarrativeSelect,
  flyToLocation,
  onActiveChapterChange,
  onUpdateOpacity,
}) {
  const [chapters, setChapters] = useState([]);
  const [checkedMaps, setCheckedMaps] = useState({});
  const [sliderValues, setSliderValues] = useState({});
  const [view, setView] = useState('maps');
  const [narratives, setNarratives] = useState([]);
  const [selectedNarrative, setSelectedNarrative] = useState(null);

  const narrativeRef = useRef(null);

  /**
   * Fly to location or compute fallback if center doesn't exist.
   */
  const handleFlyToLocation = (mapDetails) => {
    if (!flyToLocation) return;

    if (
      mapDetails.center &&
      Array.isArray(mapDetails.center) &&
      mapDetails.center.length === 2
    ) {
      flyToLocation(mapDetails.center);
    } else if (
      mapDetails.image_bounds_coords &&
      Array.isArray(mapDetails.image_bounds_coords) &&
      mapDetails.image_bounds_coords.length === 4
    ) {
      const numericBounds = mapDetails.image_bounds_coords.map((coord) =>
        coord.split(',').map(Number)
      );
      let totalLng = 0,
        totalLat = 0;
      numericBounds.forEach(([lng, lat]) => {
        totalLng += lng;
        totalLat += lat;
      });
      flyToLocation([
        totalLng / numericBounds.length,
        totalLat / numericBounds.length,
      ]);
    } else {
      console.error(
        "No 'center' property or bounding coords found for this map. Cannot fly."
      );
    }
  };

  // Fetch chapters & narratives
  useEffect(() => {
    const fetchChaptersAndNarratives = async () => {
      try {
        const erasSnap = await getDocs(collection(db, 'eras'));
        const eras = erasSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.order - b.order);

        const mapsCol = collection(db, 'maps');
        const groupsCol = collection(db, 'map_groups');

        const fetchDetails = async (id, colRef) => {
          const snap = await getDoc(doc(colRef, id));
          return snap.exists() ? { id: snap.id, ...snap.data() } : null;
        };

        const chaptersData = await Promise.all(
          eras.map(async (era) => {
            const maps = await Promise.all(
              era.maps.map((mid) => fetchDetails(mid, mapsCol))
            );
            const mapGroups = await Promise.all(
              era.map_groups.map((gid) => fetchDetails(gid, groupsCol))
            );
            return {
              title: era.title,
              date: era.years,
              description: era.description,
              maps: maps.filter((m) => m),
              mapGroups: mapGroups.filter((g) => g),
              indented: era.indented || [],
            };
          })
        );
        setChapters(chaptersData);

        const narrativeSnap = await getDocs(collection(db, 'narratives'));
        setNarratives(narrativeSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error fetching data:', err);
      }
    };
    fetchChaptersAndNarratives();
  }, []);

  /**
   * Called when user toggles a checkbox for a map.
   */
  const handleCheckboxChange = async (mapId, checked) => {
    try {
      const snap = await getDoc(doc(db, 'maps', mapId));
      if (!snap.exists()) {
        console.log(`No map document found with ID: ${mapId}`);
        return;
      }
      const mapDetails = { id: mapId, ...snap.data() };

      setCheckedMaps((prev) => {
        const next = { ...prev, [mapId]: checked ? mapDetails : null };
        onMapSelect(
          Object.values(next)
            .filter(Boolean)
            .map((m) => ({
              ...m,
              opacity: (sliderValues[m.id] ?? 100) / 100,
            }))
        );
        return next;
      });
    } catch (err) {
      console.error('Error fetching map details:', err);
    }
  };

  /**
   * Called when user drags the slider thumb.
   */
  const handleSliderChange = (mapId, value) => {
    const pct = value / 100;
    setSliderValues((prev) => ({ ...prev, [mapId]: value }));
    setCheckedMaps((prev) => {
      const next = { ...prev };
      if (next[mapId]) next[mapId].opacity = pct;
      if (onUpdateOpacity) onUpdateOpacity(mapId, pct);
      return next;
    });
  };

  const handleInfoClick = (desc) => onInfoClick(desc);
  const handleNarrativeSelect = (narr) => {
    setSelectedNarrative(narr);
    onNarrativeSelect(narr);
  };

  // Intersection Observer to detect active chapter
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) onActiveChapterChange(entry.target.id);
        });
      },
      { root: narrativeRef.current, threshold: 1 }
    );

    if (narrativeRef.current) {
      narrativeRef.current.querySelectorAll('section').forEach((sec) => obs.observe(sec));
    }
    return () => {
      if (narrativeRef.current) {
        narrativeRef.current.querySelectorAll('section').forEach((sec) => obs.unobserve(sec));
      }
    };
  }, [selectedNarrative, onActiveChapterChange]);

  return (
    <div className={styles.controller}>
      <div className={styles.headings}>
        <div
          className={view === 'maps' ? styles.active : ''}
          onClick={() => setView('maps')}
        >
          <span>maps and plans</span>
        </div>
        <div
          className={view === 'narratives' ? styles.active : ''}
          onClick={() => setView('narratives')}
        >
          <span>narratives</span>
        </div>
      </div>

      {view === 'maps' && (
        <div className={styles.sectionInfo}>
          <div className={styles.textArea}>
            <p>
              Historical maps and plans are organized chronologically. Use the slider bars to
              compare different plans. Many maps are accompanied by pin layers that contain
              ground-level views of how the city looked, or might have looked.
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
            {chapters.map((chapter, ci) => (
              <div className={styles.chapter} key={ci}>
                <div className={styles.chapterDetails}>
                  <div className={`${styles.chapterDate} ${styles.grayText}`}>
                    {chapter.date}
                  </div>
                  <div className={`${styles.chapterTitle} ${styles.leftPaddingMD}`}>
                    {chapter.title}
                  </div>
                  <div
                    className={`${styles.chapterDescription} ${styles.grayTextItalic}`}
                    dangerouslySetInnerHTML={{ __html: chapter.description }}
                  />
                </div>
                <div className={styles.chapterMaps}>
                  <div className={styles.mapList}>
                    {chapter.maps.map((map, mi) => {
                      const checked = !!checkedMaps[map.id];
                      // default to 100 when no value in state
                      const fillPct = sliderValues[map.id] ?? 100;

                      return (
                        <div className={styles.map} key={mi}>
                          <div className={styles.mapDetails}>
                            <input
                              type="checkbox"
                              className={`
                                ${styles.checkBox}
                                ${chapter.indented.includes(map.id) ? styles.indentedText : ''}
                                ${checked ? styles.redCheckBox : ''}
                              `}
                              onChange={(e) =>
                                handleCheckboxChange(map.id, e.target.checked)
                              }
                              checked={checked}
                            />
                            <span
                              className={`${styles.leftPaddingMD} ${
                                checked ? styles.redText : styles.grayText
                              }`}
                            >
                              {map.date}
                            </span>
                            <span
                              className={`${styles.mapDetailTitle} ${styles.leftPaddingMD} ${
                                checked ? styles.redText : ''
                              }`}
                            >
                              {map.title}
                            </span>
                          </div>

                          <div className={styles.mapControls}>
                            {map.map_type !== 'vector' && (
                              <input
                                type="range"
                                id={`slider-${map.id}`}
                                className={styles.slider}
                                min="0"
                                max="100"
                                value={fillPct}
                                onChange={(e) =>
                                  handleSliderChange(
                                    map.id,
                                    parseInt(e.target.value, 10)
                                  )
                                }
                                disabled={!checked}
                                style={{ '--fill': `${fillPct}%` }}
                              />
                            )}
                            <i
                              className={styles.mapInfo}
                              onClick={() => handleInfoClick(map.description)}
                            >
                              <FontAwesomeIcon icon={faInfo} />
                            </i>
                            <i
                              className={styles.mapMarker}
                              onClick={() => handleFlyToLocation(map)}
                            >
                              <FontAwesomeIcon icon={faMap} />
                            </i>
                          </div>
                        </div>
                      );
                    })}
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
              {narratives.map((narr) => (
                <li
                  key={narr.id}
                  className={styles.narrativeItem}
                  onClick={() => handleNarrativeSelect(narr)}
                >
                  <div className={styles.narrativeTitle}>{narr.title}</div>
                  <div
                    className={styles.narrativeDescription}
                    dangerouslySetInnerHTML={{ __html: narr.description }}
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
            Object.entries(selectedNarrative.chapters).map(([cid, chap]) => (
              <section key={cid} id={cid} className={styles.chapterSection}>
                <p dangerouslySetInnerHTML={{ __html: chap.content }} />
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
