import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import Editor from 'react-simple-wysiwyg';
import { faHome, faMap, faBook, faCog, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { collection, getDocs, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../firebase'; // Ensure this path is correct based on your project structure
import styles from '../style.module.css';

const CreateEraPage = () => {
  const [html, setHtml] = useState('');
  const [mapEntries, setMapEntries] = useState([]);
  const [mapGroupEntries, setMapGroupEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [years, setYears] = useState('');
  const [selectedMaps, setSelectedMaps] = useState([]);
  const [selectedMapGroups, setSelectedMapGroups] = useState([]);
  const [indented, setIndented] = useState([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const mapsSnapshot = await getDocs(collection(db, 'maps'));
      const mapGroupsSnapshot = await getDocs(collection(db, 'map_groups'));

      const maps = mapsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title + " (" + doc.data().years + ")",
        description: doc.data().description
      }));

      const mapGroups = mapGroupsSnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title + " (" + doc.data().years + ")",
        description: doc.data().description
      }));

      setMapEntries(maps);
      setMapGroupEntries(mapGroups);

      if (id) {
        const eraDoc = await getDoc(doc(db, 'eras', id));
        if (eraDoc.exists()) {
          const data = eraDoc.data();
          setTitle(data.title);
          setYears(data.years);
          setHtml(data.description);
          setSelectedMaps(data.maps || []);
          setSelectedMapGroups(data.map_groups || []);
          setIndented(data.indented || []);
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    const eraData = {
      title,
      years,
      description: html,
      maps: selectedMaps,
      map_groups: selectedMapGroups,
      indented
    };

    try {
      if (id) {
        await updateDoc(doc(db, 'eras', id), eraData);
        alert('Era updated successfully!');
      } else {
        await addDoc(collection(db, 'eras'), eraData);
        alert('Era created successfully!');
      }
      navigate('/eras');
    } catch (error) {
      console.error('Error creating/updating era: ', error);
      alert('Error creating/updating era. Please try again.');
    }
  };

  const handleSelectionChange = (e) => {
    const options = e.target.options;
    const selected = [];
    for (const option of options) {
      if (option.selected) {
        selected.push(option.value);
      }
    }
    if (e.target.name === 'maps') {
      setSelectedMaps(selected);
    } else if (e.target.name === 'map_groups') {
      setSelectedMapGroups(selected);
    }
  };

  const handleHtmlChange = (e) => {
    setHtml(e.target.value);
  };

  const moveItem = (index, direction, type) => {
    let items = type === 'maps' ? [...selectedMaps] : [...selectedMapGroups];
    const newIndex = index + direction;

    // Ensure the new index is within bounds
    if (newIndex < 0 || newIndex >= items.length) return;

    // Swap the items
    const temp = items[index];
    items[index] = items[newIndex];
    items[newIndex] = temp;

    // Update state
    if (type === 'maps') {
      setSelectedMaps(items);
    } else {
      setSelectedMapGroups(items);
    }
  };

  const toggleIndentation = (id, type) => {
    let updatedIndented = [...indented];
    if (updatedIndented.includes(id)) {
      updatedIndented = updatedIndented.filter(item => item !== id); // Remove if already indented
    } else {
      updatedIndented.push(id); // Add if not indented
    }
    setIndented(updatedIndented);
  };

  const isIndented = (id) => indented.includes(id);

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
          <h1>{id ? 'Edit Era' : 'Create Era'}</h1>
          <div>
            <button onClick={() => navigate('/eras')}>Back</button>
          </div>
        </div>
        <div className={styles.formContainer}>
          <form onSubmit={handleFormSubmit}>
            <div className={styles.formGroup}>
              <label htmlFor="title">Title</label>
              <input type="text" name="title" id="title" value={title} onChange={(e) => setTitle(e.target.value)} />

              <br /><br />

              <label htmlFor="years">Years</label>
              <input type="text" name="years" id="years" value={years} onChange={(e) => setYears(e.target.value)} />

              <br /><br />

              <label htmlFor="description">Description</label>
              <Editor className={styles.richTextEditor} value={html} onChange={handleHtmlChange} />

              <br /><br />

              {/* Multiple select options to choose maps and map groups */}
              <label htmlFor="maps">Maps</label>
              <select className={styles.multipleSelect} name="maps" id="maps" multiple onChange={handleSelectionChange} value={selectedMaps}>
                {mapEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>

              <br /><br />

              <label htmlFor="map_groups">Map Groups</label>
              <select className={styles.multipleSelect} name="map_groups" id="map_groups" multiple onChange={handleSelectionChange} value={selectedMapGroups}>
                {mapGroupEntries.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.title}</option>
                ))}
              </select>

              <br /><br />

              {/* Section for displaying and reordering selected maps and map groups */}
              <div className={styles.orderingSection}>
                <h3>Selected Maps</h3>
                {selectedMaps.map((map, index) => (
                  <div key={map} className={styles.orderingItem}>
                    <span>{mapEntries.find(entry => entry.id === map)?.title || map}</span>
                    <button type="button" onClick={() => moveItem(index, -1, 'maps')}>Up</button>
                    <button type="button" onClick={() => moveItem(index, 1, 'maps')}>Down</button>
                    <button 
                      type="button" 
                      onClick={() => toggleIndentation(map, 'maps')}
                      className={isIndented(map) ? styles.indented : ''}
                    >
                      Indentation
                    </button>
                  </div>
                ))}

                <h3>Selected Map Groups</h3>
                {selectedMapGroups.map((mapGroup, index) => (
                  <div key={mapGroup} className={styles.orderingItem}>
                    <span>{mapGroupEntries.find(entry => entry.id === mapGroup)?.title || mapGroup}</span>
                    <button type="button" onClick={() => moveItem(index, -1, 'mapGroups')}>Up</button>
                    <button type="button" onClick={() => moveItem(index, 1, 'mapGroups')}>Down</button>
                    <button 
                      type="button" 
                      onClick={() => toggleIndentation(mapGroup, 'mapGroups')}
                      className={isIndented(mapGroup) ? styles.indented : ''}
                    >
                      Indentation
                    </button>
                  </div>
                ))}
              </div>

              <br /><br />

              <button type="submit">{id ? 'Update Era' : 'Create Era'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEraPage;
