import Header from '@/components/header/header';
import styles from '@/components/settings/setting.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { ChangeEvent, useEffect, useRef, useState } from 'react';
import InputField from '../inputfields/InputField';
import { Member, Organization, SettingConfigs, TeamRole, User, addmember } from './interface';

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

  const [dropdownPosition, setDropdownPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [isDeleteHovered, setIsDeleteHovered] = useState<string | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  const [addMemberName, setAddMemberName] = useState('');

  const [addMemberEmail, setAddMemberEmail] = useState('');

  const [height, setHeight] = useState<number | null>();
  const [width, setWidth] = useState<number | null>();
  const [nestHeight, setNestHeight] = useState<number | null>();
  const [nestWidth, setNestWidth] = useState<number | null>();
  const [designUnit, setDesignUnit] = useState<string | null>();
  const [minifixDistance, setMinifixDistance] = useState<number | null>();
  const [grooveGap, setGrooveGap] = useState<number | null>();
  const [grooveDig, setGrooveDig] = useState<number | null>();

  const rolesList = ['Account Manager', 'Mes Editor', 'Designer', 'Catalog Manager'];

  const [members, setMembers] = useState<Member[]>([]);

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
  const handleRoleAddClick = (event: React.MouseEvent<HTMLImageElement>, memberId: string) => {
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
    updatedRoles.forEach((r) => formData.append('groups[]', r));

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
    updatedRoles.forEach((r) => formData.append('groups[]', r));

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
      placeholder: 'Enter design name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setAddMemberName(e.target.value),
    },
    {
      label: 'Email',
      type: 'email',
      placeholder: 'Enter design name',
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

  const handleAddMemberClick = async () => {
    const newMember: addmember = {
      username: addMemberName,
      email: addMemberEmail,
      groups: selectedRoles,
    };

    const formData = new FormData();
    formData.append('username', newMember.username);
    formData.append('email', newMember.email);
    newMember.groups.forEach((groups) => formData.append('groups[]', groups));

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
      setErrorMessage(response.data.email || 'Failed to add member');
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
      setName(UserDetails.name);
      setEmail(UserDetails.email);
      setNumber(UserDetails.phone);
    }
  }, [UserDetails]);

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
      onChange: (e: ChangeEvent<HTMLInputElement>) => setMinifixDistance(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: minifixDistance,
    },
  ];
  const designGroovingInputFields = [
    {
      label: 'Diameter',
      type: 'number',
      placeholder: 'Diameter',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setGrooveGap(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: grooveGap,
    },
    {
      label: 'Height',
      type: 'number',
      placeholder: 'Height',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setGrooveDig(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: grooveDig,
    },
    {
      label: 'Width',
      type: 'number',
      placeholder: 'Width',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setGrooveDig(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: grooveDig,
    },
  ];

  const EdgeBandingInputFields = [
    {
      label: 'Distance',
      type: 'number',
      placeholder: 'Distance',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setMinifixDistance(parseInt(e.target.value)),
      error: '',
      minField: true,
      value: minifixDistance,
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

  const handleDeleteMember = async (memberId: string) => {
    const currentUserEmailId = getCurrentUserEmailId();
    if (members.find((member) => member.id === memberId)?.email === currentUserEmailId) {
      alert('You cannot remove yourself from the team.');
      return;
    }

    const confirmDelete = window.confirm('Are you sure you want to remove this team member?');
    if (!confirmDelete) return;

    try {
      const response: { status: number } = await CommonService.delete(
        API_ENDPOINT.REMOVE_USER_FROM_ORGANIZATION(memberId)
      );
      if (response.status === 200) {
        setMembers((prevMembers) => prevMembers.filter((member) => member.id !== memberId));
        alert('Team member removed successfully!');
        await handalGetmember();
      } else {
        setErrorMessage('Failed to remove team member');
      }
    } catch (error) {
      console.error('Error deleting member:', error);
      const errorMsg =
        error instanceof Error ? error.message : 'An error occurred while removing member';
      setErrorMessage(errorMsg);
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
        if (organizationdata.logo && typeof organizationdata.logo === 'string') {
          const serverImageUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${organizationdata.logo}`;
          setorganizationUrl(serverImageUrl);
        }
        setOrganizationName(organizationdata.display_name);
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
        setOrganizationName(data.display_name);
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

  const handleSettingsSubmit = async () => {
    const formData = new FormData();
    formData.append('sheet_height', String(height ?? 0));
    formData.append('sheet_width', String(width ?? 0));
    formData.append('nest_width', String(nestWidth ?? 0));
    formData.append('nest_height', String(nestHeight ?? 0));
    formData.append('unit', String(designUnit));

    formData.append('minifix_distance', String(minifixDistance ?? 0));
    formData.append('groove_gap', String(grooveGap ?? 0));
    formData.append('groove_dig', String(grooveDig ?? 0));

    try {
      const response = await CommonService.put(API_ENDPOINT.UPDATE_DESIGN_SETTING, formData);

      if (response.status === 200) {
        setSuccessMessage('Settings updated successfully!');
        fetchSettingsConfig(); // Optional: reload settings after save
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        console.error('Failed to update settings:', response.status);
        setErrorMessage('Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      setErrorMessage('An error occurred while updating settings');
    }
  };

  useEffect(() => {
    fetchSettingsConfig();
  }, []);

  const fetchSettingsConfig = async () => {
    const response: { status: number; data: SettingConfigs } = await CommonService.get(
      API_ENDPOINT.GET_DESIGN_SETTING
    );

    if (response.status === 200) {
      const data = response.data;

      setHeight(data.height);
      setWidth(data.width);
      setNestWidth(data.sheet_width);
      setNestHeight(data.sheet_height);
      setDesignUnit(data.unit);
      setMinifixDistance(data.minifix_distance);
      setGrooveGap(data.groove_gap);
      setGrooveDig(data.groove_dig);
    }
  };
  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Settings" />
        <div className={styles.mainContent}>
          <div className={styles.profileMenu}>
            <div className={styles.menuItemsEmail}>
              <img src={assets.account_profile} className={styles.accountprofile} alt="profile" />
              <p className={styles.useremail}> {UserDetails?.email}</p>
            </div>
            <div className={styles.menuImg}>
              <img src={assets.simple_line} alt="line" />
            </div>
            <div
              className={activeMenu === 'profile' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('profile')}
            >
              {activeMenu === 'profile' ? (
                <img src={assets.account_svg} alt="profile" />
              ) : (
                <img src={assets.account_not_selected} alt="profile" />
              )}
              {activeMenu === 'profile' ? (
                <p className={styles.activeMenuTitle}>Profile</p>
              ) : (
                <p className={styles.menuTitle}>Profile</p>
              )}
            </div>
            <div
              className={activeMenu === 'team' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('team')}
            >
              {activeMenu === 'team' ? (
                <img src={assets.team_not_selected} alt="team" />
              ) : (
                <img src={assets.team_svg} alt="team" />
              )}
              {activeMenu === 'team' ? (
                <p className={styles.activeMenuTitle}>Team</p>
              ) : (
                <p className={styles.menuTitle}>Team</p>
              )}
            </div>
            <div
              className={activeMenu === 'organizations' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('organizations')}
            >
              {activeMenu === 'organizations' ? (
                <img src={assets.organization_not_selected} alt="organizations" />
              ) : (
                <img src={assets.organizations_svg} alt="organizations" />
              )}
              {activeMenu === 'organizations' ? (
                <p className={styles.activeMenuTitle}>Organizations</p>
              ) : (
                <p className={styles.menuTitle}>Organizations</p>
              )}
            </div>
            {/* Design setting menu */}
            <div
              className={activeMenu === 'Design setting' ? styles.activeMenu : styles.menuItems}
              onClick={() => handleActiveMenu('Design setting')}
            >
              {activeMenu === 'Design setting' ? (
                <img src={assets.designmenuicon_not} alt="Design setting'" />
              ) : (
                <img src={assets.designmenuicon_not} alt="Design setting'" />
              )}
              {activeMenu === 'Design setting' ? (
                <p className={styles.activeMenuTitle}>Design setting</p>
              ) : (
                <p className={styles.menuTitle}>Design setting</p>
              )}
            </div>
          </div>

          <div className={styles.profile}>
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
                    onChange={(e) => {
                      handleProfileImageChange(e);
                    }}
                  />
                  <p>{UserDetails?.username}</p>
                </div>
                <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
                  <div className={styles.inputGroup}>
                    {firstfieldsgroup.map((field, index) => (
                      <InputField
                        key={index}
                        {...field}
                        borderColor="var(--primary-color-grey-2 )"
                      />
                    ))}
                  </div>
                  <div className={styles.inputGroup}>
                    {secordfieldsgroup.map((field, index) => (
                      <InputField
                        key={index}
                        {...field}
                        borderColor="var(--primary-color-grey-2 )"
                      />
                    ))}
                  </div>
                  <button className={styles.saveButton} onClick={handleSave}>
                    Save
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
            {activeMenu === 'organizations' && (
              <>
                <div className={styles.organizationupperpart}>
                  <div className={styles.organizationsfirstImage}>
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
                  </div>

                  <input
                    type="text"
                    className={`${styles.organizationInputfild} ${organizationNameError ? styles.errorInput : ''
                      }`}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      setOrganizationName(e.target.value);
                      setOrganizationNameError(null);
                    }}
                    value={organizationName}
                  />

                  <button
                    className={styles.organizationTitleButton}
                    onClick={handalInputOrganization}
                  >
                    save
                  </button>
                </div>
                {organizationNameError && (
                  <p className={styles.errorMessage}>{organizationNameError}</p>
                )}
                <p className={styles.commingsoon}>Coming Soon............</p>
                {successMessage && (
                  <div className={styles.successPopup}>
                    <img src={assets.success} alt="Success" />
                    <p>{successMessage}</p>
                  </div>
                )}
              </>
            )}

            {/* Design Setting menu active */}
            {activeMenu === 'Design setting' && (
              <>
                <div className={styles.heading_containar}>
                  <h4>Set your default design</h4>
                </div>
                <img src={assets.design_line} alt="design" className={styles.designline} />

                <div className={styles.mainContentdesign}>
                  <div className={styles.firstbox}>
                    <p>Nesting Sheet size</p>
                    <div className={styles.firstfieldsgroupdesign}>
                      {designFirstInputFields.map((field, index) => (
                        <InputField
                          key={index}
                          {...field}
                          borderColor="var(--primary-color-grey-2 )"
                        />
                      ))}
                    </div>
                  </div>
                  <div className={styles.firstbox}>
                    <p>3D view design size</p>
                    <div className={styles.firstfieldsgroupdesign}>
                      {designSecondInputFields.map((field, index) => (
                        <InputField
                          key={index}
                          {...field}
                          borderColor="var(--primary-color-grey-2 )"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <img src={assets.design_line} alt="design" className={styles.designline} />

                <h4 className={styles.design_unit_size}>Design Unit Size</h4>
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
                <img src={assets.design_line} alt="design" className={styles.designline} />
                {/*Minifix setting and grooving data */}
                <div className={styles.mainContentminifix}>
                  <div className={styles.firstbox}>
                    <p>Minifix Setting</p>
                    <div className={styles.minifixfieldsgroupdesign}>
                      {designMinifixInputFields.map((field, index) => (
                        <InputField
                          key={index}
                          {...field}
                          borderColor="var(--primary-color-grey-2 )"
                        />
                      ))}
                    </div>
                  </div>
                  <img src={assets.design_line} alt="design" className={styles.designline} />
                  <div className={styles.firstbox}>
                    <p>Grooving Settings</p>
                    <div className={styles.minifixfieldsgroupdesign}>
                      {designGroovingInputFields.map((field, index) => (
                        <InputField
                          key={index}
                          {...field}
                          borderColor="var(--primary-color-grey-2 )"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <img src={assets.design_line} alt="design" className={styles.designline} />
                <div className={styles.lastbox}>
                  <div className="flex items-center gap-[2rem]">
                    <p>Edge Banding</p>
                    <div
                      onClick={handleEdgeBandingToggle}
                      className={`relative mb-[0.5rem] h-[1rem] w-[2.25rem] cursor-pointer rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] transition-colors duration-300 ${edgeBandingEnabled ? 'bg-[var(--primary-color)]' : 'bg-[white]'} ${edgeBandingDisabled ? 'pointer-events-none opacity-50' : ''}`}
                    >
                      {/* Knob */}
                      <div
                        className={`absolute top-[0.15rem] left-[0.1rem] h-[0.6rem] w-[0.6rem] rounded-full border-[0.1rem] border-[var(--toggle-border-color)] p-[0rem] ring-[0.1rem] transition-transform duration-300 ease-in-out ${edgeBandingEnabled
                          ? 'translate-x-[1.2rem] bg-[white] ring-[var(--primary-color)]'
                          : 'translate-x-0 bg-[var(--primary-color)] ring-[white]'
                          }`}
                      />
                    </div>
                  </div>
                  <div className={styles.lastboxindiv}>
                    <div className={styles.minifixfieldsgroupdesign}>
                      {EdgeBandingInputFields.map((field, index) => (
                        <InputField
                          key={index}
                          {...field}
                          borderColor="var(--primary-color-grey-2 )"
                        />
                      ))}
                    </div>
                    <button
                      className={styles.design_profile_save_button}
                      onClick={handleSettingsSubmit}
                    >
                      save
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

            {/* Team Active Page */}

            {activeMenu === 'team' && (
              <>
                <div className={styles.team}>
                  {/* Title Section */}
                  <div className={styles.designsettingTitle}>
                    <p className={styles.designsettingTitleText}>Team Members</p>
                  </div>
                  <div className={styles.teamTopBar}>
                    <button
                      className={styles.teantopbarleftButton}
                      onClick={() => setAddMambarPopup(true)}
                    >
                      <img src={assets.addmembar} alt="addmember" /> Add Member
                    </button>
                    <div className={styles.toggleContainer}>
                      <button
                        className={`${styles.toggleButton} ${activeTab === 'active' ? styles.active : ''}`}
                        onClick={() => setActiveTab('active')}
                      >
                        Active
                      </button>
                      <button
                        className={`${styles.toggleButton} ${activeTab === 'invited' ? styles.active : ''}`}
                        onClick={() => setActiveTab('invited')}
                      >
                        Invited
                      </button>
                    </div>
                  </div>
                  <div className={styles.tableContainer} ref={tableContainerRef}>
                    <table>
                      <thead>
                        <tr>
                          <th>
                            <div style={{ marginLeft: '1rem' }}>Name</div>
                          </th>
                          <th>Email</th>
                          <th>Role</th>
                          <th className={styles.actioncolumn}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMembers.map((member) => (
                          <tr key={member.id}>
                            <td>
                              <div style={{ marginLeft: '1rem' }}>{member.name}</div>
                            </td>
                            <td className={styles.emailbox}>{member.email}</td>
                            <td className={styles.rolebox}>
                              <div className={styles.roleContainer}>
                                {member.groups.map((role, index) => (
                                  <span key={index} className={styles.roleBadge}>
                                    <div>
                                      <img
                                        src={assets.close}
                                        alt="close"
                                        className={styles.closeteam}
                                        onClick={() => {
                                          handleRoleRemove(role, member.id);
                                        }}
                                      />

                                      <img
                                        src={
                                          role === 'Account Manager'
                                            ? assets.admindot
                                            : role === 'Mes Editor'
                                              ? assets.mesdot
                                              : role === 'Designer'
                                                ? assets.designdot
                                                : role === 'Catalog Manager'
                                                  ? assets.catalogdot
                                                  : ''
                                        }
                                        alt="dot"
                                        className={styles.dot}
                                        onClick={() => {
                                          handleRoleRemove(role, member.id);
                                        }}
                                      />
                                    </div>
                                    {role}
                                  </span>
                                ))}
                                <img
                                  src={assets.roleaddicon}
                                  alt="role add"
                                  className={styles.roleaddicon}
                                  onClick={(e) => handleRoleAddClick(e, member.id)}
                                />
                              </div>
                            </td>
                            <td className={styles.actioncolumn}>
                              <img
                                src={
                                  isDeleteHovered == member.id
                                    ? assets.deleteteamicon
                                    : assets.delete_not_icon
                                }
                                alt="team delete"
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
                        <img
                          src={
                            role === 'Account Manager'
                              ? assets.admindot
                              : role === 'Mes Editor'
                                ? assets.mesdot
                                : role === 'Designer'
                                  ? assets.designdot
                                  : role === 'Catalog Manager'
                                    ? assets.catalogdot
                                    : ''
                          }
                          alt="dot"
                          className={styles.dot}
                        />
                        {role}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {addMambarPopup && (
              <div className={styles.createpopupOverlay}>
                <div className={styles.createpopup}>
                  <div className={styles.firstpart}>
                    <h5 className={styles.addmembartitle}> Add member</h5>
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
                    <form
                      className={styles.form}
                      onSubmit={(e) => {
                        e.preventDefault();
                      }}
                    >
                      <div className={styles.createinputGroup}>
                        {addmemberfields.map((field, index) => (
                          <InputField
                            className={styles.inputField}
                            key={index}
                            borderColor="var(--primary-color-grey-2)"
                            {...field}
                            error=""
                          />
                        ))}
                      </div>
                      <p className={styles.erroemessage}>{errorMessage}</p>
                      <h5 className={styles.membertitle}>Member role</h5>

                      <div className={styles.checkboxgroup}>
                        <input
                          type="checkbox"
                          id="Account Manager"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor="admin">Admin</label>

                        <input type="checkbox" id="Mes Editor" onChange={handleCheckboxChange} />
                        <label htmlFor="mes">MES</label>

                        <input type="checkbox" id="Designer" onChange={handleCheckboxChange} />
                        <label htmlFor="designer">Designer</label>

                        <input
                          type="checkbox"
                          id="Catalog Manager"
                          onChange={handleCheckboxChange}
                        />
                        <label htmlFor="catalog-manager">Catalog Manager</label>
                      </div>
                    </form>
                  </div>
                  <div className={styles.createButtonGrop}>
                    <button className={styles.invitebutton} onClick={handleAddMemberClick}>
                      Invite Member
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
