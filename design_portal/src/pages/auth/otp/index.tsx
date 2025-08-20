import logo from '@/assets/titleLogo.svg';
import Otp from '@/components/otp';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const OtpPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.OTP;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logo.src;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return <Otp />;
};

export default OtpPage;
