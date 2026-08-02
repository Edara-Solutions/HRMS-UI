import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { DateTimePicker } from "@/shared/ui/date-time-picker";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { SETUP_STEP_TYPES, type SetupStepType } from "../api/conversion-requests";
import { type CustomStepDraft, SETUP_STEP_LABEL } from "../model/conversion-request-review";

interface ConversionRequestApprovalSetupCardProps {
  templateKey: string;
  stepToAdd: SetupStepType;
  customSteps: CustomStepDraft[];
  trialEndDate: string;
  isMutating: boolean;
  isApproving: boolean;
  onTemplateChange: (templateKey: string) => void;
  onStepToAddChange: (stepType: SetupStepType) => void;
  onAddStep: () => void;
  onUpdateStep: (index: number, update: Partial<CustomStepDraft>) => void;
  onRemoveStep: (stepType: SetupStepType) => void;
  onTrialEndDateChange: (value: string) => void;
  onApprove: () => void;
}

export function ConversionRequestApprovalSetupCard({
  templateKey,
  stepToAdd,
  customSteps,
  trialEndDate,
  isMutating,
  isApproving,
  onTemplateChange,
  onStepToAddChange,
  onAddStep,
  onUpdateStep,
  onRemoveStep,
  onTrialEndDateChange,
  onApprove,
}: ConversionRequestApprovalSetupCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Approval setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 p-4">
        <div>
          <Label htmlFor="approval-template">Setup selection</Label>
          <Select value={templateKey} onValueChange={onTemplateChange} disabled={isMutating}>
            <SelectTrigger id="approval-template" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Preset 1</SelectItem>
              <SelectItem value="2">Preset 2</SelectItem>
              <SelectItem value="3">Preset 3</SelectItem>
              <SelectItem value="custom">Custom setup</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {templateKey === "custom" && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Select
                value={stepToAdd}
                onValueChange={(value) => {
                  const step = SETUP_STEP_TYPES.find((item) => item === value);
                  if (step) onStepToAddChange(step);
                }}
              >
                <SelectTrigger aria-label="Setup step to add">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SETUP_STEP_TYPES.map((step) => (
                    <SelectItem key={step} value={step}>
                      {SETUP_STEP_LABEL[step]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button intent="action" leadingIcon={<Plus size={13} />} onClick={onAddStep}>
                Add step
              </Button>
            </div>
            {customSteps.map((step, index) => (
              <div
                key={step.stepType}
                className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] p-3 sm:grid-cols-[1fr_110px_1fr_auto]"
              >
                <div>
                  <p className="text-sm font-medium">{SETUP_STEP_LABEL[step.stepType]}</p>
                  <label className="mt-2 flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={step.isRequired}
                      onChange={(event) =>
                        onUpdateStep(index, { isRequired: event.target.checked })
                      }
                    />
                    Required
                  </label>
                </div>
                <div>
                  <Label htmlFor={`sequence-${step.stepType}`}>Sequence</Label>
                  <Input
                    id={`sequence-${step.stepType}`}
                    type="number"
                    min="1"
                    value={step.sequence}
                    onChange={(event) => onUpdateStep(index, { sequence: event.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`dependencies-${step.stepType}`}>Dependencies</Label>
                  <Input
                    id={`dependencies-${step.stepType}`}
                    placeholder="SET_COMPANY_PROFILE"
                    value={step.dependencies}
                    onChange={(event) => onUpdateStep(index, { dependencies: event.target.value })}
                  />
                </div>
                <Button
                  intent="utility"
                  aria-label={`Remove ${SETUP_STEP_LABEL[step.stepType]}`}
                  onClick={() => onRemoveStep(step.stepType)}
                >
                  <Trash2 size={13} />
                </Button>
              </div>
            ))}
          </div>
        )}
        <DateTimePicker
          id="approval-trial-end"
          label="Trial end date (optional)"
          value={trialEndDate || undefined}
          onChange={(value) => onTrialEndDateChange(value ?? "")}
          boundary="to"
          disabled={isMutating}
        />
        <Button intent="cta" disabled={isMutating} isLoading={isApproving} onClick={onApprove}>
          Approve and provision
        </Button>
      </CardContent>
    </Card>
  );
}
