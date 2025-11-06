import Mes from '@/components/designmes';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';

const MesPage = () => {
  usePageSetup(PAGE_TITLE.MES);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Mes />;
};

export default MesPage;
