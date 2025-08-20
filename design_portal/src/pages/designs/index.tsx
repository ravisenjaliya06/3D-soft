import logo from '@/assets/titleLogo.svg';
import Designs from '@/components/designs';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const DesignsPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.DESIGN;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logo.src;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);
  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Designs />;
};

export default DesignsPage;
