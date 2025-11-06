import { useAuthRedirect } from '@/components/helper/helper';
import Mes from '@/components/mes/index';
import { usePageSetup } from '@/usePageSetup';
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
