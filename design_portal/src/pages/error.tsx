import { REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { LuArrowLeft, LuLayoutDashboard, LuTriangleAlert } from 'react-icons/lu';
import styles from './error.module.css';

const ErrorPage = () => {
  const router = useRouter();
  const { message } = router.query;

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <span className={styles.icon}>
          <LuTriangleAlert aria-hidden="true" />
        </span>
        <span className={styles.eyebrow}>Something went wrong</span>
        <h1>Error</h1>
        <p>{message || 'An unexpected error occurred. Please try again.'}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.secondary} onClick={() => router.back()}>
            <LuArrowLeft aria-hidden="true" />
            Go back
          </button>
          <button
            type="button"
            className={styles.primary}
            onClick={() => router.push(REDIRECT.DASHBOARD)}
          >
            <LuLayoutDashboard aria-hidden="true" />
            Go to dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorPage;
