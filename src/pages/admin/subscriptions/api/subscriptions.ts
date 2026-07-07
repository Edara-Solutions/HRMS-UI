export interface Company {
  publicId: string;
  logo: string | null;
  name: string;
  website: string | null;
  phoneNumber: string;
  country: string;
  companyCode: string;
  isActive: boolean;
  addressLine: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "FROZEN" | "CANCELLED" | "EXPIRED";
