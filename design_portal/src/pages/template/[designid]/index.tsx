import { assets } from '@/svgPaths';
import { useAuthRedirect } from '@/components/helper/helper';
import Template from '@/components/template';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const TemplatePage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.SETTINGS;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = assets.titleLogo;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Template />;
};

export default TemplatePage;
