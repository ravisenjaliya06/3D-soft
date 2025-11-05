import Mes from '@/components/designmes';
import { useAuthRedirect } from '@/components/helper/helper';
import { usePageSetup } from '@/pages/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';

const MesPage = () => {
  usePageSetup(PAGE_TITLE.MES);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Mes />;
};

export default MesPage;
