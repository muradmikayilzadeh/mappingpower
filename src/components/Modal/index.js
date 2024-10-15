import React from 'react';
import styles from './style.module.css';

const Modal = ({ isOpen, onClose, title, content, image }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <span className={styles.closeButton} onClick={onClose}>×</span>
        {image && <img src={image} alt="Modal Image" className={styles.modalImage} />}
        <h2>{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export default Modal;
