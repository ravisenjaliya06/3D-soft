import AuthShowcase from '@/components/auth/AuthShowcase';
import styles from '@/components/auth/auth.module.css';
import { handleResendOtp, handleVerify } from '@/components/otp/utils';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';
import {
  LuArrowLeft,
  LuArrowRight,
  LuClock,
  LuMailCheck,
  LuMailOpen,
  LuRotateCw,
  LuShieldCheck,
} from 'react-icons/lu';

const Otp = () => {
  const otpLength = 5;
  const router = useRouter();
  const { email, message } = router.query || {};
  const [otp, setOtp] = useState(new Array(otpLength).fill(''));
  const [timer, setTimer] = useState(120);
  const [setResend, setSetResend] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccessMessage] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const value = e.target.value;
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value && index < otpLength - 1) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => setTimer((prev) => prev - 1), 1000);
      return () => clearInterval(countdown);
    }
    if (timer === 0) setSetResend(false);
  }, [timer]);

  useEffect(() => {
    if (message) setError(message as string);
  }, []);

  // Redirect after success message
  useEffect(() => {
    if (success) {
      const timeout = setTimeout(() => {
        router.push({
          pathname: REDIRECT.LOGIN,
          query: {
            message: 'Your Account has been verified. To access login now.',
          },
        });
      }, 4000);

      return () => clearTimeout(timeout);
    }
  }, [success]);

  const handleOTPVerify = async () => {
    if (otp.includes('')) {
      setError('Please enter a valid OTP');
      return;
    }

    const otppayload = {
      otp: otp.join(''),
      email: email as string,
    };

    await handleVerify(otppayload, setError, router, setIsLoading, () =>
      setSuccessMessage(
        'Registration successful! Your request has been sent to the administrator for approval.'
      )
    );
  };

  const handleResend = async () => {
    setSetResend(true);

    const resendPayload = {
      email: email as string,
    };

    await handleResendOtp(resendPayload, setError, setIsLoading, setSuccessMessage);

    setTimer(120);
    setOtp(new Array(otpLength).fill(''));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();

    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, otpLength);
    if (!pastedData) return;

    const newOtp = [...otp];
    pastedData.split('').forEach((digit, index) => (newOtp[index] = digit));
    setOtp(newOtp);

    document.getElementById(`otp-${pastedData.length - 1}`)?.focus();
  };

  return (
    <div className={styles.container}>
      {/* ── Showcase panel (decorative) ─────────────────────── */}
      <AuthShowcase
        eyebrow="Email verification"
        title="One quick check."
        highlight="Then your workshop is ready."
        lead="We've emailed you a verification code to keep your account, designs and production data secure."
      />

      {/* ── Verification form ───────────────────────────────── */}
      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.brandRow}>
            <img src={assets.phinxLogoLight} alt="Phinx" className={styles.brandLogo} />
          </div>

          <button type="button" className={styles.backLink} onClick={() => router.back()}>
            <LuArrowLeft aria-hidden="true" />
            Back
          </button>

          <span className={styles.iconBadge}>
            <LuMailOpen aria-hidden="true" />
          </span>
          <h2 className={styles.title}>Verify your email</h2>
          <p className={styles.subtitle}>
            Enter the {otpLength}-digit code we sent to{' '}
            <strong className={styles.emphasis}>{email}</strong>
          </p>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.otpRow}>
              {otp.map((value, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value}
                  onChange={(e) => handleChange(e, index)}
                  onPaste={handlePaste}
                  onFocus={(e) => e.target.select()}
                  className={`${styles.otpInput} ${value ? styles.otpFilled : ''}`}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            <div className={styles.resendRow}>
              <span className={styles.timerPill}>
                <LuClock aria-hidden="true" />
                {Math.floor(timer / 60)
                  .toString()
                  .padStart(2, '0')}
                :{(timer % 60).toString().padStart(2, '0')}
              </span>
              <span className={styles.resendHint}>Didn&apos;t get the code?</span>
              <button
                type="button"
                disabled={setResend}
                className={styles.resendButton}
                onClick={handleResend}
              >
                <LuRotateCw aria-hidden="true" />
                Resend
              </button>
            </div>

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

            <div className={styles.buttonContainer}>
              <button
                className={styles.primaryButton}
                onClick={handleOTPVerify}
                disabled={isLoading}
              >
                <span>Verify &amp; continue</span>
                <LuArrowRight aria-hidden="true" />
              </button>
            </div>
          </form>

          <p className={styles.legal}>
            <LuShieldCheck aria-hidden="true" />
            Check your spam folder if the email hasn&apos;t arrived
          </p>
        </div>
      </section>
    </div>
  );
};

export default Otp;
