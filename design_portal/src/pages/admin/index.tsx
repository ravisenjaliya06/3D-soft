import logo from '@/assets/titleLogo.svg';
import Admin from '@/components/admin';
import { useAuthRedirect } from '@/components/helper/helper';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { useEffect } from 'react';

const AdminPage = () => {
  useEffect(() => {
    document.title = PAGE_TITLE.ADMIN;
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

  return <Admin />;
};

export default AdminPage;
