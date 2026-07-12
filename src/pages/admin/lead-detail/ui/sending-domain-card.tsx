import { HTTPError } from "ky";
import { Check, Clipboard, Copy, Globe2, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { readBackendErrorMessage } from "@/shared/api/error-mapper";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type {
  DnsCheckResult,
  DnsRecordInstruction,
  DnsRecordKind,
  ReadinessReason,
  SendingDomain,
  SendingDomainReadiness,
} from "../api/sending-domain";
import {
  isSendingDomainPermissionError,
  useLeadSendingDomain,
  useLeadSendingDomainReadiness,
  useProvisionLeadSendingDomain,
  useVerifyLeadSendingDomain,
} from "../api/sending-domain";

type ReadinessState = "checking" | "healthy" | "pending" | "failed" | "stale" | "unknown";

const DNS_RECORD_LABELS: Record<DnsRecordKind, string> = {
  OWNERSHIP_TXT: "Domain ownership",
  DKIM: "DKIM signing",
  RETURN_PATH: "Return path",
};

const DNS_CHECK_VARIANTS = {
  PENDING: "warning",
  VERIFIED: "success",
  FAILED: "danger",
} as const;

const READINESS_COPY: Record<
  Exclude<ReadinessReason, "NOT_PROVISIONED">,
  { description: string }
> = {
  NOT_VERIFIED: {
    description: "Publish every DNS record below, then request a verification check.",
  },
  UNHEALTHY: {
    description: "At least one required DNS record is missing or does not match.",
  },
  STALE: {
    description: "The previous check is no longer current. Recheck DNS before converting.",
  },
};

function domainFromWebsite(website: string | null): string {
  if (!website) return "";

  try {
    const url = new URL(/^https?:\/\//i.test(website) ? website : `https://${website}`);
    return url.hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function checkResultFor(
  checkResults: DnsCheckResult[],
  instruction: DnsRecordInstruction,
): DnsCheckResult | undefined {
  return checkResults.find((result) => result.kind === instruction.kind);
}

function readinessStateFor(
  domain: SendingDomain,
  readiness: SendingDomainReadiness | undefined,
  isReadinessPending: boolean,
  isReadinessError: boolean,
): ReadinessState {
  if (isReadinessPending) return "checking";
  if (isReadinessError) return "unknown";
  if (readiness?.reason === "STALE") return "stale";
  if (readiness?.reason === "UNHEALTHY" || domain.status === "FAILED") return "failed";
  if (readiness) {
    return readiness.ready ? "healthy" : "pending";
  }
  if (domain.status === "VERIFIED" && domain.health === "HEALTHY") return "healthy";
  if (domain.status === "PENDING" || domain.status === "UNCONFIGURED") return "pending";
  return "pending";
}

function readinessMeta(state: ReadinessState) {
  switch (state) {
    case "healthy":
      return {
        label: "Ready for conversion",
        variant: "success" as const,
        description: "The Company sending domain is healthy and can authorize conversion.",
      };
    case "failed":
      return {
        label: "Not ready",
        variant: "danger" as const,
        description: "Fix the failed DNS checks, then request verification again.",
      };
    case "stale":
      return {
        label: "Needs a fresh check",
        variant: "warning" as const,
        description: "Refresh the DNS verification before allowing conversion.",
      };
    case "checking":
      return {
        label: "Checking readiness",
        variant: "default" as const,
        description: "Checking the latest sending-domain readiness.",
      };
    case "unknown":
      return {
        label: "Readiness unavailable",
        variant: "warning" as const,
        description: "Refresh the status before allowing conversion.",
      };
    default:
      return {
        label: "Verification pending",
        variant: "warning" as const,
        description: "Publish every DNS record below, then request verification.",
      };
  }
}

function readinessDescription(
  readiness: SendingDomainReadiness | undefined,
  fallback: string,
): string {
  if (!readiness?.reason || readiness.reason === "NOT_PROVISIONED") return fallback;
  return READINESS_COPY[readiness.reason].description;
}

async function readSendingDomainError(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return "Something went wrong. Please try again.";
}

interface ProvisionDomainFormProps {
  defaultDomain: string;
  errorMessage: string | null;
  isPending: boolean;
  onSubmit: (domain: string) => Promise<void>;
}

function ProvisionDomainForm({
  defaultDomain,
  errorMessage,
  isPending,
  onSubmit,
}: ProvisionDomainFormProps) {
  const [domain, setDomain] = useState(defaultDomain);

  return (
    <form
      className="space-y-4 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void onSubmit(domain);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Globe2 size={16} aria-hidden="true" />
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-text)]">
            Set up the Company sending domain
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-text-muted)]">
            Provision the domain the new Company will use for branded email. The DNS instructions
            appear here immediately after setup.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="lead-sending-domain">Company sending domain</Label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            id="lead-sending-domain"
            value={domain}
            onChange={(event) => setDomain(event.target.value)}
            placeholder="mail.example.com"
            autoComplete="url"
            className="min-w-0 flex-1"
          />
          <Button
            intent="action"
            type="submit"
            disabled={!domain.trim()}
            isLoading={isPending}
            leadingIcon={<Globe2 size={14} />}
          >
            Provision domain
          </Button>
        </div>
      </div>

      {errorMessage && (
        <p role="alert" className="text-xs text-[var(--color-danger)]">
          {errorMessage}
        </p>
      )}
    </form>
  );
}

