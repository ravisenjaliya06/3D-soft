import { useAuthRedirect } from '@/components/helper/helper';
import Settings from '@/components/settings';
import { PAGE_TITLE } from '@/services/CommonStatus';
import { usePageSetup } from '@/usePageSetup';

const SettingsPage = () => {
  usePageSetup(PAGE_TITLE.SETTINGS);

  const { isLoading } = useAuthRedirect();

  if (isLoading) {
    return null;
  }

  return <Settings />;
};

export default SettingsPage;
