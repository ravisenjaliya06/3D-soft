export type RegisterForm = {
  organization_name: string;
  username: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  confirm_password: string;
};

export type OTPVerifyForm = {
  email: string;
  otp: string;
};

export type ResendOtp = {
  email: string;
};

export type LoginForm = {
  email: string;
  password: string;
};

export type ForgotForm = {
  email: string;
};

export type CreateProjectForm = {
  name: string;
  client_name: string;
  client_details: string;
  project_id: string;
};

export type UpdateProjectForm = {
  name: string;
  client_name: string;
  client_details: string;
  project_id: string;
  status: string;
};
