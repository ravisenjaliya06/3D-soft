const TITLE_PROJECT_NAME = 'Bravento';

export const STATUS_CODES = {
  OK: 200,
  CREATED: 201,
  UPDATED: 200,
  DELETED: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const REDIRECT = {
  UNAUTHORIZED: '/auth/login',
  REGISTER: '/auth/register',
  LOGIN: '/auth/login',
  FORGOT: '/auth/forgot',
  OTP: '/auth/otp',
  DASHBOARD: '/dashboard',
  MES: '/mes',
  MATERIAL: '/material',
  CATALOG_MANAGER: '/catalogmanager',
  DESIGNS: '/designs',
  SETTINGS: '/settings',
  PROFILE: '/profile',
  PROJECT_DESIGN: (projectId: string) => `/project/${projectId}`,
  DESIGNPAGE: (designId: string) => `/design/${designId}`,
  PROJECTDASHBOARD: '/dashboard',
} as const;

export const PAGE_TITLE = {
  DASHBOARD: TITLE_PROJECT_NAME + ' | Dashboard',
  DESIGN: TITLE_PROJECT_NAME + ' | Design',
  MES: TITLE_PROJECT_NAME + ' | Mes',
  MATERIAL: TITLE_PROJECT_NAME + ' | Material',
  CATALOG_MANAGER: TITLE_PROJECT_NAME + ' | Catalog Manager',
  DESIGNS: TITLE_PROJECT_NAME + ' | Designs',
  SETTINGS: TITLE_PROJECT_NAME + ' | Settings',
  LOGIN: TITLE_PROJECT_NAME + ' | Login',
  REGISTER: TITLE_PROJECT_NAME + ' | Register',
  FORGOT: TITLE_PROJECT_NAME + ' | Forgot Password',
  OTP: TITLE_PROJECT_NAME + ' | OTP Verification',
};

//UNITS
export const UNIT_MILLIMETER = 'mm';
export const UNIT_CENTIMETER = 'cm';
export const UNIT_METER = 'm';
export const UNIT_INCH = 'in';
export const UNIT_FOOT = 'ft';
export const UNIT_MILE = 'mi';
