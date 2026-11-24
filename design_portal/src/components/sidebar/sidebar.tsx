import PhinxLoader from '@/components/common/PhinxLoader';
import styles from '@/components/sidebar/sidebar.module.css';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { IconType } from 'react-icons';
import {
  LuBox,
  LuFactory,
  LuLayers,
  LuLayoutDashboard,
  LuLibrary,
  LuLogOut,
  LuSettings,
} from 'react-icons/lu';

interface NavItem {
  key: string;
  label: string;
  route: string;
  Icon: IconType;
}

// Same destinations and routes as before; shown as a top navigation bar.
const MAIN_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Overview', route: REDIRECT.DASHBOARD, Icon: LuLayoutDashboard },
  { key: 'designs', label: 'Designs', route: REDIRECT.DESIGNS, Icon: LuBox },
  { key: 'material', label: 'Materials', route: REDIRECT.MATERIAL, Icon: LuLayers },
  {
    key: 'catalogmanager',
    label: 'Catalog',
    route: REDIRECT.CATALOG_MANAGER,
    Icon: LuLibrary,
  },
  { key: 'mes', label: 'Production', route: REDIRECT.MES, Icon: LuFactory },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { key: 'settings', label: 'Settings', route: REDIRECT.SETTINGS, Icon: LuSettings },
  { key: 'logout', label: 'Log out', route: '/auth/login', Icon: LuLogOut },
];

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

  return (
    <header className={styles.container}>
      {isLoading && <PhinxLoader overlay label="Opening your workspace…" />}

      <div className={styles.topbar}>
        <button
          type="button"
          className={styles.brand}
          onClick={() => router.push(REDIRECT.DASHBOARD)}
          aria-label="Phinx home"
        >
          <img src={assets.phinxLogoLight} alt="Phinx" />
        </button>

        <nav className={styles.nav} aria-label="Main">
          {MAIN_ITEMS.map((item) => {
            const isActive = activeItem === item.key;
            return (
              <button
                type="button"
                key={item.key}
                className={`${styles.tab} ${isActive ? styles.tabActive : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => handleClick(item.key, item.route)}
              >
                <item.Icon aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className={styles.actions}>
          {ACCOUNT_ITEMS.map((item) => {
            const isActive = activeItem === item.key;
            return (
              <button
                type="button"
                key={item.key}
                className={`${styles.action} ${isActive ? styles.actionActive : ''} ${
                  item.key === 'logout' ? styles.actionLogout : ''
                }`}
                onClick={() => handleClick(item.key, item.route)}
                title={item.label}
                aria-label={item.label}
              >
                <item.Icon aria-hidden="true" />
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};

export default Sidebar;
