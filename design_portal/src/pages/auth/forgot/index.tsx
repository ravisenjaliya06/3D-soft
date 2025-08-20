import logo from '@/assets/titleLogo.svg';
import Forgot from '@/components/forgot';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const ForgotPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.FORGOT;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logo.src;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);
  return <Forgot />;
};

export default ForgotPage;
