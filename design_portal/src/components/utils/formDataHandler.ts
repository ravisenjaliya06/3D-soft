export const handleFormData = <T extends Record<string, string>>(
  formData: T,
  setError: (error: string | null) => void
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
      setError(errors[key]);
    } else {
      formDataObject.append(key, String(value));
      errors[key] = null;
    }
  }

  if ('password' in formData && 'confirm_password' in formData) {
    if (formData.password !== formData.confirm_password) {
      errors['confirm_password'] = "Passwords dosn't match.";
      setError(errors['confirm_password']);
    }
  }

  setError(null);
  return {
    formData: Object.keys(errors).some((key) => errors[key]) ? false : formDataObject,
    errors,
  };
};
