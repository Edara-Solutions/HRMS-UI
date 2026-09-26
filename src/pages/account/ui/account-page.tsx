import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { OperationRefusal } from "@/shared/api";
import { type AudienceName, useAudienceSession } from "@/shared/auth";
import { Button } from "@/shared/ui/button";
import { loadSelfService } from "../api/self-service";
import { ProfileEditor } from "./profile-editor";
import { SecurityPanel } from "./security-panel";
import { SessionList } from "./session-list";

type AccountSection = "profile" | "security" | "sessions";

interface AccountPageProps {
  audience: AudienceName;
  section: AccountSection;
}

export function AccountPage({ audience, section }: AccountPageProps) {
  const { t } = useTranslation("auth");
  const { session } = useAudienceSession(audience);
  const identity = session ? { audience, publicId: session.user.publicId } : null;
  const service = useQuery({
    queryKey: [audience, identity?.publicId, "self-service"],
    queryFn: () => loadSelfService(audience),
    enabled: identity !== null,
    staleTime: Infinity,
    retry: false,
  });
  if (service.error instanceof OperationRefusal && [401, 403, 404].includes(service.error.status))
    throw service.error;
  if (!identity)
    return (
      <section>
        <p>{t("account.sessionEnded")}</p>
        <Link to={audience === "company" ? "/company/login" : "/platform/login"}>
          {t("journey.loginTitle")}
        </Link>
      </section>
    );
  return (
    <section className="space-y-6" aria-labelledby="account-heading">
      <header>
        <p className="text-xs text-[var(--color-text-muted)]">{t(`journey.${audience}`)}</p>
        <h1 id="account-heading" className="mt-1 text-2xl font-semibold">
          {t(`account.${section}Title`)}
        </h1>
      </header>
      <nav
        className="flex flex-wrap gap-4 border-b border-[var(--color-border)] pb-4 text-sm"
        aria-label={t("account.navigation")}
      >
        {(["profile", "security", "sessions"] as const).map((item) => (
          <Link
            key={item}
            to={`/${audience}/me/${item}`}
            aria-current={section === item ? "page" : undefined}
            className="text-[var(--color-primary)] hover:underline"
          >
            {t(`account.${item}Title`)}
          </Link>
        ))}
      </nav>
      {service.isPending ? (
        <p role="status">{t("account.loading")}</p>
      ) : service.isError ? (
        <div role="status">
          <p>{t("journey.unavailable")}</p>
          <Button onClick={() => void service.refetch()}>{t("journey.retry")}</Button>
        </div>
      ) : (
        <div key={`${audience}:${identity.publicId}`}>
          {section === "profile" ? (
            <ProfileEditor identity={identity} service={service.data} />
          ) : section === "security" ? (
            <SecurityPanel identity={identity} service={service.data} />
          ) : (
            <SessionList identity={identity} service={service.data} />
          )}
        </div>
      )}
    </section>
  );
}
