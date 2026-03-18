import Loading_style from '@/components/loading.module.css';
import styles from '@/components/sidebar/sidebar.module.css';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const Sidebar = () => {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const currentPath = router.pathname;
    if (currentPath.includes('dashboard')) {
      setActiveItem('dashboard');
    } else if (currentPath.includes('material')) {
      setActiveItem('material');
    } else if (currentPath.includes('catalogmanager')) {
      setActiveItem('catalogmanager');
    } else if (currentPath.includes('mes')) {
      setActiveItem('mes');
    } else if (currentPath.includes('designs')) {
      setActiveItem('designs');
    } else if (currentPath.includes('settings')) {
      setActiveItem('settings');
    }
  }, [router.pathname]);

  const handleClick = (item: string, route: string) => {
    if (route === REDIRECT.UNAUTHORIZED) {
      Cookies.remove('token', { path: '/' });
      localStorage.clear();
    }
    setActiveItem(item);
    setIsLoading(true);
    router.push(route).then(() => {
      setIsLoading(false);
      setIsSidebarOpen(!isSidebarOpen);
    });
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className={styles.container}>
      {isSidebarOpen ? (
        <div className={styles.leftside}>
          {isLoading && (
            <div className={Loading_style.loadingOverlay}>
              <div className={Loading_style.loadingSpinner}></div>
              <p>Loading...</p>
            </div>
          )}
          <div className={styles.project_logo}>
            <img
              onClick={() => router.push(REDIRECT.DASHBOARD)}
              src={assets.Logo}
              alt="Bravento Logo"
            />
          </div>
          <div className={styles.simple_line}>
            <img src={assets.simple_line} alt="Simple line" />
          </div>
          <nav className={styles.nav}>
            <ul>
              <li
                className={activeItem === 'dashboard' ? styles.active : ''}
                onClick={() => handleClick('dashboard', REDIRECT.DASHBOARD)}
              >
                {activeItem === 'dashboard' && (
                  <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                )}
                <img
                  src={assets.dashboard}
                  alt="Dashboard"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'dashboard' ? styles.icon_adjusted : ''
                  }`}
                />
                Dashboard
              </li>
              <li
                className={activeItem === 'mes' ? styles.active : ''}
                onClick={() => handleClick('mes', REDIRECT.MES)}
              >
                {activeItem === 'mes' && (
                  <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                )}
                <img
                  src={assets.mes}
                  alt="MES"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'mes' ? styles.icon_adjusted : ''
                  }`}
                />
                MES
              </li>
              <li
                className={activeItem === 'material' ? styles.active : ''}
                onClick={() => handleClick('material', REDIRECT.MATERIAL)}
              >
                {activeItem === 'material' && (
                  <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                )}
                <img
                  src={assets.material}
                  alt="Material"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'material' ? styles.icon_adjusted : ''
                  }`}
                />
                Material
              </li>
              <li
                className={activeItem === 'catalogmanager' ? styles.active : ''}
                onClick={() => handleClick('catalogmanager', REDIRECT.CATALOG_MANAGER)}
              >
                {activeItem === 'catalogmanager' && (
                  <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                )}
                <img
                  src={assets.catalogmanager}
                  alt="Catalog Manager"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'catalogmanager' ? styles.icon_adjusted : ''
                  }`}
                />
                Catalog Manager
              </li>
              <li
                className={activeItem === 'designs' ? styles.active : ''}
                onClick={() => handleClick('designs', REDIRECT.DESIGNS)}
              >
                {activeItem === 'designs' && (
                  <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                )}
                <img
                  src={assets.design}
                  alt="design"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'designs' ? styles.icon_adjusted : ''
                  }`}
                />
                Design
              </li>
              <div className={styles.userhelp}>
                <div className={styles.dropdown} onClick={toggleSidebar}>
                  <img src={assets.arrow_down} alt="dropdown" />
                </div>
                <li
                  className={activeItem === 'settings' ? styles.active : ''}
                  onClick={() => handleClick('settings', REDIRECT.SETTINGS)}
                >
                  {activeItem === 'settings' && (
                    <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                  )}
                  <img
                    src={assets.Setting}
                    alt="settings"
                    className={`${styles.sidebar_icon} ${
                      activeItem === 'settings' ? styles.icon_adjusted : ''
                    }`}
                  />
                  Settings
                </li>
                <li
                  className={activeItem === 'logout' ? styles.active : ''}
                  onClick={() => handleClick('logout', '/auth/login')}
                >
                  <img src={assets.Logout} alt="logout" className={styles.sidebar_icon} />
                  Log out
                </li>
              </div>
            </ul>
          </nav>
        </div>
      ) : (
        <div className={styles.leftsidebar}>
          <div className={styles.project_logo}>
            <img src={assets.sidebaricon} alt="Bravento Logo" />
          </div>
          <div className={styles.simple_line2}>
            <img src={assets.simple_line} alt="Simple line" />
          </div>
          <nav className={styles.nav}>
            <ul>
              <li
                className={`${styles.listItem} ${activeItem === 'dashboard' ? styles.active_small : ''}`}
                onClick={() => handleClick('dashboard', REDIRECT.DASHBOARD)}
                data-title="Dashboard"
              >
                <img
                  src={assets.dashboard}
                  alt="Dashboard"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'dashboard' ? styles.icon_adjusteds : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'mes' ? styles.active_small : ''}`}
                onClick={() => handleClick('mes', REDIRECT.MES)}
                data-title="MES"
              >
                <img
                  src={assets.mes}
                  alt="MES"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'mes' ? styles.icon_adjusteds : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'material' ? styles.active_small : ''}`}
                onClick={() => handleClick('material', REDIRECT.MATERIAL)}
                data-title="Material"
              >
                <img
                  src={assets.material}
                  alt="Material"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'material' ? styles.icon_adjusteds : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'catalogmanager' ? styles.active_small : ''}`}
                onClick={() => handleClick('catalogmanager', REDIRECT.CATALOG_MANAGER)}
                data-title="Catalog Manager"
              >
                <img
                  src={assets.catalogmanager}
                  alt="Catalog Manager"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'catalogmanager' ? styles.icon_adjusteds : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'designs' ? styles.active_small : ''}`}
                onClick={() => handleClick('designs', REDIRECT.DESIGNS)}
                data-title="Design"
              >
                <img
                  src={assets.design}
                  alt="design"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'designs' ? styles.icon_adjusteds : ''
                  }`}
                />
              </li>
              <div className={styles.userhelp}>
                <div className={styles.dropup} onClick={toggleSidebar}>
                  <img src={assets.arrow_up} alt="dropup" />
                </div>
                <li
                  className={`${styles.listItem} ${activeItem === 'settings' ? styles.active_small : ''}`}
                  onClick={() => handleClick('settings', REDIRECT.SETTINGS)}
                  data-title="Settings"
                >
                  {activeItem === 'settings' && (
                    <img src={assets.selected} alt="Selected" className={styles.selected_icon} />
                  )}
                  <img src={assets.Setting} alt="setting" className={styles.sidebar_icon} />
                </li>
                <li
                  className={`${styles.listItem} ${activeItem === 'logout' ? styles.active_small : ''}`}
                  onClick={() => handleClick('logout', '/auth/login')}
                  data-title="Logout"
                >
                  <img src={assets.Logout} alt="logout" className={styles.sidebar_icon} />
                </li>
              </div>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
