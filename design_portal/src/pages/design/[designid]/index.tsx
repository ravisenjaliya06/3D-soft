import CubeComponent from '@/components/3dmodel/index';
import { useAuthRedirect } from '@/components/helper/helper';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';
import { NextPage } from 'next';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const DesignPage: NextPage = () => {
  usePageSetup(PAGE_TITLE.DESIGN);
  const { isLoading: authLoading } = useAuthRedirect();
  const router = useRouter();
  const { designid } = router.query;
  const [isRedirecting, setIsRedirecting] = useState(false);

  useEffect(() => {
    if (authLoading || !designid) return;

    const redirectToLatest = async () => {
      setIsRedirecting(true);
      try {
        const response: { status: number; data: any[] } = await commonService.get(
          API_ENDPOINT.GET_DESIGNS
        );
        if (response.status === 200) {
          const design = response.data.find((d: any) => d.id === designid);
          if (design && design.versions && design.versions.length > 0) {
            // Versions are already ordered latest first from backend
            const latestVersion = design.versions[0].id;
            router.replace(`/design/${designid}/${latestVersion}`);
          }
        }
      } catch (error) {
        console.error('Failed to redirect to latest version:', error);
      } finally {
        setIsRedirecting(false);
      }
    };

    redirectToLatest();
  }, [authLoading, designid, router]);

  if (authLoading || isRedirecting) {
    return null;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <CubeComponent />
    </div>
  );
};

export default DesignPage;
