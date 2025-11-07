export interface Design {
  id: string;
  design_name: string;
  created_at: string;
  updated_at: string;
  status: string;
  detail: string;
}

export interface DesignResponse {
  detail: string;
}

export interface User {
  name: string;
  email: string;
  username: string;
  selected_organization_name: string;
}
