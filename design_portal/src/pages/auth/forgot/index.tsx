import Forgot from '@/components/forgot';
import { usePageSetup } from '@/pages/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';

const ForgotPage = () => {
  usePageSetup(PAGE_TITLE.FORGOT);
  return <Forgot />;
};

export default ForgotPage;
