import Otp from '@/components/otp';
import { usePageSetup } from '@/pages/usePageSetup';
import { PAGE_TITLE } from '@/services/CommonStatus';

const OtpPage = () => {
  usePageSetup(PAGE_TITLE.OTP);

  return <Otp />;
};

export default OtpPage;
