export interface Design {
  id: string;
  design_name: string;
  created_at: string;
  updated_at: string;
  status: string;
  detail: string;
  customer_name?: string;
  customer_company?: string;
  customer_address?: string;
  customer_gstin?: string;
  customer_contact?: string;
  customer_email?: string;
  project_type?: string;
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
