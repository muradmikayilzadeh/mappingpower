import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faTimeline } from '@fortawesome/free-solid-svg-icons';
import Editor from 'react-simple-wysiwyg';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase'; // Adjust path if needed
import styles from '../style.module.css';

const CreateNarrativePage = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState(0);
  const [isPublic, setIsPublic] = useState(true);
  const [chapters, setChapters] = useState({});
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();
  const { id } = useParams();

  // Generate a random Chapter ID
  const generateChapterId = () => {
    return `chapter-${Math.random().toString(36).substring(2, 9)}-${Date.now().toString(36)}`;
  };

  // Load narrative if editing; also backfill the JSON textarea from stored fields
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (id) {
          const narrativeDoc = await getDoc(doc(db, 'narratives', id));
          if (narrativeDoc.exists()) {
            const data = narrativeDoc.data();
            setTitle(data.title || '');
            setDescription(data.description || '');
            setOrder(typeof data.order === 'number' ? data.order : 0);
            // Default to true (public) if field doesn't exist
            setIsPublic(Object.prototype.hasOwnProperty.call(data, 'public') ? !!data.public : true);

            const incomingChapters = data.chapters || {};
            const normalized = {};

            Object.entries(incomingChapters).forEach(([key, ch]) => {
              // Prepare JSON text from existing fields, if present
              const jsonFromExisting = {
                currentMapFocusLocation:
                  Array.isArray(ch.center) && ch.center.length === 2
                    ? ch.center
                    : [0, 0],
                currentZoomLevel:
                  typeof ch.zoom === 'number' ? ch.zoom : 10,
                maps: Array.isArray(ch.maps) ? ch.maps : [],
              };

              // Generate chapter_id if it doesn't exist
              const chapterId = ch.chapter_id || generateChapterId();

              normalized[key] = {
                chapter_id: chapterId,
                speed: typeof ch.speed === 'number' ? ch.speed : 0.5,
                content: ch.content || '',
                dataJsonText: JSON.stringify(jsonFromExisting, null, 2),
              };
            });

            setChapters(normalized);
          }
        }
      } catch (err) {
        console.error('Error loading narrative:', err);
        alert('Failed to load narrative.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const addChapter = () => {
    const newChapterKey = `chapter-${Date.now()}`;
    const newChapterId = generateChapterId();
    setChapters((prev) => ({
      ...prev,
      [newChapterKey]: {
        chapter_id: newChapterId,
        speed: 0.5,
        content: '',
        dataJsonText: JSON.stringify(
          {
            currentMapFocusLocation: [0, 0],
            currentZoomLevel: 10,
            maps: [],
          },
          null,
          2
        ),
      },
    }));
  };

  const removeChapter = (chapterKey) => {
    setChapters((prev) => {
      const copy = { ...prev };
      delete copy[chapterKey];
      return copy;
    });
  };

  const handleChapterField = (chapterKey, field, value) => {
    setChapters((prev) => ({
      ...prev,
      [chapterKey]: {
        ...prev[chapterKey],
        [field]: value,
      },
    }));
  };

  const handleFormSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }

    // Transform chapters for storage: parse JSON and attach derived fields
    const chaptersForSave = {};
    for (const [key, ch] of Object.entries(chapters)) {
      // Parse per-chapter Data JSON
      let parsed;
      try {
        parsed = JSON.parse(ch.dataJsonText || '{}');
      } catch (err) {
        alert(`Chapter "${ch.chapter_id || key}": Data JSON is invalid. Please fix it.`);
        return;
      }

      // Basic validation
      const hasCenter =
        parsed &&
        Array.isArray(parsed.currentMapFocusLocation) &&
        parsed.currentMapFocusLocation.length === 2 &&
        parsed.currentMapFocusLocation.every((n) => typeof n === 'number');

      const hasZoom = parsed && typeof parsed.currentZoomLevel === 'number';
      const maps = Array.isArray(parsed.maps) ? parsed.maps : [];

      if (!hasCenter || !hasZoom) {
        alert(
          `Chapter "${ch.chapter_id || key}": Data JSON must include "currentMapFocusLocation" as [lng,lat] and "currentZoomLevel" as a number.`
        );
        return;
      }

      chaptersForSave[key] = {
        chapter_id: ch.chapter_id || '',
        speed: typeof ch.speed === 'number' ? ch.speed : Number(ch.speed) || 0.5,
        content: ch.content || '',
        // Derived fields stored for the player/Map to use
        center: parsed.currentMapFocusLocation, // [lng, lat]
        zoom: parsed.currentZoomLevel, // number
        maps: maps, // [{ id, opacityVal }, ...]
      };
    }

    const narrativeData = {
      title,
      description: description || '',
      order: typeof order === 'number' ? order : 0,
      public: isPublic,
      chapters: chaptersForSave,
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'narratives', id), narrativeData);
        alert('Narrative updated successfully!');
      } else {
        await addDoc(collection(db, 'narratives'), narrativeData);
        alert('Narrative created successfully!');
      }
      navigate('/narratives');
    } catch (error) {
      console.error('Error creating/updating narrative: ', error);
      alert('Error creating/updating narrative. Please try again.');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <ul className={styles.sidebarMenu}>
          <li onClick={() => navigate('/dashboard')}>
            <FontAwesomeIcon icon={faHome} />
            <span>Home</span>
          </li>
          <li onClick={() => navigate('/eras')}>
            <FontAwesomeIcon icon={faTimeline} />
            <span>Eras</span>
          </li>
          <li onClick={() => navigate('/maps')}>
            <FontAwesomeIcon icon={faMap} />
            <span>Maps</span>
          </li>
          <li onClick={() => navigate('/narratives')}>
            <FontAwesomeIcon icon={faBook} />
            <span>Narratives</span>
          </li>
          <li onClick={() => navigate('/settings')}>
            <FontAwesomeIcon icon={faCog} />
            <span>Settings</span>
          </li>
        </ul>
      </div>

      <div className={styles.content}>
        <div className={styles.headBar}>
          <h1>{id ? 'Edit Narrative' : 'Create Narrative'}</h1>
          <div>
            <button 
              type="button" 
              onClick={(e) => {
                e.preventDefault();
                handleFormSubmit(e);
              }} 
              style={{ marginRight: '10px' }}
            >
              {id ? 'Update' : 'Save'}
            </button>
            <button onClick={() => navigate('/narratives')}>Back</button>
          </div>
        </div>

        <div className={styles.formContainer}>
          <form onSubmit={handleFormSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title</label>
              <input
                type="text"
                name="title"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <br />
              <br />

              <label htmlFor="description">Description</label>
              <Editor
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={styles.richTextEditor}
              />

              <br />
              <br />

              <label htmlFor="order">Order (for Table of Contents sorting)</label>
              <input
                type="number"
                name="order"
                id="order"
                value={order}
                onChange={(e) => setOrder(e.target.value === '' ? 0 : Number(e.target.value))}
                style={{ width: '100px' }}
              />
              <small style={{ marginLeft: '10px', color: '#666' }}>
                Lower numbers appear first in the Table of Contents
              </small>

              <br />
              <br />

              <label htmlFor="isPublic">
                <input
                  type="checkbox"
                  name="isPublic"
                  id="isPublic"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  style={{ marginRight: '8px' }}
                />
                Visible on website (uncheck to hide incomplete drafts)
              </label>

              <br />
              <br />

              <h2>Chapters</h2>

              <div className={styles.chapters}>
                {Object.keys(chapters).length === 0 && (
                  <p style={{ marginTop: 12 }}>No chapters yet. Click “Add Chapter”.</p>
                )}

                {Object.keys(chapters).map((chapterKey) => {
                  const ch = chapters[chapterKey];
                  return (
                    <div key={chapterKey} className={styles.chapterItem}>
                      <label>Chapter ID (auto-generated):</label>
                      <input
                        type="text"
                        value={ch.chapter_id}
                        disabled
                        style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                        title="Chapter ID is auto-generated and cannot be changed"
                      />
                      <br />

                      <label>Speed:</label>
                      <input
                        type="number"
                        step="0.1"
                        value={ch.speed}
                        onChange={(e) =>
                          handleChapterField(
                            chapterKey,
                            'speed',
                            e.target.value === '' ? '' : Number(e.target.value)
                          )
                        }
                      />
                      <br />

                      <label>Content:</label>
                      <Editor
                        value={ch.content}
                        onChange={(e) =>
                          handleChapterField(chapterKey, 'content', e.target.value)
                        }
                        className={styles.richTextEditor}
                      />
                      <br />

                      <label>Data JSON (paste from map overlay):</label>
                      <textarea
                        rows={8}
                        value={ch.dataJsonText}
                        onChange={(e) =>
                          handleChapterField(chapterKey, 'dataJsonText', e.target.value)
                        }
                        placeholder={`{\n  "currentMapFocusLocation": [-122.4194, 37.7749],\n  "currentZoomLevel": 12,\n  "maps": [\n    { "id": "abc", "opacityVal": 1 }\n  ]\n}`}
                        className={styles.textarea}
                        style={{ width: '100%', fontFamily: 'monospace' }}
                      />

                      <br />
                      <button type="button" onClick={() => removeChapter(chapterKey)}>
                        Remove Chapter
                      </button>
                    </div>
                  );
                })}
              </div>

              <br />
              <br />
              <button type="button" onClick={addChapter}>
                Add Chapter
              </button>

              <br />
              <br />
              <button type="submit">{id ? 'Update Narrative' : 'Create Narrative'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateNarrativePage;
