import React, { useState, useEffect, useRef, useMemo } from 'react';
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

  // Footnote modal state
  const [footnoteOpen, setFootnoteOpen] = useState(false);
  const [footnoteHtml, setFootnoteHtml] = useState('');
  const footnoteStoreRef = useRef({});     // { fn-id: modalHTML }
  const footnoteCounterRef = useRef(0);    // global counter for unique ids per narrative render

  const narrativeRef = useRef(null);

  const handleFlyToLocation = (mapDetails) => {
    if (!flyToLocation) return;

    if (mapDetails.center && Array.isArray(mapDetails.center) && mapDetails.center.length === 2) {
      flyToLocation(mapDetails.center);
    } else if (
      mapDetails.image_bounds_coords &&
      Array.isArray(mapDetails.image_bounds_coords) &&
      mapDetails.image_bounds_coords.length === 4
    ) {
      const numericBounds = mapDetails.image_bounds_coords.map((coord) =>
        coord.split(',').map(Number)
      );
      let totalLng = 0, totalLat = 0;
      numericBounds.forEach(([lng, lat]) => {
        totalLng += lng;
        totalLat += lat;
      });
      flyToLocation([totalLng / numericBounds.length, totalLat / numericBounds.length]);
    } else {
      console.error("No 'center' property or bounding coords found for this map. Cannot fly.");
    }
  };

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

        const isPublic = (m) =>
          Object.prototype.hasOwnProperty.call(m, 'public') ? !!m.public : true;

        const chaptersData = await Promise.all(
          eras.map(async (era) => {
            const maps = await Promise.all((era.maps || []).map((mid) => fetchDetails(mid, mapsCol)));
            const mapGroups = await Promise.all(
              (era.map_groups || []).map((gid) => fetchDetails(gid, groupsCol))
            );
            return {
              title: era.title,
              date: era.years,
              description: era.description,
              // include only maps that are public (default true if field missing)
              maps: maps.filter(Boolean).filter(isPublic),
              mapGroups: mapGroups.filter(Boolean),
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
        const selected = Object.values(next)
          .filter(Boolean)
          .map((m) => ({ ...m, opacity: (sliderValues[m.id] ?? 100) / 100 }));
        onMapSelect(selected);
        return next;
      });
    } catch (err) {
      console.error('Error fetching map details:', err);
    }
  };

  const handleSliderChange = (mapId, value) => {
    const pct = value / 100;
    setSliderValues((prev) => ({ ...prev, [mapId]: value }));

    setCheckedMaps((prev) => {
      const next = { ...prev };
      if (next[mapId]) next[mapId].opacity = pct;

      if (onUpdateOpacity) onUpdateOpacity(mapId, pct);

      const selected = Object.values(next)
        .filter(Boolean)
        .map((m) => {
          const sliderPct = m.id === mapId ? pct : (sliderValues[m.id] ?? 100) / 100;
          return { ...m, opacity: typeof m.opacity === 'number' ? m.opacity : sliderPct };
        });

      onMapSelect(selected);
      return next;
    });
  };

  const handleInfoClick = (desc) => onInfoClick(desc);
  const handleNarrativeSelect = (narr) => {
    setSelectedNarrative(narr);
    onNarrativeSelect(narr);
  };

  // ---------- Footnote helpers (handle escaped or literal HTML) ----------
  const decodeHtml = (str) =>
    String(str)
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");

  const escapeHtml = (str) =>
    String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

  /**
   * Transform <footnote><text>..</text><content>..</content></footnote>
   * into a clickable span and stash the modal HTML.
   * Works even if the chapter string is HTML-escaped.
   *
   * IMPORTANT: This function DOES NOT mutate refs. The caller (useMemo) resets
   * footnoteStoreRef and counter and then invokes this per chapter so the store
   * is always in-sync with the rendered HTML.
   */
  const transformFootnotes = (html, chapterId, allocateId) => {
    if (!html) return '';

    // 1) decode once so tags become real if they were escaped
    const dec = decodeHtml(html);

    // 2) replace footnotes
    const footnoteRe = /<footnote\b[^>]*>([\s\S]*?)<\/footnote\s*>/gi;

    return dec.replace(footnoteRe, (_full, inner) => {
      const textMatch = /<text\b[^>]*>([\s\S]*?)<\/text\s*>/i.exec(inner);
      const contentMatch = /<content\b[^>]*>([\s\S]*?)<\/content\s*>/i.exec(inner);

      const displayTextRaw = textMatch ? textMatch[1] : '';
      const displayText = escapeHtml(displayTextRaw.replace(/<[^>]*>/g, '')); // text-only

      const modalHtml = contentMatch ? contentMatch[1] : '';

      const id = allocateId(chapterId); // get a stable id for this span
      // caller will store modalHtml into footnoteStoreRef.current[id]

      return `<span class="footnote-inline" data-fn="${id}" role="button" tabindex="0" style="cursor:pointer;text-decoration:underline;">${displayText}</span>`;
    });
  };

  // Build processed chapters AND the footnote store together so IDs always match
  const processedChapters = useMemo(() => {
    if (!selectedNarrative || !selectedNarrative.chapters) return [];

    // reset store + counter each time we rebuild processed HTML
    const store = {};
    footnoteStoreRef.current = store;
    footnoteCounterRef.current = 0;

    const allocateId = (chapterId) => {
      const id = `fn-${chapterId}-${footnoteCounterRef.current++}`;
      return id;
    };

    // We need a second pass to collect modal HTMLs in same order we replace.
    const chaptersArr = Object.entries(selectedNarrative.chapters).map(([cid, chap]) => {
      // We'll use a temporary array to capture modal htmls in order of appearance
      const modalHtmls = [];

      // A wrapper around transformFootnotes that also pushes modal content to modalHtmls + store
      const replaced = transformFootnotes(chap?.content || '', cid, (chapterId) => {
        const id = allocateId(chapterId);
        // push a placeholder; we don't have modalHtml here yet (need to parse inner each time)
        modalHtmls.push({ id });
        return id;
      });

      // Now, walk through the original (decoded) content again to extract <content> in order
      // so we can assign to the IDs we generated above.
      const dec = decodeHtml(chap?.content || '');
      const iterator = dec.matchAll(/<footnote\b[^>]*>([\s\S]*?)<\/footnote\s*>/gi);
      let idx = 0;
      for (const m of iterator) {
        const inner = m[1] || '';
        const contentMatch = /<content\b[^>]*>([\s\S]*?)<\/content\s*>/i.exec(inner);
        const html = contentMatch ? contentMatch[1] : '';
        if (modalHtmls[idx]) {
          store[modalHtmls[idx].id] = html;
        }
        idx++;
      }

      return { cid, html: replaced };
    });

    return chaptersArr;
  }, [selectedNarrative]);

  // Reset modal when switching narratives
  useEffect(() => {
    setFootnoteOpen(false);
    setFootnoteHtml('');
  }, [selectedNarrative]);

  // Active chapter tracking
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

  // Footnote click + keyboard (event delegation)
  const onNarrativeClick = (e) => {
    const el = e.target.closest && e.target.closest('.footnote-inline');
    if (!el) return;
    if (narrativeRef.current && !narrativeRef.current.contains(el)) return;

    const id = el.getAttribute('data-fn');
    const html = (id && footnoteStoreRef.current[id]) || '';
    setFootnoteHtml(html);
    setFootnoteOpen(true);
  };

  const onNarrativeKeyDown = (e) => {
    const el = e.target.closest && e.target.closest('.footnote-inline');
    if (!el) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const id = el.getAttribute('data-fn');
      const html = (id && footnoteStoreRef.current[id]) || '';
      setFootnoteHtml(html);
      setFootnoteOpen(true);
    }
  };

  return (
    <div className={styles.controller}>
      <div className={styles.headings}>
        <div className={view === 'maps' ? styles.active : ''} onClick={() => setView('maps')}>
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
                  <div className={`${styles.chapterDate} ${styles.grayText}`}>{chapter.date}</div>
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
                    {(chapter.maps || []).map((map, mi) => {
                      const checked = !!checkedMaps[map.id];
                      const fillPct = sliderValues[map.id] ?? 100;

                      return (
                        <div className={styles.map} key={mi}>
                          <div className={styles.mapDetails}>
                            <input
                              type="checkbox"
                              className={`
                                ${styles.checkBox}
                                ${chapter.indented?.includes(map.id) ? styles.indentedText : ''}
                                ${checked ? styles.redCheckBox : ''}
                              `}
                              onChange={(e) => handleCheckboxChange(map.id, e.target.checked)}
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
                                  handleSliderChange(map.id, parseInt(e.target.value, 10))
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
                            <i className={styles.mapMarker} onClick={() => handleFlyToLocation(map)}>
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
        <div
          className={styles.sectionContent}
          ref={narrativeRef}
          onClick={onNarrativeClick}
          onKeyDown={onNarrativeKeyDown}
        >
          {selectedNarrative.chapters ? (
            processedChapters.map(({ cid, html }) => (
              <section key={cid} id={cid} className={styles.chapterSection}>
                <p dangerouslySetInnerHTML={{ __html: html }} />
              </section>
            ))
          ) : (
            <p>No chapters available for this narrative.</p>
          )}
        </div>
      )}

      {/* Footnote Modal */}
      {footnoteOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setFootnoteOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: '16px 20px',
              maxWidth: 720,
              width: '90%',
              borderRadius: 8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div dangerouslySetInnerHTML={{ __html: footnoteHtml }} style={{ lineHeight: 1.6 }} />
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <button onClick={() => setFootnoteOpen(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Controller;
