import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { delegatedCompanyOperations as operations } from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Skeleton } from "@/shared/ui/skeleton";
import {
  buildCorrection,
  type CorrectionFormValues,
  correctionFields,
  correctionFormSchema,
  type DelegatedEmployee,
  isCorrectionField,
  toCorrectionForm,
} from "../model/employee-correction";
import type { AccessSessionWorkspace } from "../model/use-access-session-workspace";
import { useDelegatedCommand } from "../model/use-delegated-command";
import { CommandFeedback } from "./command-feedback";
import { TextField } from "./text-field";

const ltrFields = new Set(["phone", "photoUrl"]);

interface EmployeeCorrectionDialogProps {
  employee: DelegatedEmployee | null;
  workspace: AccessSessionWorkspace;
  onClose: () => void;
}

export function EmployeeCorrectionDialog({
  employee,
  workspace,
  onClose,
}: EmployeeCorrectionDialogProps) {
  const { t } = useTranslation("platform-access-session");
  const { titleId, descriptionId } = useDialogIds();
  const command = useDelegatedCommand(workspace);
  const { data, isPending, isError } = useQuery({
    ...workspace.delegated.user(employee?.publicId ?? ""),
    enabled: employee !== null,
  });
  const close = () => {
    if (command.pending) return;
    command.clearFeedback();
    onClose();
  };

  return (
    <Dialog
      open={employee !== null}
      onClose={close}
      dismissible={!command.pending}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      <DialogTitle id={titleId}>{t("correction.title")}</DialogTitle>
      <DialogDescription id={descriptionId}>{t("correction.description")}</DialogDescription>
      {isPending ? (
        <output className="mt-4 block space-y-3" aria-label={t("loading")}>
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
        </output>
      ) : isError ? (
        <p role="alert" className="mt-4 text-sm">
          {t("correction.unavailable")}
        </p>
      ) : (
        <CorrectionForm
          key={data.updatedAt}
          employee={data}
          workspace={workspace}
          command={command}
          onCancel={close}
        />
      )}
    </Dialog>
  );
}

interface CorrectionFormProps {
  employee: DelegatedEmployee;
  workspace: AccessSessionWorkspace;
  command: ReturnType<typeof useDelegatedCommand>;
  onCancel: () => void;
}

function CorrectionForm({ employee, workspace, command, onCancel }: CorrectionFormProps) {
  const { t } = useTranslation("platform-access-session");
  const form = useForm<CorrectionFormValues>({
    resolver: zodResolver(correctionFormSchema),
    defaultValues: toCorrectionForm(employee),
  });
  const enabled =
    workspace.availability(operations.updateUser).state === "enabled" && !command.pending;

  async function submit(values: CorrectionFormValues) {
    const correction = buildCorrection(values, form.formState.dirtyFields);
    if (Object.keys(correction).length === 0) return;
    const saved = await command.run(
      () => workspace.commands.correctEmployee(employee.publicId, correction),
      {
        activity: "employeeCorrected",
        refresh: [workspace.delegated.root],
        onInvalid: (fields) => {
          for (const field of fields)
            if (isCorrectionField(field)) form.setError(field, { message: "rejected" });
        },
      },
    );
    if (saved) form.reset(toCorrectionForm(saved));
  }

  return (
    <form noValidate className="mt-4 space-y-4" onSubmit={form.handleSubmit(submit)}>
      <p className="text-sm text-[var(--color-text-muted)]">
        <span dir="ltr">{employee.employeeCode}</span> · <span dir="ltr">{employee.email}</span>
      </p>
      {correctionFields.map((name) => (
        <TextField
          key={name}
          id={`correction-${name}`}
          label={t(`correction.field.${name}`)}
          error={form.formState.errors[name]?.message}
          ltr={ltrFields.has(name)}
          disabled={!enabled}
          registration={form.register(name)}
        />
      ))}
      <CommandFeedback feedback={command.feedback} />
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" intent="dismissive" disabled={command.pending} onClick={onCancel}>
          {t("cancel")}
        </Button>
        <Button
          type="submit"
          intent="cta"
          disabled={!enabled || !form.formState.isDirty}
          isLoading={command.pending}
        >
          {t("correction.save")}
        </Button>
      </div>
    </form>
  );
}
