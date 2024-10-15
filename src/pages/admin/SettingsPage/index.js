import React, { useState, useEffect } from 'react';
import styles from './style.module.css';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHome, faMap, faBook, faCog, faTimeline } from '@fortawesome/free-solid-svg-icons';
import { collection, doc, getDoc, setDoc } from "firebase/firestore";
import { ref, getDownloadURL, getStorage, uploadBytesResumable } from 'firebase/storage';
import { app, db } from '../../../firebase';
import Editor from 'react-simple-wysiwyg';

const SettingsPage = () => {

  const navigate = useNavigate();

  const [settingsData, setSettingsData] = useState({
    logo: '',
    projectTitle: '',
    introduction: '',
    bibliography: '',
    credits: '',
    feedback: ''
  });

  const [logoFile, setLogoFile] = useState(null); // State to store the selected logo file

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, "settings", "settingsData");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettingsData(docSnap.data());
        } else {
          console.log("No such document!");
        }
      } catch (e) {
        console.error("Error getting document:", e);
      }
    };

    fetchSettings();
  }, []);

  const handleLogoUpload = (event) => {
    const file = event.target.files[0];
    setLogoFile(file); // Store the selected logo file
    const reader = new FileReader();
    reader.onload = () => {
      setSettingsData(prevState => ({
        ...prevState,
        logo: reader.result // Update logo preview with base64 encoded image
      }));
    };
    reader.readAsDataURL(file);
  };

  const saveChanges = async (e) => {
    e.preventDefault();
    
    try {
      if (logoFile) {
        // Upload the logo to the bucket and save the URL to the settings.logo
        const logoPath = `/logos/${logoFile.name}`;
        const storage = getStorage(app);
        const storageRef = ref(storage, logoPath);
        const uploadTask = uploadBytesResumable(storageRef, logoFile);
    
        uploadTask.on('state_changed',
          (snapshot) => {
            // Observe state change events such as progress, pause, and resume
            // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Upload is ' + progress + '% done');
            switch (snapshot.state) {
              case 'paused':
                console.log('Upload is paused');
                break;
              case 'running':
                console.log('Upload is running');
                break;
            }
          },
          (error) => {
            // Handle unsuccessful uploads
            console.error(error);
          },
          () => {
            // Handle successful uploads on complete
            getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
              console.log('File available at', downloadURL);
              setSettingsData(prevState => ({
                ...prevState,
                logo: downloadURL
              }));
            });
          }
        );
      }

      const docRef = doc(db, "settings", "settingsData");
      await setDoc(docRef, settingsData);
      console.log("Document successfully written!");
      alert("Changes saved successfully!");
    } catch (e) {
      console.error("Error writing document: ", e);
    }
  };

  const handleChange = (name, value) => {
    setSettingsData(prevState => ({
      ...prevState,
      [name]: value
    }));
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
        <h1>Settings Page</h1>
        <div className={styles.section}>
          <h2>Logo</h2>
          <div className={styles.logoSection}>
            <div className={styles.currentLogo}>
              <h3>Current Logo</h3>
              {settingsData.logo ? (
                <img src={settingsData.logo} alt="Current Logo" width={100} />
              ) : (
                <p>No logo uploaded</p>
              )}
            </div>
            <div className={styles.newLogo}>
              <h3>New Logo</h3>
              <input type="file" onChange={handleLogoUpload} />
            </div>
          </div>
        </div>
        <div className={styles.section}>
          <h2>Project Title</h2>
          <input
            type="text"
            name="projectTitle"
            value={settingsData.projectTitle}
            onChange={(e) => handleChange('projectTitle', e.target.value)}
          />
        </div>
        <div className={styles.section}>
          <h2>Introduction</h2>
          <Editor
            value={settingsData.introduction}
            onChange={(e) => handleChange('introduction', e.target.value)}
          />
        </div>
        <div className={styles.section}>
          <h2>Bibliography</h2>
          <Editor
            value={settingsData.bibliography}
            onChange={(e) => handleChange('bibliography', e.target.value)}
          />
        </div>
        <div className={styles.section}>
          <h2>Credits</h2>
          <Editor
            value={settingsData.credits}
            onChange={(e) => handleChange('credits', e.target.value)}
          />
        </div>
        <div className={styles.section}>
          <h2>Feedback</h2>
          <Editor
            value={settingsData.feedback}
            onChange={(e) => handleChange('feedback', e.target.value)}
          />
        </div>
        
        <div>
          <button onClick={saveChanges}>Save Changes</button>
        </div>
      
      </div>
    </div>
  );
};

export default SettingsPage;
