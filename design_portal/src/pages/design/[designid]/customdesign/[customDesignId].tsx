import { CustomDesignRootComponent } from '@/components/3dmodel/customDesign/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { usePageSetup } from '@/pages/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';
import { useRouter } from 'next/router';

const CustomDesignPage: NextPage = () => {
  const router = useRouter();

  usePageSetup(PAGE_TITLE.DESIGN);

  const { isLoading } = useAuthRedirect();

  if (isLoading || !router.isReady) {
    return null;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CustomDesignRootComponent />
    </div>
  );
};

export default CustomDesignPage;
