import { API_ENDPOINT } from '@/services/ApiEndpoints';
import CommonService from '@/services/CommonService';
import { ForgotForm } from '@/types/formTypes';
import { NextRouter } from 'next/router';
import { handleFormData } from '../utils/formDataHandler';

export const handleForgotAPI = async (
  forgotPayload: ForgotForm,
  setError: (message: string | null) => void,
  router: NextRouter,
  setIsLoading: (loading: boolean) => void,
  setEmailError: (message: string | null) => void,
  setSuccessMessage: (message: string | null) => void
) => {
  setIsLoading(true);
  const { formData, errors } = handleFormData<ForgotForm>(forgotPayload, setError);

  setEmailError(errors.email);

  if (!formData) {
    setIsLoading(false);
    return;
  }
  const response = await CommonService.post(API_ENDPOINT.FORGOT_PASSWORD, formData);
  if (response.status === 200) {
    setSuccessMessage('Password reset email sent successfully');
  } else {
    const error =
      response.data?.email?.[0] ||
      response.data?.non_field_errors?.[0] ||
      'Something went wrong. Please try again.';
    setEmailError(error);
  }

  setIsLoading(false);
};
