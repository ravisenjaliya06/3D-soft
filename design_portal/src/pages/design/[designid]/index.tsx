import logo from '@/assets/titleLogo.svg';
import CubeComponent from '@/components/3dmodel/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';
import { useEffect } from 'react';

const DesignPage: NextPage = () => {
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

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CubeComponent />
    </div>
  );
};

export default DesignPage;
