import InputField from '@/components/inputfields/InputField.jsx';
import styles from '@/components/register/register.module.css';
import { handleSignIn } from '@/components/register/utils';
import { REDIRECT } from '@/services/CommonStatus';
import { assets } from '@/svgPaths';
import { RegisterForm } from '@/types/formTypes';
import { useRouter } from 'next/router';
import { ChangeEvent, useState } from 'react';

const Register = () => {
  const router = useRouter();
  const [username, setUsername] = useState<string>('');
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
      setConfirmPasswordError
    );
  };

  const firstfieldsgroup = [
    {
      label: 'Name',
      type: 'text',
      placeholder: 'Enter name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      error: nameError,
      smallField: true,
    },
    {
      label: 'Email',
      type: 'email',
      placeholder: 'Enter email',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setEmail(e.target.value),
      error: emailError,
      smallField: true,
    },
  ];

  const secondfieldsgroup = [
    {
      label: 'Username',
      type: 'text',
      smallField: true,
      placeholder: 'Enter username',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setUsername(e.target.value),
      error: usernameError,
    },
    {
      label: 'Phone Number',
      type: 'tel',
      smallField: true,
      placeholder: 'Enter phone number',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setNumber(e.target.value),
      error: phoneError,
    },
  ];

  const thirdfieldsgroup = [
    {
      label: 'Password',
      type: 'password',
      placeholder: 'Enter password',
      showPassword,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value),
      onClickShowPassword: handleClickShowPassword,
      error: passwordError,
    },
    {
      label: 'Confirm Password',
      type: 'password',
      placeholder: 'Enter confirm password',
      showPassword: showConfirmPassword,
      onChange: (e: ChangeEvent<HTMLInputElement>) => setConfirmPassword(e.target.value),
      onClickShowPassword: handleClickShowConfirmPassword,
      error: confirmPasswordError,
    },
  ];

  return (
    <>
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.left_side}>
            <div className={styles.popup_logo}>
              <img src={assets.popup_logo} alt="Popup Logo" />
            </div>
            <h1>
              3D Models of <span>wooden sheet cutting</span>
            </h1>
            <p>Make your design and nesting with 3D to less wastage</p>
            <div className={styles.login_image}>
              <img src={assets.loginimage} alt="loginpage image" />
            </div>
            <div className={styles.logo}>
              <img src={assets.Logo} alt="Bravento Logo" />
            </div>
          </div>
          <div className={styles.right_side}>
            <h2>Sign up</h2>
            <p>Let&apos;s get you all set up so you can access your personal account.</p>
            <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
              <div className={styles.inputGroup1}>
                {firstfieldsgroup.map((field, index) => (
                  <InputField className={styles.inputField} key={index} {...field} borderColor="var(--primary-color-grey-2 )" />
                ))}
              </div>
              <div className={styles.inputGroup1}>
                {secondfieldsgroup.map((field, index) => (
                  <InputField className={styles.inputField} key={index} {...field} borderColor="var(--primary-color-grey-2 )" />
                ))}
              </div>
              <div className={styles.inputGroup}>
                {thirdfieldsgroup.map((field, index) => (
                  <InputField className={styles.inputField} key={index} {...field} borderColor="var(--primary-color-grey-2 )" />
                ))}
              </div>
              {error && <p className={styles.registererrorMessage}>{error}</p>}
              <div className={styles.termsContainer}>
                <input
                  type="checkbox"
                  id="terms"
                  className={styles.termsCheckbox}
                  checked={termsAccepted}
                  onChange={() => setTermsAccepted(!termsAccepted)}
                />
                <label htmlFor="terms">
                  I agree to all the <a>Terms</a> and <a>Privacy Policies</a>
                </label>
              </div>
              {termsError && <p className={styles.registererrorMessage}>{termsError}</p>}
              <div className={styles.buttonContainer}>
                <button
                  className={styles.registerButton}
                  onClick={handleSignInWrapper}
                  disabled={isLoading}
                >
                  {isLoading ? 'Loading...' : 'Create account'}
                </button>
              </div>
            </form>
            <div className={styles.loginLinkContainer}>
              <p>
                Already have an account?{' '}
                <span onClick={() => router.push(REDIRECT.LOGIN)}>Login</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Register;
