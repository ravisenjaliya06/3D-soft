import { useAuthRedirect } from '@/components/helper/helper';
import Settings from '@/components/settings';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { useEffect } from 'react';

const SettingsPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.SETTINGS;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = assets.logo;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Settings />;
};

export default SettingsPage;
