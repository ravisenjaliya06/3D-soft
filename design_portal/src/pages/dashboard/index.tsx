import ProjectDashboard from '@/components/dashboard';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '../usePageSetup';

const DashboardPage = () => {
  usePageSetup(PAGE_TITLE.DASHBOARD);

  const { isLoading } = useAuthRedirect();
  if (isLoading) {
    return null;
  }

  return <ProjectDashboard />;
};

export default DashboardPage;
