import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { type KeyboardEvent, useId, useState } from "react";
import {
  type CompanySession,
  isPlatformPortalEnabled,
  type PlatformSession,
  useCurrentSession,
} from "@/shared/auth";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  type Audience,
  groupPersonas,
  type Persona,
  personaForCompanyUser,
  personaForPlatformUser,
  personas,
} from "../model/personas";
import {
  lastPersonaKeys,
  type SwitchOutcome,
  signOutAllTiers,
  switchPersona,
} from "../model/switch-persona";

const TIER_LABEL: Record<Audience, string> = { platform: "Platform", company: "Company" };

interface TierIdentity {
  readonly audience: Audience;
  readonly persona: Persona | undefined;
  readonly name: string;
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
  readonly note: string | null;
}

function platformIdentity(session: PlatformSession): TierIdentity {
  const persona = personaForPlatformUser(session.user.email);
  return {
    audience: "platform",
    persona,
    name: persona?.label ?? session.user.email,
    roles: session.user.roleNames,
    permissions: session.user.permissions,
    note: null,
  };
}

function companyIdentity(session: CompanySession): TierIdentity {
  const persona = personaForCompanyUser(session.user.companyCode, session.user.employeeCode);
  return {
    audience: "company",
    persona,
    name: persona ? `${persona.label} · ${persona.group}` : session.user.employeeCode,
    roles: session.user.isOwner ? ["Company Owner"] : [],
    permissions: session.user.permissions,
    note: session.user.isOwner
      ? "Owner authority bypasses Company permission checks."
      : "The Company session does not carry role names.",
  };
}

function TierSummary({ identity }: { identity: TierIdentity }) {
  return (
    <section
      className="flex flex-col gap-1.5"
      aria-label={`${TIER_LABEL[identity.audience]} session`}
    >
      <div className="flex items-center gap-2">
        <Badge variant={identity.audience === "platform" ? "primary" : "default"}>
          {TIER_LABEL[identity.audience]}
        </Badge>
        <span className="truncate text-xs text-[var(--color-text)]">{identity.name}</span>
      </div>
      <details className="text-xs text-[var(--color-text-muted)]">
        <summary className="cursor-pointer select-none">
          {identity.roles.length > 0 ? identity.roles.join(", ") : "No role names"} ·{" "}
          {identity.permissions.length} permissions
        </summary>
        {identity.note ? <p className="mt-1">{identity.note}</p> : null}
        <ul className="mt-1 max-h-32 overflow-y-auto font-mono text-[11px] leading-5">
          {[...identity.permissions].sort().map((permission) => (
            <li key={permission}>{permission}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function OutcomeMessage({ outcome }: { outcome: SwitchOutcome | null }) {
  if (outcome === null || outcome.kind === "signed-in") return null;
  if (outcome.kind === "refused-as-expected") {
    return (
      <p role="status" className="text-xs text-[var(--color-text-muted)]">
        Refused as expected.
      </p>
    );
  }
  return (
    <p role="status" className="text-xs text-[var(--color-danger)]">
      {outcome.detail}
    </p>
  );
}

export function DevPersonaSwitcher() {
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [outcome, setOutcome] = useState<SwitchOutcome | null>(null);
  const panelId = useId();
  const navigate = useNavigate();
  const platformSession = useCurrentSession("platform");
  const companySession = useCurrentSession("company");

  const identities = [
    platformSession ? platformIdentity(platformSession) : null,
    companySession ? companyIdentity(companySession) : null,
  ].filter((identity): identity is TierIdentity => identity !== null);
  const activeKeys = new Set(identities.flatMap(({ persona }) => (persona ? [persona.key] : [])));
  const lastKeys = lastPersonaKeys();
  const available = isPlatformPortalEnabled()
    ? personas
    : personas.filter((persona) => persona.audience === "company");

  const switching = useMutation({
    mutationFn: switchPersona,
    onSuccess: async (result, persona) => {
      setOutcome(result);
      if (result.kind === "signed-in") await navigate({ href: `/${persona.audience}` });
    },
  });
  const signingOut = useMutation({
    mutationFn: signOutAllTiers,
    onSuccess: () => setOutcome(null),
  });

  const closeOnEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") setOpen(false);
  };

  if (hidden) {
    return (
      <button
        type="button"
        aria-label="Show dev persona switcher"
        onClick={() => setHidden(false)}
        className="fixed end-2 bottom-2 z-50 size-3 rounded-full border border-[var(--color-border)] bg-[var(--color-surface-2)]"
      />
    );
  }

  return (
    <div
      className="fixed end-4 bottom-4 z-50 flex flex-col items-end gap-2"
      onKeyDown={closeOnEscape}
    >
      {open ? (
        <div
          id={panelId}
          className="flex max-h-[70dvh] w-80 flex-col gap-3 overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-[var(--shadow-md)]"
        >
          <div className="flex flex-col gap-3 border-b border-[var(--color-border)] pb-3">
            {identities.length > 0 ? (
              identities.map((identity) => (
                <TierSummary key={identity.audience} identity={identity} />
              ))
            ) : (
              <p className="text-xs text-[var(--color-text-muted)]">No tier is signed in.</p>
            )}
          </div>
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
            {groupPersonas(available).map(([group, members]) => (
              <section key={group} className="flex flex-col gap-1" aria-label={group}>
                <h3 className="text-[11px] font-semibold text-[var(--color-text-faint)]">
                  {group}
                </h3>
                {members.map((persona) => (
                  <Button
                    key={persona.key}
                    intent="utility"
                    size="block"
                    pressed={activeKeys.has(persona.key)}
                    disabled={switching.isPending}
                    onClick={() => switching.mutate(persona)}
                    className="justify-between"
                  >
                    <span className="truncate">{persona.label}</span>
                    <span className="text-[11px] text-[var(--color-text-muted)]">
                      {activeKeys.has(persona.key)
                        ? "signed in"
                        : persona.signIn === "refused"
                          ? "refused"
                          : lastKeys.has(persona.key)
                            ? "last"
                            : ""}
                    </span>
                  </Button>
                ))}
              </section>
            ))}
          </div>
          <OutcomeMessage outcome={outcome} />
          <div className="flex gap-2">
            <Button
              intent="action"
              size="sm"
              className="flex-1"
              isLoading={signingOut.isPending}
              onClick={() => signingOut.mutate()}
            >
              Sign out all tiers
            </Button>
            <Button intent="utility" onClick={() => setHidden(true)}>
              Hide
            </Button>
          </div>
        </div>
      ) : null}
      <Button
        intent="action"
        size="sm"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full shadow-[var(--shadow-sm)]"
      >
        <span className="max-w-64 truncate">
          {identities.length > 0
            ? identities
                .map(
                  (identity) =>
                    `${TIER_LABEL[identity.audience]} · ${identity.persona?.label ?? identity.name}`,
                )
                .join("  |  ")
            : "Dev · Choose persona"}
        </span>
      </Button>
    </div>
  );
}
