import logo from '@/assets/titleLogo.svg';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';
import { useEffect } from 'react';

const PanelDesigner = dynamic(
  () => import('@/components/3dmodel/panelDesign/index'),
  {
    ssr: false,
  },
);

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
      <PanelDesigner />
    </div>
  );
};

export default DesignPage;
