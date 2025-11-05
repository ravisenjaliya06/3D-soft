import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { RegisterForm } from '@/types/formTypes';
import { NextRouter } from 'next/router';
import { handleFormData } from '../utils/formDataHandler';

// Function to handle sign-in
export const handleSignIn = async (
  router: NextRouter,
  registerPayload: RegisterForm,
  setError: (message: string | null) => void,
  setIsLoading: (loading: boolean) => void,
  setNameError: (message: string | null) => void,
  setEmailError: (message: string | null) => void,
  setUsernameError: (message: string | null) => void,
  setPhoneError: (message: string | null) => void,
  setPasswordError: (message: string | null) => void,
  setConfirmPasswordError: (message: string | null) => void
) => {
  setIsLoading(true);
  const { formData, errors } = handleFormData<RegisterForm>(registerPayload, setError);
  setNameError(errors.name);
  setEmailError(errors.email);
  setUsernameError(errors.username);
  setPhoneError(errors.phone);
  setPasswordError(errors.password);
  setConfirmPasswordError(errors.confirm_password);

  if (!formData) {
    setIsLoading(false);
    return;
  }
  const response = await CommonService.post('user', 'register', formData);
  if (response.status === 201) {
    router.push({
      pathname: REDIRECT.OTP,
      query: { email: registerPayload.email },
    });
  } else {
    setNameError(response.data.name);
    setEmailError(response.data.email);
    setUsernameError(response.data.username);
    setPhoneError(response.data.phone);
    setIsLoading(false);
  }
};
