import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Badge } from "@/shared/ui/badge";

type StatusTone = "default" | "primary" | "success" | "warning" | "danger" | "info";

interface StatusToneGroup {
  tone: StatusTone;
  statuses: ReadonlyArray<string>;
}

const STATUS_TONE_GROUPS: ReadonlyArray<StatusToneGroup> = [
  {
    tone: "success",
    statuses: ["ACTIVE", "APPROVED", "SUCCEEDED", "VERIFIED", "WON_CONVERTED", "REJOINED"],
  },
  {
    tone: "primary",
    statuses: ["QUALIFIED", "DEMO_SCHEDULED", "TRIAL_STARTED"],
  },
  {
    tone: "warning",
    statuses: [
      "PENDING",
      "WAITING_QUOTATION",
      "QUOTATION_SENT",
      "NEGOTIATION",
      "FAILED_RETRYABLE",
      "ONBOARDING",
      "BLOCKED",
      "SUSPENDED",
    ],
  },
  {
    tone: "danger",
    statuses: [
      "REJECTED",
      "LOST",
      "EXHAUSTED",
      "FAILED",
      "CLOSED",
      "INACTIVE",
      "DISABLED",
      "NOT_QUALIFIED",
      "NOT_INTERESTED",
      "WRONG_NUMBER",
      "NO_ANSWER",
    ],
  },
  {
    tone: "info",
    statuses: ["CONTACTED", "FOLLOWING_UP", "IN_PROGRESS"],
  },
];

function getStatusTone(status: string): StatusTone {
  for (const group of STATUS_TONE_GROUPS) {
    if (group.statuses.includes(status)) return group.tone;
  }

  return "default";
}

function isKnownStatus(status: string): boolean {
  return STATUS_TONE_GROUPS.some((group) => group.statuses.includes(status));
}

function formatKnownStatusLabel(status: string): string {
  return status
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatUnknownStatusLabel(status: string): string {
  return status.toLowerCase().replaceAll("_", " ");
}

export interface StatusProps {
  status: string;
  label?: ReactNode;
  className?: string;
}

export function Status({ status, label, className }: StatusProps) {
  return (
    <Badge variant={getStatusTone(status)} className={cn(className)}>
      {label ??
        (isKnownStatus(status) ? formatKnownStatusLabel(status) : formatUnknownStatusLabel(status))}
    </Badge>
  );
}
