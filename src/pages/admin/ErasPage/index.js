import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faTimes, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import styles from './style.module.css';

const ErasPage = () => {
  const [eras, setEras] = useState([]);
  const [filteredEras, setFilteredEras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchEras = async () => {
      const querySnapshot = await getDocs(collection(db, 'eras'));
      const erasData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        description: doc.data().description
      }));
      setEras(erasData);
      setFilteredEras(erasData);
    };

    fetchEras();
  }, []);

  useEffect(() => {
    const results = eras.filter(era =>
      era.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredEras(results);
  }, [searchTerm, eras]);

  const handleDelete = async (id) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this era?');
    if (confirmDelete) {
      try {
        await deleteDoc(doc(db, 'eras', id));
        setEras(eras.filter(era => era.id !== id));
        setFilteredEras(filteredEras.filter(era => era.id !== id));
      } catch (error) {
        console.error('Error deleting era: ', error);
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
          <li onClick={() => navigate('/media')}><FontAwesomeIcon icon={faMap} /><span>Media Library</span></li>
          <li onClick={() => navigate('/narratives')}><FontAwesomeIcon icon={faBook} /><span>Narratives</span></li>
          <li onClick={() => navigate('/settings')}><FontAwesomeIcon icon={faCog} /><span>Settings</span></li>
        </ul>
      </div>
      <div className={styles.content}>
        <div className={styles.headBar}>
          <h1>Eras Page</h1>
          <div>
            <button onClick={() => navigate('/create-era')}>New Era</button>
          </div>
        </div>

        <div className={styles.searchBar}>
          <input
            type="text"
            placeholder="Search era..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.itemList}>
          {filteredEras.length > 0 ? (
            filteredEras.map((era) => (
              <div key={era.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{era.title}</h2>
                  <p dangerouslySetInnerHTML={{ __html: era.description }} />
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => navigate(`/edit-era/${era.id}`)}><FontAwesomeIcon icon={faEdit} /></button>
                  <button onClick={() => handleDelete(era.id)}><FontAwesomeIcon icon={faTimes} /></button>
                </div>
              </div>
            ))
          ) : (
            <p>No era found</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ErasPage;
