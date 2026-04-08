export interface FormDataOptions {
  isRegister?: boolean;
}

export const handleFormData = <T extends Record<string, string>>(
  formData: T,
  setError: (error: string | null) => void,
  options?: FormDataOptions
): { formData: FormData | false; errors: Record<string, string | null> } => {
  const formDataObject = new FormData();
  const errors: Record<string, string | null> = {};

  for (const [key, value] of Object.entries(formData)) {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      const formattedKey = key
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      errors[key] = `${formattedKey} is required.`;
    } else {
      formDataObject.append(key, String(value));
      errors[key] = null;
    }
  }

  if ('password' in formData && !errors['password']) {
    const password = String(formData.password);
    if (password.length < 8) {
      errors['password'] = 'Password must be at least 8 characters long.';
    } else if (options?.isRegister) {
      if (!/[a-z]/.test(password)) {
        errors['password'] = 'Password must contain at least one lowercase letter.';
      } else if (!/[A-Z]/.test(password)) {
        errors['password'] = 'Password must contain at least one uppercase letter.';
      } else if (!/\d/.test(password)) {
        errors['password'] = 'Password must contain at least one numeric character.';
      } else if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errors['password'] = 'Password must contain at least one special character.';
      }
    } else {
      // Basic validation for login or other forms
      if (!/[a-zA-Z]/.test(password)) {
        errors['password'] = 'Password must contain at least one letter.';
      } else if (!/\d/.test(password)) {
        errors['password'] = 'Password must contain at least one numeric character.';
      }
    }
  }

  if ('password' in formData && 'confirm_password' in formData) {
    if (formData.password !== formData.confirm_password) {
      errors['confirm_password'] = "Passwords don't match.";
    }
  }

  if ('phone' in formData && !errors['phone']) {
    const phone = String(formData.phone);
    if (phone.length !== 10) {
      errors['phone'] = 'Phone number must be exactly 10 digits.';
    }
  }

  const hasErrors = Object.values(errors).some((error) => error !== null);

  if (!hasErrors) {
    setError(null);
  }

  return {
    formData: hasErrors ? false : formDataObject,
    errors,
  };
};
