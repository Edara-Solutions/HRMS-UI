import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { PackageSearch, Plus } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  BILLING_INTERVAL_VALUES,
  isBillingInterval,
  type Plan,
  type PlanPrice,
  readBackendErrorMessage,
  useCreatePlanPrice,
  useDeletePlanPrice,
  usePlanPrices,
  useUpdatePlanPrice,
} from "@/shared/api";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { EmptyState } from "@/shared/ui/empty-state";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  BILLING_INTERVAL_LABEL,
  DEFAULT_INTERVAL_COUNT,
  getPlanPriceMarketLabel,
  KNOWN_BILLING_INTERVALS,
} from "../api/plan-labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const createPriceSchema = z.object({
  currencyCode: z.string().trim().length(3, "Use a 3-letter currency code"),
  amountMinor: z.coerce.number().int().nonnegative("Amount must be zero or greater"),
  billingInterval: z.enum(BILLING_INTERVAL_VALUES),
  intervalCount: z.coerce.number().int().positive("Interval count must be at least 1"),
  countryCode: z
    .string()
    .trim()
    .max(2, "Country code must be 2 letters")
    .optional()
    .or(z.literal("")),
  regionCode: z.string().trim().max(32, "Region code is too long").optional().or(z.literal("")),
  isActive: z.boolean(),
});

const updatePriceSchema = z.object({
  currencyCode: z.string().trim().length(3, "Use a 3-letter currency code"),
  amountMinor: z.coerce.number().int().nonnegative("Amount must be zero or greater"),
  isActive: z.boolean(),
});

type CreatePriceFormData = z.infer<typeof createPriceSchema>;
type UpdatePriceFormData = z.infer<typeof updatePriceSchema>;

interface PlanPricesDialogProps {
  plan: Plan | null;
  onClose: () => void;
}

async function readPlanErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

function toCreateDefaults(): CreatePriceFormData {
  return {
    currencyCode: "",
    amountMinor: 0,
    billingInterval: "monthly",
    intervalCount: DEFAULT_INTERVAL_COUNT,
    countryCode: "",
    regionCode: "",
    isActive: true,
  };
}

export function PlanPricesDialog({ plan, onClose }: PlanPricesDialogProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={plan !== null}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-h-[90vh] max-w-4xl overflow-y-auto"
    >
      {plan && (
        <PlanPricesDialogContent
          key={plan.publicId}
          plan={plan}
          onClose={onClose}
          titleId={titleId}
          descriptionId={descriptionId}
        />
      )}
    </Dialog>
  );
}

