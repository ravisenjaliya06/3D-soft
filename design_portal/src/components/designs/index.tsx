import styles from '@/components/designs/designs.module.css';
import Header from '@/components/header/header';
import InputField from '@/components/inputfields/InputField';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { resetStoreForNewDesign, store } from '../3dmodel/store';
import { Design, DesignResponse, User } from './interface';

type StatusStylesType = {
  [key: string]: { [key: string]: string };
};

const Designs = () => {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [visibleDesigns, setVisibleDesigns] = useState(6);
  const [showPopup, setShowPopup] = useState(false);
  const [designName, setDesingName] = useState('');
  const [designStatus, setDesingStatus] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const actionDropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const [showEditPopup, setshowEditPopup] = useState(false);
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
    { value: null, label: 'All Projects', icon: assets.design_list_icon, color: '' },
    { value: 'Draft', label: 'Draft', icon: assets.draft_svg, color: styles.statusDraft },
    { value: 'Ready', label: 'Ready', icon: assets.ready_svg, color: styles.statusReady },
    { value: 'Nesting', label: 'Nesting', icon: assets.nesting_svg, color: styles.statusNesting },
    {
      value: 'Completed',
      label: 'Completed',
      icon: assets.complate_svg,
      color: styles.statusCompleted,
    },
    { value: 'Deleted', label: 'Deleted', icon: assets.delete_svg, color: styles.statusDelete },
  ];

  const fields = [
    {
      label: 'Design Name',
      id: 'name',
      type: 'text',
      placeholder: 'Enter a creative name...',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
    },
  ];

  const editFields = [
    {
      label: 'Design Name',
      type: 'text',
      placeholder: 'Update name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
      value: designName,
    },
    {
      label: 'Current Status',
      type: 'select',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingStatus(e.target.value),
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
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDesigns();
    fetchUserDetails();
  }, []);

  const fetchUserDetails = async () => {
    try {
      const response: { status: number; data: User } = await CommonService.get(
        API_ENDPOINT.GET_USER_DETAILS
      );
      if (response.status === 200) {
        setUserDetails(response.data);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const filteredDesigns = designs.filter((design) => {
    const matchesSearch = design.design_name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = activeFilter ? design.status === activeFilter : true;
    return matchesSearch && matchesStatus;
  });

  const handleCreateDesign = async () => {
    if (!designName.trim()) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('design_name', designName);

    try {
      const response: { status: number; data: Design } = await CommonService.post(
        API_ENDPOINT.CREATE_DESIGN,
        formData
      );
      if (response.status === 201) {
        router.push(`/template/${response.data.id}`);
      } else {
        setApiErrorMessage(response.data.detail);
        setErrorPopup(true);
        setTimeout(() => setErrorPopup(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setShowPopup(false);
      setLoading(false);
    }
  };

  const handleEditClick = async () => {
    if (!selectedDesign) return;
    setLoading(true);
    const formData = new FormData();
    formData.append('design_name', designName);
    formData.append('status', designStatus);

    try {
      const response: { status: number; data: Design } = await CommonService.put(
        API_ENDPOINT.UPDATE_DESIGN_DETAILS(selectedDesign.id),
        formData
      );
      if (response.status === 200) {
        setshowEditPopup(false);
        await fetchDesigns();
      }
    } catch (error) {
      console.error('Error updating design:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = async () => {
    if (!selectedDesign) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('design_name', designName || '');
      formData.append('status', 'Deleted');

      const response: { status: number; data: Design } = await CommonService.put(
        API_ENDPOINT.UPDATE_DESIGN_DETAILS(selectedDesign.id),
        formData
      );
      if (response.status === 200) {
        setshowDeletePopup(false);
        await fetchDesigns();
      }
    } catch (error) {
      console.error('Error deleting design:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlathreedot = (event: React.MouseEvent, designId: string, designStatus: string) => {
    if (designStatus === 'Deleted') return;
    event.stopPropagation();
    setActiveDropdownId((prevId) => (prevId === designId ? null : designId));
  };

  const handleEditClickPopUp = (event: React.MouseEvent, designId: string) => {
    event.stopPropagation();
    const design = designs.find((d) => d.id === designId);
    if (design) {
      setSelectedDesign(design);
      setDesingName(design.design_name);
      setDesingStatus(design.status);
      setshowEditPopup(true);
      setActiveDropdownId(null);
    }
  };

  const handleDeleteClickPopUp = (event: React.MouseEvent, designId: string) => {
    event.stopPropagation();
    const design = designs.find((d) => d.id === designId);
    if (design) {
      setSelectedDesign(design);
      setDesingName(design.design_name);
      setDesingStatus(design.status);
      setshowDeletePopup(true);
      setActiveDropdownId(null);
    }
  };

  const handleRedirectDesign = (id: string) => {
    store.dispatch(resetStoreForNewDesign());
    router.push(`/design/${id}`);
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      // Handle Filter Dropdown
      if (
        isDropdownOpen &&
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
      // Handle Action Menu
      if (
        activeDropdownId &&
        actionDropdownRef.current &&
        !actionDropdownRef.current.contains(event.target as Node)
      ) {
        setActiveDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen, activeDropdownId]);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className={styles.container}>
      {errorPopup && (
        <div className={styles.errorPopup}>
          <img src={assets.error} alt="Error" />
          <p>{apiErrorMessage}</p>
        </div>
      )}

      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Design Studio" />

        <div className={styles.maincontent}>
          {/* Welcome Section */}
          <div className={styles.createdesigns}>
            <div className={styles.createdesignscontent}>
              <h2 className={styles.createdesignstext}>Ready for a new masterpiece?</h2>
              <p className={styles.createdesignssubtext}>
                Bring your ideas to life with our advanced 3D modeling and visualization suite.
              </p>
            </div>

            <div className={styles.createdesignButton} onClick={() => setShowPopup(true)}>
              <div className={styles.createdesignButtoncontent}>
                <div className={styles.createdesing}>
                  <img src={assets.plus_icon} alt="+" />
                  <div className={styles.createdesingtext}>
                    <h4>Create New Design</h4>
                    <p>Start from scratch or a template</p>
                  </div>
                </div>
                <div className={styles.createbuttonimage}>
                  <img src={assets.createdesignicon} alt="Design studio" />
                </div>
              </div>
            </div>
          </div>

          {/* Create Popup */}
          {showPopup && (
            <div className={styles.createpopupOverlay}>
              <div className={styles.createpopup}>
                <img src={assets.createicon} className={styles.createicon} alt="Studio" />
                <img
                  src={assets.close}
                  className={styles.createclose}
                  alt="Close"
                  onClick={() => setShowPopup(false)}
                />
                <div className={styles.create_right_side}>
                  <h2>New Project</h2>
                  <p>Give your design a name to get started.</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateDesign();
                    }}
                  >
                    <div className={styles.createinputGroup}>
                      {fields.map((field, i) => (
                        <InputField
                          key={i}
                          borderColor="rgba(57, 37, 121, 0.1)"
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
                    Start Design
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Design List / Grid Section */}
          <div className={styles.designs}>
            <div className={styles.designfirstpart}>
              <div className={styles.searchWrapper}>
                <img src={assets.search_design} alt="Search" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search your designs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.designsIcon}>
                <div className={styles.filterWrapper}>
                  <img
                    src={assets.sort_searching}
                    alt="Filter"
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    ref={dropdownButtonRef}
                    className={activeFilter ? styles.activeView : ''}
                  />
                  {isDropdownOpen && (
                    <div className={styles.dropdownMenuProfile} ref={filterDropdownRef}>
                      {filterStatusOptions.map((opt) => (
                        <div
                          key={opt.label}
                          className={`${styles.dropdownItem} ${activeFilter === opt.value ? styles.activeDropdownItem : ''}`}
                          onClick={() => {
                            setActiveFilter(opt.value);
                            setIsDropdownOpen(false);
                          }}
                        >
                          <img
                            src={opt.icon}
                            alt={opt.label}
                            className={styles.dropdownStatusIcon}
                          />
                          {opt.label}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <img
                  src={activeView === 'list' ? assets.list_formate : assets.disactive_list}
                  alt="List"
                  className={activeView === 'list' ? styles.activeView : ''}
                  onClick={() => setActiveView('list')}
                />
                <img
                  src={activeView === 'grid' ? assets.active_grid : assets.grid_formate}
                  alt="Grid"
                  className={activeView === 'grid' ? styles.activeView : ''}
                  onClick={() => setActiveView('grid')}
                />
              </div>
            </div>

            <div className={styles.designviewpart}>
              {loading && <div className="p-8 text-center text-slate-400">Loading catalog...</div>}
              {!loading && filteredDesigns.length === 0 && (
                <div className="rounded-3xl border border-dashed bg-white p-12 text-center font-medium text-slate-400">
                  No projects found matching your criteria.
                </div>
              )}

              {activeView === 'list' ? (
                <div className={styles.listView}>
                  {filteredDesigns.slice(0, visibleDesigns).map((design) => (
                    <div
                      key={design.id}
                      className={`${styles.designview} ${design.status === 'Deleted' ? styles.cursorNotAllowed : ''} ${activeDropdownId === design.id ? styles.activeDesignRow : ''}`}
                      onClick={() => design.status !== 'Deleted' && handleRedirectDesign(design.id)}
                    >
                      <img
                        src={assets.design_list_icon}
                        className={styles.design_list_icon}
                        alt="D"
                      />
                      <div className={styles.designviewcontent}>
                        <h4 className={styles.designName}>{design.design_name}</h4>
                        <div className={styles.designsdetailsontime}>
                          <div className={styles.designCreatedAt}>
                            <p className={styles.designTime}>Author</p>
                            <span className={styles.userName}>{userdetails?.username || '—'}</span>
                          </div>
                          <div className={styles.designUpdateAt}>
                            <p className={styles.designTime}>Updated</p>
                            <span className={styles.userName}>{formatDate(design.updated_at)}</span>
                          </div>
                        </div>
                        <div className={`${styles.status} ${statusStyles['LIST'][design.status]}`}>
                          <img src={statusStyles['SVG'][design.status]} alt="" />
                          {design.status}
                        </div>
                      </div>

                      <div className={styles.threedot_container}>
                        <img
                          src={assets.three_dots}
                          alt="Menu"
                          className={styles.three_icon}
                          onClick={(e) => handlathreedot(e, design.id, design.status)}
                        />
                        {activeDropdownId === design.id && (
                          <div className={styles.three_dots} ref={actionDropdownRef}>
                            <ul className={styles.three_dots_dropdown}>
                              <li onClick={(e) => handleEditClickPopUp(e, design.id)}>
                                <img src={assets.editicon} alt="" className={styles.actionIcon} />{' '}
                                Edit Details
                              </li>
                              <li
                                className={styles.delete}
                                onClick={(e) => handleDeleteClickPopUp(e, design.id)}
                              >
                                <img src={assets.deleteicon} alt="" className="w-4" /> Move to Trash
                              </li>
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.gridView}>
                  {filteredDesigns.slice(0, visibleDesigns).map((design) => (
                    <div
                      key={design.id}
                      className={`${styles.gridItemContainer} ${design.status === 'Deleted' ? styles.cursorNotAllowed : ''} ${activeDropdownId === design.id ? styles.activeDesignRow : ''}`}
                      onClick={() => design.status !== 'Deleted' && handleRedirectDesign(design.id)}
                    >
                      <div className={styles.gridItem}>
                        <div className={styles.gridTitle}>
                          <img src={assets.grid_computer} alt="GLB" />
                          <p title={design.design_name}>{design.design_name}</p>
                        </div>
                        <div className={styles.gridAction}>
                          <img
                            src={assets.three_dots}
                            alt="Menu"
                            className={styles.three_icon}
                            onClick={(e) => handlathreedot(e, design.id, design.status)}
                          />
                          {activeDropdownId === design.id && (
                            <div className={styles.gridthree_dots} ref={actionDropdownRef}>
                              <ul className={styles.three_dots_dropdown}>
                                <li onClick={(e) => handleEditClickPopUp(e, design.id)}>
                                  <img src={assets.editicon} alt="" className="w-4" /> Edit
                                </li>
                                <li
                                  className={styles.delete}
                                  onClick={(e) => handleDeleteClickPopUp(e, design.id)}
                                >
                                  <img src={assets.deleteicon} alt="" className="w-4" /> Trash
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={styles.gridBottom}>
                        <div
                          className={`${styles.gridStatus} ${statusStyles['GRID'][design.status]}`}
                        >
                          <img src={statusStyles['SVG'][design.status]} alt="" />
                          {design.status}
                        </div>
                        <div className={styles.gridDesignUpdateAt}>
                          <p className={styles.gridDesignTime}>Updated</p>
                          <p className={styles.gridUserSubtitle}>{formatDate(design.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {visibleDesigns < filteredDesigns.length && (
              <div className={styles.designsLoadMore}>
                <div
                  className={styles.loadmore}
                  onClick={() => setVisibleDesigns((prev) => prev + 6)}
                >
                  <p>View More Projects</p>
                  <img src={assets.progress_upload} alt="" className={styles.process_upload} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Popup */}
        {showEditPopup && (
          <div className={styles.popupOverlay} onClick={() => setshowEditPopup(false)}>
            <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
              <img src={assets.editpopupicon} className={styles.editpopupicon} alt="Edit" />
              <img
                src={assets.close}
                className={styles.editclose}
                alt="X"
                onClick={() => setshowEditPopup(false)}
              />
              <div className={styles.edit_right_side}>
                <h3>Project Settings</h3>
                <p>Update your design name or status below.</p>
              </div>
              <form onSubmit={(e) => e.preventDefault()}>
                <div className={styles.inputGroup}>
                  {editFields.map((field, i) => (
                    <InputField key={i} borderColor="rgba(57, 37, 121, 0.1)" {...field} error="" />
                  ))}
                </div>
              </form>
              <div className={styles.editButtonGrop}>
                <button className={styles.canceleditButton} onClick={() => setshowEditPopup(false)}>
                  Cancel
                </button>
                <button className={styles.continueButton} onClick={handleEditClick}>
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Popup */}
        {showDeletePopup && (
          <div className={styles.deletepopupOverlay} onClick={() => setshowDeletePopup(false)}>
            <div className={styles.deletepopup} onClick={(e) => e.stopPropagation()}>
              <img src={assets.deletepopup} className={styles.deletepopupicon} alt="Delete" />
              <img
                src={assets.close}
                className={styles.close}
                alt="X"
                onClick={() => setshowDeletePopup(false)}
              />
              <div className={styles.right_side}>
                <h2>Discard Design?</h2>
                <p>This will move the design to the trash. You can restore it later if needed.</p>
              </div>
              <div className={styles.deleteButtonGrop}>
                <button className={styles.cancelButton} onClick={() => setshowDeletePopup(false)}>
                  No, Keep it
                </button>
                <button className={styles.deleteButton} onClick={handleDeleteClick}>
                  Yes, Move to Trash
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Designs;
