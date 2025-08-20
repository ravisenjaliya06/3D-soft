import logo from '@/assets/titleLogo.svg';
import { getTokenDetail } from '@/components/helper/helper';
import Login from '@/components/login';
import { PAGE_TITLE, REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const LoginPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.LOGIN;
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

  const handleLogin = () => {
    const token = getTokenDetail();
    if (token) {
      router.push(REDIRECT.PROJECTDASHBOARD);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleLogin();
  }, []);

  if (isLoading) {
    return null;
  }

  return <Login />;
};

export default LoginPage;
