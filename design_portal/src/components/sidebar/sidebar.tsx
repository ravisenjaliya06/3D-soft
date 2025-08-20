import bravento_logo from '@/assets/Logo.svg';
import simple_line from '@/assets/sidebar/Line.svg';
import simple_line2 from '@/assets/sidebar/Line2.svg';
import Logout from '@/assets/sidebar/Logout.svg';
import Setting from '@/assets/sidebar/Setting.svg';
import admin from '@/assets/sidebar/admin.svg';
import dropdown from '@/assets/sidebar/arrow-down.svg';
import dropup from '@/assets/sidebar/arrow-up.svg';
import dashboard from '@/assets/sidebar/dashboard.svg';
import design from '@/assets/sidebar/design.svg';
import mes from '@/assets/sidebar/mes.svg';
import selected from '@/assets/sidebar/selected.svg';
import dropup_icon from '@/assets/sidebar/sidebaricon.svg';
import Loading_style from '@/components/loading.module.css';
import styles from '@/components/sidebar/sidebar.module.css';
import { REDIRECT } from '@/services/CommonStatus';
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
    } else if (currentPath.includes('admin')) {
      setActiveItem('admin');
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
      Cookies.remove('token', { path: '' });
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
              src={bravento_logo.src}
              alt="Bravento Logo"
            />
          </div>
          <div className={styles.simple_line}>
            <img src={simple_line.src} alt="Simple line" />
          </div>
          <nav className={styles.nav}>
            <ul>
              <li
                className={activeItem === 'dashboard' ? styles.active : ''}
                onClick={() => handleClick('dashboard', REDIRECT.DASHBOARD)}
              >
                {activeItem === 'dashboard' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={dashboard.src}
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
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={mes.src}
                  alt="MES"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'mes' ? styles.icon_adjusted : ''
                  }`}
                />
                MES
              </li>
              <li
                className={activeItem === 'admin' ? styles.active : ''}
                onClick={() => handleClick('admin', REDIRECT.ADMIN)}
              >
                {activeItem === 'admin' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={admin.src}
                  alt="Admin"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'admin' ? styles.icon_adjusted : ''
                  }`}
                />
                Admin
              </li>
              <li
                className={activeItem === 'designs' ? styles.active : ''}
                onClick={() => handleClick('designs', REDIRECT.DESIGNS)}
              >
                {activeItem === 'designs' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={design.src}
                  alt="design"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'designs' ? styles.icon_adjusted : ''
                  }`}
                />
                Design
              </li>
              <div className={styles.userhelp}>
                <div className={styles.dropdown} onClick={toggleSidebar}>
                  <img src={dropdown.src} alt="dropdown" />
                </div>
                <li
                  className={activeItem === 'settings' ? styles.active : ''}
                  onClick={() => handleClick('settings', REDIRECT.SETTINGS)}
                >
                  {activeItem === 'settings' && (
                    <img
                      src={selected.src}
                      alt="Selected"
                      className={styles.selected_icon}
                    />
                  )}
                  <img
                    src={Setting.src}
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
                  <img
                    src={Logout.src}
                    alt="logout"
                    className={styles.sidebar_icon}
                  />
                  Log out
                </li>
              </div>
            </ul>
          </nav>
        </div>
      ) : (
        <div className={styles.leftsidebar}>
          <div className={styles.project_logo}>
            <img src={dropup_icon.src} alt="Bravento Logo" />
          </div>
          <div className={styles.simple_line2}>
            <img src={simple_line2.src} alt="Simple line" />
          </div>
          <nav className={styles.nav}>
            <ul>
              <li
                className={`${styles.listItem} ${activeItem === 'dashboard' ? styles.active_small : ''}`}
                onClick={() => handleClick('dashboard', REDIRECT.DASHBOARD)}
                data-title="Dashboard"
              >
                {activeItem === 'dashboard' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={dashboard.src}
                  alt="Dashboard"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'dashboard' ? styles.icon_adjusted : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'mes' ? styles.active_small : ''}`}
                onClick={() => handleClick('mes', REDIRECT.MES)}
                data-title="MES"
              >
                {activeItem === 'mes' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={mes.src}
                  alt="MES"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'mes' ? styles.icon_adjusted : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'admin' ? styles.active_small : ''}`}
                onClick={() => handleClick('admin', REDIRECT.ADMIN)}
                data-title="Admin"
              >
                {activeItem === 'admin' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={admin.src}
                  alt="Admin"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'admin' ? styles.icon_adjusted : ''
                  }`}
                />
              </li>
              <li
                className={`${styles.listItem} ${activeItem === 'designs' ? styles.active_small : ''}`}
                onClick={() => handleClick('designs', REDIRECT.DESIGNS)}
                data-title="Design"
              >
                {activeItem === 'designs' && (
                  <img
                    src={selected.src}
                    alt="Selected"
                    className={styles.selected_icon}
                  />
                )}
                <img
                  src={design.src}
                  alt="design"
                  className={`${styles.sidebar_icon} ${
                    activeItem === 'designs' ? styles.icon_adjusted : ''
                  }`}
                />
              </li>
              <div className={styles.userhelp}>
                <div className={styles.dropup} onClick={toggleSidebar}>
                  <img src={dropup.src} alt="dropup" />
                </div>
                <li
                  className={`${styles.listItem} ${activeItem === 'settings' ? styles.active_small : ''}`}
                  onClick={() => handleClick('settings', REDIRECT.SETTINGS)}
                  data-title="Settings"
                >
                  {activeItem === 'settings' && (
                    <img
                      src={selected.src}
                      alt="Selected"
                      className={styles.selected_icon}
                    />
                  )}
                  <img
                    src={Setting.src}
                    alt="setting"
                    className={styles.sidebar_icon}
                  />
                </li>
                <li
                  className={`${styles.listItem} ${activeItem === 'logout' ? styles.active_small : ''}`}
                  onClick={() => handleClick('logout', '/auth/login')}
                  data-title="Logout"
                >
                  <img
                    src={Logout.src}
                    alt="logout"
                    className={styles.sidebar_icon}
                  />
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
