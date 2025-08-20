import logo from '@/assets/titleLogo.svg';
import { useAuthRedirect } from '@/components/helper/helper';
import Mes from '@/components/mes/index';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const MesPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.MES;
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

  return <Mes />;
};

export default MesPage;
