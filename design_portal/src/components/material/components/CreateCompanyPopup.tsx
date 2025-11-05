import { assets } from '@/svgPaths';
import InputField from '@/components/inputfields/InputField';
import type React from 'react';
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
      <div className={styles.createpopup}>
        <img
          src={assets.createicon || '/placeholder.svg'}
          className={styles.createicon}
          alt="createicon"
        />
        <img
          src={assets.close || '/placeholder.svg'}
          className={styles.createclose}
          alt="close"
          onClick={onClose}
        />
        <div className={styles.create_right_side}>
          <h2>Create Company</h2>
          <p>Please fill all the details to create company.</p>
          <form
            className={styles.form}
            onSubmit={(e) => {
              e.preventDefault();
              onCreateCompany();
            }}
          >
            <div className={styles.createinputGroup}>
              <InputField
                mediumField={true}
                className={styles.inputField}
                borderColor="var(--primary-color-grey-2)"
                value={companyName}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  onCompanyNameChange(e.target.value)
                }
                placeholder="Enter Company Name"
                label={companyName ? 'Company Name' : ''}
                error={error || ''}
              />
            </div>
          </form>
        </div>
        <div className={styles.createButtonGrop}>
          <button className={styles.cancelcreateButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.createcontinueButton} onClick={onCreateCompany}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
};
