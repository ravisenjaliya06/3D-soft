import NestingDetails from '@/components/mes/nestingDetails';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

const NestingDetailsPage = () => {
  const router = useRouter();
  const [designId, setDesignId] = useState<string | null>(null);
  const [versionId, setVersionId] = useState<string | null>(null);

  useEffect(() => {
    if (router.isReady) {
      const { designid, versionid } = router.query;
      setDesignId(designid as string);
      setVersionId(versionid as string);
    }
  }, [router.isReady, router.query]);

  if (!designId || !versionId) {
    return <div>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>Nesting Details | Phinx</title>
      </Head>
      <NestingDetails designId={designId} versionId={versionId} />
    </>
  );
};

export default NestingDetailsPage;
