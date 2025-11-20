import PlannerGrid from '@/components/3dmodel/2dmodel/PlannerGrid';
import Header from '@/components/3dmodel/header/header';
import Sidebar from '@/components/3dmodel/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/toolbar';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';
import { NextPage } from 'next';
import { useRouter } from 'next/router';

const View2d: NextPage = () => {
  usePageSetup(PAGE_TITLE.DESIGN);
  const router = useRouter();
  const { isLoading } = useAuthRedirect();
  if (isLoading) {
    return null;
  }
  const design3D = null;

  return (
    <div className="fixed h-screen w-screen overflow-hidden">
      <Header router={router} design3D={design3D} />
      <Toolbar />
      <PlannerGrid />
      <Sidebar />
    </div>
  );
};

export default View2d;
