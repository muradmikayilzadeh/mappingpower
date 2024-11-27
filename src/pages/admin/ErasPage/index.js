import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faTimes, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
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
        ...doc.data()
      }));
      const sortedEras = erasData.sort((a, b) => a.order - b.order); // Sort by the 'order' field
      setEras(sortedEras);
      setFilteredEras(sortedEras);
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

  const handleMove = async (index, direction) => {
    const newEras = [...eras];

    if (direction === 'up') {
      // Move up: rotate first item to the bottom
      const swapIndex = index === 0 ? newEras.length - 1 : index - 1;
      [newEras[index], newEras[swapIndex]] = [newEras[swapIndex], newEras[index]];
    } else if (direction === 'down') {
      // Move down: rotate last item to the top
      const swapIndex = index === newEras.length - 1 ? 0 : index + 1;
      [newEras[index], newEras[swapIndex]] = [newEras[swapIndex], newEras[index]];
    }

    // Dynamically update the UI
    const updatedEras = newEras.map((era, newIndex) => ({
      ...era,
      order: newIndex + 1 // Orders start at 1
    }));

    setEras(updatedEras); // Update the UI immediately
    setFilteredEras(updatedEras); // Reflect the new order in the filtered list

    // Update the order in Firestore
    try {
      const updatePromises = updatedEras.map(era => {
        return updateDoc(doc(db, 'eras', era.id), { order: era.order });
      });
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating order: ', error);
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
            filteredEras.map((era, index) => (
              <div key={era.id} className={styles.itemEntry}>
                <div className={styles.itemDetails}>
                  <h2>{era.title}</h2>
                  <p dangerouslySetInnerHTML={{ __html: era.description }} />
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => handleMove(index, 'up')}>Up</button>
                  <button onClick={() => handleMove(index, 'down')}>Down</button>
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
