import { useRouter } from 'next/router';

const ErrorPage = () => {
  const router = useRouter();
  const { message } = router.query;

  return (
    <div>
      <h1>Error</h1>
      <p>{message || 'An unexpected error occurred. Please try again.'}</p>
    </div>
  );
};

export default ErrorPage;
