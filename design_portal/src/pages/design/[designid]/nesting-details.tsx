import NestingDetails from '@/components/mes/nestingDetails';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NestingDetailsPage = () => {
  const router = useRouter();
  const [designId, setDesignId] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady) {
      const { designid } = router.query;
      setDesignId(designid as string);
    }
  }, [router.isReady, router.query]);

  if (!designId) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Nesting Details | Bravento</title>
      </Head>
      <NestingDetails designId={designId} />
    </>
  );
};

export default NestingDetailsPage;
