import styles from '@/components/otp/otp.module.css';
import { handleResendOtp, handleVerify } from '@/components/otp/utils';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

const Otp = () => {
  const otpLength = 5;
  const router = useRouter();
  const { email } = router.query || {};
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

  React.useEffect(() => {
    if (timer > 0) {
      const countdown = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);

      return () => clearInterval(countdown);
    }
    if (timer === 0) {
      setSetResend(false);
    }
  }, [timer]);

  const handleOTPVerify = async () => {
    if (otp.includes('')) {
      setError('Please enter a valid OTP');
      return;
    }

    const otppayload = {
      otp: otp.join(''),
      email: email as string,
    };

    await handleVerify(otppayload, setError, router, setIsLoading);
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

    pastedData.split('').forEach((digit, index) => {
      newOtp[index] = digit;
    });

    setOtp(newOtp);

    // Focus last filled input
    document.getElementById(`otp-${pastedData.length - 1}`)?.focus();
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        {/* Left Section */}
        <div className={styles.left_side}>
          <div className={styles.popup_logo}>
            <img src={assets.popup_logo} alt="Popup Logo" />
          </div>
          <div className={styles.forgot_boy}>
            <img src={assets.otp_computer} alt="forgot boy" />
          </div>
          <div className={styles.logo}>
            <img src={assets.Logo} alt="Bravento Logo" />
          </div>
        </div>

        {/* Right Section */}
        <div className={styles.right_side}>
          <div className={styles.back_button}>
            <img src={assets.back_login_icon} onClick={() => router.back()} alt="Logo" />
            Back
          </div>
          <h2>Verification</h2>
          <p>
            Please enter the 6-digit code sent to your registered email <a>{email}</a> for
            verification.
          </p>
          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.otpContainer}>
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
                  className={styles.otpInput}
                />
              ))}
            </div>
            <div className={styles.timerText}>
              {Math.floor(timer / 60)
                .toString()
                .padStart(2, '0')}
              :{(timer % 60).toString().padStart(2, '0')}
            </div>{' '}
            <div className={styles.otpError}>
              {error && <p className={styles.otpErrorMessage}>{error}</p>}
              {success && <p className={styles.otpSuccessMessage}>{success}</p>}
            </div>
            <div className={styles.buttonContainer}>
              <button className={styles.otpButton} onClick={handleOTPVerify} disabled={isLoading}>
                CONTINUE
              </button>
            </div>
          </form>
          <div className={styles.resendText}>If you didn&apos;t receive a code!</div>
          <button
            disabled={setResend}
            className={setResend ? styles.disabledButton : styles.resendButton}
            onClick={handleResend}
          >
            Resend
          </button>
        </div>
      </div>
    </div>
  );
};

export default Otp;
