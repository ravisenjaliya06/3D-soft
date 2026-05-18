import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import styles from './TextureAddPopup.module.css';

interface TextureAddPopupProps {
  onClose: () => void;
  onSuccess?: () => void;
}

export const TextureAddPopup: React.FC<TextureAddPopupProps> = ({ onClose, onSuccess }) => {
  const [newTextureName, setNewTextureName] = useState('');
  const [newTextureFile, setNewTextureFile] = useState<File | null>(null);
  const [newTexturePreview, setNewTexturePreview] = useState<string | null>(null);
  const [isSavingTexture, setIsSavingTexture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewTextureFile(file);
      const objectUrl = URL.createObjectURL(file);
      setNewTexturePreview(objectUrl);
    }
  };

  const handleSaveNewTexture = async () => {
    if (!newTextureName.trim() || !newTextureFile) {
      toast.error('Please provide a name and select an image.');
      return;
    }

    setIsSavingTexture(true);
    const formData = new FormData();
    formData.append('name', newTextureName);
    formData.append('image', newTextureFile);
    formData.append('type', 'Texture');

    try {
      const response = await commonService.post(API_ENDPOINT.CREATE_FINISH, formData);
      if (response.status === 201 || response.status === 200) {
        toast.success('Texture created successfully.');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        toast.error('Failed to create texture.');
      }
    } catch (error) {
      console.error('Error creating texture:', error);
      toast.error('Failed to create texture.');
    } finally {
      setIsSavingTexture(false);
    }
  };

  if (typeof window === 'undefined') return null;

  const content = (
    <div className={styles.popupOverlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <img
              src={assets.Setting || '/placeholder.svg'}
              alt="Settings Icon"
              className={styles.headerIcon}
            />
            <h2>Add New Texture</h2>
          </div>
          <img
            src={assets.close || '/placeholder.svg'}
            alt="Close"
            className={styles.closeButton}
            onClick={onClose}
          />
        </div>

        <div className={styles.mainContent}>
          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Texture Name</label>
            <input
              type="text"
              value={newTextureName}
              onChange={(e) => setNewTextureName(e.target.value)}
              placeholder="Enter texture name"
              className={styles.textInput}
            />
          </div>

          <div className={styles.inputGroup}>
            <label className={styles.inputLabel}>Upload Image</label>
            <div className={styles.uploadRow}>
              <input
                type="file"
                accept="image/*"
                onChange={handleTextureFileChange}
                ref={fileInputRef}
                className={styles.fileInput}
                id="texture-upload-input"
              />
              <label htmlFor="texture-upload-input" className={styles.uploadButton}>
                Choose Image
              </label>
              {newTexturePreview && (
                <div className={styles.previewContainer}>
                  <img src={newTexturePreview} alt="Preview" className={styles.previewImage} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={styles.buttonGroup}>
          <button
            onClick={handleSaveNewTexture}
            disabled={isSavingTexture}
            className={styles.saveButton}
          >
            {isSavingTexture ? 'Saving...' : 'Save Texture'}
          </button>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