interface CopyFieldProps {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}

function CopyField({ label, value, copied, onCopy }: CopyFieldProps) {
  return (
    <div className="min-w-0 border-s border-[var(--color-border)] ps-3 first:border-s-0 first:ps-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-faint)]">
          {label}
        </span>
        <Button
          variant="ghost"
          size="xs"
          leadingIcon={copied ? <Check size={12} /> : <Copy size={12} />}
          onClick={onCopy}
          aria-label={`Copy ${label.toLowerCase()}`}
          title={`Copy ${label.toLowerCase()}`}
        >
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <code className="mt-1 block break-all text-[12px] text-[var(--color-text)]">{value}</code>
    </div>
  );
}

interface DnsInstructionRowProps {
  instruction: DnsRecordInstruction;
  result: DnsCheckResult | undefined;
  copiedKey: string | null;
  onCopy: (key: string, value: string) => Promise<void>;
}

function DnsInstructionRow({ instruction, result, copiedKey, onCopy }: DnsInstructionRowProps) {
  const status = result?.status ?? "PENDING";
  const checkLabel =
    status === "FAILED" ? (result?.failureDetail ?? "Check failed") : status.toLowerCase();

  return (
    <li className="space-y-3 border-b border-[var(--color-border)] py-4 first:pt-0 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-medium text-[var(--color-text)]">
            {DNS_RECORD_LABELS[instruction.kind]}
          </p>
          <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{instruction.description}</p>
        </div>
        <Badge variant={DNS_CHECK_VARIANTS[status]}>{checkLabel}</Badge>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <CopyField
          label="Host"
          value={instruction.host}
          copied={copiedKey === `${instruction.kind}:host`}
          onCopy={() => onCopy(`${instruction.kind}:host`, instruction.host)}
        />
        <CopyField
          label={`Value · ${instruction.recordType}`}
          value={instruction.value}
          copied={copiedKey === `${instruction.kind}:value`}
          onCopy={() => onCopy(`${instruction.kind}:value`, instruction.value)}
        />
      </div>
    </li>
  );
}

interface SendingDomainCardProps {
  leadPublicId: string;
  leadWebsite: string | null;
}

