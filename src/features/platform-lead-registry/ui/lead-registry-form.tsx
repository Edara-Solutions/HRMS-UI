import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import {
  ContractViolation,
  platformLeadOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { CountrySelect } from "@/shared/ui/country-select";
import { Label } from "@/shared/ui/label";
import { type SchemaField, SchemaForm } from "@/shared/ui/schema-form";
import { StateSelect } from "@/shared/ui/state-select";
import { editableLeadStatuses } from "../model/status-transitions";

type Lead = z.output<(typeof operations.lead.responses)["200"]>["lead"];
interface Props {
  lead?: Lead;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
  onSaved?: (publicId: string) => Promise<void>;
  onCancel?: () => void;
}
const readOperations = [
  operations.leads,
  operations.lead,
  operations.eligibility,
  operations.requests,
];
const textFields = ["companyName", "website", "industry"] as const;

export function LeadRegistryForm({ lead, disabled, onPendingChange, onSaved, onCancel }: Props) {
  const { t } = useTranslation("platform-leads");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const locked = useRef(false);
  const locationId = useId();
  const [country, setCountry] = useState(lead?.country ?? "");
  const [state, setState] = useState(lead?.city ?? "");
  const [feedback, setFeedback] = useState<string>();
  const [duplicate, setDuplicate] = useState<z.output<
    (typeof operations.create.responses)[201]
  > | null>(null);
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
      const created = !lead ? operations.create.responses[201].safeParse(result) : null;
      if (created?.success && created.data.meta.duplicate) {
        setDuplicate(created.data);
        return;
      }
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
  const createFormSchema = z
    .preprocess((value) => {
      if (!value || typeof value !== "object") return value;
      const input = Object.fromEntries(Object.entries(value));
      const primaryContact = input.primaryContact;
      return {
        ...input,
        status: "NEW",
        primaryContact:
          primaryContact && typeof primaryContact === "object"
            ? { ...primaryContact, isPrimary: true }
            : primaryContact,
      };
    }, bodySchema)
    .superRefine((value, context) => {
      if (!value.primaryContact?.name?.trim())
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["primaryContact", "name"],
          message: t("contact.nameRequired"),
        });
    });
  const updateFormSchema = operations.update.requestSchema.shape.body.superRefine(
    (body, context) => {
      if ((body.status ?? lead?.status) === "LOST" && !(body.lostReason ?? lead?.lostReason)) {
        context.addIssue({ code: "custom", path: ["lostReason"], message: t("invalid") });
      }
    },
  );
  const options = (values: readonly string[]) =>
    values.map((value) => ({ value, label: t(`enum.${value}`) }));
  const formDisabled =
    !!disabled || mutation.isPending || mutation.isError || available.state !== "enabled";
  const changeCountry = (next: string) => {
    if (next === country) return;
    setCountry(next);
    setState("");
  };
  const fields: SchemaField[] = [
    ...textFields.map((name) => ({
      name,
      label: t(`field.${name}`),
      value: lead?.[name] ?? "",
      nullable: !!lead,
      ...(name === "companyName" ? { section: t("section.company") } : {}),
    })),
    {
      name: "country",
      label: t("field.country"),
      value: lead?.country ?? "",
      nullable: !!lead,
      control: (
        <div className="space-y-1.5">
          <Label htmlFor={`${locationId}-country`}>{t("field.country")}</Label>
          <input type="hidden" name="country" value={country} />
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <CountrySelect
                id={`${locationId}-country`}
                value={country}
                onValueChange={changeCountry}
                disabled={formDisabled}
                placeholder={t("location.selectCountry")}
                loadingPlaceholder={t("location.loadingCountries")}
                unavailablePlaceholder={t("location.noCountries")}
                searchPlaceholder={t("location.searchCountries")}
                emptyMessage={t("location.noCountries")}
              />
            </div>
            {country && (
              <Button
                intent="utility"
                size="iconSm"
                aria-label={t("location.clearCountry")}
                title={t("location.clearCountry")}
                disabled={formDisabled}
                onClick={() => changeCountry("")}
              >
                <X aria-hidden="true" size={15} />
              </Button>
            )}
          </div>
        </div>
      ),
    },
    {
      name: "city",
      label: t("location.state"),
      value: lead?.city ?? "",
      nullable: !!lead,
      control: (
        <div className="space-y-1.5">
          <Label htmlFor={`${locationId}-state`}>{t("location.state")}</Label>
          <input type="hidden" name="city" value={state} />
          <div className="flex items-center gap-1">
            <div className="min-w-0 flex-1">
              <StateSelect
                key={country}
                id={`${locationId}-state`}
                country={country}
                value={state}
                onValueChange={setState}
                disabled={formDisabled}
                placeholder={t(country ? "location.selectState" : "location.chooseCountryFirst")}
                loadingPlaceholder={t("location.loadingStates")}
                unavailablePlaceholder={t("location.noStates")}
                searchPlaceholder={t("location.searchStates")}
                emptyMessage={t("location.noStates")}
              />
            </div>
            {state && (
              <Button
                intent="utility"
                size="iconSm"
                aria-label={t("location.clearState")}
                title={t("location.clearState")}
                disabled={formDisabled}
                onClick={() => setState("")}
              >
                <X aria-hidden="true" size={15} />
              </Button>
            )}
          </div>
        </div>
      ),
    },
    {
      name: "companySizeRange",
      label: t("field.companySizeRange"),
      required: true,
      value: lead?.companySizeRange ?? "5_TO_20",
      options: options(bodySchema.shape.companySizeRange.options.map((item) => item.value)),
      section: t("section.qualification"),
    },
    {
      name: "source",
      label: t("field.source"),
      required: true,
      value: lead?.source ?? "CRM",
      options: options(bodySchema.shape.source.options.map((item) => item.value)),
    },
    ...(lead
      ? [
          {
            name: "status",
            label: t("field.status"),
            required: true,
            value: lead.status,
            options: options(editableLeadStatuses(lead.status)),
          },
          {
            name: "lostReason",
            label: t("field.lostReason"),
            value: lead.lostReason ?? "",
            nullable: true,
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
        ]
      : []),
  ];
  if (!lead)
    fields.push(
      ...["name", "email", "phone", "jobTitle"].map((name) => ({
        name: `primaryContact.${name}`,
        label: t(`contact.${name}`),
        ...(name === "name" ? { section: t("section.contact") } : {}),
      })),
    );
  if (duplicate)
    return (
      <div className="mt-5 space-y-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-success)] bg-[var(--color-success-soft)] p-4">
          <output className="block font-semibold">{t("duplicate.title")}</output>
          <p className="mt-2 text-sm">{t("duplicate.description")}</p>
          <p className="mt-2 font-medium" dir="auto">
            {duplicate.lead.companyName ?? t("unnamed")}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {t("attempts", { count: duplicate.lead.numberOfAttempts })}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {onCancel && (
            <Button intent="dismissive" onClick={onCancel}>
              {t("cancel")}
            </Button>
          )}
          <Button intent="cta" onClick={() => void onSaved?.(duplicate.lead.publicId)}>
            {t("duplicate.view")}
          </Button>
        </div>
      </div>
    );
  return (
    <div className="space-y-3">
      <SchemaForm
        schema={lead ? updateFormSchema : createFormSchema}
        fields={fields}
        changedOnly={!!lead}
        label={t(lead ? "save" : "create")}
        cancelLabel={t("cancel")}
        onCancel={onCancel}
        cancelDisabled={mutation.isPending}
        invalidLabel={t("invalid")}
        disabled={formDisabled}
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
