import InputField from '@/components/inputfields/InputField';
import type React from 'react';
import { LuBuilding2, LuTrash2, LuTriangleAlert, LuX } from 'react-icons/lu';
import styles from '../material.module.css';

interface CreateCompanyPopupProps {
  companyName: string;
  error: string | null;
  onCompanyNameChange: (name: string) => void;
  onCreateCompany: () => void;
  onClose: () => void;
}

export const CreateCompanyPopup: React.FC<CreateCompanyPopupProps> = ({
  companyName,
  error,
  onCompanyNameChange,
  onCreateCompany,
  onClose,
}) => {
  return (
    <div className={styles.createpopupOverlay}>
      <div className={`${styles.createpopup} ${styles.createCompanyPopup}`}>
        <div className={styles.popupHead}>
          <span className={styles.createicon}>
            <LuBuilding2 aria-hidden="true" />
          </span>
          <div className={styles.create_right_side}>
            <h2>Add supplier</h2>
            <p>Add a supplier or brand to group its materials under this material type.</p>
          </div>
          <button type="button" className={styles.createclose} aria-label="Close" onClick={onClose}>
            <LuX aria-hidden="true" />
          </button>
        </div>
        <form
          className={styles.form}
          onSubmit={(e) => {
            e.preventDefault();
            onCreateCompany();
          }}
        >
          <div className={styles.createinputGroup}>
            <InputField
              fullWidth={true}
              borderColor="var(--primary-color-grey-2)"
              value={companyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onCompanyNameChange(e.target.value)
              }
              placeholder="e.g. Rehau, Blum, Hettich"
              label={companyName ? 'Supplier name' : ''}
              error={error || ''}
            />
          </div>
        </form>
        <div className={`${styles.createButtonGrop} ${styles.createCompanyButtonGrop}`}>
          <button className={styles.cancelcreateButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.createcontinueButton} onClick={onCreateCompany}>
            Add supplier
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmDeletePopupProps {
  onConfirm: () => void;
  onClose: () => void;
  itemName?: string;
}

export const ConfirmDeletePopup: React.FC<ConfirmDeletePopupProps> = ({
  onConfirm,
  onClose,
  itemName,
}) => {
  return (
    <div className={styles.createpopupOverlay} onClick={onClose}>
      <div
        className={`${styles.createpopup} ${styles.deletePopup}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className={styles.createclose} aria-label="Close" onClick={onClose}>
          <LuX aria-hidden="true" />
        </button>
        <span className={styles.deleteIcon}>
          <LuTriangleAlert aria-hidden="true" />
        </span>
        <div className={styles.create_right_side}>
          <h2>Delete material?</h2>
          <p>
            <strong>{itemName || 'This material'}</strong> will be moved to the trash.
          </p>
        </div>
        <div className={styles.createButtonGrop}>
          <button className={styles.cancelcreateButton} onClick={onClose}>
            No, keep it
          </button>
          <button
            className={`${styles.createcontinueButton} ${styles.dangerButton}`}
            onClick={onConfirm}
          >
            <LuTrash2 aria-hidden="true" />
            Yes, delete
          </button>
        </div>
      </div>
    </div>
  );
};