export function SendingDomainCard({ leadPublicId, leadWebsite }: SendingDomainCardProps) {
  const domainQuery = useLeadSendingDomain(leadPublicId);
  const readinessQuery = useLeadSendingDomainReadiness(leadPublicId);
  const provisionDomain = useProvisionLeadSendingDomain();
  const verifyDomain = useVerifyLeadSendingDomain();
  const [actionError, setActionError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleProvision = async (domain: string) => {
    setActionError(null);
    try {
      await provisionDomain.mutateAsync({ leadPublicId, input: { domain: domain.trim() } });
    } catch (error) {
      setActionError(await readSendingDomainError(error));
    }
  };

  const handleVerify = async () => {
    setActionError(null);
    try {
      await verifyDomain.mutateAsync(leadPublicId);
      await readinessQuery.refetch();
    } catch (error) {
      setActionError(await readSendingDomainError(error));
    }
  };

  const handleRefresh = async () => {
    setActionError(null);
    try {
      const [domainResult, readinessResult] = await Promise.all([
        domainQuery.refetch(),
        readinessQuery.refetch(),
      ]);
      const refreshError = domainResult.error ?? readinessResult.error;
      if (refreshError) {
        setActionError(await readSendingDomainError(refreshError));
      }
    } catch (error) {
      setActionError(await readSendingDomainError(error));
    }
  };

  const handleCopy = async (key: string, value: string) => {
    if (!navigator.clipboard) {
      setActionError(
        "Copying is unavailable in this browser. Select the value and copy it manually.",
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1600);
    } catch {
      setActionError("The value could not be copied. Select it and copy it manually.");
    }
  };

  const isPermissionError =
    isSendingDomainPermissionError(domainQuery.error) ||
    isSendingDomainPermissionError(readinessQuery.error);

  if (domainQuery.isPending || readinessQuery.isPending) {
    return (
      <Card aria-busy="true">
        <CardHeader>
          <CardTitle>Company sending domain</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-xs text-[var(--color-text-muted)]">Loading domain readiness...</p>
        </CardContent>
      </Card>
    );
  }

  if (isPermissionError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company sending domain</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldAlert
            size={18}
            className="mt-0.5 shrink-0 text-[var(--color-warning)]"
            aria-hidden="true"
          />
          <p role="alert" className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            You do not have permission to view sending-domain readiness for this lead.
          </p>
        </CardContent>
      </Card>
    );
  }

  const cannotLoadDomain =
    (domainQuery.isError && !domainQuery.isNotProvisioned) ||
    (!domainQuery.data && readinessQuery.isError && !readinessQuery.isNotProvisioned);

  if (cannotLoadDomain) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Company sending domain</CardTitle>
        </CardHeader>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <p role="alert" className="text-xs leading-relaxed text-[var(--color-text-muted)]">
            We could not load the sending-domain status. Refresh and try again.
          </p>
          <Button
            intent="utility"
            size="xs"
            leadingIcon={<RefreshCw size={12} />}
            onClick={() => void handleRefresh()}
          >
            Refresh
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!domainQuery.data) {
    return (
      <Card>
        <CardHeader className="flex items-center justify-between gap-3">
          <CardTitle>Company sending domain</CardTitle>
          <Badge variant="warning">Not configured</Badge>
        </CardHeader>
        <CardContent>
          <ProvisionDomainForm
            defaultDomain={domainFromWebsite(leadWebsite)}
            errorMessage={actionError}
            isPending={provisionDomain.isPending}
            onSubmit={handleProvision}
          />
        </CardContent>
      </Card>
    );
  }

  const state = readinessStateFor(
    domainQuery.data,
    readinessQuery.data,
    readinessQuery.isPending,
    readinessQuery.isError,
  );
  const meta = readinessMeta(state);
  const readinessReason = readinessQuery.data?.reason;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle>Company sending domain</CardTitle>
            <p className="mt-1 break-all text-[13px] font-medium text-[var(--color-text)]">
              {domainQuery.data.domain}
            </p>
          </div>
          <Badge variant={meta.variant}>{meta.label}</Badge>
        </div>
        <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">
          {readinessDescription(readinessQuery.data, meta.description)}
        </p>
        {readinessReason === "UNHEALTHY" && domainQuery.data.lastFailure && (
          <p className="text-xs text-[var(--color-danger)]">{domainQuery.data.lastFailure}</p>
        )}
        {actionError && (
          <p role="alert" className="text-xs text-[var(--color-danger)]">
            {actionError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            intent="action"
            size="sm"
            leadingIcon={<RefreshCw size={13} />}
            isLoading={verifyDomain.isPending}
            onClick={() => void handleVerify()}
          >
            {domainQuery.data.status === "VERIFIED" ? "Recheck DNS" : "Verify DNS"}
          </Button>
          <Button
            intent="utility"
            size="sm"
            leadingIcon={<RefreshCw size={13} />}
            disabled={domainQuery.isFetching || readinessQuery.isFetching || verifyDomain.isPending}
            onClick={() => void handleRefresh()}
            aria-label="Refresh sending-domain status"
            title="Refresh sending-domain status"
          >
            Refresh status
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="mb-3 flex items-center gap-2">
          <Clipboard size={14} className="text-[var(--color-text-muted)]" aria-hidden="true" />
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Required DNS records
          </h4>
        </div>
        <ul>
          {domainQuery.data.dnsRecords.map((instruction) => (
            <DnsInstructionRow
              key={instruction.kind}
              instruction={instruction}
              result={checkResultFor(domainQuery.data.checkResults, instruction)}
              copiedKey={copiedKey}
              onCopy={handleCopy}
            />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
