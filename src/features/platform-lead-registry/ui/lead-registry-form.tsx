import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import {
  ContractViolation,
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";

type Lead = z.output<(typeof operations.lead.responses)["200"]>["lead"];
interface Props {
  lead?: Lead;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: (publicId: string) => Promise<void>;
}
const readOperations = [
  operations.leads,
  operations.lead,
  operations.eligibility,
  operations.requests,
];
const textFields = ["companyName", "website", "industry", "country", "city"] as const;

export function LeadRegistryForm({ lead, disabled, onPendingChange, onSaved }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const locked = useRef(false);
  const [feedback, setFeedback] = useState<string>();
  const operation = lead ? operations.update : operations.create;
  const available = access.availability(operation.key);
  const userPublicId = access.user?.publicId ?? "";
  const reconcile = () =>
    Promise.all(
      readOperations.map((operation) =>
        queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
      ),
    );
  const mutation = useMutation({
    retry: false,
    mutationFn: async (body: unknown) => {
      if (access.availability(operation.key).state !== "enabled")
        throw new Error("Authority changed");
      const result = lead
        ? await requestPlatformOperation(operations.update, {
            params: { publicId: lead.publicId },
            body,
          })
        : await requestPlatformOperation(operations.create, { body });
      if (lead && result.lead.publicId !== lead.publicId)
        throw new ContractViolation({
          audience: "platform",
          key: operation.key,
          phase: "response",
          status: 200,
        });
      return result;
    },
    onSuccess: async (result) => {
      setFeedback(t("done"));
      await onSaved?.(result.lead.publicId);
    },
    onError: async (error) => {
      const outcome = await recover(error);
      setFeedback(t(`outcome.${outcome.kind}`));
    },
    onSettled: async () => {
      await Promise.all(
        readOperations.map((operation) =>
          queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
        ),
      );
      locked.current = false;
      onPendingChange?.(false);
    },
  });
  if (available.state === "hidden") return null;
  const bodySchema = operations.create.requestSchema.shape.body;
  const statuses = bodySchema.shape.status.options.map((item) => item.value);
  const statusOptions =
    lead && !statuses.some((status) => status === lead.status)
      ? [...statuses, lead.status]
      : statuses;
  const options = (values: readonly string[]) =>
    values.map((value) => ({ value, label: t(`enum.${value}`) }));
  const fields: SchemaField[] = [
    ...textFields.map((name) => ({
      name,
      label: t(`field.${name}`),
      value: lead?.[name] ?? "",
      nullable: !!lead,
    })),
    {
      name: "companySizeRange",
      label: t("field.companySizeRange"),
      required: true,
      value: lead?.companySizeRange ?? "5_TO_20",
      options: options(bodySchema.shape.companySizeRange.options.map((item) => item.value)),
    },
    {
      name: "source",
      label: t("field.source"),
      required: true,
      value: lead?.source ?? "CRM",
      options: options(bodySchema.shape.source.options.map((item) => item.value)),
    },
    {
      name: "status",
      label: t("field.status"),
      required: true,
      value: lead?.status ?? "NEW",
      options: options(statusOptions),
    },
    {
      name: "lostReason",
      label: t("field.lostReason"),
      value: lead?.lostReason ?? "",
      nullable: !!lead,
      options: options([
        "TOO_EXPENSIVE",
        "MISSING_FEATURES",
        "NOT_FIT",
        "COMPETITOR_CHOSEN",
        "NO_BUDGET",
        "NO_DECISION",
        "NO_RESPONSE",
      ]),
    },
  ];
  if (!lead)
    fields.push(
      ...["name", "email", "phone", "jobTitle"].map((name) => ({
        name: `primaryContact.${name}`,
        label: t(`contact.${name}`),
      })),
    );
  return (
    <div className="space-y-3">
      <SchemaForm
        schema={lead ? operations.update.requestSchema.shape.body : bodySchema}
        fields={fields}
        changedOnly={!!lead}
        label={t(lead ? "save" : "create")}
        invalidLabel={t("invalid")}
        disabled={
          disabled || mutation.isPending || mutation.isError || available.state !== "enabled"
        }
        onSubmit={(body) => {
          if (locked.current) return;
          locked.current = true;
          onPendingChange?.(true);
          mutation.mutate(body);
        }}
      />
      {feedback && <p role={mutation.isError ? "alert" : "status"}>{feedback}</p>}
      {mutation.isError && (
        <Button
          intent="action"
          onClick={async () => {
            await reconcile();
            mutation.reset();
          }}
        >
          {t("reconcile")}
        </Button>
      )}
    </div>
  );
}
