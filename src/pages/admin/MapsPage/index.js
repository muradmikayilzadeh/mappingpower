import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faEye, faTimes, faSearch, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import styles from './style.module.css';

const MapsPage = () => {
  const navigate = useNavigate();

  const [mapEntries, setMapEntries] = useState([]);
  const [filteredEntries, setFilteredEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchMapEntries = async () => {
      const querySnapshot = await getDocs(collection(db, 'maps'));
      const maps = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
        map_type: doc.data().map_type,
        snippet: doc.data().map_type === 'raster' ? doc.data().raster_image : doc.data().vector_file
      }));
      setMapEntries(maps);
      setFilteredEntries(maps);
    };

    fetchMapEntries();
  }, []);

  useEffect(() => {
    const results = mapEntries.filter(entry =>
      entry.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEntries(results);
  }, [searchTerm, mapEntries]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this map?');
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'maps', id));
        setMapEntries(mapEntries.filter(entry => entry.id !== id));
        setFilteredEntries(filteredEntries.filter(entry => entry.id !== id));
      } catch (error) {
        console.error('Error deleting map: ', error);
      }
    }
  };

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
          <h1>Maps Page</h1>
          <div>
            <button onClick={() => navigate('/new-map')}>New Map</button>
            <button onClick={() => navigate('/map-groups')}>Map Groups</button>
          </div>
        </div>
        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search map..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.itemList}>
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
              <div key={entry.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{entry.title}</h2>
                  <p dangerouslySetInnerHTML={{ __html: entry.description.slice(0, 140) }} />
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => navigate(`/edit-map/${entry.id}`)}><FontAwesomeIcon icon={faEdit} /></button>
                  <button><FontAwesomeIcon icon={faEye} /></button>
                  <button onClick={() => handleDelete(entry.id)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
                <div className={styles.itemSnippet}>
                  {entry.map_type === "raster" ?
                  
                    (<img src={entry.snippet} alt={entry.title} />)
                    :(
                      <a href={entry.snippet} target="_blank">
                        <FontAwesomeIcon icon={faSearch} />
                        <span>View Vector File</span>
                      </a>
                    )
                  
                  }
                </div>
              </div>
            ))
          ) : (
            <p>No map found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapsPage;