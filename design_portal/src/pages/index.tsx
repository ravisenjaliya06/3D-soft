import { getTokenDetail } from '@/components/helper/helper';
import { REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

function Index() {
  const router = useRouter();

  useEffect(() => {
    const token = getTokenDetail();

    if (!token) {
      router.push(REDIRECT.UNAUTHORIZED);
    } else {
      router.push(REDIRECT.PROJECTDASHBOARD);
    }
  }, [router]);

  return null;
}

export default Index;
