import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Editor from 'react-simple-wysiwyg';
import { faHome, faMap, faBook, faCog, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../../firebase';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import styles from '../style.module.css';

const CreateMapGroupPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const [html, setHtml] = useState('');
  const [mapEntries, setMapEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [years, setYears] = useState('');
  const [selectedMaps, setSelectedMaps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMapEntries = async () => {
      const querySnapshot = await getDocs(collection(db, 'maps'));
      const maps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        snippet: doc.data().map_type === 'raster' ? doc.data().raster_image : ''
      }));
      setMapEntries(maps);
    };

    const fetchMapGroupData = async () => {
      if (id) {
        const mapGroupDoc = await getDoc(doc(db, 'map_groups', id));
        if (mapGroupDoc.exists()) {
          const data = mapGroupDoc.data();
          setTitle(data.title);
          setYears(data.years);
          setHtml(data.description);
          setSelectedMaps(data.map_ids);
        }
      }
      setLoading(false);
    };

    fetchMapEntries();
    fetchMapGroupData();
  }, [id]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const mapGroupData = {
      title,
      years,
      description: html,
      map_ids: selectedMaps
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'map_groups', id), mapGroupData);
        alert('Map Group updated successfully!');
      } else {
        await addDoc(collection(db, 'map_groups'), mapGroupData);
        alert('Map Group created successfully!');
      }
      navigate('/map-groups');
    } catch (error) {
      console.error('Error creating/updating map group: ', error);
      alert('Error creating/updating map group. Please try again.');
    }
  };

  const handleMapSelection = (e) => {
    const options = e.target.options;
    const selected = [];
    for (const option of options) {
      if (option.selected) {
        selected.push(option.value);
      }
    }
    setSelectedMaps(selected);
  };

  const onChange = (e) => {
    setHtml(e.target.value);
    console.log(e.target.value);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <ul className={styles.sidebarMenu}>
          <li onClick={() => navigate('/dashboard')}><FontAwesomeIcon icon={faHome} /><span>Home</span></li>
          <li onClick={() => navigate('/eras')}><FontAwesomeIcon icon={faTimeline} /><span>Eras</span></li>
          <li onClick={() => navigate('/maps')}><FontAwesomeIcon icon={faMap} /><span>Maps</span></li>
          <li onClick={() => navigate('/narratives')}><FontAwesomeIcon icon={faBook} /><span>Narratives</span></li>
          <li onClick={() => navigate('/settings')}><FontAwesomeIcon icon={faCog} /><span>Settings</span></li>
        </ul>
      </div>
      <div className={styles.content}>
        <div className={styles.headBar}>
          <h1>{id ? 'Edit Map Group' : 'Create Map Group'}</h1>
          <div>
            <button onClick={() => navigate('/map-groups')}>Back</button>
          </div>
        </div>
        <div className={styles.formContainer}>
          <form onSubmit={handleFormSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title</label>
              <input type="text" name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <br></br>
              <br></br>

              <label htmlFor="years">Years</label>
              <input type="text" name="years" id="years" value={years} onChange={(e) => setYears(e.target.value)} />

              <br></br>
              <br></br>
              
              <label htmlFor="description">Description</label>
              <Editor className={styles.richTextEditor} value={html} onChange={onChange} />

              <br></br>

              {/* Multiple select options to choose maps from */}
              <label htmlFor="maps">Maps</label>
              <select className={styles.multipleSelect} name="maps" id="maps" multiple onChange={handleMapSelection} value={selectedMaps}>
                {mapEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>

              <br></br>
              <br></br>
              <button type="submit">{id ? 'Update Map Group' : 'Create Map Group'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateMapGroupPage;
