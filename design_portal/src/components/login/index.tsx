import AuthShowcase from '@/components/auth/AuthShowcase';
import styles from '@/components/auth/auth.module.css';
import InputField from '@/components/inputfields/InputField';
import Loading_style from '@/components/loading.module.css';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { LoginForm } from '@/types/formTypes';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useState } from 'react';
import { LuArrowRight, LuShieldCheck } from 'react-icons/lu';
import { handleFormData } from '../utils/formDataHandler';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleLogin = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError(null);
    setPasswordError(null);
    setError(null);

    const loginPayload: LoginForm = { email, password };
    const { formData, errors } = handleFormData<LoginForm>(loginPayload, setError);

    setEmailError(errors.email);
    setPasswordError(errors.password);

    if (!formData) {
      setIsLoading(false);
      return;
    }

    localStorage.clear();
    Cookies.remove('token');

    const response = await CommonService.post(API_ENDPOINT.LOGIN, formData);

    if (response.status === 200) {
      localStorage.setItem('token', response.data.payload.access);
      Cookies.set('token', response.data.payload.access);
      router.push({ pathname: REDIRECT.PROJECTDASHBOARD });
      return;
    }

    const errorMessage =
      response.data?.email?.[0] ||
      response.data?.non_field_errors?.[0] ||
      response.data?.message ||
      response.data?.error ||
      'Login failed. Please try again.';

    if (errorMessage === 'Account is not verified. Please verify account with the OTP.') {
      router.push({
        pathname: REDIRECT.OTP,
        query: { email, message: errorMessage },
      });
      return;
    }

    if (errorMessage === 'Account is not verified. Please verify account with Admin.') {
      setError(
        'Approval Pending: Your account is not yet approved. Please contact the Bravento Administration.'
      );
      setIsLoading(false);
      return;
    }

    setError(errorMessage);
    setIsLoading(false);
  };

  const fields = [
    {
      label: 'Email address *',
      type: 'email',
      placeholder: 'you@company.com',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
    },
    {
      label: 'Password *',
      icon: null,
      type: 'password',
      placeholder: 'Your password',
      showPassword,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      onClickShowPassword: handleClickShowPassword,
      error: passwordError,
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

      {/* ── Showcase panel (decorative) ─────────────────────── */}
      <AuthShowcase
        title="Design it in 3D."
        highlight="Build it with precision."
        lead="Plan kitchens, wardrobes and full interiors in 3D, then send cut lists, optimised nesting and CNC-ready files straight to your workshop."
      />

      {/* ── Sign-in form ────────────────────────────────────── */}
      <section className={styles.formPanel}>
        <div className={styles.formInner}>
          <div className={styles.brandRow}>
            <img src={assets.Logo} alt="Bravento" className={styles.brandLogo} />
          </div>

          <h2 className={styles.title}>Welcome back</h2>
          <p className={styles.subtitle}>
            Sign in to your workspace to continue designing and producing.
          </p>

          <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
            <div className={styles.inputGroup}>
              {fields.map((field, index) => (
                <InputField
                  className={styles.inputField}
                  key={index}
                  borderColor="var(--primary-color-grey-2)"
                  {...field}
                />
              ))}
            </div>

            <div className={styles.errorContainer}>
              {error && <p className={styles.errorMessage}>{error}</p>}
            </div>

            <div className={styles.forgotContainer}>
              <div className={styles.remembermeContainer}>
                <input type="checkbox" id="rememberMe" className={styles.rememberMeCheckbox} />
                <label htmlFor="rememberMe">Remember me</label>
              </div>
              <div className={styles.forgotPasswordContainer}>
                <a
                  href="#"
                  onClick={() => router.push(REDIRECT.FORGOT)}
                  className={styles.forgotPassword}
                >
                  Forgot password?
                </a>
              </div>
            </div>

            {/* 🔒 BUTTON WRAPPER UNCHANGED */}
            <div className={styles.buttonContainer}>
              <button className={styles.loginButton} onClick={handleLogin} disabled={isLoading}>
                <span>Sign in</span>
                <LuArrowRight aria-hidden="true" />
              </button>
            </div>

            {/* 🔒 LINK WRAPPER UNCHANGED */}
            <div className={styles.linkContainer}>
              <div className={styles.registerLinkContainer}>
                <p>
                  New to Bravento?{' '}
                  <span onClick={() => router.push(REDIRECT.REGISTER)}>Create an account</span>
                </p>
              </div>
            </div>
          </form>

          <p className={styles.legal}>
            <LuShieldCheck aria-hidden="true" />
            Secure sign-in · © {new Date().getFullYear()} Bravento Technologies
          </p>
        </div>
      </section>
    </div>
  );
};

export default Login;
