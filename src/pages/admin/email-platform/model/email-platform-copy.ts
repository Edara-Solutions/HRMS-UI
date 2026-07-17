import type { SupportedLocale } from "@/shared/i18n";

const ENGLISH_EMAIL_PLATFORM_COPY = {
  previewAction: "Preview",
  edaraEmail: "Edara Email",
  companyEmail: "Company Email",
  critical: "Critical",
  operational: "Operational",
  defaultTemplate: "Default template",
  payload: "Payload",
  locales: "Locales",
  communicationBoundary: "Communication boundary",
  communicationBoundaryDescription:
    "The sender context is fixed by each Email Type and cannot be changed at preview time.",
  edaraBoundaryDescription:
    "Edara onboarding and operator communication uses the managed Edara identity.",
  companyBoundaryDescription:
    "White-label Company communication uses only the Company identity and verified sender.",
  safePreview: "Safe preview",
  safePreviewDescription:
    "Approved sample data only. No real token, password, or SMTP credential is exposed.",
  previewLocale: "Preview locale",
  englishPreview: "English preview",
  arabicPreview: "Arabic preview",
  previewFormat: "Preview format",
  htmlPreview: "HTML preview",
  plainTextPreview: "Plain text preview",
  loadingPreview: "Loading email preview",
  previewLocaleUnavailable: "Preview locale unavailable",
  previewLocaleUnavailableDescription:
    "This Email Type is not registered for the selected locale. Choose one of its supported locales.",
  requestedLocale: "Requested locale",
  effectiveLocale: "Effective locale",
  previewFallback: "Translation fallback applied",
  previewFallbackDescription:
    "The requested translation is unavailable. This preview and any test email use the effective locale shown.",
  previewUnavailable: "Preview unavailable",
  previewUnavailableDescription:
    "The approved sample could not be rendered. Try another locale or retry shortly.",
  companyPreviewBlocked: "Company preview blocked",
  companyPreviewBlockedDescription:
    "The rendered sample contained Edara identity. Try another locale or ask the email platform owner to correct the template.",
  retryPreview: "Retry preview",
  subject: "Subject",
  preheader: "Preheader",
  resolvedCompanySender: "Resolved Company sender",
  replyTo: "Reply to",
  emailPreview: "email preview",
  fullScreenPreview: "Open full-screen preview",
  fullScreenPreviewDescription: "Mailbox-style preview with approved sample data only.",
  closePreview: "Close preview",
  testSend: "Test send",
  testSendDescription:
    "Test messages require an explicit recipient and are queued separately from production communication.",
  testSendLocaleDescription: "The queued test uses the effective preview locale shown above.",
  testRecipient: "Test recipient",
  testRecipientPlaceholder: "name@company.example",
  invalidRecipientEmail: "Enter a valid recipient email address",
  queueTestEmail: "Queue test email",
  testEmailQueued: "Test email queued",
  testEmailQueuedDescription:
    "The durable queue accepted the test email. It has not confirmed inbox delivery.",
  testEmailUnavailable: "Test email could not be queued",
  testEmailUnavailableDescription:
    "Check the recipient and try again. No delivery credentials are exposed.",
  testQueueUnavailable: "Test delivery queue unavailable",
  testQueueUnavailableDescription:
    "The current API supports safe previews only. This control will enable when the durable queue contract is published; it will report queued acceptance, never inbox delivery.",
  emailPlatform: "Email Platform",
  email: "Email",
  pageDescription:
    "Inspect immutable Email Types, default template revisions, and safe React Email previews.",
  catalogContext: "Catalog context",
  emailTypeCatalog: "Email Type catalog",
  all: "All",
  edara: "Edara",
  company: "Company",
  allContexts: "All contexts",
  edaraContext: "Edara context",
  companyContext: "Company context",
  emailType: "Email Type",
  emailTypes: "Email Types",
  loadingCatalog: "Loading Email Type catalog",
  catalogUnavailable: "Catalog unavailable",
  catalogUnavailableDescription:
    "The Email Type catalog could not be loaded. Retry shortly or check your access.",
  retryCatalog: "Retry catalog",
  emailTypeUnavailable: "Email Type unavailable",
  emailTypeUnavailableDescription:
    "The requested or required default Email Type is not registered in this context. Choose an available type or return after the registry is corrected.",
  chooseDefaultPreview: "Choose default preview",
  noEmailTypes: "No Email Types found",
  noEmailTypesDescription: "No registered templates match this context.",
} as const;

/** Localized interface copy consumed by Email Platform components. */
export type EmailPlatformCopy = { [Key in keyof typeof ENGLISH_EMAIL_PLATFORM_COPY]: string };

