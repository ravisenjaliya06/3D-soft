import InputField from '@/components/inputfields/InputField';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useState } from 'react';
import styles from './CreateDesignPopup.module.css';
import { Design } from './interface';
const CreateDesignPopup = ({
  setShowCreatePopup,
}: {
  setShowCreatePopup: React.Dispatch<React.SetStateAction<boolean>>;
}) => {
  const router = useRouter();
  const [showPopup, setShowPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [designToDelete, setDesignToDelete] = useState<string | null>(null);
  const [designName, setDesingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [errorPopup, setErrorPopup] = useState(false);
  const [designs, setDesigns] = useState<Design[]>([]);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [hoveredDesignId, setHoveredDesignId] = useState<string | null>(null);
  const [visibleDesigns, setVisibleDesigns] = useState(6);

  // Fetch designs when the component mounts
  useEffect(() => {
    const fetchDesigns = async () => {
      setFetchLoading(true);
      const response: { status: number; data: Design[] } = await CommonService.getWithQueryParam(
        'design',
        '',
        'is_custom',
        'true'
      );
      if (response.status === 200) {
        setFetchLoading(false);
        setDesigns(response.data);
      } else {
        setFetchError('Failed to fetch designs');
      }
    };

    fetchDesigns();
  }, []);

  const handleCreateClick = () => {
    setShowPopup(true);
  };

  const handleSelectCustomDesign = (customDesignId: string) => {
    const selectedDesignId = window.location.pathname.split('/')[2];
    router.push(`/design/${selectedDesignId}/customdesign/${customDesignId}`);
    setShowPopup(false);
  };

  const fields = [
    {
      label: 'Name',
      type: 'name',
      placeholder: 'Enter design name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
      error: '',
    },
  ];

  const handleCreateDesign = async () => {
    if (!designName.trim()) {
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('design_name', designName);
    formData.append('is_custom', 'true');
    const response: { status: number; data: Design } = await CommonService.post(
      'design',
      '',
      formData
    );

    if (response.status === 201) {
      const selectedDesignId = window.location.pathname.split('/')[2];
      setLoading(false);
      router.push(`/design/${selectedDesignId}/customdesign/${response.data.id}`);
      setShowPopup(false); // Close the popup on success
    } else {
      setApiErrorMessage(response.data.detail || 'Failed to create design');
      setErrorPopup(true);
    }
  };

  const handleDeleteDesign = async (designId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDesignToDelete(designId);
    setshowDeletePopup(true);
  };

  const handleDeleteConfirm = async () => {
    if (!designToDelete) return;

    try {
      const response: { status: number } = await CommonService.delete('design', designToDelete);
      if (response.status === 200) {
        setDesigns(designs.filter((design) => design.id !== designToDelete));
        setshowDeletePopup(false);
        setDesignToDelete(null);
      }
    } catch (err) {
      console.error('Error deleting design:', err);
      setApiErrorMessage('Failed to delete design');
      setErrorPopup(true);
    }
  };

  const handleEditDesign = (customDesignId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const designId = window.location.pathname.split('/')[2];
    router.push(`/design/${designId}/customdesign/${customDesignId}`);
    setShowPopup(false);
  };

  const handleLoadMore = () => {
    setVisibleDesigns((prev) => prev + 5);
  };

  // First popup (Design List)
  return (
    <div className={styles.overlay}>
      <div className={styles.popup}>
        <div className={styles.header}>
          <button className={styles.createButton} onClick={handleCreateClick}>
            Create New
          </button>
          <p> Custom Design Created </p>
          <img
            src={assets.close}
            className={styles.closeButton}
            alt="close"
            onClick={() => {
              setShowCreatePopup(false);
            }}
          />
        </div>
        <div className={styles.images}>
          <img src={assets.lines} className={styles.lines} alt="lines" />
        </div>
        <div className={styles.designList}>
          {fetchLoading ? (
            <p>Loading designs...</p>
          ) : fetchError ? (
            <p className={styles.error}>{fetchError}</p>
          ) : designs.length === 0 ? (
            <p>No designs available. Create a new one!</p>
          ) : (
            <>
              <div className={styles.designGrid}>
                {designs.slice(0, visibleDesigns).map((design) => (
                  <div
                    key={design.id}
                    className={styles.designCard}
                    onClick={() => handleSelectCustomDesign(design.id)}
                    onMouseEnter={() => setHoveredDesignId(design.id)}
                    onMouseLeave={() => setHoveredDesignId(null)}
                  >
                    <img src={assets.demo} className={styles.demoimage} alt="demoimage" />
                    <div className={styles.names}>
                      <h4>{design.design_name}</h4>
                    </div>
                    {hoveredDesignId === design.id && (
                      <div className={styles.editIcons}>
                        <button
                          className={styles.editButton}
                          onClick={(e) => handleEditDesign(design.id, e)}
                        >
                          <img src={assets.editicon} className={styles.editicon} alt="editicon" />
                        </button>
                        <button
                          className={styles.deleteiconButton}
                          onClick={(e) => handleDeleteDesign(design.id, e)}
                        >
                          <img
                            src={assets.deleteicon}
                            className={styles.deleteicon}
                            alt="deleteicon"
                          />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {visibleDesigns < designs.length && (
                <div className={styles.designsLoadMore}>
                  <div className={styles.loadmore} onClick={handleLoadMore}>
                    <p>Load More</p>
                    <img
                      src={assets.progress_upload}
                      alt="process upload"
                      className={styles.process_upload}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Second popup (Create Design) */}
      {showPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img src={assets.createicon} className={styles.createicon} alt="createicon" />
            <img
              src={assets.close}
              className={styles.createclose}
              alt="close"
              onClick={() => {
                setShowPopup(false);
              }}
            />
            <div className={styles.create_right_side}>
              <h2>Create 3D Model Custom Design</h2>
              <p>Please enter a name for your 3D model design.</p>

              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  handleCreateDesign();
                }}
              >
                <div className={styles.createinputGroup}>
                  {fields.map((field, index) => (
                    <InputField
                      className={styles.inputField}
                      key={index}
                      borderColor="var(--primary-color-grey-2)"
                      {...field}
                      error=""
                    />
                  ))}
                </div>
              </form>
              {errorPopup && <div className={styles.error}>{apiErrorMessage}</div>}
            </div>
            <div className={styles.createButtonGrop}>
              <button
                className={styles.cancelcreateButton}
                onClick={() => {
                  setShowPopup(false);
                }}
              >
                Cancel
              </button>
              <button
                className={styles.createcontinueButton}
                onClick={handleCreateDesign}
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete popup */}
      {showDeletePopup && (
        <div
          className={styles.deletepopupOverlay}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setshowDeletePopup(false);
            }
          }}
        >
          <div className={styles.deletepopup}>
            <img
              src={assets.deletepopupicon}
              alt="deletepopupicon"
              className={styles.deletepopupicon}
            />
            <img
              src={assets.close}
              alt="close"
              onClick={() => setshowDeletePopup(false)}
              className={styles.close}
            />
            <div className={styles.right_side}>
              <h3>Delete Design</h3>
              <p className={styles.deletemassage}>
                Are you sure you want to delete this design? This action cannot be undone.
              </p>
            </div>
            <div className={styles.deleteButtonGrop}>
              <button className={styles.cancelButton} onClick={() => setshowDeletePopup(false)}>
                Cancel
              </button>
              <button className={styles.deleteButton} onClick={handleDeleteConfirm}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateDesignPopup;
