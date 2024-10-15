import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faTimes, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import styles from './style.module.css';

const MapGroupsPage = () => {
  const [mapGroups, setMapGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMapGroups = async () => {
      const querySnapshot = await getDocs(collection(db, 'map_groups'));
      const groups = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description
      }));
      setMapGroups(groups);
      setFilteredGroups(groups);
    };

    fetchMapGroups();
  }, []);

  useEffect(() => {
    const results = mapGroups.filter(group =>
      group.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredGroups(results);
  }, [searchTerm, mapGroups]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this map group?');
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'map_groups', id));
        setMapGroups(mapGroups.filter(group => group.id !== id));
        setFilteredGroups(filteredGroups.filter(group => group.id !== id));
      } catch (error) {
        console.error('Error deleting map group: ', error);
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
          <h1>Map Groups Page</h1>
          <div>
            <button onClick={() => navigate('/maps')}>Maps</button>
            <button onClick={() => navigate('/new-map-group')}>New Map Group</button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search map group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.itemList}>
          {filteredGroups.length > 0 ? (
            filteredGroups.map((group) => (
              <div key={group.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => navigate(`/edit-map-group/${group.id}`)}><FontAwesomeIcon icon={faEdit} /></button>
                  <button onClick={() => handleDelete(group.id)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
              </div>
            ))
          ) : (
            <p>No map group found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MapGroupsPage;
