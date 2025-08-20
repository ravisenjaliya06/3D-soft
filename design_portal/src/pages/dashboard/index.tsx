import logo from '@/assets/titleLogo.svg';
import ProjectDashboard from '@/components/dashboard';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const DashboardPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.DASHBOARD;
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = logo.src;
    document.head.appendChild(link);

    return () => {
      document.head.removeChild(link);
    };
  }, []);

  const { isLoading } = useAuthRedirect();
  if (isLoading) {
    return null;
  }

  return <ProjectDashboard />;
};

export default DashboardPage;
