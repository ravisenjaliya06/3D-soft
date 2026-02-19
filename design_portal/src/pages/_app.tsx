import { useGLBPreloader } from '@/components/3dmodel/helper/glbLoader/useGLBPreloader';
import { store } from '@/components/3dmodel/store';
import { assets } from '@/svgPaths';
import { AppProps } from 'next/app';
import localFont from 'next/font/local';
import { useRouter } from 'next/router';
import { Provider } from 'react-redux';
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
  const isDesignPage = router.pathname.startsWith('/design/');
  const isCatalogPage = router.pathname.startsWith('/catalogmanager');
  const isMaterialPage = router.pathname.startsWith('/material');
  const is2dPage = router.pathname.startsWith('lab/design/');

  return (
    <>
      <Provider store={store}>
        <main
          className={`${geistSans?.variable || ''} ${geistMono?.variable || ''} ${poppins?.variable || ''} ${poppinsBold?.variable || ''} ${poppinsSemiBold?.variable || ''} antialiased`}
        >
          <Component {...pageProps} />
          {!isDesignPage && !isMaterialPage && !isCatalogPage && is2dPage && (
            <div className="fixed-image">
              <img src={assets.brevento_background_logo} alt="Background" />
            </div>
          )}
        </main>
      </Provider>
    </>
  );
}
