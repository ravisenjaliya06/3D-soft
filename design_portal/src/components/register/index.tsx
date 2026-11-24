import AuthShowcase from '@/components/auth/AuthShowcase';
import styles from '@/components/auth/auth.module.css';
import InputField from '@/components/inputfields/InputField.jsx';
import { handleSignIn } from '@/components/register/utils';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { RegisterForm } from '@/types/formTypes';
import { useRouter } from 'next/router';
import { ChangeEvent, useState } from 'react';
import { LuArrowRight, LuShieldCheck } from 'react-icons/lu';
import PasswordStrengthBar from 'react-password-strength-bar';

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
  const [organizationName, setOrganizationName] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [phone, setNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);

  // UI States
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // error popup
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [organizationNameError, setOrganizationNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);

  // Password Toggle Handlers
  const handleClickShowPassword = () => setShowPassword(!showPassword);

  const handleClickShowConfirmPassword = () => setShowConfirmPassword(!showConfirmPassword);

  const handleSignInWrapper = async () => {
    setNameError(null);
    setOrganizationNameError(null);
    setEmailError(null);
    setEmailError(null);
    setUsernameError(null);
    setPhoneError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!termsAccepted) {
      setTermsError('You must accept the Terms and Privacy Policies.');
      return;
    } else {
      setTermsError(null);
    }

    const registerPayload: RegisterForm = {
      organization_name: organizationName,
      username,
      name,
      email,
      phone,
      password,
      confirm_password: confirmPassword,
    };

    await handleSignIn(
      router,
      registerPayload,
      setError,
      setIsLoading,
      setNameError,
      setEmailError,
      setUsernameError,
      setPhoneError,
      setPasswordError,
      setConfirmPasswordError,
      setOrganizationNameError
    );
  };

  const firstfieldsgroup = [
    {
      label: 'Full name *',
      type: 'text',
      placeholder: 'Your full name',
      value: name,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      error: nameError,
      smallField: true,
    },
    {
      label: 'Work email *',
      type: 'email',
      placeholder: 'you@company.com',
      value: email,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
      smallField: true,
    },
  ];

  const secondfieldsgroup = [
    {
      label: 'Username *',
      type: 'text',
      smallField: true,
      placeholder: 'Choose a username',
      value: username,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
      error: usernameError,
    },
    {
      label: 'Phone number *',
      type: 'text',
      smallField: true,
      placeholder: '10-digit mobile number',
      value: phone,
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.replace(/\D/g, '');
        if (val.length <= 10) {
          setNumber(val);
        }
      },
      error: phoneError,
    },
  ];

  const thirdfieldsgroup = [
    {
      label: 'Company / workshop name *',
      type: 'text',
      placeholder: 'e.g. Oakline Interiors',
      value: organizationName,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setOrganizationName(e.target.value),
      onClickShowPassword: handleClickShowConfirmPassword,
      error: organizationNameError,
    },
    {
      label: 'Password *',
      type: 'password',
      placeholder: 'At least 8 characters',
      showPassword,
      value: password,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      onClickShowPassword: handleClickShowPassword,
      error: passwordError,
    },
    {
      label: 'Confirm password *',
      type: 'password',
      placeholder: 'Repeat password',
      showPassword: showConfirmPassword,
      value: confirmPassword,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value),
      onClickShowPassword: handleClickShowConfirmPassword,
      error: confirmPasswordError,
    },
  ];

  return (
    <div className={styles.container}>
      {/* ── Showcase panel (decorative) ─────────────────────── */}
      <AuthShowcase
        eyebrow="Free workspace for furniture makers"
        title="Set up your workshop."
        highlight="Start building today."
        lead="Create your Phinx workspace to design furniture in 3D, generate accurate cut lists and nest every board for less waste."
      />

      {/* ── Sign-up form ────────────────────────────────────── */}
      <section className={styles.formPanel}>
        <div className={`${styles.formInner} ${styles.wide}`}>
          <div className={styles.brandRow}>
            <img src={assets.phinxLogoLight} alt="Phinx" className={styles.brandLogo} />
          </div>

          <h2 className={styles.title}>Create your account</h2>
          <p className={styles.subtitle}>
            It takes a minute. We&apos;ll send a code to verify your email.
          </p>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.sectionLabel}>Your details</div>
            <div className={`${styles.inputGroup} ${styles.fieldRow}`}>
              {firstfieldsgroup.map((field, index) => (
                <InputField
                  className={styles.inputField}
                  key={index}
                  {...field}
                  borderColor="var(--primary-color-grey-2 )"
                />
              ))}
            </div>
            <div className={`${styles.inputGroup} ${styles.fieldRow}`}>
              {secondfieldsgroup.map((field, index) => (
                <InputField
                  className={styles.inputField}
                  key={index}
                  {...field}
                  borderColor="var(--primary-color-grey-2 )"
                />
              ))}
            </div>

            <div className={styles.sectionLabel}>Company</div>
            <div className={`${styles.inputGroup} ${styles.fieldStack}`}>
              {thirdfieldsgroup.slice(0, 1).map((field, index) => (
                <InputField
                  className={styles.inputField}
                  key={index}
                  {...field}
                  borderColor="var(--primary-color-grey-2 )"
                />
              ))}
            </div>

            <div className={styles.sectionLabel}>Security</div>
            <div className={`${styles.inputGroup} ${styles.fieldRow}`}>
              {thirdfieldsgroup.slice(1).map((field, index) => (
                <InputField
                  className={styles.inputField}
                  key={index + 1}
                  {...field}
                  borderColor="var(--primary-color-grey-2 )"
                />
              ))}
            </div>
            <div className={styles.strength} aria-live="polite">
              <PasswordStrengthBar
                password={password}
                minLength={8}
                scoreWords={['Weak', 'Fair', 'Good', 'Strong', 'Strong']}
                shortScoreWord="Too short"
                barColors={[
                  'var(--bv-border)',
                  'var(--bv-danger)',
                  'var(--bv-warning)',
                  'var(--bv-accent)',
                  'var(--bv-success)',
                ]}
              />
            </div>

            {error && (
              <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
              </div>
            )}

            <div className={styles.terms}>
              <input
                type="checkbox"
                id="terms"
                className={styles.rememberMeCheckbox}
                checked={termsAccepted}
                onChange={() => setTermsAccepted(!termsAccepted)}
              />
              <label htmlFor="terms">
                I agree to the <a>Terms of Service</a> and <a>Privacy Policy</a>
              </label>
            </div>
            {termsError && <p className={styles.fieldError}>{termsError}</p>}

            <div className={styles.buttonContainer}>
              <button
                className={styles.primaryButton}
                onClick={handleSignInWrapper}
                disabled={isLoading}
              >
                <span>{isLoading ? 'Creating account…' : 'Create account'}</span>
                {!isLoading && <LuArrowRight aria-hidden="true" />}
              </button>
            </div>
          </form>

          <div className={styles.linkContainer}>
            <div className={styles.registerLinkContainer}>
              <p>
                Already have an account?{' '}
                <span onClick={() => router.push(REDIRECT.LOGIN)}>Sign in</span>
              </p>
            </div>
          </div>

          <p className={styles.legal}>
            <LuShieldCheck aria-hidden="true" />
            Your data is encrypted · © {new Date().getFullYear()} Phinx
          </p>
        </div>
      </section>
    </div>
  );
};

export default Register;
