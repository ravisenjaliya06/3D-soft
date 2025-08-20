import logo from '@/assets/titleLogo.svg';
import { CustomDesignRootComponent } from '@/components/3dmodel/customDesign/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

const CustomDesignPage: NextPage = () => {
  const router = useRouter();

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
