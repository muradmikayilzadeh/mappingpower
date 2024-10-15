import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faEye, faTimes, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import styles from './style.module.css';

const NarrativesPage = () => {
  const [narratives, setNarratives] = useState([]);
  const [filteredNarratives, setFilteredNarratives] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNarratives = async () => {
      const querySnapshot = await getDocs(collection(db, 'narratives'));
      const narrativesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description,
      }));
      setNarratives(narrativesData);
      setFilteredNarratives(narrativesData);
    };

    fetchNarratives();
  }, []);

  useEffect(() => {
    const results = narratives.filter(narrative =>
      narrative.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredNarratives(results);
  }, [searchTerm, narratives]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this narrative?');
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'narratives', id));
        setNarratives(narratives.filter(narrative => narrative.id !== id));
        setFilteredNarratives(filteredNarratives.filter(narrative => narrative.id !== id));
      } catch (error) {
        console.error('Error deleting narrative: ', error);
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
          <h1>Narrative Page</h1>
          <button onClick={() => navigate('/create-narrative')}>New Narrative</button>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search narrative..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.itemList}>
          {filteredNarratives.length > 0 ? (
            filteredNarratives.map((narrative) => (
              <div key={narrative.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{narrative.title}</h2>
                  <p>{narrative.description}</p>
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => navigate(`/edit-narrative/${narrative.id}`)}><FontAwesomeIcon icon={faEdit} /></button>
                  <button><FontAwesomeIcon icon={faEye} /></button>
                  <button onClick={() => handleDelete(narrative.id)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
              </div>
            ))
          ) : (
            <p>No narrative found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default NarrativesPage;
