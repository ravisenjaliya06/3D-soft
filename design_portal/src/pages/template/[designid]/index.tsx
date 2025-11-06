import { useAuthRedirect } from '@/components/helper/helper';
import Template from '@/components/template';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';

const TemplatePage = () => {
  usePageSetup(PAGE_TITLE.SETTINGS);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Template />;
};

export default TemplatePage;
