import { useAuthRedirect } from '@/components/helper/helper';
import { usePageSetup } from '@/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';
import dynamic from 'next/dynamic';

const PanelDesigner = dynamic(() => import('@/components/3dmodel/panelDesign/index'), {
  ssr: false,
});

const DesignPage: NextPage = () => {
  usePageSetup(PAGE_TITLE.DESIGN);
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
