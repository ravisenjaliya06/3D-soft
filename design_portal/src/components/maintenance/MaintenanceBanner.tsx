import { getMaintenanceMode } from '@/components/maintenance/maintenance-schedule';
import { useEffect, useState } from 'react';

const MaintenanceBanner = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkDayAndTime = () => {
      setShouldShow(getMaintenanceMode() === 'banner');
    };

    // Check immediately
    checkDayAndTime();

    // Check every minute to handle day and time changes
    const interval = setInterval(checkDayAndTime, 60000);

    return () => clearInterval(interval);
  }, []);

  // Add data attribute to body when banner is visible for CSS styling
  useEffect(() => {
    if (shouldShow) {
      document.body.setAttribute('data-banner-visible', 'true');
      return () => {
        document.body.removeAttribute('data-banner-visible');
      };
    } else {
      document.body.removeAttribute('data-banner-visible');
    }
  }, [shouldShow]);

  if (!shouldShow) {
    return null;
  }

  const message =
    '🚨 Maintenance Notice: The site will undergo scheduled maintenance today between 7:00 PM - 8:00 PM IST. Thank you for your patience. 🚨';

  return (
    <div id="maintenance-banner" className="maintenance-banner-container">
      <span className="maintenance-message">{message}</span>
    </div>
  );
};

export default MaintenanceBanner;
