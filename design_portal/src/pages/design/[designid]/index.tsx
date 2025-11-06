import CubeComponent from '@/components/3dmodel/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { usePageSetup } from '@/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';

const DesignPage: NextPage = () => {
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

export default DesignPage;
