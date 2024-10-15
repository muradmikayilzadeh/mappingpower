import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faTimeline } from '@fortawesome/free-solid-svg-icons';
import Editor from 'react-simple-wysiwyg';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase'; // Ensure this path is correct based on your project structure
import styles from '../style.module.css';

const CreateNarrativePage = () => {
  const [title, setTitle] = useState('');
  const [mapEntries, setMapEntries] = useState([]);
  const [chapters, setChapters] = useState({});
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const mapsSnapshot = await getDocs(collection(db, 'maps'));

      const maps = mapsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title + " (" + doc.data().years + ")",
      }));

      setMapEntries(maps);

      if (id) {
        const narrativeDoc = await getDoc(doc(db, 'narratives', id));
        if (narrativeDoc.exists()) {
          const data = narrativeDoc.data();
          setTitle(data.title);
          setChapters(data.chapters || {});
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const narrativeData = {
      title,
      chapters,
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

  const addChapter = () => {
    const newChapterKey = `chapter-${Date.now()}`;
    setChapters({
      ...chapters,
      [newChapterKey]: {
        chapter_id: '', // Empty string initially, user will provide this
        bearing: 0,
        center: [0, 0],
        zoom: 10,
        speed: 0.5,
        pitch: 0,
        source_map_id: mapEntries[0]?.id || '',
        content: '', // New content field for rich text editor
      }
    });
  };

  const handleChapterChange = (chapterKey, field, value) => {
    setChapters({
      ...chapters,
      [chapterKey]: {
        ...chapters[chapterKey],
        [field]: value
      }
    });
  };

  const handleContentChange = (chapterKey, value) => {
    setChapters({
      ...chapters,
      [chapterKey]: {
        ...chapters[chapterKey],
        content: value
      }
    });
  };

  const removeChapter = (chapterKey) => {
    const updatedChapters = { ...chapters };
    delete updatedChapters[chapterKey];
    setChapters(updatedChapters);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <ul className={styles.sidebarMenu}>
          <li onClick={() => navigate('/dashboard')}><FontAwesomeIcon icon={faHome} /><span>Home</span></li>
          <li onClick={() => navigate('/eras')} ><FontAwesomeIcon icon={faTimeline} /><span>Eras</span></li>
          <li onClick={() => navigate('/maps')}><FontAwesomeIcon icon={faMap} /><span>Maps</span></li>
          <li onClick={() => navigate('/narratives')}><FontAwesomeIcon icon={faBook} /><span>Narratives</span></li>
          <li onClick={() => navigate('/settings')}><FontAwesomeIcon icon={faCog} /><span>Settings</span></li>
        </ul>
      </div>
      <div className={styles.content}>
        <div className={styles.headBar}>
          <h1>{id ? 'Edit Narrative' : 'Create Narrative'}</h1>
          <button onClick={() => navigate('/narratives')}>Back</button>
        </div>
        <div className={styles.formContainer}>
          <form onSubmit={handleFormSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title</label>
              <input type="text" name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <br /><br />

              <h2>Chapters</h2>
              <button type="button" onClick={addChapter}>Add Chapter</button>

              <div className={styles.chapters}>
                {Object.keys(chapters).map((chapterKey) => (
                  <div key={chapterKey} className={styles.chapterItem}>
                    <label>Chapter ID:</label>
                    <input
                      type="text"
                      value={chapters[chapterKey].chapter_id}
                      onChange={(e) => handleChapterChange(chapterKey, 'chapter_id', e.target.value)}
                    />
                    <br />
                    <label>Bearing:</label>
                    <input
                      type="number"
                      value={chapters[chapterKey].bearing}
                      onChange={(e) => handleChapterChange(chapterKey, 'bearing', e.target.value)}
                    />
                    <br />
                    <label>Center (Lat, Lng):</label>
                    <input
                      type="text"
                      value={chapters[chapterKey].center}
                      onChange={(e) => handleChapterChange(chapterKey, 'center', e.target.value.split(',').map(Number))}
                    />
                    <br />
                    <label>Zoom:</label>
                    <input
                      type="number"
                      value={chapters[chapterKey].zoom}
                      onChange={(e) => handleChapterChange(chapterKey, 'zoom', e.target.value)}
                    />
                    <br />
                    <label>Speed:</label>
                    <input
                      type="number"
                      value={chapters[chapterKey].speed}
                      onChange={(e) => handleChapterChange(chapterKey, 'speed', e.target.value)}
                    />
                    <br />
                    <label>Pitch:</label>
                    <input
                      type="number"
                      value={chapters[chapterKey].pitch}
                      onChange={(e) => handleChapterChange(chapterKey, 'pitch', e.target.value)}
                    />
                    <br />
                    <label>Source Map:</label>
                    <select
                      value={chapters[chapterKey].source_map_id}
                      onChange={(e) => handleChapterChange(chapterKey, 'source_map_id', e.target.value)}
                    >
                      {mapEntries.map((map) => (
                        <option key={map.id} value={map.id}>
                          {map.title}
                        </option>
                      ))}
                    </select>

                    <br />
                    <label>Content:</label>
                    <Editor
                      value={chapters[chapterKey].content}
                      onChange={(e) => handleContentChange(chapterKey, e.target.value)}
                      className={styles.richTextEditor}
                    />

                    <br />
                    <button type="button" onClick={() => removeChapter(chapterKey)}>Remove Chapter</button>
                  </div>
                ))}
              </div>

              <br /><br />
              <button type="submit">{id ? 'Update Narrative' : 'Create Narrative'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateNarrativePage;
