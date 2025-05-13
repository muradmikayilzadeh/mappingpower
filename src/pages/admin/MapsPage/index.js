// src/pages/MapsPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHome,
  faMap,
  faBook,
  faCog,
  faEdit,
  faEye,
  faTimes,
  faSearch,
  faTimeline
} from '@fortawesome/free-solid-svg-icons';

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
      const maps = querySnapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || '',
          // default to empty string if missing
          description: data.description || '',
          map_type: data.map_type || '',
          // also default URLs to empty string
          snippetUrl:
            data.map_type === 'raster'
              ? data.raster_image || ''
              : data.vector_file || ''
        };
      });
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
    if (window.confirm('Are you sure you want to delete this map?')) {
      try {
        await deleteDoc(doc(db, 'maps', id));
        setMapEntries(prev => prev.filter(e => e.id !== id));
        setFilteredEntries(prev => prev.filter(e => e.id !== id));
      } catch (error) {
        console.error('Error deleting map: ', error);
      }
    }
  };

  return (
    <div className={styles.dashboard}>
      <div className={styles.sidebar}>
        <ul className={styles.sidebarMenu}>
          <li onClick={() => navigate('/dashboard')}>
            <FontAwesomeIcon icon={faHome} /><span>Home</span>
          </li>
          <li onClick={() => navigate('/eras')}>
            <FontAwesomeIcon icon={faTimeline} /><span>Eras</span>
          </li>
          <li onClick={() => navigate('/maps')}>
            <FontAwesomeIcon icon={faMap} /><span>Maps</span>
          </li>
          <li onClick={() => navigate('/narratives')}>
            <FontAwesomeIcon icon={faBook} /><span>Narratives</span>
          </li>
          <li onClick={() => navigate('/settings')}>
            <FontAwesomeIcon icon={faCog} /><span>Settings</span>
          </li>
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
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className={styles.itemList}>
          {filteredEntries.length > 0 ? (
            filteredEntries.map(entry => (
              <div key={entry.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{entry.title}</h2>
                  <p
                    dangerouslySetInnerHTML={{
                      __html: entry.description.slice(0, 140)
                    }}
                  />
                </div>

                <div className={styles.itemActions}>
                  <button
                    onClick={() => navigate(`/edit-map/${entry.id}`)}
                  >
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button>
                    <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button onClick={() => handleDelete(entry.id)}>
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
                </div>

                <div className={styles.itemSnippet}>
                  {entry.map_type === 'raster' ? (
                    entry.snippetUrl ? (
                      <img
                        src={entry.snippetUrl}
                        alt={entry.title}
                      />
                    ) : (
                      <span>No image</span>
                    )
                  ) : entry.snippetUrl ? (
                    <a
                      href={entry.snippetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FontAwesomeIcon icon={faSearch} />
                      <span>View Vector File</span>
                    </a>
                  ) : (
                    <span>No file</span>
                  )}
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
};

export default MapsPage;
