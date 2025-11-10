import styles from '@/components/designs/designs.module.css';
import Header from '@/components/header/header';
import InputField from '@/components/inputfields/InputField';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndpoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Design, DesignResponse, User } from './interface';
type StatusStylesType = {
  [key: string]: { [key: string]: string };
};

const Designs = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeView, setActiveView] = useState('list');
  const [visibleDesigns, setVisibleDesigns] = useState(6);
  const [showPopup, setShowPopup] = useState(false);
  const [designName, setDesingName] = useState('');
  const [designStatus, setDesingStatus] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const [showEdtiPopup, setshowEdtiPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [errorPopup, setErrorPopup] = useState(false);
  const [userdetails, setUserDetails] = useState<User | null>(null);

  const statusStyles: StatusStylesType = {
    LIST: {
      Draft: styles.statusDraft,
      Deleted: styles.statusDelete,
      Ready: styles.statusReady,
      Nesting: styles.statusNesting,
      Completed: styles.statusCompleted,
    },
    GRID: {
      Draft: styles.gridStatusDraft,
      Deleted: styles.gridStatusDelete,
      Ready: styles.gridStatusReady,
      Nesting: styles.gridStatusNesting,
      Completed: styles.gridStatusCompleted,
    },
    SVG: {
      Draft: assets.draft_svg,
      Deleted: assets.delete_svg,
      Ready: assets.ready_svg,
      Nesting: assets.nesting_svg,
      Completed: assets.complate_svg,
    },
  };
  const filterStatusOptions = [
    { value: null, label: 'All', icon: '', color: '' },
    {
      value: 'Draft',
      label: 'Draft',
      icon: assets.draft_svg,
      color: styles.statusDraft,
    },
    {
      value: 'Deleted',
      label: 'Deleted',
      icon: assets.delete_svg,
      color: styles.statusDelete,
    },
    {
      value: 'Ready',
      label: 'Ready',
      icon: assets.ready_svg,
      color: styles.statusReady,
    },
    {
      value: 'Nesting',
      label: 'Nesting',
      icon: assets.nesting_svg,
      color: styles.statusNesting,
    },
    {
      value: 'Completed',
      label: 'Completed',
      icon: assets.complate_svg,
      color: styles.statusCompleted,
    },
  ];

  const fields = [
    {
      label: 'Name',
      type: 'name',
      placeholder: 'Enter design name',

      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
      error: '',
    },
  ];

  const editFields = [
    {
      label: 'Design Name',
      type: 'name',
      placeholder: 'Enter design name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
      error: '',
      value: designName,
    },
    {
      label: 'Design Status',
      type: 'select',
      placeholder: 'Enter design status',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingStatus(e.target.value),
      error: '',
      options: [
        { value: 'Draft', label: 'Draft' },
        { value: 'Ready', label: 'Ready' },
        { value: 'Nesting', label: 'Nesting' },
        { value: 'Completed', label: 'Completed' },
      ],
      value: designStatus,
    },
  ];

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      const response: {
        status: number;
        data: Design[] | DesignResponse;
      } = await CommonService.get(API_ENDPOINT.GET_NON_CUSTOM_DESIGNS);
      if (response.status === 200) {
        setDesigns(response.data as Design[]);
      } else if (response.status === 403) {
        setError((response.data as DesignResponse).detail);
      } else {
        setError('Something went wrong');
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
      setError('Unathorized Access');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const filteredDesigns = designs.filter((design) => {
    const matchesSearch = design.design_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter ? design.status === activeFilter : true;
    return matchesSearch && matchesStatus;
  });

  const filterData = (status: string | null) => {
    setActiveFilter(status);
    setIsDropdownOpen(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleLoadMore = () => {
    setVisibleDesigns((prev) => prev + 5);
  };

  const handleCreateDesign = async () => {
    if (!designName.trim()) {
      return;
    }
    setLoading(true);

    const formData = new FormData();
    formData.append('design_name', designName);

    const response: { status: number; data: Design } = await CommonService.post(
      API_ENDPOINT.CREATE_DESIGN,
      formData
    );

    if (response.status === 201) {
      router.push({
        pathname: `/template/${response.data.id}`,
      });
    } else {
      setApiErrorMessage(response.data.detail);
      setErrorPopup(true);
    }
    setShowPopup(false);
    setLoading(false);
  };

  const handleEditClick = async () => {
    if (!selectedDesign) return;

    setLoading(true);

    const formData = new FormData();
    formData.append('design_name', designName);
    formData.append('status', designStatus);

    try {
      const response: {
        status: number;
        data: Design;
      } = await CommonService.put(API_ENDPOINT.UPDATE_DESIGN_DETAILS(selectedDesign.id), formData);

      if (response.status === 200) {
        setshowEdtiPopup(false);
        await fetchDesigns();
      }
    } catch (error) {
      console.error('Error updating design:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedDesign) {
      console.error('No design selected for deletion.');
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('design_name', designName || '');
      formData.append('status', 'Deleted');

      const response: {
        status: number;
        data: Design;
      } = await CommonService.put(API_ENDPOINT.UPDATE_DESIGN_DETAILS(selectedDesign.id), formData);

      if (response.status === 200) {
        setshowDeletePopup(false);
        await fetchDesigns();
      } else {
        console.error('Unexpected status code:', response.status);
      }
    } catch (error) {
      console.error('Error deleting design:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleShort = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    const handleOutsideClick = (event: Event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
        setActiveDropdownId(null);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleRedirectDesign = (id: string) => {
    setLoading(true);
    router.push({
      pathname: `/design/${id}`,
    });
    setLoading(false);
  };

  const handlathreedot = (
    event: React.MouseEvent<HTMLImageElement, MouseEvent>,
    designId: string,
    designStatus: string
  ) => {
    if (designStatus === 'Deleted') return;
    event.stopPropagation();
    setActiveDropdownId((prevId) => (prevId === designId ? null : designId));
  };

  const handleEditClickPopUp = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    designId: string
  ) => {
    event.stopPropagation();
    const design = designs.find((design) => design.id === designId);
    if (design) {
      setSelectedDesign(design);
      setDesingName(design.design_name);
      setDesingStatus(design.status);
      setshowEdtiPopup(true);
    }
  };

  const handleDeleteClickPopUp = (
    event: React.MouseEvent<HTMLLIElement, MouseEvent>,
    designId: string
  ) => {
    event.stopPropagation();
    const design = designs.find((design) => design.id === designId);
    if (design) {
      setSelectedDesign(design);
      setDesingName(design.design_name);
      setDesingStatus(design.status);
      setshowDeletePopup(true);
    }
  };

  const fetchUserDetails = async () => {
    try {
      const response: { status: number; data: User } = await CommonService.get(
        API_ENDPOINT.GET_USER_DETAILS
      );
      if (response.status === 200) {
        const userDetails = response.data;
        setUserDetails(userDetails);
      } else {
        console.error('Failed to fetch user details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, []);

  return (
    <div className={styles.container}>
      {errorPopup === true && (
        <div className={styles.successPopup}>
          <img src={assets.error} alt="Error" />
          <p>{apiErrorMessage}</p>
        </div>
      )}

      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Design" />
        <div className={styles.maincontent}>
          <div className={styles.createdesigns}>
            <div className={styles.createdesignscontent}>
              <p className={styles.createdesignstext}>Get Started</p>
              <p className={styles.createdesignssubtext}>
                Follow the guide to create your first design project
              </p>
            </div>
            <div className={styles.createdesignButton} onClick={() => setShowPopup(true)}>
              <div className={styles.createdesignButtoncontent}>
                <div className={styles.createdesing}>
                  <img src={assets.plus_icon} alt="create design" />
                  <div className={styles.createdesingtext}>
                    <h4>Create New Design</h4>
                    <p>All-in-one design for modeling, visualizing, and drawing</p>
                  </div>
                </div>
                <div className={styles.createbuttonimage}>
                  <img src={assets.createdesignicon} alt="create design icon" />
                </div>
              </div>
            </div>
          </div>

          {showPopup && (
            <div className={styles.createpopupOverlay}>
              <div className={styles.createpopup}>
                <img src={assets.createicon} className={styles.createicon} alt="createicon" />
                <img
                  src={assets.close}
                  className={styles.createclose}
                  alt="close"
                  onClick={() => setShowPopup(false)}
                />
                <div className={styles.create_right_side}>
                  <h2>Create Design</h2>
                  <p>Please enter a name for this design.</p>

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
                </div>
                <div className={styles.createButtonGrop}>
                  <button className={styles.cancelcreateButton} onClick={() => setShowPopup(false)}>
                    Cancel
                  </button>
                  <button className={styles.createcontinueButton} onClick={handleCreateDesign}>
                    continue
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.designs}>
            {/* Design View Part */}
            <div className={styles.designfirstpart}>
              <div className={styles.searchWrapper}>
                <img src={assets.search} alt="Search Icon" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search Design"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
              </div>
              <div className={styles.designsIcon}>
                <img
                  src={assets.sort_searching}
                  alt="short search"
                  onClick={handleShort}
                  ref={dropdownButtonRef}
                />
                {isDropdownOpen && (
                  <div className={styles.dropdownMenuProfile} ref={dropdownRef}>
                    <ul className={styles.ProfiledropdownList}>
                      {filterStatusOptions.map((option) => (
                        <li
                          key={option.label}
                          className={`${styles.dropdownItem} ${
                            activeFilter === option.value ? styles.activeDropdownItem : ''
                          }`}
                          onClick={() => filterData(option.value)}
                        >
                          {option.icon && (
                            <img
                              src={option.icon}
                              alt={`${option.label} icon`}
                              className={styles.dropdownStatusIcon}
                            />
                          )}
                          {option.label}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <img
                  src={activeView === 'list' ? assets.list_formate : assets.disactive_list}
                  alt="list formate"
                  className={activeView === 'list' ? styles.activeView : ''}
                  onClick={() => setActiveView('list')}
                />
                <img
                  src={activeView === 'grid' ? assets.active_grid : assets.grid_formate}
                  alt="grid formate"
                  className={activeView === 'grid' ? styles.activeView : ''}
                  onClick={() => setActiveView('grid')}
                />
              </div>
            </div>
            <div className={styles.designviewpart}>
              {loading && <p>Loading...</p>}
              {error && <p className={styles.error}>{error}</p>}
              {!loading && !error && filteredDesigns.length === 0 && (
                <p className={styles.nodesign}>No designs found.</p>
              )}
              {activeView === 'list' ? (
                filteredDesigns.slice(0, visibleDesigns).map((design) => (
                  <div
                    key={design.id}
                    className={`${styles.designview} ${
                      design.status.toLowerCase() === 'deleted' ? styles.cursorNotAllowed : ''
                    }`}
                    onClick={() => {
                      if (design.status.toLowerCase() === 'deleted') return;
                      handleRedirectDesign(design.id);
                    }}
                  >
                    {/* List view content */}
                    <img
                      src={assets.design_list_icon}
                      alt="design list icon"
                      className={styles.design_list_icon}
                    />
                    <div className={styles.designviewcontent}>
                      <h4 className={styles.designName}>{design.design_name}</h4>
                      <div className={styles.designsdetailsontime}>
                        <div className={styles.designCreatedAt}>
                          <p className={styles.designTime}>Created By</p>
                          <sub className={styles.userSubtitle}>
                            {userdetails?.username ? (
                              <div className={styles.userInfo}>
                                <p className={styles.userName} title={userdetails.username}>
                                  {userdetails.username}
                                </p>
                              </div>
                            ) : (
                              <div className={styles.userInfo}>
                                <p className={styles.userName}></p>
                              </div>
                            )}
                          </sub>
                        </div>
                        <div className={styles.designUpdateAt}>
                          <p className={styles.designTime}>Last updated</p>
                          <sub className={styles.userSubtitle}>
                            {new Intl.DateTimeFormat('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }).format(new Date(design.updated_at))}
                          </sub>
                        </div>
                      </div>
                      <div className={`${styles.status} ${statusStyles['LIST'][design.status]}`}>
                        <img src={`${statusStyles['SVG'][design.status]}`} alt="status img" />
                        <p className={styles.statusText}> {design.status}</p>
                      </div>
                    </div>
                    <div className={styles.threedot_container}>
                      <img
                        src={assets.three_dots}
                        alt="design list icon"
                        className={styles.design_list_icon}
                        onClick={(event) => handlathreedot(event, design.id, design.status)}
                      />
                      {activeDropdownId === design.id && (
                        <div className={styles.three_dots} ref={dropdownRef}>
                          <ul className={styles.three_dots_dropdown}>
                            <div className={styles.edit}>
                              <li onClick={(event) => handleEditClickPopUp(event, design.id)}>
                                <img
                                  src={assets.editicon}
                                  alt="edit icon"
                                  className={styles.editicon}
                                />
                                Edit
                              </li>
                            </div>
                            <img
                              src={assets.edit_delete_line}
                              alt="edit-delete-line"
                              className={styles.edit_delete_line}
                            />
                            <div className={styles.delete}>
                              <li onClick={(event) => handleDeleteClickPopUp(event, design.id)}>
                                <img
                                  src={assets.deleteicon}
                                  alt="delete icon"
                                  className={styles.deleteicon}
                                />
                                Deleted
                              </li>
                            </div>
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                /* grid edit - delete popup*/
                <div className={styles.gridView}>
                  {filteredDesigns.slice(0, visibleDesigns).map((design) => (
                    <div
                      key={design.id}
                      className={`${styles.gridItemContainer} ${
                        design.status.toLowerCase() === 'deleted' ? styles.cursorNotAllowed : ''
                      }`}
                      onClick={() => {
                        if (design.status.toLowerCase() === 'deleted') return;
                        handleRedirectDesign(design.id);
                      }}
                    >
                      <div className={styles.gridItem}>
                        <div className={styles.gridTitle}>
                          <img src={assets.grid_computer} alt="design list icon" />
                          <p>{design.design_name}</p>
                        </div>
                        <div className={styles.gridAction}>
                          <img
                            src={assets.three_dots}
                            alt="design list icon"
                            className={styles.design_list_icon}
                            onClick={(event) => handlathreedot(event, design.id, design.status)}
                          />

                          {activeDropdownId === design.id && (
                            <div className={styles.gridthree_dots} ref={dropdownRef}>
                              <ul className={styles.gridthree_dots_dropdown}>
                                <li onClick={(event) => handleEditClickPopUp(event, design.id)}>
                                  <img
                                    src={assets.editicon}
                                    alt="edit icon"
                                    className={styles.gridediticon}
                                  />
                                  Edit
                                </li>

                                <img
                                  src={assets.edit_delete_line}
                                  alt="edit-delete-line"
                                  className={styles.gridedit_delete_line}
                                />

                                <li onClick={(event) => handleDeleteClickPopUp(event, design.id)}>
                                  <img
                                    src={assets.deleteicon}
                                    alt="delete icon"
                                    className={styles.griddeleteicon}
                                  />
                                  Deleted
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.gridBottom}>
                        <div className={styles.gridDesignCreatedAt}>
                          <p className={styles.geidDesignTime}>Created By</p>
                          <sub className={styles.userSubtitle}>
                            {userdetails?.username ? (
                              <div className={styles.userInfo}>
                                <p className={styles.griduserName} title={userdetails.username}>
                                  {userdetails.username}
                                </p>
                              </div>
                            ) : (
                              <div className={styles.userInfo}>
                                <p className={styles.userName}></p>
                              </div>
                            )}
                          </sub>
                        </div>
                        <div
                          className={`${styles.gridStatus} ${statusStyles['GRID'][design.status]}`}
                        >
                          <img src={`${statusStyles['SVG'][design.status]}`} alt="status img" />
                          <p> {design.status} </p>
                        </div>
                        <div className={styles.gridDesignUpdateAt}>
                          <p className={styles.geidDesignTime}>Last updated</p>
                          <p className={styles.gridUserSubtitle}>
                            {new Intl.DateTimeFormat('en-GB', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            }).format(new Date(design.updated_at))}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {visibleDesigns < filteredDesigns.length && (
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

            {/* edit popup */}
            {showEdtiPopup && (
              <div
                className={styles.popupOverlay}
                onClick={(e) => {
                  e.stopPropagation();
                  if (e.target === e.currentTarget) {
                    setshowEdtiPopup(false);
                  }
                }}
              >
                <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
                  <img
                    src={assets.editpopupicon}
                    alt="editpopupicon"
                    className={styles.editpopupicon}
                  />
                  <img
                    src={assets.close}
                    alt="close"
                    onClick={() => setshowEdtiPopup(false)}
                    className={styles.editclose}
                  />

                  <div className={styles.edit_right_side}>
                    <h3>Edit Design</h3>
                    <p>Please change name for this design.</p>
                  </div>
                  <div>
                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                      <div className={styles.inputGroup}>
                        {editFields.map((field, index) => (
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
                  </div>
                  <div className={styles.editButtonGrop}>
                    <button
                      className={styles.canceleditButton}
                      onClick={() => setshowEdtiPopup(false)}
                    >
                      Cancel
                    </button>
                    <button className={styles.continueButton} onClick={handleEditClick}>
                      continue
                    </button>
                  </div>
                </div>
              </div>
            )}

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
                    src={assets.deletepopup}
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
                    <h2>Delete Design</h2>
                    <p className={styles.deletemassage}>
                      Are you sure you want to delete this design? This action cannot be undone.
                    </p>
                  </div>
                  <div className={styles.deleteButtonGrop}>
                    <button
                      className={styles.cancelButton}
                      onClick={() => setshowDeletePopup(false)}
                    >
                      Cancel
                    </button>
                    <button className={styles.deleteButton} onClick={handleDeleteClick}>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Designs;
