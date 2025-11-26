import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faEdit, faEye, faEyeSlash, faTimes, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { db } from '../../../firebase';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import styles from './style.module.css';

const NarrativesPage = () => {
  const [narratives, setNarratives] = useState([]);
  const [filteredNarratives, setFilteredNarratives] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchNarratives = async () => {
      const querySnapshot = await getDocs(collection(db, 'narratives'));
      const narrativesData = querySnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          description: data.description,
          // default visibility: if field absent -> visible (true)
          public: Object.prototype.hasOwnProperty.call(data, 'public') ? !!data.public : true
        };
      });
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

  const handleTogglePublic = async (id) => {
    // find current value
    const current = narratives.find(n => n.id === id);
    if (!current) return;
    const newValue = !current.public;

    // optimistic UI
    setNarratives(prev => prev.map(n => (n.id === id ? { ...n, public: newValue } : n)));
    setFilteredNarratives(prev => prev.map(n => (n.id === id ? { ...n, public: newValue } : n)));

    try {
      await updateDoc(doc(db, 'narratives', id), { public: newValue });
    } catch (err) {
      console.error('Failed to update visibility:', err);
      // rollback on failure
      setNarratives(prev => prev.map(n => (n.id === id ? { ...n, public: !newValue } : n)));
      setFilteredNarratives(prev => prev.map(n => (n.id === id ? { ...n, public: !newValue } : n)));
      alert('Could not update visibility. Please try again.');
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
                  <h2>
                    {narrative.title}{' '}
                    <span
                      title={narrative.public ? 'Publicly visible' : 'Private (hidden)'}
                      style={{
                        fontSize: 12,
                        padding: '2px 8px',
                        borderRadius: 999,
                        marginLeft: 8,
                        border: '1px solid',
                        borderColor: narrative.public ? '#1f8b4c' : '#b54747',
                        color: narrative.public ? '#1f8b4c' : '#b54747',
                        background: narrative.public ? 'rgba(31,139,76,0.08)' : 'rgba(181,71,71,0.08)'
                      }}
                    >
                      {narrative.public ? 'Public' : 'Private'}
                    </span>
                  </h2>
                  <p>{narrative.description}</p>
                </div>
                <div className={styles.itemActions}>
                  <button onClick={() => navigate(`/edit-narrative/${narrative.id}`)} title="Edit">
                    <FontAwesomeIcon icon={faEdit} />
                  </button>
                  <button
                    onClick={() => handleTogglePublic(narrative.id)}
                    title={narrative.public ? 'Make Private' : 'Make Public'}
                  >
                    <FontAwesomeIcon icon={narrative.public ? faEye : faEyeSlash} />
                  </button>
                  <button onClick={() => handleDelete(narrative.id)} title="Delete">
                    <FontAwesomeIcon icon={faTimes} />
                  </button>
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
