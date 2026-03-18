import { RootState } from '@/components/3dmodel/store';
import { updateDesignSettings } from '@/components/3dmodel/store/designSettingsSlice';
import Header from '@/components/header/header';
import styles from '@/components/settings/setting.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import InputField from '../inputfields/InputField';
import { Member, Organization, TeamRole, User, addmember } from './interface';

const Settings = () => {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const [organization, setorganization] = useState<Organization | null>(null);
  const [organizationName, setOrganizationName] = useState('');

  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setNumber] = useState<string>('');
  const [name, setName] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Error States
  const [nameError, setNameError] = useState<string | null>(null);

  const [emailError, setEmailError] = useState<string | null>(null);

  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [UserDetails, setUserDetails] = useState<User | null>(null);

  // --- Company Details ---
  const [companyName, setCompanyName] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyGstin, setCompanyGstin] = useState('');
  const [companyPan, setCompanyPan] = useState('');

  // --- Banking Details ---
  const [bankName, setBankName] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountType, setAccountType] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [branchName, setBranchName] = useState('');
  const [upiId, setUpiId] = useState('');
  const [activeMenu, setActiveMenu] = useState<string>('profile');
  const [activeTab, setActiveTab] = useState('active');
  const [openDropdown, setOpenDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [addMambarPopup, setAddMambarPopup] = useState(false);
  const [organizationImage, setOrganizationImage] = useState<File | null>(null);

  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileUrl, setprofileUrl] = useState('');
  const [organizationUrl, setorganizationUrl] = useState('');
  const [organizationNameError, setOrganizationNameError] = useState<string | null>(null);
  const [allOrganizations, setAllOrganizations] = useState<Organization[]>([]);
  const [selectedGhostOrgId, setSelectedGhostOrgId] = useState<string>(
    (typeof window !== 'undefined' && localStorage.getItem('ghost_org_id')) || ''
  );
  const [ghostAccessType, setGhostAccessType] = useState<string>('view');
  const [selectedMyOrgId, setSelectedMyOrgId] = useState<string>('');

  const [dropdownPosition, setDropdownPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [isDeleteHovered, setIsDeleteHovered] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [addMemberName, setAddMemberName] = useState('');

  const [addMemberEmail, setAddMemberEmail] = useState('');

  const dispatch = useDispatch();
  const designSettings = useSelector((state: RootState) => state.designSettings);

  const [height, setHeight] = useState<number | null>();
  const [width, setWidth] = useState<number | null>();
  const [nestHeight, setNestHeight] = useState<number | null>();
  const [nestWidth, setNestWidth] = useState<number | null>();
  const [designUnit, setDesignUnit] = useState<string | null>();
  const [minifixDistance, setMinifixDistance] = useState<number>(designSettings.minifixDistance);
  const [minifixDiameterHole, setMinifixDiameterHole] = useState<number>(
    designSettings.minifixDiameterHole
  );
  const [camDepth, setCamDepth] = useState<number>(designSettings.camDepth);
  const [camDiameter, setCamDiameter] = useState<number>(designSettings.camDiameter);
  const [camHeight, setCamHeight] = useState<number>(designSettings.camHeight);
  const [edgeBandingDistance, setEdgeBandingDistance] = useState<number>(
    designSettings.edgeBandingDistance
  );

  const rolesList = ['Account Manager', 'Mes Editor', 'Designer', 'Catalog Manager'];

  const [members, setMembers] = useState<Member[]>([]);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);

  const handalGetmember = async () => {
    try {
      const response: { status: number; data: { users: Member[] } } = await CommonService.get(
        API_ENDPOINT.GET_ORGANIZATION_USERS
      );
      if (response.status === 200) {
        const membersData = response.data.users;
        setMembers(membersData);
      } else {
        console.error('Failed to fetch members:', response.status);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const filteredMembers = members.filter((member) =>
    activeTab === 'active' ? !member.is_invited : member.is_invited
  );

  useEffect(() => {
    handalGetmember();
  }, []);
  const handleRoleAddClick = (event: React.MouseEvent<HTMLElement>, memberId: string) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setDropdownPosition({
      x: rect.left + window.scrollX,
      y: rect.bottom + window.scrollY,
    });
    setSelectedMemberId(memberId);
    setOpenDropdown(true);
    event.stopPropagation();
  };

  useEffect(() => {
    const handleScroll = () => {
      if (openDropdown) {
        setOpenDropdown(false);
        setSelectedMemberId(null);
      }
    };

    const tableContainer = tableContainerRef.current;
    if (tableContainer) {
      tableContainer.addEventListener('scroll', handleScroll);
    }

    // Cleanup
    return () => {
      if (tableContainer) {
        tableContainer.removeEventListener('scroll', handleScroll);
      }
    };
  }, [openDropdown]);

  const handleRoleSelect = (role: string, memberId: string) => {
    if (memberId === null) return;

    const selectedMember = members.find((member) => member.id === memberId);

    if (!selectedMember) return;

    const updatedRoles = selectedMember.groups.includes(role)
      ? selectedMember.groups
      : [...selectedMember.groups, role];

    const formData = new FormData();
    updatedRoles.forEach((r) => formData.append('groups', r));

    CommonService.put(API_ENDPOINT.EDIT_ORGANIZATION_USER(memberId), formData)
      .then((response: { status: number; data: TeamRole; memberId: number }) => {
        if (response.status === 200) {
          handalGetmember();
        }
      })
      .catch((error) => console.error('Error updating roles:', error));

    setOpenDropdown(false);
    setDropdownPosition(null);
    setSelectedMemberId(null);
  };

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null);
      }, 2000);
      return () => clearTimeout(timer);
    }
  });

  const handleRoleRemove = (role: string, memberId: string) => {
    setMembers((prevMembers) =>
      prevMembers.map((member) =>
        member.id === memberId
          ? { ...member, groups: member.groups.filter((r) => r !== role) }
          : member
      )
    );

    const selectedMember = members.find((member) => member.id === memberId);
    if (!selectedMember) {
      return;
    }

    // Transform groups array
    const groupsArray =
      Array.isArray(selectedMember.groups) && selectedMember.groups.length > 0
        ? selectedMember.groups[0].includes(',')
          ? selectedMember.groups[0].split(',')
          : selectedMember.groups
        : [];

    // Remove the role
    const updatedRoles = groupsArray.filter((r) => r !== role);

    // Prepare FormData
    const formData = new FormData();
    updatedRoles.forEach((r) => formData.append('groups', r));

    CommonService.put(API_ENDPOINT.EDIT_ORGANIZATION_USER(memberId), formData)
      .then((response) => {
        if (response.status === 200) {
          handalGetmember(); // Ensure this fetches the updated members list
        } else {
        }
      })
      .catch((error) => {
        console.error('API Error:', error);
        alert('Failed to update roles. Check the console for details.');
      });

    setOpenDropdown(false);
    setDropdownPosition(null);
    setSelectedMemberId(null);
  };

  const addmemberfields = [
    {
      label: 'Name',
      type: 'name',
      placeholder: 'Enter name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAddMemberName(e.target.value),
    },
    {
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAddMemberEmail(e.target.value),
    },
  ];
  const fetchUserDetails = async () => {
    try {
      const response: { status: number; data: User } = await CommonService.get(
        API_ENDPOINT.GET_USER_DETAILS
      );
      if (response.status === 200) {
        const UserDetails = response.data;
        setUserDetails(UserDetails);
        setGhostAccessType(UserDetails.ghost_access_type || 'view');
        setSelectedMyOrgId(UserDetails.selected_organization || '');
        if (UserDetails.profile_picture && typeof UserDetails.profile_picture === 'string') {
          const serverImageUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${UserDetails.profile_picture}`;
          setprofileUrl(serverImageUrl);
        } else {
          setprofileUrl('');
        }
      } else {
        console.error('Failed to fetch details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };
  useEffect(() => {
    fetchUserDetails();
  }, []);

  const fetchAllOrganizations = async () => {
    try {
      const response = await CommonService.get(API_ENDPOINT.ALL_ORGANIZATIONS);
      if (response.status === 200) {
        setAllOrganizations(response.data);
      }
    } catch (error) {
      console.error('Error fetching all organizations:', error);
    }
  };

  useEffect(() => {
    if (UserDetails?.is_ghost) {
      fetchAllOrganizations();
    }
  }, [UserDetails]);

  const toPublicUrl = (path?: string | File | null) => {
    if (!path || typeof path !== 'string') return '';
    const normalized = path.replace(/^\/+/, '');
    return `${process.env.NEXT_PUBLIC_PUBLIC_API}/${normalized}`;
  };

  const myOrganizations = UserDetails?.organizations || [];
  const myOrganizationIdSet = new Set(myOrganizations.map((o) => o.id).filter(Boolean) as string[]);
  const ghostOrganizations = allOrganizations.filter((org) => !myOrganizationIdSet.has(org.id || ''));

  const handleMyOrgChange = async (orgId: string) => {
    setSelectedMyOrgId(orgId);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ghost_org_id');
    }
    setSelectedGhostOrgId('');

    try {
      await CommonService.put(API_ENDPOINT.UPDATE_USER_DETAILS, {
        selected_organization: orgId || null,
      });
    } catch (error) {
      console.error('Failed to update selected organization on backend:', error);
    }

    window.location.reload();
  };

  const handleGhostOrgChange = (orgId: string) => {
    setSelectedGhostOrgId(orgId);
    if (typeof window !== 'undefined') {
      if (!orgId) localStorage.removeItem('ghost_org_id');
      else localStorage.setItem('ghost_org_id', orgId);
    }
    window.location.reload();
  };

  const handleGhostPermissionChange = async (type: string) => {
    try {
      const response = await CommonService.put(API_ENDPOINT.UPDATE_GHOST_PERMISSION, {
        ghost_access_type: type,
      });
      if (response.status === 200) {
        setGhostAccessType(type);
        setSuccessMessage('Ghost permission updated successfully!');
      }
    } catch (error) {
      console.error('Error updating ghost permission:', error);
      setErrorMessage('Failed to update ghost permission');
    }
  };

  const handleAddMemberClick = async () => {
    const newMember: addmember = {
      username: addMemberName,
      email: addMemberEmail,
      groups: selectedRoles,
    };

    const formData = new FormData();
    formData.append('username', newMember.username);
    formData.append('email', newMember.email);
    newMember.groups.forEach((groups) => formData.append('groups', groups));

    const response: { status: number; data: addmember } = await CommonService.post(
      API_ENDPOINT.ADD_ORGANIZATION_USER,
      formData
    );

    if (response.status === 201) {
      setSuccessMessage('Member added successfully!');
      setTimeout(() => {
        setSuccessMessage(null);
      }, 3000);
      setAddMemberName('');
      setAddMemberEmail('');
      setSelectedRoles([]);
      setOpenDropdown(false);
      handalGetmember();
      setAddMambarPopup(false);
      setErrorMessage('');
    } else {
      setErrorMessage(
        response.data.username?.[0] || response.data.email?.[0] || 'Failed to add member'
      );
    }
  };

  const handleSave = () => {
    if (!name.trim()) {
      setNameError('Name is required');
      return;
    }
    if (!phone.trim()) {
      setPhoneError('Phone number is required');
      return;
    }
    updateUserDetails();
  };

  const updateOrganizationDetails = async () => {
    const formData = new FormData();
    formData.append('company_name', companyName);
    formData.append('company_address', companyAddress);
    formData.append('company_email', companyEmail);
    formData.append('company_phone', companyPhone);
    formData.append('company_website', companyWebsite);
    formData.append('company_gstin', companyGstin);
    formData.append('company_pan', companyPan);
    formData.append('bank_name', bankName);
    formData.append('account_name', accountName);
    formData.append('account_number', accountNumber);
    formData.append('account_type', accountType);
    formData.append('ifsc_code', ifscCode);
    formData.append('branch_name', branchName);
    formData.append('upi_id', upiId);

    try {
      const response = await CommonService.put(API_ENDPOINT.UPDATE_ORGANIZATION_DETAILS, formData);
      if (response.status === 200) {
        setSuccessMessage('Billing details updated successfully!');
        handalSetOrganization();

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setErrorMessage('Failed to update billing details');

        setTimeout(() => {
          setErrorMessage(null);
        }, 3000);
        console.error('Failed to update organization details:', response.status);
      }
    } catch (error) {
      console.error('Error updating organization details:', error);
      setErrorMessage('Failed to update billing details');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const updateUserDetails = async () => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('phone', phone);
    if (profileImage && profileImage instanceof File) {
      formData.append('profile_picture', profileImage);
    }
    try {
      const response = await CommonService.put(API_ENDPOINT.UPDATE_USER_DETAILS, formData);
      const data = response.data as User;
      if (response.status === 200) {
        setUserDetails(data);
        setPhoneError(data.phone);
        if (data.profile_picture && typeof data.profile_picture === 'string') {
          setprofileUrl(`${process.env.NEXT_PUBLIC_PUBLIC_API}/${data.profile_picture}`);
        }
        setSuccessMessage('Profile updated successfully!');
        fetchUserDetails();

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        setErrorMessage('Failed to update profile');

        setTimeout(() => {
          setErrorMessage(null);
        }, 3000);
        console.error('Failed to update user details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const handleActiveMenu = (menu: string) => {
    setActiveMenu(menu);
  };
  useEffect(() => {
    if (UserDetails) {
      setUsername(UserDetails.username);
      setName(UserDetails.name || '');
      setEmail(UserDetails.email || '');
      setNumber(UserDetails.phone || '');
    }
  }, [UserDetails]);

  useEffect(() => {
    if (organization) {
      setCompanyName(organization.company_name || '');
      setCompanyAddress(organization.company_address || '');
      setCompanyEmail(organization.company_email || '');
      setCompanyPhone(organization.company_phone || '');
      setCompanyWebsite(organization.company_website || '');
      setCompanyGstin(organization.company_gstin || '');
      setCompanyPan(organization.company_pan || '');
      setBankName(organization.bank_name || '');
      setAccountName(organization.account_name || '');
      setAccountNumber(organization.account_number || '');
      setAccountType(organization.account_type || '');
      setIfscCode(organization.ifsc_code || '');
      setBranchName(organization.branch_name || '');
      setUpiId(organization.upi_id || '');
    }
  }, [organization]);

  const designFirstInputFields = [
    {
      label: 'Height',
      type: 'number',
      placeholder: 'Height',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNestHeight(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: nestHeight,
    },
    {
      label: 'Width',
      type: 'number',
      placeholder: 'Width',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNestWidth(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: nestWidth,
    },
  ];
  const designSecondInputFields = [
    {
      label: 'Height',
      type: 'number',
      placeholder: 'Height',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setHeight(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: height,
      readOnly: true,
      InputProps: {
        readOnly: true,
        style: { opacity: 0.2 },
      },
    },
    {
      label: 'Width',
      type: 'number',
      placeholder: 'Width',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setWidth(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: width,
      readOnly: true,
      InputProps: {
        readOnly: true,
        style: { opacity: 0.2 },
      },
    },
  ];
  const designMinifixInputFields = [
    {
      label: 'Distance',
      type: 'number',
      placeholder: 'Distance',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setMinifixDistance(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: minifixDistance,
    },
    {
      label: 'Diameter Hole',
      type: 'number',
      placeholder: 'Diameter Hole',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setMinifixDiameterHole(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: minifixDiameterHole,
    },
  ];
  const designCamlockInputFields = [
    {
      label: 'Diameter',
      type: 'number',
      placeholder: 'Diameter',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCamDiameter(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: camDiameter,
    },
    {
      label: 'Height',
      type: 'number',
      placeholder: 'Height',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCamHeight(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: camHeight,
    },
    {
      label: 'Depth',
      type: 'number',
      placeholder: 'Depth',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCamDepth(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: camDepth,
    },
  ];

  const EdgeBandingInputFields = [
    {
      label: 'Edge Banding',
      type: 'number',
      placeholder: 'Edge Banding',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setEdgeBandingDistance(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: edgeBandingDistance,
    },
  ];

  const firstfieldsgroup = [
    {
      label: 'User Name',
      type: 'text',
      placeholder: 'Enter User Name',
      value: username,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
      error: '',
      mediumField: true,
      readOnly: true,
      InputProps: {
        readOnly: true,
        style: { opacity: 0.4 },
      },
    },
    {
      label: 'Email',
      type: 'text',
      placeholder: 'Enter Email',
      value: email,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
      mediumField: true,
      readOnly: true,
      InputProps: {
        readOnly: true,
        style: { opacity: 0.4 },
      },
    },
  ];

  const secordfieldsgroup = [
    {
      label: 'Name',
      type: 'text',
      placeholder: 'Enter Name',
      value: name,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      error: nameError,
      mediumField: true,
    },
    {
      label: 'Phone Number',
      type: 'text',
      placeholder: 'Enter Phone Number',
      value: phone,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNumber(e.target.value),
      error: phoneError,
      mediumField: true,
    },
  ];

  const companyDetailsFields = [
    {
      label: 'Company Name',
      type: 'text',
      placeholder: 'Company Name',
      value: companyName,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyName(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Company Email',
      type: 'text',
      placeholder: 'Company Email',
      value: companyEmail,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyEmail(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Company Phone',
      type: 'text',
      placeholder: 'Company Phone',
      value: companyPhone,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyPhone(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'GSTIN',
      type: 'text',
      placeholder: 'Company GSTIN',
      value: companyGstin,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyGstin(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'PAN',
      type: 'text',
      placeholder: 'Company PAN',
      value: companyPan,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyPan(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Website',
      type: 'text',
      placeholder: 'https://example.com',
      value: companyWebsite,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyWebsite(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Company Address',
      type: 'text',
      placeholder: 'Company Address',
      value: companyAddress,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setCompanyAddress(e.target.value),
      error: '',
      mediumField: true,
    },
  ];

  const bankingDetailsFields1 = [
    {
      label: 'Bank Name',
      type: 'text',
      placeholder: 'Bank Name',
      value: bankName,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setBankName(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Account Name',
      type: 'text',
      placeholder: 'Account Name',
      value: accountName,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAccountName(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Account Number',
      type: 'text',
      placeholder: 'Account Number',
      value: accountNumber,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAccountNumber(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Account Type',
      type: 'text',
      placeholder: 'e.g. Current, Savings',
      value: accountType,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAccountType(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'IFSC Code',
      type: 'text',
      placeholder: 'IFSC Code',
      value: ifscCode,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setIfscCode(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'Branch Name',
      type: 'text',
      placeholder: 'Branch Name',
      value: branchName,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setBranchName(e.target.value),
      error: '',
      mediumField: true,
    },
    {
      label: 'UPI ID',
      type: 'text',
      placeholder: 'UPI ID',
      value: upiId,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setUpiId(e.target.value),
      error: '',
      mediumField: true,
    },
  ];

  //smit|Harsh only for design not add function
  const [edgeBandingEnabled, setEdgeBandingEnabled] = useState(true);
  const [edgeBandingDisabled, setEdgeBandingDisabled] = useState(false);

  const handleEdgeBandingToggle = () => {
    if (edgeBandingDisabled) return;
    setEdgeBandingEnabled((prev) => !prev);
  };

  useEffect(() => {
    setEdgeBandingDisabled(false);
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event: Event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleCheckboxChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { id, checked } = event.target;
    setSelectedRoles((prevRoles) =>
      checked ? [...prevRoles, id] : prevRoles.filter((role) => role !== id)
    );
  };

  // NOTE: Need to remove it later, adding it to handle the errors. it will be use to update the design later.
  const ignoreTypeErrors = () => {
    setEmailError('');
  };

  useEffect(() => {
    ignoreTypeErrors();
  }, []);

  const handleMouseEnter = (memberId: string) => {
    setIsDeleteHovered(memberId);
  };

  const handleMouseLeave = () => {
    setIsDeleteHovered(null);
  };

  const getCurrentUserEmailId = () => {
    return UserDetails?.email;
  };

  const handleDeleteMember = (memberId: string) => {
    const currentUserEmailId = getCurrentUserEmailId();
    if (members.find((member) => member.id === memberId)?.email === currentUserEmailId) {
      alert('You cannot remove yourself from the team.');
      return;
    }

    setMemberToDelete(memberId);
  };

  const confirmDelete = async (memberId: string) => {
    try {
      const response: { status: number } = await CommonService.delete(
        API_ENDPOINT.REMOVE_USER_FROM_ORGANIZATION(memberId)
      );
      if (response.status === 200) {
        setMembers((prevMembers) => prevMembers.filter((member) => member.id !== memberId));
        setSuccessMessage('Team member removed successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        await handalGetmember();
      } else {
        setErrorMessage('Failed to remove team member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'An error occurred while removing member';
      setErrorMessage(errorMsg);
    } finally {
      setMemberToDelete(null);
    }
  };

  const handleImageClick = () => {
    document.getElementById('fileInput')?.click();
  };

  const handleOrganizationImageFile = () => {
    document.getElementById('organizationImageFile')?.click();
  };

  const handleOrganizationImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const url = URL.createObjectURL(file);

      setorganizationUrl(url);
      setOrganizationImage(file);
    }
  };

  const handleProfileImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      const url = URL.createObjectURL(file);
      setprofileUrl(url);
      setProfileImage(file);
    }
  };

  const handalSetOrganization = async () => {
    try {
      const response: { status: number; data: Organization } = await CommonService.get(
        API_ENDPOINT.GET_ORGANIZATION_DETAILS
      );
      if (response.status === 200) {
        const organizationdata = response.data;
        setorganization(organizationdata);
        const logoUrl = toPublicUrl(organizationdata.logo);
        setorganizationUrl(logoUrl);
        setOrganizationName(organizationdata.display_name || '');
      } else {
        console.error('Failed to fetch details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  useEffect(() => {
    handalSetOrganization();
  }, []);

  // Initialize design settings from Redux
  useEffect(() => {
    setMinifixDistance(designSettings.minifixDistance);
    setMinifixDiameterHole(designSettings.minifixDiameterHole);
    setCamDepth(designSettings.camDepth);
    setCamDiameter(designSettings.camDiameter);
    setEdgeBandingDistance(designSettings.edgeBandingDistance);
  }, [designSettings]);

  const handleSaveDesignSettings = () => {
    dispatch(
      updateDesignSettings({
        minifixDistance,
        minifixDiameterHole,
        camDepth,
        camDiameter,
        edgeBandingDistance,
      })
    );
    setSuccessMessage('Design settings saved successfully!');
    setTimeout(() => {
      setSuccessMessage(null);
    }, 3000);
  };

  const handalInputOrganization = async () => {
    if (!organizationName?.trim()) {
      setOrganizationNameError('Organization name is required');
      return;
    }
    setOrganizationNameError(null);
    try {
      const formData = new FormData();
      formData.append('display_name', organizationName);
      if (organizationImage && organizationImage instanceof File) {
        formData.append('logo', organizationImage);
      }

      const response = await CommonService.put(API_ENDPOINT.UPDATE_ORGANIZATION_DETAILS, formData);
      const data = response.data as Organization;

      if (response.status === 200) {
        setorganization(data);
        setOrganizationName(data.display_name ? data.display_name : '');
        if (data.logo && typeof data.logo === 'string') {
          const serverImageUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${data.logo}`;
          setorganizationUrl(serverImageUrl);
        }
        setSuccessMessage('Organization updated successfully!');
        setOrganizationImage(null);
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        console.error('Failed to update organization:', response.status);
        setErrorMessage('Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      setErrorMessage('An error occurred while updating the organization');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebarWrapper}>
        <Sidebar />
      </div>
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Settings" />
        <div className={styles.mainContent}>
          {/* ─── Sidebar Menu ─── */}
          <div className={styles.profileMenu}>
            <div className={styles.menuItemsEmail}>
              <img src={assets.account_profile} className={styles.accountprofile} alt="profile" />
              <p className={styles.useremail}>{UserDetails?.email}</p>
            </div>

            <div
              className={activeMenu === 'profile' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('profile')}
            >
              <img
                src={activeMenu === 'profile' ? assets.account_svg : assets.account_not_selected}
                alt="profile"
              />
              <p className={activeMenu === 'profile' ? styles.activeMenuTitle : styles.menuTitle}>
                Profile
              </p>
            </div>

            <div
              className={activeMenu === 'team' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('team')}
            >
              <img
                src={activeMenu === 'team' ? assets.team_not_selected : assets.team_svg}
                alt="team"
              />
              <p className={activeMenu === 'team' ? styles.activeMenuTitle : styles.menuTitle}>
                Team
              </p>
            </div>

            <div
              className={activeMenu === 'organizations' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('organizations')}
            >
              <img
                src={
                  activeMenu === 'organizations'
                    ? assets.organization_not_selected
                    : assets.organizations_svg
                }
                alt="organizations"
              />
              <p
                className={
                  activeMenu === 'organizations' ? styles.activeMenuTitle : styles.menuTitle
                }
              >
                Organizations
              </p>
            </div>

            <div
              className={activeMenu === 'Design setting' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('Design setting')}
            >
              <img
                src={assets.designmenuicon_not}
                alt="Design setting"
                style={{ opacity: activeMenu === 'Design setting' ? 1 : 0.6 }}
              />
              <p
                className={
                  activeMenu === 'Design setting' ? styles.activeMenuTitle : styles.menuTitle
                }
              >
                Design setting
              </p>
            </div>

            <div
              className={activeMenu === 'billing' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('billing')}
            >
              <img
                src={activeMenu === 'billing' ? assets.activemoney : assets.money}
                alt="billing"
              />
              <p className={activeMenu === 'billing' ? styles.activeMenuTitle : styles.menuTitle}>
                Billing Details
              </p>
            </div>
          </div>

          {/* ─── Main Content Area ─── */}
          <div className={styles.profile}>
            {/* 1. Profile Tab */}
            {activeMenu === 'profile' && (
              <>
                <div className={styles.profileImage}>
                  <img
                    src={
                      profileUrl ||
                      (UserDetails?.profile_picture &&
                        `${process.env.NEXT_PUBLIC_PUBLIC_API}/${UserDetails.profile_picture}`) ||
                      assets.user
                    }
                    alt="profile"
                    onClick={handleImageClick}
                  />
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: 'none' }}
                    accept="image/*"
                    onChange={handleProfileImageChange}
                  />
                  <p>{UserDetails?.username}</p>
                </div>

                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                  <div className={styles.inputGroup}>
                    {firstfieldsgroup.map((field, index) => (
                      <InputField key={index} {...field} borderColor="#e2e8f0" />
                    ))}
                  </div>
                  <div className={styles.inputGroup}>
                    {secordfieldsgroup.map((field, index) => (
                      <InputField key={index} {...field} borderColor="#e2e8f0" />
                    ))}
                  </div>
                  <button className={styles.saveButton} onClick={handleSave}>
                    Save Changes
                  </button>
                </form>

                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
                {errorMessage && (
                  <div className={styles.errorPopup}>
                    <img src={assets.error} alt="Error" />
                    <p>{errorMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* 1.5 Billing Tab */}
            {activeMenu === 'billing' && (
              <>
                <div className={styles.heading_containar}>
                  <h4>Company Details</h4>
                  <p className={styles.description}>
                    These details will be used as the Header context in your Quotation output.
                  </p>
                </div>
                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                  <div
                    className={styles.inputGroup}
                    style={{ flexWrap: 'wrap', gap: '1.5rem 3rem' }}
                  >
                    {companyDetailsFields.map((field, index) => (
                      <InputField
                        key={index}
                        className={styles.inputField}
                        {...field}
                        borderColor="#e2e8f0"
                      />
                    ))}
                  </div>

                  <div
                    className={styles.heading_containar}
                    style={{ marginBottom: '1.5rem', marginTop: '2.5rem' }}
                  >
                    <h4>Banking Details</h4>
                    <p className={styles.description}>
                      These banking details will appear at the bottom of your Quotations.
                    </p>
                  </div>

                  <div
                    className={styles.inputGroup}
                    style={{ flexWrap: 'wrap', gap: '1.5rem 3rem' }}
                  >
                    {bankingDetailsFields1.map((field, index) => (
                      <InputField
                        key={index}
                        className={styles.inputField}
                        {...field}
                        borderColor="#e2e8f0"
                      />
                    ))}
                  </div>

                  <button className={styles.saveButton} onClick={updateOrganizationDetails}>
                    Save Details
                  </button>
                </form>

                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
                {errorMessage && (
                  <div className={styles.errorPopup}>
                    <img src={assets.error} alt="Error" />
                    <p>{errorMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* 2. Organizations Tab */}
            {activeMenu === 'organizations' && (
              <>
                <div className={styles.organizationupperpart}>
                  <div className={styles.organizationImage}>
                    <img
                      src={
                        organizationUrl ||
                        (organization?.logo &&
                          `${process.env.NEXT_PUBLIC_PUBLIC_API}/${organization.logo}`) ||
                        assets.organization_blank_image
                      }
                      alt="organization"
                      onClick={handleOrganizationImageFile}
                    />
                    <input
                      type="file"
                      id="organizationImageFile"
                      style={{ display: 'none' }}
                      onChange={handleOrganizationImageChange}
                    />
                  </div>

                  <div style={{ width: '100%' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontWeight: 600,
                        color: '#475569',
                        fontSize: '0.9rem',
                      }}
                    >
                      Organization Name
                    </label>
                    <input
                      type="text"
                      className={`${styles.organizationInputfild} ${
                        organizationNameError ? styles.errorInput : ''
                      }`}
                      placeholder="Enter Organization Name"
                      onChange={(e: ChangeEvent<HTMLInputElement>) => {
                        setOrganizationName(e.target.value);
                        setOrganizationNameError(null);
                      }}
                      value={organizationName}
                    />
                  </div>

                  <button
                    className={styles.organizationTitleButton}
                    onClick={handalInputOrganization}
                  >
                    Save Details
                  </button>
                </div>

                {organizationNameError && (
                  <p
                    className={styles.errorMessage}
                    style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}
                  >
                    {organizationNameError}
                  </p>
                )}

                {UserDetails?.is_ghost && (
                  <div className={styles.ghostAccessContainer}>
                    <div>
                      <div className={styles.ghostHeaderRow}>
                        <label className={`${styles.ghostAccessTitle} ${styles.ghostTitleNoMargin}`}>
                          My Organizations
                        </label>
                      </div>
                      
                      <div className={styles.ghostGrid}>
                        {myOrganizations.map(org => {
                          const logoUrl = toPublicUrl(org.logo) || null;
                          return (
                            <button
                              key={org.id}
                              onClick={() => handleMyOrgChange(org.id || '')}
                              className={`${styles.ghostCard} ${selectedMyOrgId === org.id ? styles.ghostCardActive : ''}`}
                            >
                              <div className={styles.ghostLogoWrapper}>
                                {logoUrl ? (
                                  <img src={logoUrl} alt={org.name} className={styles.ghostLogo} />
                                ) : (
                                  <div className={styles.ghostLogoPlaceholder}>
                                    {org.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className={styles.ghostCardText}>
                                <div className={styles.ghostOrgName}>
                                  {org.name}
                                </div>
                                <div className={styles.ghostOrgDisplayName}>
                                  {org.display_name}
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className={styles.ghostSubHeaderRow}>
                        <label className={`${styles.ghostAccessTitle} ${styles.ghostTitleNoMargin}`}>
                          Ghost Access Organizations
                        </label>
                        <div className={styles.ghostAccessTypeRow}>
                          <span className={styles.ghostAccessTypeLabel}>
                            Ghost Access Type:
                          </span>
                          <div className={styles.ghostAccessTypeToggle}>
                            <button
                              onClick={() => handleGhostPermissionChange('view')}
                              className={`${styles.ghostAccessTypeButton} ${ghostAccessType === 'view' ? styles.ghostAccessTypeButtonActive : ''}`}
                            >
                              View Only
                            </button>
                            <button
                              onClick={() => handleGhostPermissionChange('full')}
                              className={`${styles.ghostAccessTypeButton} ${ghostAccessType === 'full' ? styles.ghostAccessTypeButtonActive : ''}`}
                            >
                              Full Access
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className={styles.ghostGrid}>
                        {ghostOrganizations.map((org) => {
                          const logoUrl = toPublicUrl(org.logo) || null;
                          return (
                            <button
                              key={org.id}
                              onClick={() => handleGhostOrgChange(org.id || '')}
                              className={`${styles.ghostCard} ${selectedGhostOrgId === org.id ? styles.ghostCardActive : ''}`}
                            >
                              <div className={styles.ghostLogoWrapper}>
                                {logoUrl ? (
                                  <img src={logoUrl} alt={org.name} className={styles.ghostLogo} />
                                ) : (
                                  <div className={styles.ghostLogoPlaceholder}>
                                    {org.name?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              <div className={styles.ghostCardText}>
                                <div className={styles.ghostOrgName}>{org.name}</div>
                                <div className={styles.ghostOrgDisplayName}>{org.display_name}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {!UserDetails?.is_ghost && (
                  <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Current Organization</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{organization?.name || 'Loading...'}</div>
                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>{organization?.display_name}</div>
                  </div>
                )}

                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* 3. Design Setting Tab */}
            {activeMenu === 'Design setting' && (
              <>
                <div className={styles.heading_containar}>
                  <h4>Set your default design preferences</h4>
                </div>

                <div className={styles.mainContentdesign}>
                  <div className={styles.firstbox}>
                    <p>Nesting Sheet Size</p>
                    <div className={styles.firstfieldsgroupdesign}>
                      {designFirstInputFields.map((field, index) => (
                        <InputField key={index} {...field} borderColor="#e2e8f0" />
                      ))}
                    </div>
                  </div>

                  <div className={styles.firstbox}>
                    <p>3D View Design Size</p>
                    <div className={styles.firstfieldsgroupdesign}>
                      {designSecondInputFields.map((field, index) => (
                        <InputField key={index} {...field} borderColor="#e2e8f0" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.design_unit_size}>Design Unit Size</div>
                <div className={styles.rediogroup}>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="mm"
                      className={styles.option}
                      checked={designUnit === 'mm'}
                      onChange={(e) => setDesignUnit(e.target.value)}
                    />
                    <span className={styles.customRadio}></span>
                    MM
                  </label>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="cm"
                      className={styles.option}
                      checked={designUnit === 'cm'}
                      onChange={(e) => setDesignUnit(e.target.value)}
                    />
                    <span className={styles.customRadio}></span>
                    CM
                  </label>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="inch"
                      className={styles.option}
                      checked={designUnit === 'inch'}
                      onChange={(e) => setDesignUnit(e.target.value)}
                    />
                    <span className={styles.customRadio}></span>
                    Inch
                  </label>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="feet"
                      className={styles.option}
                      checked={designUnit === 'feet'}
                      onChange={(e) => setDesignUnit(e.target.value)}
                    />
                    <span className={styles.customRadio}></span>
                    Feet
                  </label>
                </div>

                <div className={styles.mainContentminifix}>
                  <div className={styles.firstbox}>
                    <p>Minifix Setting</p>
                    <div className={styles.minifixfieldsgroupdesign}>
                      {designMinifixInputFields.map((field, index) => (
                        <InputField key={index} {...field} borderColor="#e2e8f0" />
                      ))}
                    </div>
                  </div>

                  <div className={styles.firstbox}>
                    <p>Camlock Screw Hole</p>
                    <div className={styles.minifixfieldsgroupdesign}>
                      {designCamlockInputFields.map((field, index) => (
                        <InputField key={index} {...field} borderColor="#e2e8f0" />
                      ))}
                    </div>
                  </div>
                </div>

                <div className={styles.lastbox}>
                  <div className="flex items-center gap-[2rem]" style={{ marginBottom: '1rem' }}>
                    <p style={{ margin: 0 }}>Edge Banding</p>
                    <div
                      onClick={handleEdgeBandingToggle}
                      className={`${styles.toggleSwitch} ${edgeBandingEnabled ? styles.active : ''} ${edgeBandingDisabled ? styles.disabled : ''}`}
                    >
                      <div className={styles.toggleKnob} />
                    </div>
                  </div>

                  <div
                    className={styles.lastboxindiv}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      gap: '2rem',
                    }}
                  >
                    <div className={styles.minifixfieldsgroupdesign}>
                      {EdgeBandingInputFields.map((field, index) => (
                        <InputField key={index} {...field} borderColor="#e2e8f0" />
                      ))}
                    </div>
                    <button
                      className={styles.design_profile_save_button}
                      onClick={handleSaveDesignSettings}
                    >
                      Save Settings
                    </button>
                  </div>
                </div>

                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* 4. Team Tab */}
            {activeMenu === 'team' && (
              <>
                <div className={styles.team}>
                  <div className={styles.designsettingTitle}>
                    <p className={styles.designsettingTitleText} style={{ marginBottom: '0.5rem' }}>
                      Team Management
                    </p>
                    <p style={{ color: '#64748b', fontSize: '0.9rem' }}>
                      Manage your team members and their roles here.
                    </p>
                  </div>

                  <div className={styles.teamTopBar}>
                    <div className={styles.toggleContainer}>
                      <button
                        className={`${styles.toggleButton} ${activeTab === 'active' ? styles.active : ''}`}
                        onClick={() => setActiveTab('active')}
                      >
                        Active Members
                      </button>
                      <button
                        className={`${styles.toggleButton} ${activeTab === 'invited' ? styles.active : ''}`}
                        onClick={() => setActiveTab('invited')}
                      >
                        Invited
                      </button>
                    </div>

                    <button
                      className={styles.teantopbarleftButton}
                      onClick={() => setAddMambarPopup(true)}
                    >
                      <img src={assets.addmembar} alt="addmember" />
                      Invite New Member
                    </button>
                  </div>

                  <div className={styles.tableContainer} ref={tableContainerRef}>
                    <table>
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Email</th>
                          <th>Role</th>
                          <th className={styles.actioncolumn}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => (
                          <tr key={member.id}>
                            <td style={{ fontWeight: 500 }}>{member.name}</td>
                            <td className={styles.emailbox}>{member.email}</td>
                            <td className={styles.rolebox}>
                              <div className={styles.roleContainer}>
                                {member.groups.map((role, index) => (
                                  <span key={index} className={styles.roleBadge}>
                                    {role}
                                    <img
                                      src={assets.close}
                                      alt="close"
                                      className={styles.closeteam}
                                      onClick={() => handleRoleRemove(role, member.id)}
                                    />
                                  </span>
                                ))}
                                <div
                                  className={styles.roleaddicon}
                                  onClick={(e) => handleRoleAddClick(e, member.id)}
                                >
                                  <img
                                    src={assets.roleaddicon}
                                    alt="add role"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      filter: 'invert(1) brightness(2)',
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className={styles.actioncolumn}>
                              <img
                                src={
                                  isDeleteHovered == member.id
                                    ? assets.deleteteamicon
                                    : assets.delete_not_icon
                                }
                                alt="delete"
                                className={styles.teamdeleteicon}
                                onClick={() => handleDeleteMember(member.id)}
                                onMouseEnter={() => handleMouseEnter(member.id)}
                                onMouseLeave={handleMouseLeave}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}

                {/* Role Dropdown Popup */}
                {openDropdown && dropdownPosition && (
                  <div
                    ref={dropdownRef}
                    className={styles.roleDropdownPopup}
                    style={{
                      top: `${dropdownPosition.y}px`,
                      left: `${dropdownPosition.x}px`,
                    }}
                  >
                    {rolesList.map((role, index) => (
                      <div
                        key={index}
                        className={styles.dropdownItem}
                        onClick={() => selectedMemberId && handleRoleSelect(role, selectedMemberId)}
                      >
                        <span
                          style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: '#392579',
                            display: 'inline-block',
                          }}
                        ></span>
                        {role}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Add Member Popup */}
            {addMambarPopup && (
              <div className={styles.createpopupOverlay}>
                <div className={styles.createpopup}>
                  <div
                    className={styles.firstpart}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1.5rem',
                    }}
                  >
                    <h5 className={styles.addmembartitle} style={{ margin: 0 }}>
                      Invite New Member
                    </h5>
                    <img
                      src={assets.addmemberclose}
                      className={styles.createclose}
                      alt="close"
                      onClick={() => {
                        setAddMambarPopup(false);
                        setErrorMessage('');
                      }}
                    />
                  </div>

                  <div className={styles.create_right_side}>
                    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                      {errorMessage && (
                        <p
                          className={styles.erroemessage}
                          style={{ color: 'red', fontSize: '0.85rem' }}
                        >
                          {errorMessage}
                        </p>
                      )}

                      <div className={styles.createinputGroup}>
                        {addmemberfields.map((field, index) => (
                          <InputField
                            className={styles.inputField}
                            key={index}
                            borderColor="#e2e8f0"
                            {...field}
                            error=""
                            mediumField={true}
                          />
                        ))}
                      </div>

                      <p className={styles.membertitle}>Assign Roles</p>

                      <div className={styles.checkboxgroup}>
                        {['Account Manager', 'Mes Editor', 'Designer', 'Catalog Manager'].map(
                          (role) => (
                            <div
                              key={role}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '0.5rem',
                              }}
                            >
                              <input
                                type="checkbox"
                                id={role}
                                onChange={handleCheckboxChange}
                                style={{ width: '1rem', height: '1rem', accentColor: '#392579' }}
                              />
                              <label htmlFor={role} style={{ marginLeft: '0.5rem' }}>
                                {role}
                              </label>
                            </div>
                          )
                        )}
                      </div>
                    </form>
                  </div>
                  <div className={styles.createButtonGrop}>
                    <button className={styles.invitebutton} onClick={handleAddMemberClick}>
                      Send Invitation
                    </button>
                  </div>
                </div>
              </div>
            )}

            {memberToDelete && (
              <div className={styles.createpopupOverlay}>
                <div className={styles.deletepopup}>
                  <div
                    className={styles.firstpart}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <img
                        src={assets.deleteteamicon}
                        alt="delete user"
                        style={{ width: '24px', height: '24px', margin: 0 }}
                      />
                      <h5 className={styles.addmembartitle} style={{ margin: 0 }}>
                        Remove Team Member
                      </h5>
                    </div>
                    <img
                      src={assets.addmemberclose}
                      className={styles.createclose}
                      alt="close"
                      onClick={() => setMemberToDelete(null)}
                      style={{ marginTop: 0, position: 'relative', top: 0, right: 0 }}
                    />
                  </div>

                  <div className={styles.create_right_side}>
                    <p style={{ margin: '0 0 1.5rem 0', color: '#475569', fontSize: '1rem' }}>
                      Are you sure you want to remove this team member? This action cannot be undone
                      and they will lose access to the organization immediately.
                    </p>
                  </div>

                  <div
                    className={styles.createButtonGrop}
                    style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', padding: 0 }}
                  >
                    <button
                      className={styles.cancelButton}
                      onClick={() => setMemberToDelete(null)}
                      style={{
                        flex: 1,
                        padding: '0.85rem',
                        borderRadius: '12px',
                        background: 'white',
                        border: '1px solid #cbd5e1',
                        color: '#475569',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      className={styles.confirmDeleteButton}
                      onClick={() => confirmDelete(memberToDelete)}
                      style={{
                        flex: 1,
                        padding: '0.85rem',
                        borderRadius: '12px',
                        background: '#ef4444',
                        border: 'none',
                        color: 'white',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                      }}
                    >
                      Yes, Remove Member
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

export default Settings;
