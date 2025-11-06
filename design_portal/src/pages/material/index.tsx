import { useAuthRedirect } from '@/components/helper/helper';
import Material from '@/components/material';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '../../usePageSetup';

const MaterialPage = () => {
  usePageSetup(PAGE_TITLE.MATERIAL);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Material />;
};

export default MaterialPage;
