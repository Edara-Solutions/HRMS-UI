import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import type { z } from "zod";
import {
  ContractViolation,
  platformCompanyOperations as operations,
  platformQueryKey,
  requestPlatformOperation,
  usePlatformAccess,
  usePlatformMutationRecovery,
} from "@/shared/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

const fields = ["name", "logo", "website", "phoneNumber", "country", "addressLine"] as const;
const readOperations = [
  operations.company,
  operations.companies,
  operations.cursor,
  operations.policy,
  operations.activation,
  operations.subscription,
  operations.commercial,
];
// Derive the editable subset; registry isActive remains read-only.
const schema = operations.create.requestSchema.shape.body.omit({
  isActive: true,
  companyCode: true,
});
type Values = z.input<typeof schema>;
interface RegistryFormProps {
  company?: Values & { publicId: string };
  onSaved?: (publicId: string) => Promise<void>;
  disabled?: boolean;
  onPendingChange?: (pending: boolean) => void;
}

/** Safe registry fields are the same interaction in create and edit. */
export function RegistryForm({
  company,
  onSaved,
  disabled = false,
  onPendingChange,
}: RegistryFormProps) {
  const { t } = useTranslation("platform-companies");
  const access = usePlatformAccess();
  const recover = usePlatformMutationRecovery();
  const queryClient = useQueryClient();
  const userPublicId = access.user?.publicId ?? "";
  const [failure, setFailure] = useState<string | null>(null);
  const locked = useRef(false);
  const operation = company ? operations.update : operations.create;
  const available = access.availability(operation.key);
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: company?.name ?? "",
      logo: company?.logo ?? "",
      website: company?.website ?? "",
      phoneNumber: company?.phoneNumber ?? "",
      country: company?.country ?? "",
      addressLine: company?.addressLine ?? "",
    },
  });
  const { dirtyFields } = form.formState;
  const reconcile = () =>
    Promise.all(
      readOperations.map((operation) =>
        queryClient.invalidateQueries({ queryKey: platformQueryKey(userPublicId, operation) }),
      ),
    );
  const mutation = useMutation({
    retry: false,
    mutationFn: async (values: Values) => {
      // Construct the body explicitly; no lifecycle, ownership, policy or credential may enter it.
      const body = {
        name: values.name,
        logo: values.logo || null,
        website: values.website || null,
        phoneNumber: values.phoneNumber,
        country: values.country,
        addressLine: values.addressLine || null,
      };
      const dirty = dirtyFields;
      const update = {
        ...(dirty.name ? { name: body.name } : {}),
        ...(dirty.logo ? { logo: body.logo } : {}),
        ...(dirty.website ? { website: body.website } : {}),
        ...(dirty.phoneNumber ? { phoneNumber: body.phoneNumber } : {}),
        ...(dirty.country ? { country: body.country } : {}),
        ...(dirty.addressLine ? { addressLine: body.addressLine } : {}),
      };
      if (access.availability(operation.key).state !== "enabled")
        throw new Error("Authority changed");
      const result = company
        ? await requestPlatformOperation(operations.update, {
            params: { publicId: company.publicId },
            body: update,
          })
        : await requestPlatformOperation(operations.create, { body });
      if (company && result.publicId !== company.publicId)
        throw new ContractViolation({
          audience: "platform",
          key: operations.update.key,
          status: 200,
          phase: "response",
        });
      return result;
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
    onSuccess: async (result) => {
      await onSaved?.(result.publicId);
      form.reset({
        name: result.name,
        logo: result.logo ?? "",
        website: result.website ?? "",
        phoneNumber: result.phoneNumber,
        country: result.country,
        addressLine: result.addressLine ?? "",
      });
    },
    onError: async (error) => {
      const outcome = await recover(error);
      if (outcome.kind === "invalid") {
        const rejected = new Set(outcome.fields);
        for (const field of fields)
          if (rejected.has(field)) form.setError(field, { message: "rejected" });
      }
      setFailure(t(`outcome.${outcome.kind}`));
    },
  });
  if (available.state === "hidden") return null;
  return (
    <form
      className="grid gap-4 sm:grid-cols-2"
      noValidate
      onSubmit={form.handleSubmit((values) => {
        if (locked.current || disabled || available.state !== "enabled" || mutation.isError) return;
        locked.current = true;
        setFailure(null);
        onPendingChange?.(true);
        mutation.mutate(values);
      })}
    >
      {fields.map((field) => (
        <div key={field} className="space-y-1.5">
          <Label htmlFor={`registry-${field}`}>{t(`field.${field}`)}</Label>
          <Input
            id={`registry-${field}`}
            {...form.register(field)}
            aria-invalid={!!form.formState.errors[field]}
            disabled={disabled || mutation.isPending || available.state === "disabled"}
          />
          {form.formState.errors[field] && (
            <p role="alert" className="text-xs text-[var(--color-danger)]">
              {t("invalid")}
            </p>
          )}
        </div>
      ))}
      {failure && (
        <p role="alert" className="sm:col-span-2">
          {failure}
        </p>
      )}
      <Button
        type="submit"
        intent="cta"
        disabled={
          disabled || mutation.isPending || available.state !== "enabled" || mutation.isError
        }
        isLoading={mutation.isPending}
      >
        {t(company ? "save" : "create")}
      </Button>
      {mutation.isError && (
        <Button
          intent="action"
          onClick={async () => {
            await reconcile();
            mutation.reset();
            setFailure(null);
          }}
        >
          {t("reconcile")}
        </Button>
      )}
    </form>
  );
}
