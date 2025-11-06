import { getTokenDetail } from '@/components/helper/helper';
import Login from '@/components/login';
import { usePageSetup } from '@/usePageSetup';
import { PAGE_TITLE, REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const LoginPage = () => {
  usePageSetup(PAGE_TITLE.LOGIN);

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
