import React from 'react';
import styles from './style.module.css';

const Modal = ({ isOpen, onClose, title, content, image, type }) => {
  if (!isOpen) return null;

  // If it's a share modal, use the special share layout
  if (type === 'share') {
    return (
      <div className={styles.shareModalOverlay} onClick={onClose}>
        <div className={styles.shareModalContent} onClick={(e) => e.stopPropagation()}>
          <span className={styles.closeButton} onClick={onClose}>×</span>
          
          <h5>Share current view</h5>
          
          {/* Social Icons */}
          <div className={styles.socialIconsContainer}>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/5/51/Facebook_f_logo_%282019%29.svg"
                alt="Facebook"
                className={styles.socialIcon}
              />
              <span>Facebook</span>
            </a>
            <a
              href={`https://x.com/intent/tweet?url=${encodeURIComponent(window.location.href)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.socialLink}
            >
              <img
                src="https://upload.wikimedia.org/wikipedia/commons/c/cc/X_icon.svg"
                alt="X"
                className={styles.socialIcon}
              />
              <span>X</span>
            </a>

          </div>

          <div className={styles.orDivider}>-OR-</div>

          {/* Link to share */}
          <p>Link to share</p>
          <textarea
            className={styles.shareLink}
            readOnly
            value={window.location.href}
          />
        </div>
      </div>
    );
  }

  // Default modal layout (for non-share modals)
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <span className={styles.closeButton} onClick={onClose}>×</span>
        {image && <img src={image} alt="Modal" className={styles.modalImage} />}
        <h2>{title}</h2>
        <div dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </div>
  );
};

export default Modal;
