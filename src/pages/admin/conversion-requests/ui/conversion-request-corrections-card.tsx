import type { ReactNode } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type { ConversionRequest } from "../api/conversion-requests";

interface ConversionRequestCorrectionsCardProps {
  request: ConversionRequest;
  planOptions: ReactNode;
  selectedPlanPublicId: string;
  isMutating: boolean;
  isChangingPlan: boolean;
  onCorrectLead: () => void;
  onPlanChange: (publicId: string) => void;
  onSavePlan: () => void;
}

export function ConversionRequestCorrectionsCard({
  request,
  planOptions,
  selectedPlanPublicId,
  isMutating,
  isChangingPlan,
  onCorrectLead,
  onPlanChange,
  onSavePlan,
}: ConversionRequestCorrectionsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Correct request data</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <p className="text-sm text-[var(--color-text-muted)]">
          Lead and contact corrections belong in the lead workflow. Return here and reload before
          deciding.
        </p>
        <Button intent="action" onClick={onCorrectLead}>
          Correct lead or contact
        </Button>
        <div>
          <Label htmlFor="replacement-plan">Replacement plan</Label>
          <Select
            value={selectedPlanPublicId || request.plan.publicId}
            onValueChange={onPlanChange}
            disabled={isMutating}
          >
            <SelectTrigger id="replacement-plan" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>{planOptions}</SelectContent>
          </Select>
        </div>
        <Button
          intent="action"
          disabled={
            !selectedPlanPublicId || selectedPlanPublicId === request.plan.publicId || isMutating
          }
          isLoading={isChangingPlan}
          onClick={onSavePlan}
        >
          Update selected plan
        </Button>
      </CardContent>
    </Card>
  );
}
