import brevento_background_logo from '@/assets/brevento-background-logo.svg';
import { store } from '@/components/3dmodel/store';
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
  const router = useRouter();
  const isDesignPage = router.pathname.startsWith('/design/');
  const isMaterialPage = router.pathname.startsWith('/material');

  return (
    <>
      <Provider store={store}>
        <main
          className={`${geistSans?.variable || ''} ${geistMono?.variable || ''} ${poppins?.variable || ''} ${poppinsBold?.variable || ''} ${poppinsSemiBold?.variable || ''} antialiased`}
        >
          <Component {...pageProps} />
          {!isDesignPage && !isMaterialPage && (
            <div className="fixed-image">
              <img src={brevento_background_logo.src} alt="Background" />
            </div>
          )}
        </main>
      </Provider>
    </>
  );
}
