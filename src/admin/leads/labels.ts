import type { CompanySizeRange, LeadActivityType, LeadSource, LeadStatus, LostReason } from "./api";

type StatusBadgeVariant = "success" | "primary" | "warning" | "danger" | "info" | "default";

export const STATUS_BADGE: Record<LeadStatus, { variant: StatusBadgeVariant; label: string }> = {
  NEW: { variant: "default", label: "New" },
  NO_ANSWER: { variant: "default", label: "No answer" },
  WRONG_NUMBER: { variant: "danger", label: "Wrong number" },
  CONTACTED: { variant: "info", label: "Contacted" },
  FOLLOWING_UP: { variant: "info", label: "Following up" },
  QUALIFIED: { variant: "primary", label: "Qualified" },
  NOT_QUALIFIED: { variant: "default", label: "Not qualified" },
  NOT_INTERESTED: { variant: "default", label: "Not interested" },
  DEMO_SCHEDULED: { variant: "primary", label: "Demo scheduled" },
  WAITING_QUOTATION: { variant: "warning", label: "Waiting quote" },
  QUOTATION_SENT: { variant: "warning", label: "Quote sent" },
  TRIAL_STARTED: { variant: "primary", label: "Trial" },
  NEGOTIATION: { variant: "warning", label: "Negotiation" },
  WON_CONVERTED: { variant: "success", label: "Won" },
  LOST: { variant: "danger", label: "Lost" },
  REJOINED: { variant: "success", label: "Rejoined" },
};

export const ALL_STATUSES = Object.keys(STATUS_BADGE) as LeadStatus[];

export const SOURCE_LABEL: Record<LeadSource, string> = {
  CRM: "CRM",
  LANDING_PAGE: "Landing page",
  FACEBOOK: "Facebook",
  GOOGLE: "Google",
  LINKEDIN: "LinkedIn",
  REFERRAL: "Referral",
  PARTNER: "Partner",
  OTHER: "Other",
};

export const ALL_SOURCES = Object.keys(SOURCE_LABEL) as LeadSource[];

export const SIZE_LABEL: Record<CompanySizeRange, string> = {
  "5_TO_20": "5–20",
  "21_TO_50": "21–50",
  "51_TO_100": "51–100",
  MORE_THAN_100: "100+",
};

export const LOST_REASON_LABEL: Record<LostReason, string> = {
  TOO_EXPENSIVE: "Too expensive",
  MISSING_FEATURES: "Missing features",
  NOT_FIT: "Not a fit",
  COMPETITOR_CHOSEN: "Competitor chosen",
  NO_BUDGET: "No budget",
  NO_DECISION: "No decision",
  NO_RESPONSE: "No response",
};

export const ACTIVITY_TYPE_LABEL: Record<LeadActivityType, string> = {
  CALLING_ON_WHATSAPP: "WhatsApp call",
  CALLING_ON_PHONE: "Phone call",
  SENDING_EMAIL: "Email sent",
  RECEIVING_EMAIL: "Email received",
  SENDING_SMS: "SMS sent",
  RECEIVING_SMS: "SMS received",
  CHAT: "Chat",
  SENDING_QUOTATION: "Quotation sent",
  REQUEST_QUOTATION: "Quotation requested",
  MEETING: "Meeting",
  NOTE: "Note",
  FORM_SUBMISSION: "Form submission",
  SYSTEM_EVENT: "System event",
  OTHER: "Other",
};
