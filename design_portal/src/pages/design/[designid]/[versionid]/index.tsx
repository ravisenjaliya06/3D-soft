import CubeComponent from '@/components/3dmodel/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';
import { NextPage } from 'next';

const DesignVersionPage: NextPage = () => {
  usePageSetup(PAGE_TITLE.DESIGN);
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

export default DesignVersionPage;
