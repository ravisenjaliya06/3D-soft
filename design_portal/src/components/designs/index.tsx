import styles from '@/components/designs/designs.module.css';
import Header from '@/components/header/header';
import InputField from '@/components/inputfields/InputField';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { Design, DesignResponse, User } from './interface';

type StatusStylesType = {
  [key: string]: { [key: string]: string };
};

const Designs = () => {
  const DESIGNS_BATCH_SIZE = 6;
  const SCROLL_THRESHOLD_PX = 120;
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('list');
  const [visibleDesigns, setVisibleDesigns] = useState(DESIGNS_BATCH_SIZE);
  const [isAppendingDesigns, setIsAppendingDesigns] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [designName, setDesingName] = useState('');
  const [designStatus, setDesingStatus] = useState('');
  const [orderNumber, setOrderNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerCompany, setCustomerCompany] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [projectType, setProjectType] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const designsScrollRef = useRef<HTMLDivElement | null>(null);
  const filterDropdownRef = useRef<HTMLDivElement | null>(null);
  const actionDropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);
  const [showEditPopup, setshowEditPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [userdetails, setUserDetails] = useState<User | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  const setFieldError = (fieldId: string, message: string) => {
    setErrors((prev) => ({ ...prev, [fieldId]: message }));
  };

  const clearFieldError = (fieldId: string) => {
    setErrors((prev) => {
      if (!prev[fieldId]) return prev;
      const next = { ...prev };
      delete next[fieldId];
      return next;
    });
  };

  const isEmailValid = (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) return false;
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(trimmed);
  };

  const countDigits = (value: string) => {
    return (value.match(/\d/g) || []).length;
  };

  const isContactCharsAllowed = (contact: string) => {
    // Allow optional leading +, then digits, spaces or dashes only
    return /^\+?[0-9\s-]*$/.test(contact);
  };

  const isContactValid = (contact: string) => {
    const digits = countDigits(contact);
    return digits >= 7 && digits <= 15;
  };

  const handleCustomerChange =
    (fieldId: string, setter: (v: string) => void) => (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setter(value);
      if (fieldId === 'customer_email') {
        if (!value.trim() || isEmailValid(value)) {
          clearFieldError(fieldId);
        } else {
          setFieldError(fieldId, 'Please enter a valid email address.');
        }
        return;
      }
      if (fieldId === 'customer_contact') {
        if (!value.trim() || (isContactCharsAllowed(value) && isContactValid(value))) {
          clearFieldError(fieldId);
        } else {
          setFieldError(
            fieldId,
            'Contact may include spaces/dashes, optional leading +, and must have 7–15 digits.'
          );
        }
        return;
      }
      if (fieldId === 'order_number' || fieldId === 'customer_company') {
        if (value.trim()) {
          clearFieldError(fieldId);
        } else {
          setFieldError(fieldId, 'This field is required.');
        }
      } else {
        clearFieldError(fieldId);
      }
    };

  const filterStatusOptions = [
    { value: null, label: 'All Designs', icon: assets.design_list_icon, color: '' },
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

  const projectFields = [
    {
      label: 'Design Name',
      id: 'name',
      type: 'text',
      placeholder: 'Enter a creative name...',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setDesingName(e.target.value),
      value: designName,
    },
    {
      label: 'Project Type (Optional)',
      id: 'project_type',
      type: 'text',
      placeholder: 'e.g. Wardrobe, Kitchen...',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setProjectType(e.target.value),
      value: projectType,
    },
  ];

  const customerFields = [
    {
      label: 'Order Number*',
      id: 'order_number',
      type: 'text',
      placeholder: 'Enter order number...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('order_number', setOrderNumber)(e),
      value: orderNumber,
    },
    {
      label: 'Customer Name',
      id: 'customer',
      type: 'text',
      placeholder: 'Enter customer name...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer', setCustomerName)(e),
      value: customerName,
    },
    {
      label: 'Customer Company*',
      id: 'customer_company',
      type: 'text',
      placeholder: 'Enter customer company...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer_company', setCustomerCompany)(e),
      value: customerCompany,
    },
    {
      label: 'Customer Address',
      id: 'customer_address',
      type: 'text',
      placeholder: 'Enter customer address...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer_address', setCustomerAddress)(e),
      value: customerAddress,
    },
    {
      label: 'Customer GSTIN',
      id: 'customer_gstin',
      type: 'text',
      placeholder: 'Enter customer GSTIN...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer_gstin', setCustomerGstin)(e),
      value: customerGstin,
    },
    {
      label: 'Customer Contact',
      id: 'customer_contact',
      type: 'text',
      placeholder: 'Enter customer contact...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer_contact', setCustomerContact)(e),
      value: customerContact,
    },
    {
      label: 'Customer Email',
      id: 'customer_email',
      type: 'email',
      placeholder: 'Enter customer email...',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        handleCustomerChange('customer_email', setCustomerEmail)(e),
      value: customerEmail,
    },
  ];

  const editProjectFields = [
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
    {
      label: 'Project Type (Optional)',
      type: 'text',
      placeholder: 'e.g. Wardrobe, Kitchen...',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setProjectType(e.target.value),
      value: projectType,
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

  const hasMoreDesigns = visibleDesigns < filteredDesigns.length;

  const loadMoreDesigns = () => {
    if (!hasMoreDesigns || isAppendingDesigns || loading) return;
    setIsAppendingDesigns(true);

    window.setTimeout(() => {
      setVisibleDesigns((prev) => Math.min(prev + DESIGNS_BATCH_SIZE, filteredDesigns.length));
      setIsAppendingDesigns(false);
    }, 250);
  };

  const handleDesignsScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const reachedBottom =
      target.scrollHeight - target.scrollTop <= target.clientHeight + SCROLL_THRESHOLD_PX;

    if (reachedBottom) {
      loadMoreDesigns();
    }
  };

  const buildDesignFormData = (includeStatus = false) => {
    const formData = new FormData();

    formData.append('design_name', designName);

    if (includeStatus) {
      formData.append('status', designStatus);
    }

    const fields: Record<string, string> = {
      order_number: orderNumber,
      customer_name: customerName,
      customer_company: customerCompany,
      customer_address: customerAddress,
      customer_gstin: customerGstin,
      customer_contact: customerContact,
      customer_email: customerEmail,
      project_type: projectType,
    };

    Object.entries(fields).forEach(([key, value]) => {
      if (value?.trim()) {
        formData.append(key, value.trim());
      }
    });

    return formData;
  };

  const handleCreateDesign = async () => {
    if (!designName.trim()) return;

    // Validate required customer fields
    const validationErrors: Record<string, string> = {};
    const requiredCustomer: Array<[string, string]> = [
      ['order_number', orderNumber],
      ['customer_company', customerCompany],
    ];
    requiredCustomer.forEach(([key, val]) => {
      if (!val || !val.trim()) {
        validationErrors[key] = 'This field is required.';
      }
    });
    if (customerEmail && !isEmailValid(customerEmail)) {
      validationErrors['customer_email'] = 'Please enter a valid email address.';
    }
    if (
      customerContact &&
      (!isContactValid(customerContact) || !isContactCharsAllowed(customerContact))
    ) {
      validationErrors['customer_contact'] =
        'Contact may include spaces/dashes, optional leading +, and must have 7–15 digits.';
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await CommonService.post(API_ENDPOINT.CREATE_DESIGN, buildDesignFormData());

      if (response.status === 201) {
        router.push(`/template/${response.data.id}`);
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

    // Validate required customer fields
    const validationErrors: Record<string, string> = {};
    const requiredCustomer: Array<[string, string]> = [
      ['order_number', orderNumber],
      ['customer_company', customerCompany],
    ];
    requiredCustomer.forEach(([key, val]) => {
      if (!val || !val.trim()) {
        validationErrors[key] = 'This field is required.';
      }
    });
    if (customerEmail && !isEmailValid(customerEmail)) {
      validationErrors['customer_email'] = 'Please enter a valid email address.';
    }
    if (customerContact && !isContactValid(customerContact)) {
      validationErrors['customer_contact'] =
        'Contact must contain 10–15 digits (spaces/dashes allowed).';
    }
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);

    try {
      const response = await CommonService.put(
        API_ENDPOINT.UPDATE_DESIGN_DETAILS(selectedDesign.id),
        buildDesignFormData(true)
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
      setDesingName(design.design_name || '');
      setDesingStatus(design.status || '');
      setOrderNumber(design.order_number || '');
      setCustomerName(design.customer_name || '');
      setCustomerCompany(design.customer_company || '');
      setCustomerAddress(design.customer_address || '');
      setCustomerGstin(design.customer_gstin || '');
      setCustomerContact(design.customer_contact || '');
      setCustomerEmail(design.customer_email || '');
      setProjectType(design.project_type || '');
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

  const handleRedirectDesign = (design: Design) => {
    if (design.versions && design.versions.length > 0) {
      window.location.href = `/design/${design.id}/${design.versions[0].id}`;
    } else {
      window.location.href = `/design/${design.id}`;
    }
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

  useEffect(() => {
    setVisibleDesigns(DESIGNS_BATCH_SIZE);
    setIsAppendingDesigns(false);

    if (designsScrollRef.current) {
      designsScrollRef.current.scrollTop = 0;
    }
  }, [searchQuery, activeFilter, activeView]);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  };

  return (
    <div className={styles.container}>
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

            <div
              className={styles.createdesignButton}
              onClick={() => {
                setDesingName('');
                setDesingStatus('');
                setOrderNumber('');
                setCustomerName('');
                setCustomerCompany('');
                setCustomerAddress('');
                setCustomerGstin('');
                setCustomerContact('');
                setCustomerEmail('');
                setProjectType('');
                setShowPopup(true);
              }}
            >
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
                <div className={styles.create_right_side}>
                  <div className={styles.createheader}>
                    <img
                      src={assets.close}
                      className={styles.createclose}
                      alt="Close"
                      onClick={() => setShowPopup(false)}
                    />
                    <div>
                      <h2>New Design</h2>
                      <p>Give your design a name to get started.</p>
                    </div>
                  </div>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleCreateDesign();
                    }}
                  >
                    <div className={styles.formSection}>
                      <h3 className={styles.formSectionTitle}>Design Details</h3>
                      <div className={`${styles.twoColsWrapper} ${styles.scrollArea}`}>
                        {projectFields.map((field, i) => (
                          <InputField
                            key={i}
                            className={styles.inputField}
                            mediumField
                            borderColor="rgba(57, 37, 121, 0.1)"
                            {...field}
                            error=""
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.formSection}>
                      <h3 className={styles.formSectionTitle}>Customer Details</h3>
                      <div className={`${styles.customerGrid} ${styles.scrollArea}`}>
                        {customerFields.map((field, i) => (
                          <InputField
                            key={i}
                            className={styles.inputField}
                            mediumField
                            borderColor="rgba(57, 37, 121, 0.1)"
                            {...field}
                            error={errors[(field as any).id] ?? ''}
                          />
                        ))}
                      </div>
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

            <div
              className={styles.designviewpart}
              ref={designsScrollRef}
              onScroll={handleDesignsScroll}
            >
              {loading && <div className="p-8 text-center text-slate-400">Loading catalog...</div>}
              {!loading && filteredDesigns.length === 0 && (
                <div className="rounded-3xl bg-white p-12 text-center font-medium text-slate-400">
                  No designs found matching your criteria.
                </div>
              )}

              {activeView === 'list' ? (
                <div className={styles.listView}>
                  {filteredDesigns.slice(0, visibleDesigns).map((design) => (
                    <div
                      key={design.id}
                      className={`${styles.designview} ${design.status === 'Deleted' ? styles.cursorNotAllowed : ''} ${activeDropdownId === design.id ? styles.activeDesignRow : ''}`}
                      onClick={() => design.status !== 'Deleted' && handleRedirectDesign(design)}
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
                                <img src={assets.deleteicon} alt="" className={styles.actionIcon} />{' '}
                                Move to Trash
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
                      onClick={() => design.status !== 'Deleted' && handleRedirectDesign(design)}
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
                                  <img src={assets.editicon} alt="" className={styles.actionIcon} />{' '}
                                  Edit Details
                                </li>
                                <li
                                  className={styles.delete}
                                  onClick={(e) => handleDeleteClickPopUp(e, design.id)}
                                >
                                  <img
                                    src={assets.deleteicon}
                                    alt=""
                                    className={styles.actionIcon}
                                  />{' '}
                                  Move to Trash
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

            {isAppendingDesigns && (
              <div className={styles.scrollLoaderRow}>
                <div className={styles.scrollLoaderSpinner} />
                <p>Loading more designs...</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Popup */}
        {showEditPopup && (
          <div className={styles.createpopupOverlay} onClick={() => setshowEditPopup(false)}>
            <div className={styles.createpopup} onClick={(e) => e.stopPropagation()}>
              <img src={assets.editpopupicon} className={styles.createicon} alt="Edit" />
              <div className={styles.create_right_side}>
                <div className={styles.createheader}>
                  <img
                    src={assets.close}
                    className={styles.createclose}
                    alt="X"
                    onClick={() => setshowEditPopup(false)}
                  />
                  <div>
                    <h2>Edit Project</h2>
                    <p>Update your project and customer details.</p>
                  </div>
                </div>
                <form onSubmit={(e) => e.preventDefault()}>
                  <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>Design Details</h3>
                    <div className={`${styles.twoColsWrapper} ${styles.scrollArea}`}>
                      {editProjectFields.map((field, i) => (
                        <InputField
                          key={i}
                          className={styles.inputField}
                          mediumField
                          borderColor="rgba(57, 37, 121, 0.1)"
                          {...field}
                          error=""
                        />
                      ))}
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>Customer Details</h3>
                    <div className={`${styles.customerGrid} ${styles.scrollArea}`}>
                      {customerFields.map((field, i) => (
                        <InputField
                          key={i}
                          className={styles.inputField}
                          mediumField
                          borderColor="rgba(57, 37, 121, 0.1)"
                          {...field}
                          error={errors[(field as any).id] ?? ''}
                        />
                      ))}
                    </div>
                  </div>
                </form>
              </div>
              <div className={styles.createButtonGrop}>
                <button
                  className={styles.cancelcreateButton}
                  onClick={() => setshowEditPopup(false)}
                >
                  Cancel
                </button>
                <button className={styles.createcontinueButton} onClick={handleEditClick}>
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
