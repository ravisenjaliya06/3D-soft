import styles from '@/components/header/header.module.css';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import { User } from './interface';

const Header = ({
  isBorderRadius = false,
  dashboardName,
}: {
  isBorderRadius?: boolean;
  dashboardName?: string;
}) => {
  const router = useRouter();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [userdetails, setUserDetails] = useState<User | null>(null);
  const dropdownButtonRef = useRef<HTMLDivElement | null>(null); // Ref for dropdown button
  const dropdownMenuRef = useRef<HTMLDivElement | null>(null); // Ref for dropdown menu
  const [profileUrl, setprofileUrl] = useState('');

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  const handleProfileClick = () => {
    setIsDropdownOpen((prev) => !prev); // Toggle dropdown state
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    Cookies.remove('token', { path: '' });
    router.push({
      pathname: REDIRECT.UNAUTHORIZED,
    });
  };

  const profileSetting = () => {
    router.push({
      pathname: REDIRECT.SETTINGS,
    });
  };

  const fetchUserDetails = async () => {
    try {
      const response: { status: number; data: User } = await CommonService.get(
        API_ENDPOINT.GET_USER_DETAILS
      );
      if (response.status === 200) {
        const userdetails = response.data;
        setUserDetails(userdetails);
        const serverImageUrl = userdetails?.profile_picture
          ? `${process.env.NEXT_PUBLIC_PUBLIC_API}/${userdetails.profile_picture}`
          : '';
        setprofileUrl(serverImageUrl);
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

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownMenuRef.current &&
        !dropdownMenuRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false); // Close dropdown if clicking outside
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  return (
    <>
      <div className={styles.headerTitle}>
        <p>{dashboardName}</p>
      </div>
      <div
        className={`${styles.mainheader} ${isBorderRadius ? styles.withBorderRadius : styles.noBorderRadius} ${isDropdownOpen ? styles.dropdownShadow : ''}`}
      >
        <div className={styles.headerContent}>
          {isFullscreen ? (
            <FullscreenExit
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '1rem',
              }}
            />
          ) : (
            <Fullscreen
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '1rem',
              }}
            />
          )}
          <div
            className={styles.profileIconContainer}
            onClick={handleProfileClick}
            ref={dropdownButtonRef}
          >
            <div>
              <img
                src={profileUrl ? profileUrl : assets.user}
                alt="profile"
                className={styles.profileIcon}
              />
            </div>
            {userdetails?.username ? (
              <div className={styles.userInfo}>
                <p className={styles.userName} title={userdetails.username}>
                  {userdetails.username.length > 10
                    ? userdetails.username.substring(0, 10) + '...'
                    : userdetails.username}
                </p>
                <p className={styles.userSubtitle}>
                  {userdetails.selected_organization_name.length > 15
                    ? userdetails.selected_organization_name.substring(0, 15) + '...'
                    : userdetails.selected_organization_name}
                </p>
              </div>
            ) : (
              <div className={styles.userInfo}>
                <p className={styles.userName}></p>
                <sub className={styles.userSubtitle}></sub>
              </div>
            )}
            <div>
              <img src={assets.dropdown} className={styles.dropDown} alt="dropDown"></img>
            </div>
            {isDropdownOpen && (
              <div className={styles.dropdownMenuProfile} ref={dropdownMenuRef}>
                <ul className={styles.ProfiledropdownList}>
                  <li onClick={profileSetting}>Profile Settings</li>
                  <img
                    src={assets.edit_delete_line}
                    alt="edit-delete-line"
                    className={styles.profile_setting_line}
                  />
                  <li onClick={handleLogout}>Logout</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={styles.simpleLine}>
        <img src={assets.header_part_line} alt="simpleLine" className={styles.simpleLine} />
      </div>
    </>
  );
};

export default Header;