const ARABIC_EMAIL_PLATFORM_COPY = {
  previewAction: "معاينة",
  edaraEmail: "بريد إدارة",
  companyEmail: "بريد الشركة",
  critical: "حرج",
  operational: "تشغيلي",
  defaultTemplate: "القالب الافتراضي",
  payload: "إصدار البيانات",
  locales: "اللغات",
  communicationBoundary: "حدود التواصل",
  communicationBoundaryDescription: "يُحدَّد سياق المرسل لكل نوع بريد ولا يمكن تغييره أثناء المعاينة.",
  edaraBoundaryDescription: "تستخدم رسائل تهيئة إدارة وتشغيلها هوية إدارة المُدارة.",
  companyBoundaryDescription:
    "تستخدم رسائل الشركة ذات العلامة البيضاء هوية الشركة والمرسل الموثّق فقط.",
  safePreview: "معاينة آمنة",
  safePreviewDescription:
    "تُستخدم بيانات نموذجية معتمدة فقط، ولا تُعرض رموز أو كلمات مرور أو بيانات SMTP حقيقية.",
  previewLocale: "لغة المعاينة",
  englishPreview: "معاينة بالإنجليزية",
  arabicPreview: "معاينة بالعربية",
  previewFormat: "تنسيق المعاينة",
  htmlPreview: "معاينة HTML",
  plainTextPreview: "معاينة النص العادي",
  loadingPreview: "جارٍ تحميل معاينة البريد",
  previewLocaleUnavailable: "لغة المعاينة غير متاحة",
  previewLocaleUnavailableDescription:
    "نوع البريد هذا غير مسجل للغة المحددة. اختر إحدى اللغات المدعومة.",
  previewUnavailable: "المعاينة غير متاحة",
  previewUnavailableDescription: "تعذّر عرض النموذج المعتمد. جرّب لغة أخرى أو أعد المحاولة بعد قليل.",
  companyPreviewBlocked: "حُظرت معاينة الشركة",
  companyPreviewBlockedDescription:
    "تضمن النموذج المعروض هوية إدارة. جرّب لغة أخرى أو اطلب من مسؤول منصة البريد تصحيح القالب.",
  retryPreview: "إعادة محاولة المعاينة",
  subject: "الموضوع",
  preheader: "النص التمهيدي",
  resolvedCompanySender: "مرسل الشركة المحدد",
  replyTo: "الرد إلى",
  emailPreview: "معاينة البريد",
  fullScreenPreview: "فتح المعاينة بملء الشاشة",
  fullScreenPreviewDescription: "معاينة بأسلوب البريد الوارد ببيانات نموذجية معتمدة فقط.",
  closePreview: "إغلاق المعاينة",
  testSend: "إرسال تجريبي",
  testSendDescription:
    "تتطلب الرسائل التجريبية مستلمًا محددًا وتوضع في طابور منفصل عن رسائل الإنتاج.",
  testRecipient: "المستلم التجريبي",
  testRecipientPlaceholder: "name@company.example",
  invalidRecipientEmail: "أدخل عنوان بريد إلكتروني صالحًا للمستلم",
  queueTestEmail: "إضافة البريد التجريبي للطابور",
  testQueueUnavailable: "طابور الإرسال التجريبي غير متاح",
  testQueueUnavailableDescription:
    "تدعم الواجهة الحالية المعاينات الآمنة فقط. سيتاح هذا الإجراء عند نشر عقد الطابور الدائم، وسيؤكد قبول الرسالة في الطابور لا وصولها إلى البريد الوارد.",
  emailPlatform: "منصة البريد",
  email: "البريد",
  pageDescription:
    "افحص أنواع البريد الثابتة وإصدارات القوالب الافتراضية ومعاينات React Email الآمنة.",
  catalogContext: "سياق الكتالوج",
  emailTypeCatalog: "كتالوج أنواع البريد",
  all: "الكل",
  edara: "إدارة",
  company: "الشركة",
  allContexts: "كل السياقات",
  edaraContext: "سياق إدارة",
  companyContext: "سياق الشركة",
  emailType: "نوع بريد",
  emailTypes: "أنواع البريد",
  loadingCatalog: "جارٍ تحميل كتالوج أنواع البريد",
  catalogUnavailable: "الكتالوج غير متاح",
  catalogUnavailableDescription:
    "تعذّر تحميل كتالوج أنواع البريد. أعد المحاولة بعد قليل أو تحقق من صلاحياتك.",
  retryCatalog: "إعادة محاولة الكتالوج",
  emailTypeUnavailable: "نوع البريد غير متاح",
  emailTypeUnavailableDescription:
    "نوع البريد المطلوب أو الافتراضي الإلزامي غير مسجل في هذا السياق. اختر نوعًا متاحًا أو عُد بعد تصحيح السجل.",
  chooseDefaultPreview: "اختيار المعاينة الافتراضية",
  noEmailTypes: "لم يتم العثور على أنواع بريد",
  noEmailTypesDescription: "لا توجد قوالب مسجلة تطابق هذا السياق.",
  requestedLocale: "اللغة المطلوبة",
  effectiveLocale: "اللغة الفعّالة",
  previewFallback: "تم تطبيق بديل الترجمة",
  previewFallbackDescription:
    "الترجمة المطلوبة غير متاحة. تستخدم المعاينة والرسالة التجريبية اللغة الفعّالة المبينة.",
  testSendLocaleDescription: "تستخدم الرسالة التجريبية لغة المعاينة الفعّالة المبينة أعلاه.",
  testEmailQueued: "تمت إضافة البريد التجريبي للطابور",
  testEmailQueuedDescription:
    "قبل الطابور الدائم الرسالة التجريبية. لا يؤكد ذلك وصولها إلى البريد الوارد.",
  testEmailUnavailable: "تعذّر إضافة البريد التجريبي إلى الطابور",
  testEmailUnavailableDescription: "تحقق من المستلم وأعد المحاولة. لا تُعرض بيانات اعتماد الإرسال.",
} satisfies EmailPlatformCopy;

const EMAIL_PLATFORM_COPY: Readonly<Record<SupportedLocale, EmailPlatformCopy>> = {
  en: ENGLISH_EMAIL_PLATFORM_COPY,
  ar: ARABIC_EMAIL_PLATFORM_COPY,
};

/** Returns all Email Platform interface copy for the active application locale. */
export function getEmailPlatformCopy(locale: SupportedLocale): EmailPlatformCopy {
  return EMAIL_PLATFORM_COPY[locale];
}
