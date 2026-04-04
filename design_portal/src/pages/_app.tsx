import { useGLBPreloader } from '@/components/3dmodel/helper/glbLoader/useGLBPreloader';
import { store } from '@/components/3dmodel/store';
import MaintenanceGate from '@/components/MaintenanceGate';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { AppProps } from 'next/app';
import localFont from 'next/font/local';
import { useRouter } from 'next/router';
import { Provider } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/globals.css';

const geistSans = localFont({
  src: '../../public/fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: '../../public/fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});
const poppins = localFont({
  src: '../../public/fonts/Poppins-Regular.woff',
  variable: '--font-poppins-regular',
  weight: '100 900',
});
const poppinsBold = localFont({
  src: '../../public/fonts/Poppins-Bold.woff',
  variable: '--font-poppins-bold',
  weight: '100 900',
});
const poppinsSemiBold = localFont({
  src: '../../public/fonts/Poppins-SemiBold.woff',
  variable: '--font-poppins-semibold',
  weight: '100 900',
});

export default function MyApp({ Component, pageProps }: AppProps) {
  useGLBPreloader(); // Start preloading 3D assets in background
  const router = useRouter();
  const showMaintenanceBanner =
    router.pathname === REDIRECT.LOGIN || router.pathname === REDIRECT.DASHBOARD;
  const isDesignPage = router.pathname.startsWith('/design/');
  const isCatalogPage = router.pathname.startsWith('/catalogmanager');
  const isMaterialPage = router.pathname.startsWith('/material');
  const is2dPage = router.pathname.startsWith('lab/design/');

  return (
    <>
      <Provider store={store}>
        <MaintenanceGate showBannerOnPages={showMaintenanceBanner}>
          <main
            className={`${geistSans?.variable || ''} ${geistMono?.variable || ''} ${poppins?.variable || ''} ${poppinsBold?.variable || ''} ${poppinsSemiBold?.variable || ''} antialiased`}
          >
            <Component {...pageProps} />
            <ToastContainer
              containerId="global"
              position="top-right"
              autoClose={3500}
              closeOnClick
              pauseOnHover
              draggable
              newestOnTop
              theme="dark"
              className="bravento-toast-container"
              toastClassName="bravento-toast"
              progressClassName="bravento-toast-progress"
              style={{ zIndex: 2147483647 }}
            />
            {!isDesignPage && !isMaterialPage && !isCatalogPage && is2dPage && (
              <div className="fixed-image">
                <img src={assets.brevento_background_logo} alt="Background" />
              </div>
            )}
          </main>
        </MaintenanceGate>
      </Provider>
    </>
  );
}
