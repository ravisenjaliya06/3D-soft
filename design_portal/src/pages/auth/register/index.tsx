import logo from '@/assets/titleLogo.svg';
import { getTokenDetail } from '@/components/helper/helper';
import Register from '@/components/register';
import { PAGE_TITLE, REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const RegisterPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.REGISTER;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logo.src;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const handleRegister = () => {
    const token = getTokenDetail();
    if (token) {
      router.push(REDIRECT.PROJECTDASHBOARD);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleRegister();
  }, []);

  if (isLoading) {
    return null;
  }

  return <Register />;
};

export default RegisterPage;
