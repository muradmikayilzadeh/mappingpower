import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import './style.modules.css';

function Navbar({ onLinkClick }) {
    const [logoUrl, setLogoUrl] = useState(null);

    // Fetch logo URL from the database
    useEffect(() => {
        const fetchLogo = async () => {
            try {
                const docRef = doc(db, 'settings', 'settingsData');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const settings = docSnap.data();
                    setLogoUrl(settings.logo);
                } else {
                    console.error('Settings document does not exist!');
                }
            } catch (error) {
                console.error('Error fetching settings data:', error);
            }
        };

        fetchLogo();
    }, []);

    return (
        <nav className="navbar">
            <div className="logoSection">
                <img src={logoUrl || '../../images/logo.svg'} alt="logo" className="logo" />
            </div>
            <div className="itemsSection">
                <ul>
                    <li onClick={() => onLinkClick('introduction')}>introduction</li>
                    <li onClick={() => onLinkClick('bibliography')}>bibliography</li>
                    <li onClick={() => onLinkClick('credits')}>credits</li>
                    {/* <li onClick={() => onLinkClick('share')}>
                        <img
                            style={{ maxWidth: '15px', cursor: 'pointer' }}
                            src="https://www.imaginedsanfrancisco.org/wp-content/themes/imaginedsf-custom-theme/static/share.svg"
                            alt="share"
                            className="ShareButton__StyledShareIcon-sc-151rsxt-1 kogIld"
                        />
                    </li> */}
                </ul>
            </div>
        </nav>
    );
}

export default Navbar;
