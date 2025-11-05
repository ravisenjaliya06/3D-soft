import CatalogManager from '@/components/catalogmanager';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '../usePageSetup';

const MaterialPage = () => {
  usePageSetup(PAGE_TITLE.MATERIAL);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }
  return <CatalogManager />;
};

export default MaterialPage;
