import type { Company, SubscriptionStatus } from "./api";

const dummyCompanies: Company[] = [
  {
    publicId: "co-001",
    logo: null,
    name: "Nexus Technologies",
    website: "https://nexustech.sa",
    phoneNumber: "+966112345678",
    country: "SA",
    companyCode: "NEXUS",
    isActive: true,
    addressLine: "King Fahd Road, Riyadh",
    createdAt: "2026-05-20T10:00:00.000Z",
    updatedAt: "2026-05-20T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-002",
    logo: null,
    name: "CloudNine Solutions",
    website: "https://cloudnine.ae",
    phoneNumber: "+971501234567",
    country: "AE",
    companyCode: "CLOUD",
    isActive: true,
    addressLine: "Sheikh Zayed Road, Dubai",
    createdAt: "2026-05-18T10:00:00.000Z",
    updatedAt: "2026-05-18T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-003",
    logo: null,
    name: "Digital Dynamics",
    website: null,
    phoneNumber: "+966509876543",
    country: "SA",
    companyCode: "DIGDYN",
    isActive: true,
    addressLine: null,
    createdAt: "2026-05-15T10:00:00.000Z",
    updatedAt: "2026-05-15T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-004",
    logo: null,
    name: "Innovate Corp",
    website: "https://innovatecorp.com",
    phoneNumber: "+966122345679",
    country: "SA",
    companyCode: "INNOV",
    isActive: true,
    addressLine: "Olaya District, Riyadh",
    createdAt: "2026-05-12T10:00:00.000Z",
    updatedAt: "2026-05-12T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-005",
    logo: null,
    name: "Swift Systems",
    website: "https://swiftsys.sa",
    phoneNumber: "+966133456780",
    country: "SA",
    companyCode: "SWIFT",
    isActive: false,
    addressLine: "Al Malaz, Riyadh",
    createdAt: "2026-05-10T10:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-006",
    logo: null,
    name: "TechVista Inc",
    website: "https://techvista.sa",
    phoneNumber: "+966144567891",
    country: "SA",
    companyCode: "TVISTA",
    isActive: true,
    addressLine: "Business Gate, Riyadh",
    createdAt: "2026-05-08T10:00:00.000Z",
    updatedAt: "2026-05-08T10:00:00.000Z",
    deletedAt: null,
  },
  {
    publicId: "co-007",
    logo: null,
    name: "Gulf Analytics",
    website: "https://gulfanalytics.com",
    phoneNumber: "+966155678902",
    country: "SA",
    companyCode: "GULF",
    isActive: true,
    addressLine: "Riyadh Front, Riyadh",
    createdAt: "2026-04-28T10:00:00.000Z",
    updatedAt: "2026-04-28T10:00:00.000Z",
    deletedAt: null,
  },
];

export interface CompanyWithConfig extends Company {
  config?: {
    subscriptionStatus: SubscriptionStatus;
    planName: string;
    trialEndDate: string | null;
    subscriptionEndDate: string | null;
  };
}

export const dummyCompaniesWithConfig: CompanyWithConfig[] = [
  {
    ...dummyCompanies[0],
    config: {
      subscriptionStatus: "ACTIVE",
      planName: "Enterprise",
      trialEndDate: null,
      subscriptionEndDate: "2027-05-20",
    },
  },
  {
    ...dummyCompanies[1],
    config: {
      subscriptionStatus: "TRIAL",
      planName: "Professional",
      trialEndDate: "2026-06-18",
      subscriptionEndDate: null,
    },
  },
  {
    ...dummyCompanies[2],
    config: {
      subscriptionStatus: "TRIAL",
      planName: "Starter",
      trialEndDate: "2026-06-15",
      subscriptionEndDate: null,
    },
  },
  {
    ...dummyCompanies[3],
    config: {
      subscriptionStatus: "ACTIVE",
      planName: "Enterprise",
      trialEndDate: null,
      subscriptionEndDate: "2027-05-12",
    },
  },
  {
    ...dummyCompanies[4],
    config: {
      subscriptionStatus: "FROZEN",
      planName: "Professional",
      trialEndDate: null,
      subscriptionEndDate: "2027-05-10",
    },
  },
  {
    ...dummyCompanies[5],
    config: {
      subscriptionStatus: "ACTIVE",
      planName: "Starter",
      trialEndDate: null,
      subscriptionEndDate: "2027-05-08",
    },
  },
  {
    ...dummyCompanies[6],
    config: {
      subscriptionStatus: "ACTIVE",
      planName: "Professional",
      trialEndDate: null,
      subscriptionEndDate: "2027-04-28",
    },
  },
];