interface PlanPricesDialogContentProps {
  plan: Plan;
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function PlanPricesDialogContent({
  plan,
  onClose,
  titleId,
  descriptionId,
}: PlanPricesDialogContentProps) {
  const pricesQuery = usePlanPrices(plan.publicId);
  const createPrice = useCreatePlanPrice();
  const deletePrice = useDeletePlanPrice();
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [deletePriceId, setDeletePriceId] = useState<string | null>(null);

  const {
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreatePriceFormData>({
    resolver: zodResolver(createPriceSchema),
    defaultValues: toCreateDefaults(),
  });

  const createBillingInterval = watch("billingInterval");
  const createIsActive = watch("isActive");
  const prices = pricesQuery.data?.data ?? [];
  const pricePending = createPrice.isPending;

  async function onCreatePrice(data: CreatePriceFormData) {
    try {
      await createPrice.mutateAsync({
        publicId: plan.publicId,
        input: {
          currencyCode: data.currencyCode.toUpperCase(),
          amountMinor: data.amountMinor,
          billingInterval: data.billingInterval,
          intervalCount: data.intervalCount,
          countryCode: data.countryCode?.trim() ? data.countryCode.toUpperCase() : null,
          regionCode: data.regionCode?.trim() ? data.regionCode.trim() : null,
          isActive: data.isActive,
        },
      });
      reset(toCreateDefaults());
    } catch (error) {
      setError("root", { message: await readPlanErrorMessage(error) });
    }
  }

  async function confirmDeletePrice() {
    if (!deletePriceId) return;
    await deletePrice.mutateAsync(deletePriceId);
    setDeletePriceId(null);
  }

  return (
    <div>
      <DialogTitle id={titleId}>Manage prices for {plan.name}</DialogTitle>
      <DialogDescription id={descriptionId}>
        Track default, country, and region pricing in one place. Market and billing combinations
        must stay unique per plan.
      </DialogDescription>

      <div className="mt-6 space-y-5">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Plus size={16} className="text-[var(--color-primary)]" />
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Add price</h3>
          </div>

          <Form onSubmit={handleSubmit(onCreatePrice)}>
            {errors.root?.message && (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
                {errors.root.message}
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 min-[640px]:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="price-currency">Currency</Label>
                <Input
                  id="price-currency"
                  maxLength={3}
                  placeholder="EGP"
                  {...register("currencyCode")}
                />
                {errors.currencyCode && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {errors.currencyCode.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-amount-minor">Amount (minor units)</Label>
                <Input id="price-amount-minor" type="number" min={0} {...register("amountMinor")} />
                {errors.amountMinor && (
                  <p className="text-xs text-[var(--color-danger)]">{errors.amountMinor.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-billing-interval">Billing interval</Label>
                <Select
                  value={createBillingInterval}
                  onValueChange={(value) => {
                    if (isBillingInterval(value)) {
                      setValue("billingInterval", value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                    }
                  }}
                >
                  <SelectTrigger id="price-billing-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent>
                    {KNOWN_BILLING_INTERVALS.map((interval) => (
                      <SelectItem key={interval} value={interval}>
                        {BILLING_INTERVAL_LABEL[interval]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.billingInterval && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {errors.billingInterval.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-interval-count">Interval count</Label>
                <Input
                  id="price-interval-count"
                  type="number"
                  min={1}
                  {...register("intervalCount")}
                />
                {errors.intervalCount && (
                  <p className="text-xs text-[var(--color-danger)]">
                    {errors.intervalCount.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-country">Country code</Label>
                <Input
                  id="price-country"
                  maxLength={2}
                  placeholder="EG"
                  {...register("countryCode")}
                />
                {errors.countryCode && (
                  <p className="text-xs text-[var(--color-danger)]">{errors.countryCode.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="price-region">Region code</Label>
                <Input id="price-region" placeholder="MENA" {...register("regionCode")} />
                {errors.regionCode && (
                  <p className="text-xs text-[var(--color-danger)]">{errors.regionCode.message}</p>
                )}
              </div>

              <div className="space-y-2 xl:col-span-2">
                <p className="text-sm font-medium text-[var(--color-text)]">Status</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    pressed={createIsActive}
                    onClick={() => setValue("isActive", true, { shouldDirty: true })}
                  >
                    Active
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    pressed={!createIsActive}
                    onClick={() => setValue("isActive", false, { shouldDirty: true })}
                  >
                    Inactive
                  </Button>
                </div>
              </div>
            </div>

            <p className="text-xs text-[var(--color-text-faint)]">
              Use country or region when the price should override the default fallback. Leave both
              blank for the fallback row.
            </p>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button intent="cta" type="submit" disabled={pricePending} isLoading={pricePending}>
                Add price
              </Button>
            </div>
          </Form>
        </Card>

        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-[var(--color-text)]">Existing prices</h3>
            <span className="text-xs text-[var(--color-text-muted)]">{prices.length} total</span>
          </div>

          {pricesQuery.isPending ? (
            <Card className="p-8 text-center text-sm text-[var(--color-text-muted)]">
              Loading plan prices…
            </Card>
          ) : pricesQuery.isError ? (
            <Card className="p-8 text-center text-sm text-[var(--color-danger)]">
              Couldn't load plan prices right now.
            </Card>
          ) : prices.length === 0 ? (
            <Card>
              <EmptyState
                icon={PackageSearch}
                title="No prices configured"
                description="Create a fallback, country, or region price to make the plan selectable in a market."
              />
            </Card>
          ) : (
            <div className="grid gap-3">
              {prices.map((price) => (
                <PlanPriceRow
                  key={price.publicId}
                  price={price}
                  isEditing={editingPriceId === price.publicId}
                  onStartEdit={() => setEditingPriceId(price.publicId)}
                  onCancelEdit={() => setEditingPriceId(null)}
                  onDelete={() => setDeletePriceId(price.publicId)}
                  onSaved={() => setEditingPriceId(null)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={deletePriceId !== null}
        title="Delete price"
        description="This soft-deletes the price row and removes it from normal plan reads."
        confirmLabel="Delete price"
        isLoading={deletePrice.isPending}
        onConfirm={() => void confirmDeletePrice()}
        onClose={() => setDeletePriceId(null)}
      />
    </div>
  );
}

interface PlanPriceRowProps {
  price: PlanPrice;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onSaved: () => void;
}

function PlanPriceRow({
  price,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onDelete,
  onSaved,
}: PlanPriceRowProps) {
  const updatePrice = useUpdatePlanPrice();
  const {
    handleSubmit,
    register,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdatePriceFormData>({
    resolver: zodResolver(updatePriceSchema),
    defaultValues: {
      currencyCode: price.money.currencyCode,
      amountMinor: price.money.amountMinor,
      isActive: price.isActive,
    },
  });

  const isActive = watch("isActive");

  async function onSubmit(data: UpdatePriceFormData) {
    try {
      await updatePrice.mutateAsync({
        pricePublicId: price.publicId,
        input: {
          currencyCode: data.currencyCode.toUpperCase(),
          amountMinor: data.amountMinor,
          isActive: data.isActive,
        },
      });
      onSaved();
    } catch (error) {
      setError("root", { message: await readPlanErrorMessage(error) });
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-[var(--color-text)]">
              {price.money.formattedAmount}
            </p>
            <Badge variant={price.isActive ? "success" : "default"}>
              {price.isActive ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="default">{getPlanPriceMarketLabel(price)}</Badge>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-text-muted)]">
            <span>{BILLING_INTERVAL_LABEL[price.billingInterval] ?? price.billingInterval}</span>
            <span>Every {price.intervalCount}</span>
            <span>{price.money.currencyCode}</span>
            <span>Minor units: {price.money.amountMinor}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button intent="utility" type="button" onClick={isEditing ? onCancelEdit : onStartEdit}>
            {isEditing ? "Cancel" : "Edit"}
          </Button>
          <Button intent="destructive-trigger" type="button" onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>

      {isEditing && (
        <Form
          onSubmit={handleSubmit(onSubmit)}
          className="mt-4 border-t border-[var(--color-border)] pt-4"
        >
          {errors.root?.message && (
            <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {errors.root.message}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 min-[560px]:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor={`price-edit-currency-${price.publicId}`}>Currency</Label>
              <Input
                id={`price-edit-currency-${price.publicId}`}
                maxLength={3}
                {...register("currencyCode")}
              />
              {errors.currencyCode && (
                <p className="text-xs text-[var(--color-danger)]">{errors.currencyCode.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`price-edit-amount-${price.publicId}`}>Amount (minor units)</Label>
              <Input
                id={`price-edit-amount-${price.publicId}`}
                type="number"
                min={0}
                {...register("amountMinor")}
              />
              {errors.amountMinor && (
                <p className="text-xs text-[var(--color-danger)]">{errors.amountMinor.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-text)]">Status</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  pressed={isActive}
                  onClick={() => setValue("isActive", true, { shouldDirty: true })}
                >
                  Active
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  pressed={!isActive}
                  onClick={() => setValue("isActive", false, { shouldDirty: true })}
                >
                  Inactive
                </Button>
              </div>
            </div>
          </div>

          <p className="text-xs text-[var(--color-text-faint)]">
            Market and billing fields are fixed on the existing record. If you need a different
            combination, delete it and add a new price row.
          </p>

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button intent="dismissive" type="button" onClick={onCancelEdit}>
              Cancel
            </Button>
            <Button
              intent="cta"
              type="submit"
              disabled={updatePrice.isPending}
              isLoading={updatePrice.isPending}
            >
              Save price
            </Button>
          </div>
        </Form>
      )}
    </Card>
  );
}
