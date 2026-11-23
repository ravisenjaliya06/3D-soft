import { useAuthRedirect } from '@/components/helper/helper';
import Nesting from '@/components/mes/nesting';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';
import { NextPage } from 'next';

const NestingPage: NextPage = () => {
  usePageSetup(PAGE_TITLE.DESIGN);
  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Nesting />
    </div>
  );
};

export default NestingPage;
