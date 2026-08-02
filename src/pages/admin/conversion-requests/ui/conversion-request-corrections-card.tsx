import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { SearchableSelect, type SearchableSelectOption } from "@/shared/ui/searchable-select";
import type { ConversionRequest } from "../api/conversion-requests";

interface ConversionRequestCorrectionsCardProps {
  request: ConversionRequest;
  planOptions: SearchableSelectOption[];
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
      <CardContent className="flex lg:flex-row flex-col gap-4 p-4">
        <div className="space-y-2 flex-1">
          <p className="text-sm text-[var(--color-text-muted)]">
            Lead and contact corrections belong in the lead workflow. Return here and reload before
            deciding.
          </p>

          <Button intent="action" type="button" onClick={onCorrectLead}>
            Correct lead or contact
          </Button>
        </div>
        <div className="flex-1">
          <div className="space-y-2 mb-4">
            <Label htmlFor="replacement-plan">Replacement plan</Label>

            <div className="mt-1 w-full lg:w-60">
              <SearchableSelect
                id="replacement-plan"
                value={selectedPlanPublicId ?? request.plan.publicId}
                options={planOptions}
                placeholder="Select replacement plan"
                searchPlaceholder="Search plans"
                emptyText="No plans found"
                disabled={isMutating}
                onValueChange={(value) => {
                  if (value !== null && value !== undefined && value !== "") {
                    onPlanChange(value);
                  }
                }}
              />
            </div>
          </div>

          <Button
            intent="action"
            type="button"
            disabled={
              !selectedPlanPublicId ||
              selectedPlanPublicId === request.plan.publicId ||
              isMutating
            }
            isLoading={isChangingPlan}
            onClick={onSavePlan}
          >
            Update selected plan
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
