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
    '🔧 Maintenance Notice: The site will undergo scheduled maintenance today between 7:00 PM - 8:00 PM IST. Thank you for your patience.';

  const animationDuration = 20;
  const animationDurationStr = `${animationDuration}s`;

  return (
    <div id="maintenance-banner" className="maintenance-banner-container">
      <span
        className="maintenance-message"
        style={{
          animation: `scrollMessage ${animationDurationStr} linear infinite`,
        }}
      >
        {message}
      </span>
      <style jsx>{`
        .maintenance-banner-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          background-color: #e5ddff;
          color: #392579;
          height: 20px;
          z-index: 99999;
          overflow: hidden;
          width: 100%;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          display: block;
        }
        .maintenance-message {
          position: absolute;
          top: 0;
          left: 0;
          white-space: nowrap;
          font-size: 13px;
          line-height: 20px;
          font-family: Comfortaa, sans-serif;
          font-weight: 700 !important;
          letter-spacing: 0.1px;
          text-shadow: 0.15px 0 currentColor;
          will-change: transform;
        }
        @keyframes scrollMessage {
          0% {
            transform: translateX(100vw);
          }
          100% {
            transform: translateX(calc(-100% - 100vw));
          }
        }
      `}</style>
    </div>
  );
};

export default MaintenanceBanner;
