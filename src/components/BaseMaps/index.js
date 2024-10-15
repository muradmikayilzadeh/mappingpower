import React from 'react';
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
    return (
        <div className={styles.basemaps}>
            <div className={styles.basemapsTitle}>
                <span>basemaps</span>
                <img src="https://www.imaginedsanfrancisco.org/wp-content/themes/imaginedsf-custom-theme/static/basemaps.png" alt="Basemaps Logo" />
            </div>
            <div className={styles.basemapsOptions}>
                {basemapOptions.map((option) => (
                    <div className={styles.option} key={option.id}>
                        <div className={styles.optionDetails}>
                            <input
                                type='checkbox'
                                className={styles.checkBox}
                                onChange={() => onStyleChange(option.style)} // Call onStyleChange with the selected style
                            />
                            <span className={`${styles.leftPaddingMD} ${styles.grayText}`}>{option.name}</span>
                        </div>
                        {/* <div className={styles.optionControls}>
                            <input type="range" min="1" max="100" value="100" className={styles.slider} />
                            <i className={styles.optionInfo}>𝒊</i>
                        </div> */}
                    </div>
                ))}
            </div>
        </div>
    );
}

export default Basemaps;
