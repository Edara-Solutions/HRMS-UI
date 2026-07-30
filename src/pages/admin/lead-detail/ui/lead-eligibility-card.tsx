import { RefreshCw } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import type { LeadConversionEligibility } from "../api/lead-detail";

interface LeadEligibilityCardProps {
  data: LeadConversionEligibility | undefined;
  isPending: boolean;
  isError: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function LeadEligibilityCard({
  data,
  isPending,
  isError,
  isRefreshing,
  onRefresh,
}: LeadEligibilityCardProps) {
  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle>Conversion eligibility</CardTitle>
        <Button
          intent="utility"
          leadingIcon={<RefreshCw size={13} />}
          disabled={isRefreshing}
          isLoading={isRefreshing}
          onClick={onRefresh}
        >
          Refresh eligibility
        </Button>
      </CardHeader>
      <CardContent className="p-4" aria-live="polite">
        {isPending ? (
          <p className="text-sm text-[var(--color-text-muted)]">Checking eligibility...</p>
        ) : isError || !data ? (
          <p className="text-sm text-[var(--color-danger)]">
            Eligibility is unavailable. Refresh before continuing.
          </p>
        ) : data.isEligible ? (
          <p className="text-sm font-medium text-[var(--color-success)]">
            This lead is eligible for conversion.
          </p>
        ) : (
          <div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              Resolve every blocker before conversion:
            </p>
            <ul className="mt-2 list-disc space-y-1 ps-5 text-sm text-[var(--color-danger)]">
              {data.reasons.map((reason) => (
                <li key={reason.code}>{reason.message}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
