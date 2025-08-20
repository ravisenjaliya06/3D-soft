export interface User {
  name: string;
  email: string;
  username: string;
  selected_organization_name: string;
  profile_picture: string | File | null;
}
