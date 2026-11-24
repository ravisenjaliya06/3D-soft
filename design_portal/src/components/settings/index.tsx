import { RootState } from '@/components/3dmodel/store';
import { updateDesignSettings } from '@/components/3dmodel/store/designSettingsSlice';
import Header from '@/components/header/header';
import styles from '@/components/settings/setting.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuBox,
  LuBuilding2,
  LuCamera,
  LuChevronRight,
  LuCircleAlert,
  LuCircleCheck,
  LuCircleDot,
  LuCrosshair,
  LuEye,
  LuFactory,
  LuGhost,
  LuIdCard,
  LuImageUp,
  LuLandmark,
  LuLayoutGrid,
  LuLock,
  LuMailOpen,
  LuPencil,
  LuPlus,
  LuReceiptText,
  LuRuler,
  LuSave,
  LuSend,
  LuTrash2,
  LuUserCheck,
  LuUserMinus,
  LuUserPlus,
  LuUserRound,
  LuUsers,
  LuX,
} from 'react-icons/lu';
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
        const membersData = response.data.users.map((member) => {
          const emailPrefix = member.email?.split('@')?.[0]?.trim();
          const displayName =
            member.name?.trim() || member.username?.trim() || emailPrefix || 'N/A';
          return {
            ...member,
            displayName,
          };
        });
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
  const ghostOrganizations = allOrganizations.filter(
    (org) => !myOrganizationIdSet.has(org.id || '')
  );

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

  const firstfieldsgroup = [
    {
      label: 'User Name',
      type: 'text',
      placeholder: 'Enter User Name',
      value: username,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
      error: '',
      mediumField: true,
      fullWidth: true,
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
      fullWidth: true,
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
      fullWidth: true,
    },
    {
      label: 'Phone Number',
      type: 'text',
      placeholder: 'Enter Phone Number',
      value: phone,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNumber(e.target.value),
      error: phoneError,
      mediumField: true,
      fullWidth: true,
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

  const SETTINGS_MENU: { key: string; label: string; hint: string; icon: IconType }[] = [
    { key: 'profile', label: 'Profile', hint: 'Your name, photo and contact', icon: LuUserRound },
    { key: 'team', label: 'Team', hint: 'Designers, MES and catalog roles', icon: LuUsers },
    {
      key: 'organizations',
      label: 'Organizations',
      hint: 'Workshop name and logo',
      icon: LuBuilding2,
    },
    {
      key: 'Design setting',
      label: 'Design setting',
      hint: 'Sheet sizes, units, hardware',
      icon: LuRuler,
    },
    {
      key: 'billing',
      label: 'Billing Details',
      hint: 'Company and bank details for quotes',
      icon: LuReceiptText,
    },
  ];

  const SECTION_INTRO: Record<string, { eyebrow: string; title: string; text: string }> = {
    profile: {
      eyebrow: 'Account',
      title: 'Your profile',
      text: 'How you appear to your team across designs, MES and the catalog.',
    },
    team: {
      eyebrow: 'Workshop crew',
      title: 'Team management',
      text: 'Invite designers and production staff, and choose what each person can work on.',
    },
    organizations: {
      eyebrow: 'Company',
      title: 'Organization',
      text: 'The furniture studio or factory this workspace belongs to.',
    },
    'Design setting': {
      eyebrow: 'Defaults',
      title: 'Design preferences',
      text: 'Board sizes, measuring units and hardware drilling used for every new design.',
    },
    billing: {
      eyebrow: 'Quotations',
      title: 'Billing details',
      text: 'Printed on the header and footer of every quotation you send to clients.',
    },
  };

  const intro = SECTION_INTRO[activeMenu];
  const activeIndex = Math.max(
    0,
    SETTINGS_MENU.findIndex((m) => m.key === activeMenu)
  );
  const activeItem = SETTINGS_MENU[activeIndex];
  const ActiveIcon = activeItem?.icon || LuUserRound;

  const getInitials = (value?: string | null) =>
    (value || '?')
      .split(/[\s@._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join('');

  const renderToasts = (withError: boolean) => (
    <>
      {successMessage && (
        <div className={`${styles.toast} ${styles.successPopup}`}>
          <LuCircleCheck aria-hidden="true" />
          <p>{successMessage}</p>
        </div>
      )}
      {withError && errorMessage && (
        <div className={`${styles.toast} ${styles.errorPopup}`}>
          <LuCircleAlert aria-hidden="true" />
          <p>{errorMessage}</p>
        </div>
      )}
    </>
  );

  const renderOrgCard = (org: Organization, isActive: boolean, onSelect: () => void) => {
    const logoUrl = toPublicUrl(org.logo) || null;
    return (
      <button
        key={org.id}
        onClick={onSelect}
        className={`${styles.ghostCard} ${isActive ? styles.ghostCardActive : ''}`}
      >
        <div className={styles.ghostLogoWrapper}>
          {logoUrl ? (
            <img src={logoUrl} alt={org.name} className={styles.ghostLogo} />
          ) : (
            <div className={styles.ghostLogoPlaceholder}>{org.name?.charAt(0).toUpperCase()}</div>
          )}
        </div>
        <div className={styles.ghostCardText}>
          <div className={styles.ghostOrgName}>{org.name}</div>
          <div className={styles.ghostOrgDisplayName}>{org.display_name}</div>
        </div>
        {isActive && <LuCircleCheck className={styles.ghostCheck} aria-hidden="true" />}
      </button>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.sidebarWrapper}>
        <Sidebar />
      </div>
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Settings" />
        <div className={styles.mainContent}>
          {/* ─── Masthead: account + section tabs ─── */}
          <header className={styles.settingsMast}>
            <div className={styles.mastTop}>
              <div className={styles.menuItemsEmail}>
                <span className={styles.menuAvatar}>
                  {getInitials(UserDetails?.name || UserDetails?.username || UserDetails?.email)}
                </span>
                <div className={styles.menuUser}>
                  <strong>{UserDetails?.name || UserDetails?.username || 'Your account'}</strong>
                  <p className={styles.useremail}>{UserDetails?.email}</p>
                </div>
              </div>
              <div className={styles.mastMeta}>
                <span className={styles.mastEyebrow}>Workshop settings</span>
                <span className={styles.mastStep}>
                  {activeIndex + 1} / {SETTINGS_MENU.length}
                </span>
              </div>
            </div>

            <nav className={styles.menuList} role="tablist" aria-label="Settings sections">
              {SETTINGS_MENU.map((item) => {
                const MenuIcon = item.icon;
                const isActive = activeMenu === item.key;
                return (
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    key={item.key}
                    className={isActive ? styles.activeMenu : styles.menuItems}
                    onClick={() => handleActiveMenu(item.key)}
                  >
                    <MenuIcon className={styles.menuIcon} aria-hidden="true" />
                    <span className={styles.menuTitle}>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </header>

          {/* ─── Body: section guide + forms ─── */}
          <div className={styles.settingsBody}>
            {intro && activeItem && (
              <aside className={styles.sectionIntro}>
                <span className={styles.introBadge}>
                  <ActiveIcon aria-hidden="true" />
                </span>
                <span className={styles.eyebrow}>{intro.eyebrow}</span>
                <h2>{intro.title}</h2>
                <p>{intro.text}</p>
                <div className={styles.introHint}>
                  <LuChevronRight aria-hidden="true" />
                  <span>{activeItem.hint}</span>
                </div>
              </aside>
            )}

            <section className={styles.profile}>
              {/* 1. Profile Tab */}
              {activeMenu === 'profile' && (
                <>
                  <div className={styles.profileHero}>
                    <div className={styles.profileImage} onClick={handleImageClick}>
                      <img
                        src={
                          profileUrl ||
                          (UserDetails?.profile_picture &&
                            `${process.env.NEXT_PUBLIC_PUBLIC_API}/${UserDetails.profile_picture}`) ||
                          assets.user
                        }
                        alt="profile"
                      />
                      <span className={styles.avatarEdit} title="Change photo">
                        <LuCamera aria-hidden="true" />
                      </span>
                    </div>
                    <input
                      type="file"
                      id="fileInput"
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handleProfileImageChange}
                    />
                    <div className={styles.profileHeroText}>
                      <strong>{UserDetails?.name || UserDetails?.username}</strong>
                      <span>@{UserDetails?.username}</span>
                      <small>Click the photo to upload a new one.</small>
                    </div>
                  </div>

                  <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuLock aria-hidden="true" />
                        Sign-in details
                        <span className={styles.cardTag}>Read only</span>
                      </h3>
                      <div className={styles.fieldGrid}>
                        {firstfieldsgroup.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuIdCard aria-hidden="true" />
                        Personal details
                      </h3>
                      <div className={styles.fieldGrid}>
                        {secordfieldsgroup.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>
                    <div className={styles.formActions}>
                      <button className={styles.saveButton} onClick={handleSave}>
                        <LuSave aria-hidden="true" />
                        Save Changes
                      </button>
                    </div>
                  </form>

                  {renderToasts(true)}
                </>
              )}

              {/* 1.5 Billing Tab */}
              {activeMenu === 'billing' && (
                <>
                  <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuBuilding2 aria-hidden="true" />
                        Company details
                      </h3>
                      <p className={styles.cardText}>Shown in the header of your quotations.</p>
                      <div className={`${styles.fieldGrid} ${styles.fieldGrid3}`}>
                        {companyDetailsFields.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuLandmark aria-hidden="true" />
                        Banking details
                      </h3>
                      <p className={styles.cardText}>
                        Printed at the bottom of your quotations so clients know where to pay.
                      </p>
                      <div className={`${styles.fieldGrid} ${styles.fieldGrid3}`}>
                        {bankingDetailsFields1.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.formActions}>
                      <button className={styles.saveButton} onClick={updateOrganizationDetails}>
                        <LuSave aria-hidden="true" />
                        Save Details
                      </button>
                    </div>
                  </form>

                  {renderToasts(true)}
                </>
              )}

              {/* 2. Organizations Tab */}
              {activeMenu === 'organizations' && (
                <>
                  <div className={styles.formCard}>
                    <div className={styles.organizationupperpart}>
                      <div
                        className={styles.organizationImage}
                        onClick={handleOrganizationImageFile}
                      >
                        <img
                          src={
                            organizationUrl ||
                            (organization?.logo &&
                              `${process.env.NEXT_PUBLIC_PUBLIC_API}/${organization.logo}`) ||
                            assets.organization_blank_image
                          }
                          alt="organization"
                        />
                        <span className={styles.avatarEdit} title="Change logo">
                          <LuImageUp aria-hidden="true" />
                        </span>
                        <input
                          type="file"
                          id="organizationImageFile"
                          style={{ display: 'none' }}
                          onChange={handleOrganizationImageChange}
                        />
                      </div>

                      <div className={styles.orgField}>
                        <label htmlFor="organizationNameInput">Organization name</label>
                        <input
                          id="organizationNameInput"
                          type="text"
                          className={`${styles.organizationInputfild} ${
                            organizationNameError ? styles.errorInput : ''
                          }`}
                          placeholder="e.g. Oakline Interiors"
                          onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            setOrganizationName(e.target.value);
                            setOrganizationNameError(null);
                          }}
                          value={organizationName}
                        />
                        {organizationNameError && (
                          <p className={styles.errorMessage}>{organizationNameError}</p>
                        )}
                      </div>

                      <button
                        className={styles.organizationTitleButton}
                        onClick={handalInputOrganization}
                      >
                        <LuSave aria-hidden="true" />
                        Save Details
                      </button>
                    </div>
                  </div>

                  {UserDetails?.is_ghost && (
                    <div className={styles.ghostAccessContainer}>
                      <div className={styles.formCard}>
                        <div className={styles.ghostHeaderRow}>
                          <h3 className={styles.cardTitle}>
                            <LuBuilding2 aria-hidden="true" />
                            My Organizations
                          </h3>
                        </div>
                        <div className={styles.ghostGrid}>
                          {myOrganizations.map((org) =>
                            renderOrgCard(org, selectedMyOrgId === org.id, () =>
                              handleMyOrgChange(org.id || '')
                            )
                          )}
                        </div>
                      </div>

                      <div className={styles.formCard}>
                        <div className={styles.ghostSubHeaderRow}>
                          <h3 className={styles.cardTitle}>
                            <LuGhost aria-hidden="true" />
                            Ghost Access Organizations
                          </h3>
                          <div className={styles.ghostAccessTypeRow}>
                            <span className={styles.ghostAccessTypeLabel}>Access type</span>
                            <div className={styles.ghostAccessTypeToggle}>
                              <button
                                onClick={() => handleGhostPermissionChange('view')}
                                className={`${styles.ghostAccessTypeButton} ${ghostAccessType === 'view' ? styles.ghostAccessTypeButtonActive : ''}`}
                              >
                                <LuEye aria-hidden="true" />
                                View Only
                              </button>
                              <button
                                onClick={() => handleGhostPermissionChange('full')}
                                className={`${styles.ghostAccessTypeButton} ${ghostAccessType === 'full' ? styles.ghostAccessTypeButtonActive : ''}`}
                              >
                                <LuPencil aria-hidden="true" />
                                Full Access
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className={styles.ghostGrid}>
                          {ghostOrganizations.map((org) =>
                            renderOrgCard(org, selectedGhostOrgId === org.id, () =>
                              handleGhostOrgChange(org.id || '')
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {!UserDetails?.is_ghost && (
                    <div className={styles.currentOrg}>
                      <span className={styles.currentOrgIcon}>
                        <LuFactory aria-hidden="true" />
                      </span>
                      <div>
                        <span className={styles.currentOrgLabel}>Current organization</span>
                        <strong>{organization?.name || 'Loading...'}</strong>
                        <small>{organization?.display_name}</small>
                      </div>
                    </div>
                  )}

                  {renderToasts(false)}
                </>
              )}

              {/* 3. Design Setting Tab */}
              {activeMenu === 'Design setting' && (
                <>
                  <div className={styles.designGrid}>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuLayoutGrid aria-hidden="true" />
                        Nesting sheet size
                      </h3>
                      <p className={styles.cardText}>
                        Default board size used when nesting panels.
                      </p>
                      <div className={styles.fieldGrid}>
                        {designFirstInputFields.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>

                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuBox aria-hidden="true" />
                        3D view design size
                        <span className={styles.cardTag}>Read only</span>
                      </h3>
                      <p className={styles.cardText}>Room size of the 3D design canvas.</p>
                      <div className={styles.fieldGrid}>
                        {designSecondInputFields.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.formCard}>
                    <h3 className={styles.cardTitle}>
                      <LuRuler aria-hidden="true" />
                      Design unit size
                    </h3>
                    <p className={styles.cardText}>Unit used for measurements in the designer.</p>
                    <div className={styles.rediogroup}>
                      {[
                        { value: 'mm', label: 'MM', hint: 'Millimetres' },
                        { value: 'cm', label: 'CM', hint: 'Centimetres' },
                        { value: 'inch', label: 'Inch', hint: 'Inches' },
                        { value: 'feet', label: 'Feet', hint: 'Feet' },
                      ].map((unit) => (
                        <label
                          key={unit.value}
                          className={`${styles.label} ${designUnit === unit.value ? styles.labelActive : ''}`}
                        >
                          <input
                            type="radio"
                            name="option"
                            value={unit.value}
                            className={styles.option}
                            checked={designUnit === unit.value}
                            onChange={(e) => setDesignUnit(e.target.value)}
                          />
                          <span className={styles.customRadio}></span>
                          <span className={styles.unitText}>
                            <strong>{unit.label}</strong>
                            <small>{unit.hint}</small>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className={styles.designGrid}>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuCircleDot aria-hidden="true" />
                        Minifix setting
                      </h3>
                      <p className={styles.cardText}>Cam connector drilling for cabinet joints.</p>
                      <div className={styles.fieldGrid}>
                        {designMinifixInputFields.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>
                    <div className={styles.formCard}>
                      <h3 className={styles.cardTitle}>
                        <LuCrosshair aria-hidden="true" />
                        Camlock screw hole
                      </h3>
                      <p className={styles.cardText}>Hole size for camlock screws.</p>
                      <div className={`${styles.fieldGrid} ${styles.fieldGrid3}`}>
                        {designCamlockInputFields.map((field, index) => (
                          <InputField
                            key={index}
                            {...field}
                            borderColor="var(--bv-border-strong)"
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={styles.formActions}>
                    <button
                      className={styles.design_profile_save_button}
                      onClick={handleSaveDesignSettings}
                    >
                      <LuSave aria-hidden="true" />
                      Save Settings
                    </button>
                  </div>

                  {renderToasts(false)}
                </>
              )}

              {/* 4. Team Tab */}
              {activeMenu === 'team' && (
                <>
                  <div className={styles.team}>
                    <div className={styles.teamTopBar}>
                      <div className={styles.toggleContainer}>
                        <button
                          className={`${styles.toggleButton} ${activeTab === 'active' ? styles.active : ''}`}
                          onClick={() => setActiveTab('active')}
                        >
                          <LuUserCheck aria-hidden="true" />
                          Active Members
                        </button>
                        <button
                          className={`${styles.toggleButton} ${activeTab === 'invited' ? styles.active : ''}`}
                          onClick={() => setActiveTab('invited')}
                        >
                          <LuMailOpen aria-hidden="true" />
                          Invited
                        </button>
                      </div>

                      <button
                        className={styles.teantopbarleftButton}
                        onClick={() => setAddMambarPopup(true)}
                      >
                        <LuUserPlus aria-hidden="true" />
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
                          {filteredMembers.length === 0 && (
                            <tr>
                              <td colSpan={4} className={styles.emptyCell}>
                                <span className={styles.emptyIcon}>
                                  <LuUsers aria-hidden="true" />
                                </span>
                                <strong>
                                  {activeTab === 'active' ? 'No members yet' : 'No pending invites'}
                                </strong>
                                <span className={styles.emptyHint}>
                                  Invite a designer or production manager to get started.
                                </span>
                              </td>
                            </tr>
                          )}
                          {filteredMembers.map((member) => {
                            const memberName =
                              member.displayName ||
                              member.name ||
                              member.username ||
                              member.email?.split('@')?.[0] ||
                              'N/A';
                            return (
                              <tr key={member.id}>
                                <td>
                                  <div className={styles.memberCell}>
                                    <span className={styles.memberAvatar}>
                                      {getInitials(memberName)}
                                    </span>
                                    <span className={styles.memberName}>{memberName}</span>
                                  </div>
                                </td>
                                <td className={styles.emailbox}>{member.email}</td>
                                <td className={styles.rolebox}>
                                  <div className={styles.roleContainer}>
                                    {member.groups.map((role, index) => (
                                      <span key={index} className={styles.roleBadge}>
                                        {role}
                                        <button
                                          type="button"
                                          className={styles.closeteam}
                                          aria-label={`Remove ${role}`}
                                          onClick={() => handleRoleRemove(role, member.id)}
                                        >
                                          <LuX aria-hidden="true" />
                                        </button>
                                      </span>
                                    ))}
                                    <div
                                      className={styles.roleaddicon}
                                      title="Add role"
                                      onClick={(e) => handleRoleAddClick(e, member.id)}
                                    >
                                      <LuPlus aria-hidden="true" />
                                    </div>
                                  </div>
                                </td>
                                <td className={styles.actioncolumn}>
                                  <button
                                    type="button"
                                    aria-label="Remove member"
                                    title="Remove member"
                                    className={`${styles.teamdeleteicon} ${
                                      isDeleteHovered == member.id ? styles.teamdeleteiconHover : ''
                                    }`}
                                    onClick={() => handleDeleteMember(member.id)}
                                    onMouseEnter={() => handleMouseEnter(member.id)}
                                    onMouseLeave={handleMouseLeave}
                                  >
                                    <LuTrash2 aria-hidden="true" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {renderToasts(false)}

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
                      <span className={styles.dropdownLabel}>Add role</span>
                      {rolesList.map((role, index) => (
                        <div
                          key={index}
                          className={styles.dropdownItem}
                          onClick={() =>
                            selectedMemberId && handleRoleSelect(role, selectedMemberId)
                          }
                        >
                          <span className={styles.dropdownDot}></span>
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
                    <div className={styles.invitePopupHeader}>
                      <span className={styles.popupIcon}>
                        <LuUserPlus aria-hidden="true" />
                      </span>
                      <div>
                        <h5 className={styles.addmembartitle}>Invite New Member</h5>
                        <p className={styles.popupText}>
                          They will get an email to join your workspace.
                        </p>
                      </div>
                      <button
                        type="button"
                        className={styles.createclose}
                        aria-label="Close"
                        onClick={() => {
                          setAddMambarPopup(false);
                          setErrorMessage('');
                        }}
                      >
                        <LuX aria-hidden="true" />
                      </button>
                    </div>

                    <div className={styles.create_right_side}>
                      <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                        {errorMessage && (
                          <p className={styles.erroemessage}>
                            <LuCircleAlert aria-hidden="true" />
                            {errorMessage}
                          </p>
                        )}

                        <div className={`${styles.fieldGrid} ${styles.fieldGrid1}`}>
                          {addmemberfields.map((field, index) => (
                            <InputField
                              key={index}
                              borderColor="var(--bv-border-strong)"
                              {...field}
                              error=""
                              fullWidth={true}
                              mediumField={true}
                            />
                          ))}
                        </div>

                        <p className={styles.membertitle}>Assign roles</p>

                        <div className={styles.checkboxgroup}>
                          {['Account Manager', 'Mes Editor', 'Catalog Manager', 'Designer'].map(
                            (role) => (
                              <label key={role} htmlFor={role} className={styles.roleItem}>
                                <input
                                  type="checkbox"
                                  id={role}
                                  onChange={handleCheckboxChange}
                                  className={styles.roleCheckbox}
                                />
                                <span>{role}</span>
                              </label>
                            )
                          )}
                        </div>
                      </form>
                    </div>
                    <div className={styles.createButtonGrop}>
                      <button
                        className={styles.cancelButton}
                        onClick={() => {
                          setAddMambarPopup(false);
                          setErrorMessage('');
                        }}
                      >
                        Cancel
                      </button>
                      <button className={styles.invitebutton} onClick={handleAddMemberClick}>
                        <LuSend aria-hidden="true" />
                        Send Invitation
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {memberToDelete && (
                <div className={styles.createpopupOverlay}>
                  <div className={styles.deletepopup}>
                    <button
                      type="button"
                      className={styles.createclose}
                      aria-label="Close"
                      onClick={() => setMemberToDelete(null)}
                    >
                      <LuX aria-hidden="true" />
                    </button>
                    <span className={styles.deleteIcon}>
                      <LuUserMinus aria-hidden="true" />
                    </span>
                    <h5 className={styles.addmembartitle}>Remove team member?</h5>
                    <p className={styles.popupText}>
                      They will lose access to this organization immediately. This can&apos;t be
                      undone.
                    </p>

                    <div className={styles.createButtonGrop}>
                      <button
                        className={styles.cancelButton}
                        onClick={() => setMemberToDelete(null)}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.confirmDeleteButton}
                        onClick={() => confirmDelete(memberToDelete)}
                      >
                        <LuTrash2 aria-hidden="true" />
                        Yes, Remove Member
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
