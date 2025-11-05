import { assets } from '@/svgPaths';
import styles from '@/components/forgot/forgot.module.css';
import { handleForgotAPI } from '@/components/forgot/utils';
import InputField from '@/components/inputfields/InputField';
import Loading_style from '@/components/loading.module.css';
import { REDIRECT } from '@/services/CommonStatus';
import { ForgotForm } from '@/types/formTypes';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useState } from 'react';

const Forgot = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgot = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const forgotPayload: ForgotForm = {
      email,
    };

    await handleForgotAPI(
      forgotPayload,
      setError,
      router,
      setIsLoading,
      setEmailError,
      setSuccessMessage
    );
  };

  const fields = [
    {
      label: 'Email',
      icon: '',
      type: 'email',
      placeholder: 'Enter your email',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
    },
  ];

  return (
    <div className={styles.container}>
      {isLoading && (
        <div className={Loading_style.loadingOverlay}>
          <div className={Loading_style.loadingSpinner}></div>
          <p>Loading...</p>
        </div>
      )}
      <div className={styles.card}>
        {/* Left Section */}
        <div className={styles.left_side}>
          <div className={styles.popup_logo}>
            <img src={assets.popup_logo} alt="Popup Logo" />
          </div>
          <div className={styles.forgot_boy}>
            <img src={assets.forgot_boy} alt="forgot boy" />
          </div>
          <div className={styles.logo}>
            <img src={assets.Logo} alt="Bravento Logo" />
          </div>
        </div>

        {/* Right Section */}
        <div className={styles.right_side}>
          <div className={styles.back_button}>
            <img src={assets.back_login_icon} onClick={() => router.push(REDIRECT.LOGIN)} alt="Logo" />
            Back to Login
          </div>
          <h2>Forgot your Password?</h2>
          <p>
            Don&apos;t worry, happens to all of us. Enter your email below to recover your password
          </p>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.inputGroup}>
              {fields.map((field, index) => (
                <div key={index}>
                  <InputField
                    className={styles.inputField}
                    borderColor="var(--primary-color-grey-2)"
                    {...field}
                  />
                  {error && <p className={styles.errorMessage}>{error}</p>}
                  {success && <p className={styles.successMessage}>{success}</p>}
                </div>
              ))}
            </div>
            <div className={styles.buttonContainer}>
              <button className={styles.loginButton} onClick={handleForgot} disabled={isLoading}>
                Send Reset link
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Forgot;
