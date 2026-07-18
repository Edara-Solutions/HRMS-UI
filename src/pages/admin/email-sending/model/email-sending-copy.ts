import type { SupportedLocale } from "@/shared/i18n";

const ENGLISH_EMAIL_SENDING_COPY = {
  breadcrumb: "Email",
  title: "Sending controls",
  pageDescription:
    "Emergency pause and controlled resume for each communication context. Pausing one context never affects the other.",
  edaraContext: "Edara sending",
  companyContext: "Company sending",
  edaraDescription: "Onboarding and operator communication sent with the managed Edara identity.",
  companyDescription:
    "White-label communication sent with each Company's verified sender identity.",
  active: "Active",
  paused: "Paused",
  activeDescription: "Messages in this context are dispatched normally.",
  pausedDescription: "Queued messages are held and delivered once sending resumes. None are lost.",
  reasonLabel: "Reason",
  updatedBy: "Changed by",
  updatedAt: "Changed at",
  user: "User",
  pauseAction: "Pause sending",
  resumeAction: "Resume sending",
  pauseTitle: "Pause this context?",
  pauseDialogDescription:
    "Queued messages are held, not failed, and delivered once you resume. Record why you are pausing.",
  pauseReasonPlaceholder: "e.g. SMTP provider outage",
  reasonRequired: "A reason is required.",
  confirmPause: "Pause",
  resumeTitle: "Resume this context?",
  resumeDialogDescription: "Held messages resume delivery on the next worker pass.",
  confirmResume: "Resume",
  cancel: "Cancel",
  loadingStatus: "Loading sending status",
  statusUnavailable: "Sending status unavailable",
  statusUnavailableDescription: "The current status could not be loaded. Retry shortly.",
  retry: "Retry",
  actionFailed: "The action could not be completed. Retry shortly.",
};

type EmailSendingCopy = typeof ENGLISH_EMAIL_SENDING_COPY;

const ARABIC_EMAIL_SENDING_COPY = {
  breadcrumb: "البريد",
  title: "ضوابط الإرسال",
  pageDescription:
    "إيقاف طارئ واستئناف مُتحكَّم به لكل سياق تواصل. إيقاف سياق لا يؤثر أبدًا على الآخر.",
  edaraContext: "إرسال إدارة",
  companyContext: "إرسال الشركة",
  edaraDescription: "رسائل التهيئة والتواصل التشغيلي تُرسل بهوية إدارة المُدارة.",
  companyDescription: "التواصل ذو العلامة البيضاء يُرسل بهوية المُرسِل المُوثّقة لكل شركة.",
  active: "نشط",
  paused: "متوقف",
  activeDescription: "تُرسَل رسائل هذا السياق بشكل طبيعي.",
  pausedDescription: "تُحتجز الرسائل في الطابور وتُسلَّم عند استئناف الإرسال. لا تُفقد أي رسالة.",
  reasonLabel: "السبب",
  updatedBy: "غيّرها",
  updatedAt: "وقت التغيير",
  user: "مستخدم",
  pauseAction: "إيقاف الإرسال",
  resumeAction: "استئناف الإرسال",
  pauseTitle: "إيقاف هذا السياق؟",
  pauseDialogDescription:
    "تُحتجز الرسائل في الطابور ولا تفشل، وتُسلَّم عند الاستئناف. سجّل سبب الإيقاف.",
  pauseReasonPlaceholder: "مثال: انقطاع مزوّد SMTP",
  reasonRequired: "السبب مطلوب.",
  confirmPause: "إيقاف",
  resumeTitle: "استئناف هذا السياق؟",
  resumeDialogDescription: "تستأنف الرسائل المُحتجزة التسليم في الدورة التالية للعامل.",
  confirmResume: "استئناف",
  cancel: "إلغاء",
  loadingStatus: "جارٍ تحميل حالة الإرسال",
  statusUnavailable: "حالة الإرسال غير متاحة",
  statusUnavailableDescription: "تعذّر تحميل الحالة الحالية. أعد المحاولة قريبًا.",
  retry: "إعادة المحاولة",
  actionFailed: "تعذّر إكمال الإجراء. أعد المحاولة قريبًا.",
} satisfies EmailSendingCopy;

const EMAIL_SENDING_COPY: Readonly<Record<SupportedLocale, EmailSendingCopy>> = {
  en: ENGLISH_EMAIL_SENDING_COPY,
  ar: ARABIC_EMAIL_SENDING_COPY,
};

/** Returns all sending-controls interface copy for the active application locale. */
export function getEmailSendingCopy(locale: SupportedLocale): EmailSendingCopy {
  return EMAIL_SENDING_COPY[locale];
}

export type { EmailSendingCopy };
