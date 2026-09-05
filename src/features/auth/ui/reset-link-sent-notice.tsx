import { MailCheck } from "lucide-react";
import { useEffect } from "react";
import { useCountdown } from "@/shared/lib/use-countdown";

/** Long enough to read the instructions and switch to an inbox, short enough not to strand anyone. */
const REDIRECT_SECONDS = 20;

export type ResetLinkSentNoticeProps = {
  /** The address the link went to, when it was carried over from the request screen. */
  readonly email: string | undefined;
  /** Run when the countdown reaches zero. Each portal returns to its own sign-in surface. */
  readonly onCountdownEnd: () => void;
};

/**
 * The confirmation both portals show after a reset was asked for. It never confirms that an account
 * exists — the wording is conditional on purpose, because the server's answer was too.
 */
export function ResetLinkSentNotice({ email, onCountdownEnd }: ResetLinkSentNoticeProps) {
  const remaining = useCountdown(REDIRECT_SECONDS);

  useEffect(() => {
    if (remaining > 0) return;
    onCountdownEnd();
  }, [remaining, onCountdownEnd]);

  return (
    <>
      <div className="flex size-10 items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-primary)]">
        <MailCheck size={20} />
      </div>

      <h1 className="mt-5 text-3xl font-semibold text-[var(--color-text)]">Check your email</h1>

      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        {email ? (
          <>
            If an account matches{" "}
            <span className="font-medium text-[var(--color-text)]">{email}</span>, we've sent it a
            link to choose a new password.
          </>
        ) : (
          <>
            If an account matches the address you entered, we've sent it a link to choose a new
            password.
          </>
        )}
      </p>

      <p className="mt-3 text-sm leading-6 text-[var(--color-text-muted)]">
        The link works once and expires in an hour. If nothing arrives, check your spam folder.
      </p>

      <div className="mt-8 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3">
        <p aria-live="polite" className="text-sm text-[var(--color-text-muted)]">
          Returning to sign in in{" "}
          <span className="font-medium text-[var(--color-text)]">{remaining} seconds</span>.
        </p>
      </div>
    </>
  );
}
