export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  username: string;
  profile_picture: string | File | null;

  // Company Details
  company_name?: string;
  company_address?: string;
  company_email?: string;
  company_phone?: string;
  company_website?: string;
  company_gstin?: string;
  company_pan?: string;

  // Banking Details
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  account_type?: string;
  ifsc_code?: string;
  branch_name?: string;
  upi_id?: string;
}

export interface addmember {
  username: string;
  email: string;
  groups: string[];
}

export interface Member {
  id: string;
  name: string;
  email: string;
  groups: string[];
  is_invited: boolean;
}

export interface Organization {
  display_name: string;
  logo: string | File | null;
}

export interface TeamRole {
  group: string[];
}

export interface sheetData {
  id: string;
  name: string;
}

export interface sheetsData {
  [key: string]: sheetData;
}

export interface designSetting {
  sheet_height: number;
  sheet_width: number;
  height: number;
  width: number;
  unit: string;
  minifixDistance: number;
  grooveGap: number;
  grooveDig: number;
  sheetData: sheetsData;
}

export interface SettingConfigs {
  height: number;
  width: number;
  sheet_width: number;
  sheet_height: number;
  unit: string;
  minifix_distance: number;
  groove_gap: number;
  groove_dig: number;
  sheet_data: sheetsData[];
}
