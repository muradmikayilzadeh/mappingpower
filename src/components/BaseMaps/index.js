import React, { useState } from 'react';
import * as maptilersdk from '@maptiler/sdk'; // Import maptilersdk
import styles from './style.module.css';

// Define the basemap options in a JSON array
const basemapOptions = [
    { id: 'basic-light', name: 'Basic Light', style: maptilersdk.MapStyle.BASIC.LIGHT },
    { id: 'satellite', name: 'Satellite', style: maptilersdk.MapStyle.SATELLITE },
    { id: 'street-view', name: 'Street View', style: maptilersdk.MapStyle.STREETS },
    { id: 'winter', name: 'Winter', style: maptilersdk.MapStyle.BASIC.WINTER }
];

function Basemaps({ onStyleChange }) {
    const [selectedBasemap, setSelectedBasemap] = useState(basemapOptions[0].id); // Default to the first option
    const [isCollapsed, setIsCollapsed] = useState(false); // Track collapse state

    const handleBasemapChange = (option) => {
        setSelectedBasemap(option.id);
        onStyleChange(option.style);
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed); // Toggle collapse state
    };

    return (
        <div className={styles.basemaps}>
            <div className={styles.basemapsTitle} onClick={toggleCollapse}>
                <span>basemaps</span>
                <img 
                    src="https://www.imaginedsanfrancisco.org/wp-content/themes/imaginedsf-custom-theme/static/basemaps.png" 
                    alt="Basemaps Logo"
                    className={styles.basemapLogo}
                />
            </div>

            {!isCollapsed && (
                <div className={`${styles.basemapsOptions} ${isCollapsed ? styles.collapsed : ""}`}>
                    {basemapOptions.map((option) => (
                        <div className={styles.option} key={option.id}>
                            <div className={styles.optionDetails}>
                                <input
                                    type="checkbox"
                                    className={styles.checkBox}
                                    checked={selectedBasemap === option.id}
                                    onChange={() => handleBasemapChange(option)}
                                />
                                <span className={`${styles.leftPaddingMD} ${styles.grayText}`}>{option.name}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Basemaps;
