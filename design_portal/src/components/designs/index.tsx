import styles from '@/components/designs/designs.module.css';
import Header from '@/components/header/header';
import InputField from '@/components/inputfields/InputField';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { ChangeEvent, useEffect, useRef, useState } from 'react';
import { IconType } from 'react-icons';
import {
  LuArrowRight,
  LuBox,
  LuCalendar,
  LuCircleCheck,
  LuCircleDot,
  LuEllipsisVertical,
  LuFolderOpen,
  LuLayers,
  LuLayoutGrid,
  LuList,
  LuPackageCheck,
  LuPencil,
  LuPenLine,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuTriangleAlert,
  LuUser,
  LuX,
} from 'react-icons/lu';
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
  const dropdownButtonRef = useRef<HTMLButtonElement | null>(null);
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

  const STATUS_ICON: Record<string, IconType> = {
    Draft: LuPenLine,
    Ready: LuCircleCheck,
    Nesting: LuLayoutGrid,
    Completed: LuPackageCheck,
    Deleted: LuTrash2,
  };

  const designMeta = (design: Design) =>
    [design.order_number, design.customer_company, design.project_type].filter(Boolean).join(' · ');

  const renderStatus = (status: string, variant: 'LIST' | 'GRID') => {
    const StatusIcon = STATUS_ICON[status] ?? LuCircleDot;
    return (
      <div
        className={`${variant === 'LIST' ? styles.status : styles.gridStatus} ${statusStyles[variant][status] ?? ''}`}
      >
        <StatusIcon aria-hidden="true" />
        {status}
      </div>
    );
  };

  const renderActionMenu = (design: Design, menuClass: string) => (
    <>
      <button
        type="button"
        className={`${styles.three_icon} ${design.status === 'Deleted' ? styles.three_icon_disabled : ''}`}
        aria-label="Design actions"
        onClick={(e) => handlathreedot(e, design.id, design.status)}
      >
        <LuEllipsisVertical aria-hidden="true" />
      </button>
      {activeDropdownId === design.id && (
        <div className={menuClass} ref={actionDropdownRef}>
          <ul className={styles.three_dots_dropdown}>
            <li onClick={(e) => handleEditClickPopUp(e, design.id)}>
              <LuPencil className={styles.actionIcon} aria-hidden="true" />
              Edit details
            </li>
            <li className={styles.delete} onClick={(e) => handleDeleteClickPopUp(e, design.id)}>
              <LuTrash2 className={styles.actionIcon} aria-hidden="true" />
              Move to trash
            </li>
          </ul>
        </div>
      )}
    </>
  );

  const activeFilterLabel =
    filterStatusOptions.find((opt) => opt.value === activeFilter)?.label ?? 'All Designs';

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Designs" />

        <div className={styles.maincontent}>
          {/* Studio rail: new design + status shelves */}
          <aside className={styles.studioRail} aria-label="Design library">
            <button
              type="button"
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
              <span className={styles.eyebrow}>
                <LuBox aria-hidden="true" />
                Design studio
              </span>
              <span className={styles.createdesingtext}>
                <strong>Start a new piece</strong>
                <small>Cabinets, wardrobes and kitchens in 3D — then nesting and production.</small>
              </span>
              <span className={styles.createPill}>
                <LuPlus aria-hidden="true" />
                New design
              </span>
            </button>

            <div className={styles.shelfBlock}>
              <span className={styles.shelfLabel}>Status</span>
              <nav className={styles.statusList} aria-label="Filter by status">
                {filterStatusOptions.map((opt) => {
                  const OptIcon = opt.value ? (STATUS_ICON[opt.value] ?? LuCircleDot) : LuLayers;
                  const count = opt.value
                    ? designs.filter((dsg) => dsg.status === opt.value).length
                    : designs.length;
                  const isActive = activeFilter === opt.value;
                  return (
                    <button
                      type="button"
                      key={opt.label}
                      aria-pressed={isActive}
                      className={`${styles.statusItem} ${isActive ? styles.statusItemActive : ''}`}
                      onClick={() => setActiveFilter(opt.value)}
                    >
                      <OptIcon className={styles.statusItemIcon} aria-hidden="true" />
                      <span>{opt.label}</span>
                      <span className={styles.statusItemCount}>{count}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Create Popup */}
          {showPopup && (
            <div className={styles.createpopupOverlay}>
              <div className={styles.createpopup}>
                <div className={styles.createheader}>
                  <span className={styles.modalIcon}>
                    <LuPlus aria-hidden="true" />
                  </span>
                  <div>
                    <h2>New design</h2>
                    <p>Name your design and add the order details to get started.</p>
                  </div>
                  <button
                    type="button"
                    className={styles.createclose}
                    aria-label="Close"
                    onClick={() => setShowPopup(false)}
                  >
                    <LuX aria-hidden="true" />
                  </button>
                </div>
                <form
                  className={styles.modalBody}
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleCreateDesign();
                  }}
                >
                  <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>Design details</h3>
                    <div className={`${styles.twoColsWrapper} ${styles.scrollArea}`}>
                      {projectFields.map((field, i) => (
                        <InputField
                          key={i}
                          className={styles.inputField}
                          mediumField
                          borderColor="rgba(84, 83, 51, 0.1)"
                          {...field}
                          error=""
                        />
                      ))}
                    </div>
                  </div>

                  <div className={styles.formSection}>
                    <h3 className={styles.formSectionTitle}>Customer details</h3>
                    <div className={`${styles.customerGrid} ${styles.scrollArea}`}>
                      {customerFields.map((field, i) => (
                        <InputField
                          key={i}
                          className={styles.inputField}
                          mediumField
                          borderColor="rgba(84, 83, 51, 0.1)"
                          {...field}
                          error={errors[(field as any).id] ?? ''}
                        />
                      ))}
                    </div>
                  </div>
                </form>
                <div className={styles.createButtonGrop}>
                  <button className={styles.cancelcreateButton} onClick={() => setShowPopup(false)}>
                    Cancel
                  </button>
                  <button className={styles.createcontinueButton} onClick={handleCreateDesign}>
                    Start designing
                    <LuArrowRight aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Design List / Grid Section */}
          <div className={styles.designs}>
            <div className={styles.designfirstpart}>
              <div className={styles.listHeading}>
                <span className={styles.listEyebrow}>Library</span>
                <h2>{activeFilterLabel}</h2>
              </div>

              <div className={styles.searchWrapper}>
                <LuSearch className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search designs by name…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              <div className={styles.viewToggle} role="group" aria-label="View">
                <button
                  type="button"
                  className={activeView === 'list' ? styles.activeView : ''}
                  onClick={() => setActiveView('list')}
                  aria-label="List view"
                  title="List view"
                >
                  <LuList aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={activeView === 'grid' ? styles.activeView : ''}
                  onClick={() => setActiveView('grid')}
                  aria-label="Grid view"
                  title="Grid view"
                >
                  <LuLayoutGrid aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className={styles.designviewpart}
              ref={designsScrollRef}
              onScroll={handleDesignsScroll}
            >
              {loading && (
                <div className={styles.stateBox}>
                  <div className={styles.scrollLoaderSpinner} />
                  <p>Loading your designs…</p>
                </div>
              )}
              {!loading && filteredDesigns.length === 0 && (
                <div className={styles.stateBox}>
                  <span className={styles.stateIcon}>
                    <LuFolderOpen aria-hidden="true" />
                  </span>
                  <strong>No designs found</strong>
                  <p>Try a different search or filter, or create a new design.</p>
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
                      <span className={styles.design_list_icon}>
                        <LuBox aria-hidden="true" />
                      </span>
                      <div className={styles.designviewcontent}>
                        <div className={styles.designTitleBlock}>
                          <h4 className={styles.designName}>{design.design_name}</h4>
                          {designMeta(design) && (
                            <p className={styles.designMeta}>{designMeta(design)}</p>
                          )}
                        </div>
                        <div className={styles.designsdetailsontime}>
                          <div className={styles.designCreatedAt}>
                            <p className={styles.designTime}>
                              <LuUser aria-hidden="true" />
                              Author
                            </p>
                            <span className={styles.userName}>{userdetails?.username || '—'}</span>
                          </div>
                          <div className={styles.designUpdateAt}>
                            <p className={styles.designTime}>
                              <LuCalendar aria-hidden="true" />
                              Updated
                            </p>
                            <span className={styles.userName}>{formatDate(design.updated_at)}</span>
                          </div>
                        </div>
                        {renderStatus(design.status, 'LIST')}
                      </div>

                      <div className={styles.threedot_container}>
                        {renderActionMenu(design, styles.three_dots)}
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
                      <div className={styles.gridPreview}>
                        <LuBox aria-hidden="true" />
                        <div className={styles.gridAction}>
                          {renderActionMenu(design, styles.gridthree_dots)}
                        </div>
                      </div>
                      <div className={styles.gridItem}>
                        <div className={styles.gridTitle}>
                          <p title={design.design_name}>{design.design_name}</p>
                          {designMeta(design) && (
                            <span className={styles.designMeta}>{designMeta(design)}</span>
                          )}
                        </div>
                      </div>
                      <div className={styles.gridBottom}>
                        {renderStatus(design.status, 'GRID')}
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
                <p>Loading more designs…</p>
              </div>
            )}
          </div>
        </div>

        {/* Edit Popup */}
        {showEditPopup && (
          <div className={styles.createpopupOverlay} onClick={() => setshowEditPopup(false)}>
            <div className={styles.createpopup} onClick={(e) => e.stopPropagation()}>
              <div className={styles.createheader}>
                <span className={styles.modalIcon}>
                  <LuPencil aria-hidden="true" />
                </span>
                <div>
                  <h2>Edit design</h2>
                  <p>Update the design and customer details.</p>
                </div>
                <button
                  type="button"
                  className={styles.createclose}
                  aria-label="Close"
                  onClick={() => setshowEditPopup(false)}
                >
                  <LuX aria-hidden="true" />
                </button>
              </div>
              <form className={styles.modalBody} onSubmit={(e) => e.preventDefault()}>
                <div className={styles.formSection}>
                  <h3 className={styles.formSectionTitle}>Design details</h3>
                  <div className={`${styles.twoColsWrapper} ${styles.scrollArea}`}>
                    {editProjectFields.map((field, i) => (
                      <InputField
                        key={i}
                        className={styles.inputField}
                        mediumField
                        borderColor="rgba(84, 83, 51, 0.1)"
                        {...field}
                        error=""
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3 className={styles.formSectionTitle}>Customer details</h3>
                  <div className={`${styles.customerGrid} ${styles.scrollArea}`}>
                    {customerFields.map((field, i) => (
                      <InputField
                        key={i}
                        className={styles.inputField}
                        mediumField
                        borderColor="rgba(84, 83, 51, 0.1)"
                        {...field}
                        error={errors[(field as any).id] ?? ''}
                      />
                    ))}
                  </div>
                </div>
              </form>
              <div className={styles.createButtonGrop}>
                <button
                  className={styles.cancelcreateButton}
                  onClick={() => setshowEditPopup(false)}
                >
                  Cancel
                </button>
                <button className={styles.createcontinueButton} onClick={handleEditClick}>
                  Save changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Popup */}
        {showDeletePopup && (
          <div className={styles.deletepopupOverlay} onClick={() => setshowDeletePopup(false)}>
            <div className={styles.deletepopup} onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={styles.close}
                aria-label="Close"
                onClick={() => setshowDeletePopup(false)}
              >
                <LuX aria-hidden="true" />
              </button>
              <span className={styles.deletepopupicon}>
                <LuTriangleAlert aria-hidden="true" />
              </span>
              <div className={styles.right_side}>
                <h2>Move design to trash?</h2>
                <p>
                  <strong>{designName || 'This design'}</strong> will be moved to the trash. You can
                  restore it later if needed.
                </p>
              </div>
              <div className={styles.deleteButtonGrop}>
                <button className={styles.cancelButton} onClick={() => setshowDeletePopup(false)}>
                  No, keep it
                </button>
                <button className={styles.deleteButton} onClick={handleDeleteClick}>
                  <LuTrash2 aria-hidden="true" />
                  Yes, move to trash
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
