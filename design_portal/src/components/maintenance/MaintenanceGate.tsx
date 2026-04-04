'use client';

import { getMaintenanceMode, MaintenanceMode } from '@/components/maintenance/maintenance-schedule';
import { ReactNode, useEffect, useState } from 'react';
import MaintenanceBanner from './MaintenanceBanner';
import MaintenanceFullPage from './MaintenanceFullPage';

interface MaintenanceGateProps {
  children: ReactNode;
  showBannerOnPages?: boolean;
}

const MaintenanceGate = ({ children, showBannerOnPages = false }: MaintenanceGateProps) => {
  const [mode, setMode] = useState<MaintenanceMode>('none');

  useEffect(() => {
    const checkMode = () => {
      setMode(getMaintenanceMode());
    };

    // Check immediately
    checkMode();

    // Check every minute
    const interval = setInterval(checkMode, 60000);

    return () => clearInterval(interval);
  }, []);

  // Full page maintenance - block everything
  if (mode === 'fullPage') {
    return <MaintenanceFullPage />;
  }

  // Normal mode or banner mode
  return (
    <>
      {showBannerOnPages && mode === 'banner' && <MaintenanceBanner />}
      {children}
    </>
  );
};

export default MaintenanceGate;
