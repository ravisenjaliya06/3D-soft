import { REDIRECT } from '@/services/CommonStatus';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export const getTokenDetail = () => {
  const token = Cookies.get('token');
  if (token) {
    return token;
  }
};

export const useAuthRedirect = () => {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const handleAuth = () => {
      const token = getTokenDetail();
      if (!token) {
        router.push(REDIRECT.UNAUTHORIZED);
      } else {
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [router]);

  return { isLoading };
};

export default useAuthRedirect;
