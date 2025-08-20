import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { OTPVerifyForm, ResendOtp } from '@/types/formTypes';
import { NextRouter } from 'next/router';
import { handleFormData } from '../utils/formDataHandler';

export const handleVerify = async (
  registerOTPPayload: OTPVerifyForm,
  setError: (message: string | null) => void,
  router: NextRouter,
  setIsLoading: (loading: boolean) => void,
) => {
  setIsLoading(true);
  const { formData } = handleFormData<OTPVerifyForm>(
    registerOTPPayload,
    setError,
  );
  if (!formData) {
    setIsLoading(false);
    return;
  }
  const response = await CommonService.post('user', 'otp/validate', formData);

  if (response.status === 200) {
    setIsLoading(false);
    router.push({
      pathname: REDIRECT.LOGIN,
      query: {
        message: 'Your Account has been verified. To access login now.',
      },
    });
  } else {
    setError(response.data?.message || 'Invalid OTP. Please try again.');
    setIsLoading(false);
  }
};

export const handleResendOtp = async (
  resendOTPPayload: ResendOtp,
  setError: (message: string | null) => void,
  setIsLoading: (loading: boolean) => void,
  setSuccessMessage: (message: string | null) => void,
) => {
  setIsLoading(true);
  const { formData } = handleFormData<ResendOtp>(resendOTPPayload, setError);

  if (!formData) {
    setIsLoading(false);
    return;
  }
  const response = await CommonService.post('user', 'otp', formData);

  if (response.status === 200) {
    setIsLoading(false);
    setSuccessMessage('OTP sent successfully.');
  } else {
    setError('OTP Resend failed. Please try again few minutes.');
    setIsLoading(false);
  }
};
