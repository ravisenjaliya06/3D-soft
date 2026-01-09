import InputField from '@/components/inputfields/InputField';
import Loading_style from '@/components/loading.module.css';
import styles from '@/components/login/login.module.css';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { LoginForm } from '@/types/formTypes';
import Cookies from 'js-cookie';
import { useRouter } from 'next/router';
import { ChangeEvent, FormEvent, useState } from 'react';
import { handleFormData } from '../utils/formDataHandler';

const Login = () => {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loginerror, setLoginError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [showApprovalPopup, setShowApprovalPopup] = useState(false);

  // Toggle password visibility
  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  /* Login function */
  const handleLogin = async (e: FormEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setEmailError(null);
    setPasswordError(null);

    const loginPayload: LoginForm = {
      email,
      password,
    };

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
      router.push({
        pathname: REDIRECT.PROJECTDASHBOARD,
      });
    } else {
      const errorMessage =
        response.data?.email?.[0] ||
        response.data?.non_field_errors?.[0] ||
        response.data?.message ||
        response.data?.error ||
        'Login failed. Please try again.';
      if (errorMessage === 'Account is not verified. Please verify account with the OTP.') {
        router.push({
          pathname: REDIRECT.OTP,
          query: { email: email, message: errorMessage },
        });
        return;
      }
      if (errorMessage === 'Account is not verified. Please verify account with Admin.') {
        setShowApprovalPopup(true);
        setIsLoading(false);
        return;
      }
      setLoginError(errorMessage);
      setIsLoading(false);
    }
  };

  const fields = [
    {
      label: 'Email',
      type: 'email',
      placeholder: 'Enter your email',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
    },
    {
      label: 'Password',
      icon: null,
      type: 'password',
      placeholder: 'Enter your password',
      showPassword,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      onClickShowPassword: handleClickShowPassword,
      error: passwordError,
    },
  ];

  return (
    <div className={styles.container}>
      {showApprovalPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <div className={styles.create_right_side}></div>
            <div className={styles.createButtonGrop}>
              <div className={styles.createicon}>
                <div className="relative flex items-center justify-center pl-[2rem]">
                  <img src={assets.alert_circle_outline} alt="icon" className="h-12 w-12" />
                  <img
                    src={assets.alert}
                    alt="icon"
                    className="absolute top-1/2 left-[2.7rem] h-6 w-6 -translate-x-1/2 -translate-y-1/2 transform"
                  />
                </div>
              </div>
              <div>
                <h3 className="m-0 mb-2 pl-[1rem] text-[1.1rem] font-[var(--font-family)] font-semibold text-[#FF0000]">
                  <b>Approval Pending !!</b>
                </h3>
                <p className="m-0 mb-4 pr-[2rem] pl-[1rem] text-[0.85rem] leading-relaxed font-[var(--font-family)] text-[#666]">
                  <b>Your account is not yet approved.</b>
                  <br />
                  Please contact the Bravento Administration to complete the approval process.
                </p>
              </div>
              <div className={styles.createclose} onClick={() => setShowApprovalPopup(false)}>
                <img src={assets.close} alt="close" />
              </div>
            </div>
          </div>
        </div>
      )}
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
          <h1>
            3D Models of <span>wooden sheet cutting</span>
          </h1>
          <p>Make your design and nesting with 3D to less wastage</p>
          <div className={styles.login_logo}>
            <img src={assets.loginimage} alt="loginpage image" />
          </div>
          <div className={styles.logo}>
            <img src={assets.Logo} alt="Bravento Logo" />
          </div>
        </div>

        {/* Right Section */}
        <div className={styles.right_side}>
          <h2>Login</h2>
          <p>Login to access your Bravento account</p>
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
            {loginerror && <p className={styles.loginerrorMessage}>{loginerror}</p>}
            {error && <p className={styles.errorMessage}>{error}</p>}
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
            <div className={styles.buttonContainer}>
              <button className={styles.loginButton} onClick={handleLogin} disabled={isLoading}>
                Login
              </button>
            </div>
            <div className={styles.linkContainer}>
              <div className={styles.registerLinkContainer}>
                <p>
                  Don&apos;t have an account?{' '}
                  <span onClick={() => router.push(REDIRECT.REGISTER)}>Sign up</span>
                </p>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
