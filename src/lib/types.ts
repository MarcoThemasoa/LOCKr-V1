export interface Credential {
  id?: string;
  userId: string;
  website: string;
  username: string;
  password: string; // This will be the base64 encrypted string
  notes?: string;
  iv: string; // This will be the base64 IV
  updatedAt?: string; // ISO date string
}
