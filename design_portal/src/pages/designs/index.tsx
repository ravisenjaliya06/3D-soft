import Designs from '@/components/designs';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '../../usePageSetup';

const DesignsPage = () => {
  usePageSetup(PAGE_TITLE.DESIGNS);
  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Designs />;
};

export default DesignsPage;
