import type { ReactNode } from "react";
import type { SupportedLocale } from "@/shared/i18n";
import { cn } from "@/shared/lib/cn";
export type RefusalKind =
  | "not-found"
  | "forbidden"
  | "company-blocked"
  | "access-session-inactive"
  | "no-work-access";
const copy = {
  "not-found": {
    status: "404",
    en: [
      "You missed your way",
      "The page you’re looking for isn’t available. It may have moved or no longer exist.",
    ],
    ar: ["يبدو أنك ضللت الطريق", "الصفحة التي تبحث عنها غير متاحة. ربما انتقلت أو لم تعد موجودة."],
  },
  forbidden: {
    status: "403",
    en: [
      "This area is not available to you",
      "Your current access does not include this area. You can return to your workspace.",
    ],
    ar: [
      "هذه المساحة غير متاحة لك",
      "صلاحياتك الحالية لا تشمل هذه المساحة. يمكنك العودة إلى مساحة عملك.",
    ],
  },
  "company-blocked": {
    status: "403",
    en: [
      "Your company workspace is unavailable",
      "Work access is currently paused. Your personal account remains available.",
    ],
    ar: ["مساحة عمل شركتك غير متاحة", "الوصول إلى العمل متوقف حاليًا. حسابك الشخصي ما زال متاحًا."],
  },
  "access-session-inactive": {
    status: "403",
    en: [
      "This access session has ended",
      "Return to your workspace to continue. Your personal account remains available.",
    ],
    ar: ["انتهت جلسة الوصول هذه", "عد إلى مساحة عملك للمتابعة. حسابك الشخصي ما زال متاحًا."],
  },
  "no-work-access": {
    status: "Edara",
    en: [
      "Your work access has not been assigned",
      "You can still manage your profile, security, and sessions. Contact your administrator if you need work access.",
    ],
    ar: [
      "لم تُعيّن لك صلاحيات العمل بعد",
      "يمكنك إدارة ملفك الشخصي وأمان حسابك وجلساتك. تواصل مع مسؤولك إذا كنت بحاجة إلى صلاحيات العمل.",
    ],
  },
} as const;

interface RefusalSurfaceProps {
  kind: RefusalKind;
  locale: SupportedLocale;
  destination: string;
  recoveryLabel: string;
  children?: ReactNode;
}

function WayfindingCompass() {
  return (
    <svg
      viewBox="0 0 120 120"
      className="mb-7 size-28 shrink-0"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="60"
        cy="13"
        r="6"
        fill="none"
        stroke="var(--color-illustration-copper)"
        strokeWidth="2"
      />
      <path d="M54 19h12v8H54z" fill="var(--color-illustration-copper)" />
      <circle
        cx="60"
        cy="65"
        r="43"
        fill="var(--color-surface)"
        stroke="var(--color-border)"
        strokeWidth="1.5"
      />
      <circle
        cx="60"
        cy="65"
        r="37"
        fill="var(--color-primary-soft)"
        fillOpacity="0.55"
        stroke="var(--color-primary)"
        strokeOpacity="0.2"
      />
      <path
        d="M60 31v5m0 58v5M26 65h5m58 0h5M36 41l3.5 3.5m41 41L84 89M36 89l3.5-3.5m41-41L84 41"
        fill="none"
        stroke="var(--color-primary)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path d="M60 46v38M41 65h38" stroke="var(--color-border)" strokeWidth="1" />
      <path d="M78 45 66 71 54 59z" fill="var(--color-illustration-copper)" />
      <path d="M42 85 54 59 66 71z" fill="var(--color-primary)" />
      <path
        d="M78 45 60 65 42 85"
        fill="none"
        stroke="var(--color-surface)"
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <circle
        cx="60"
        cy="65"
        r="4"
        fill="var(--color-surface)"
        stroke="var(--color-illustration-copper)"
        strokeWidth="2"
      />
      <path
        d="M14 42h4m-2-2v4m88 41h4m-2-2v4"
        stroke="var(--color-illustration-copper)"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.65"
      />
    </svg>
  );
}
export function RefusalSurface({
  kind,
  locale,
  destination,
  recoveryLabel,
  children,
}: RefusalSurfaceProps) {
  const [heading, description] = copy[kind][locale];
  return (
    <section
      className="mx-auto flex min-h-[70dvh] w-full max-w-xl flex-col items-center justify-center px-6 py-12 text-center"
      aria-labelledby="refusal-heading"
    >
      <WayfindingCompass />
      <p
        className={cn(
          "mb-3 font-medium",
          kind === "not-found"
            ? "text-4xl font-semibold tracking-tight text-[var(--color-primary)] sm:text-5xl"
            : "text-xs tracking-widest text-[var(--color-text-faint)]",
        )}
      >
        {copy[kind].status}
      </p>
      <h1
        id="refusal-heading"
        className="text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
      >
        {heading}
      </h1>
      <p className="mt-4 max-w-md text-sm leading-7 text-[var(--color-text-muted)]">
        {description}
      </p>
      <a
        href={destination}
        className="mt-8 inline-flex min-h-11 items-center rounded-[var(--radius-md)] bg-[var(--color-primary)] px-5 py-3 text-sm font-medium text-[var(--color-on-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-primary)]"
      >
        {recoveryLabel}
      </a>
      {children}
    </section>
  );
}
