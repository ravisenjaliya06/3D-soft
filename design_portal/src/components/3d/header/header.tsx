import close from '@/assets/catalog/close.svg';
import help from '@/assets/catalog/help.svg';
import profile from '@/assets/catalog/profile.svg';
import Loading_style from '@/components/loading.module.css';
import commonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import Fullscreen from '@mui/icons-material/Fullscreen';
import FullscreenExit from '@mui/icons-material/FullscreenExit';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import styles from './header.module.css';

interface Design {
  id: string;
  design_name: string;
  created_at: string;
  updated_at: string;
  status: string;
}

const Header = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [designName, setDesignName] = useState<Design[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const dropdownButtonRef = useRef<HTMLImageElement | null>(null);

  const handleClick = (route: string) => {
    if (document.fullscreenElement) {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        router.push(route);
      });
    } else {
      router.push(route);
    }
    setIsLoading(true);
    router.push(route).then(() => {
      setIsLoading(false);
    });
  };

  const pathName = window.location.pathname.split('/');
  const designId = pathName[2];

  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      const response: { status: number; data: Design[] } =
        await commonService.get('design', '');
      if (response.status === 200) {
        const designs = response.data;
        const selectedDesign = designs.find((design) => design.id === designId);
        if (selectedDesign) {
          setDesignName([selectedDesign]);
        } else {
          setErrorMessage('Design not found');
        }
      } else {
        setErrorMessage('Failed to fetch designs');
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
      setErrorMessage('Error fetching designs');
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        dropdownButtonRef.current &&
        !dropdownButtonRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

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
    setIsDropdownOpen((prev) => !prev);
  };

  const profileSetting = () => {
    router.push({
      pathname: REDIRECT.SETTINGS,
    });
  };

  const designId1 = window.location.pathname.split('/')[2];

  const handleNesting = async () => {
    try {
      const response: { status: number; data: Design[] } =
        // @ts-expect-error designId conflict
        await commonService.get('design', designId1 + '/nesting');
      if (response.status === 200) {
        router.push({
          pathname: `/mes/${designId1}`,
        });
      } else {
        setErrorMessage('Failed to fetch designs');
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
      setErrorMessage('Error fetching designs');
    }
  };

  return (
    <>
      <div className={styles.header}>
        {isLoading && (
          <div className={Loading_style.loadingOverlay}>
            <div className={Loading_style.loadingSpinner}></div>
            <p>Loading...</p>
          </div>
        )}
        <div className={styles.headerTitle}>
          <p>
            {designName.length > 0
              ? designName[0].design_name
              : 'Furniture Design'}
          </p>
        </div>

        <div className={styles.header_rightmenu}>
          <div className={styles.nestingbutton} onClick={handleNesting}>
            <p>Nesting</p>
          </div>
          <img
            src={profile.src}
            alt="profile"
            onClick={handleProfileClick}
            ref={dropdownButtonRef}
            style={{ cursor: 'pointer' }}
          />

          <img src={help.src} alt="help" className={styles.help} />
          {isFullscreen ? (
            <FullscreenExit
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '0rem',
              }}
            />
          ) : (
            <Fullscreen
              onClick={toggleFullscreen}
              style={{
                width: '1.5rem',
                cursor: 'pointer',
                marginRight: '0rem',
              }}
            />
          )}

          <img
            src={close.src}
            alt="close"
            onClick={() => handleClick(REDIRECT.DESIGNS)}
            className={styles.close}
          />
        </div>
      </div>

      {isDropdownOpen && (
        <div className={styles.dropdownMenuProfile} ref={dropdownRef}>
          <ul className={styles.ProfiledropdownList}>
            <li onClick={profileSetting}>Profile Settings</li>
          </ul>
        </div>
      )}
    </>
  );
};

export default Header;
