import { getTokenDetail } from '@/components/helper/helper';
import Register from '@/components/register';
import { usePageSetup } from '@/pages/usePageSetup';
import { PAGE_TITLE, REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const RegisterPage = () => {
  usePageSetup(PAGE_TITLE.REGISTER);

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
