import { useEffect, useState } from 'react';

const MaintenanceBanner = () => {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    const checkDay = () => {
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 3 = Wednesday, 5 = Friday

      // Show banner on Wednesday (3) or Friday (5)
      if (dayOfWeek === 3 || dayOfWeek === 5) {
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    };

    // Check immediately
    checkDay();

    // Check every minute to handle day changes
    const interval = setInterval(checkDay, 60000);

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
