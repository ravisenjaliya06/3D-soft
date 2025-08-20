export interface User {
  id: number;
  name: string;
  phone: string;
  email: string;
  username: string;
  profile_picture: string | File | null;
}

export interface addmember {
  username: string;
  email: string;
  groups: string[];
}

export interface Member {
  id: number;
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

interface sheetData {
  id: string;
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
