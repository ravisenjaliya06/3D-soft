import logo from '@/assets/titleLogo.svg';
import { useAuthRedirect } from '@/components/helper/helper';
import Material from '@/components/material';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const MaterialPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.MATERIAL;
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

  return <Material />;
};

export default MaterialPage;
