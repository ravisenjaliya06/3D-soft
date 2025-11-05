import { useAuthRedirect } from '@/components/helper/helper';
import Mes from '@/components/mes/index';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/pages/usePageSetup';

const MesPage = () => {
  usePageSetup(PAGE_TITLE.MES);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Mes />;
};

export default MesPage;
