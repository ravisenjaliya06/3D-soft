import { useMinimumVisible } from '@/components/common/useMinimumVisible';
import AuthShowcase from '@/components/auth/AuthShowcase';
import styles from '@/components/auth/auth.module.css';
import { handleForgotAPI } from '@/components/forgot/utils';
import InputField from '@/components/inputfields/InputField';
import PhinxLoader from '@/components/common/PhinxLoader';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { ForgotForm } from '@/types/formTypes';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useState } from 'react';
import { LuArrowLeft, LuArrowRight, LuKeyRound, LuMailCheck, LuShieldCheck } from 'react-icons/lu';

const Forgot = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const showLoading = useMinimumVisible(isLoading);

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
      label: 'Email address',
      icon: '',
      type: 'email',
      placeholder: 'you@company.com',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
    },
  ];

  return (
    <div className={styles.container}>
      {showLoading && <PhinxLoader overlay label="Sending your reset code…" />}

      {/* ── Showcase panel (decorative) ─────────────────────── */}
      <AuthShowcase
        eyebrow="Account recovery"
        title="Locked out of the workshop?"
        highlight="We'll get you back in."
        lead="Enter the email on your Phinx account and we'll send a secure link to reset your password. Your designs and cut lists stay safe."
      />

      {/* ── Reset form ──────────────────────────────────────── */}
      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.brandRow}>
            <img src={assets.phinxLogoLight} alt="Phinx" className={styles.brandLogo} />
          </div>

          <button
            type="button"
            className={styles.backLink}
            onClick={() => router.push(REDIRECT.LOGIN)}
          >
            <LuArrowLeft aria-hidden="true" />
            Back to sign in
          </button>

          <span className={styles.iconBadge}>
            <LuKeyRound aria-hidden="true" />
          </span>
          <h2 className={styles.title}>Forgot your password?</h2>
          <p className={styles.subtitle}>
            No problem. Enter your account email and we&apos;ll send you a link to set a new
            password.
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
                  {error && (
                    <div className={styles.errorContainer}>
                      <p className={styles.errorMessage}>{error}</p>
                    </div>
                  )}
                  {success && (
                    <div className={styles.successMessage}>
                      <LuMailCheck aria-hidden="true" />
                      <span>{success}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className={styles.buttonContainer}>
              <button className={styles.primaryButton} onClick={handleForgot} disabled={isLoading}>
                <span>Send reset link</span>
                <LuArrowRight aria-hidden="true" />
              </button>
            </div>
          </form>

          <p className={styles.legal}>
            <LuShieldCheck aria-hidden="true" />
            Secure reset links · © {new Date().getFullYear()} Phinx
          </p>
        </div>
      </section>
    </div>
  );
};

export default Forgot;
