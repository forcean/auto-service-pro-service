export type AuthUser = {
  id: string;
  publicId: string;
  email: string;
  firstname: string;
  lastname: string;
  role: string;
  activeFlag: boolean;
  permissions: string[];
}