import Forgot from '@/components/forgot';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';

const ForgotPage = () => {
  usePageSetup(PAGE_TITLE.FORGOT);
  return <Forgot />;
};

export default ForgotPage;
