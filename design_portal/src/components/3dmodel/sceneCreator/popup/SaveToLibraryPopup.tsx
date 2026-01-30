import InputField from '@/components/inputfields/InputField';
import { assets } from '@/svgPaths';
import type React from 'react';
import styles from './saveToLibraryPopup.module.css';

interface SaveToLibraryPopupProps {
  catalogName: string;
  error: string | null;
  onCatalogNameChange: (name: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export const SaveToLibraryPopup: React.FC<SaveToLibraryPopupProps> = ({
  catalogName,
  error,
  onCatalogNameChange,
  onSave,
  onClose,
}) => {
  return (
    <div className={styles.createpopupOverlay}>
      <div className={styles.createpopup}>
        <img
          src={assets.save || '/placeholder.svg'}
          className={styles.createicon}
          alt="save"
        />

        <img
          src={assets.close || '/placeholder.svg'}
          className={styles.createclose}
          alt="close"
          onClick={onClose}
        />

        <div className={styles.create_right_side}>
          <h2>Save to Library</h2>

          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              onSave();
            }}
          >
            <div className={styles.createinputGroup}>
              <InputField
                mediumField
                className={styles.inputField}
                borderColor="var(--primary-color-grey-2)"
                value={catalogName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onCatalogNameChange(e.target.value)
                }
                placeholder="Enter Library Name"
                label={catalogName ? 'Catalog Name' : ''}
                error={error || ''}
              />
            </div>
          </form>
        </div>

        <div className={styles.createButtonGrop}>
          <button className={styles.cancelcreateButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.createcontinueButton} onClick={onSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
};
