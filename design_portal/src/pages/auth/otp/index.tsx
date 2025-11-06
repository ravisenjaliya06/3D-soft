import Otp from '@/components/otp';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';

const OtpPage = () => {
  usePageSetup(PAGE_TITLE.OTP);

  return <Otp />;
};

export default OtpPage;
