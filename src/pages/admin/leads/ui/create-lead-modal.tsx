import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { type ReactNode, useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { GetCountries, GetState } from "react-country-state-city/dist/cjs/index.js";
import type { Country, State } from "react-country-state-city/dist/cjs/types/index";
import { z } from "zod";
import { readBackendErrorMessage } from "@/shared/api";
import { asZodEnumValues } from "@/shared/lib/zod-enum";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogDescription, DialogTitle, useDialogIds } from "@/shared/ui/dialog";
import { Form } from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { ALL_SIZES, ALL_SOURCES, SIZE_LABEL, SOURCE_LABEL } from "../api/lead-labels";
import { useCreateLead } from "../api/leads";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readCreateErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const createLeadFormSchema = z.object({
  companyName: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  companySizeRange: z.enum(asZodEnumValues(ALL_SIZES)),
  country: z.string().optional(),
  state: z.string().optional(),
  source: z.enum(asZodEnumValues(ALL_SOURCES)),
  contactName: z.string().min(1, "Primary contact name is required"),
  contactEmail: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  contactPhone: z.string().optional(),
  contactJobTitle: z.string().optional(),
});

type CreateLeadFormData = z.infer<typeof createLeadFormSchema>;

interface SearchableSelectOption {
  value: string;
  label: ReactNode;
  searchText: string;
}

interface SearchableSelectContentProps {
  options: SearchableSelectOption[];
  searchPlaceholder: string;
  emptyMessage: string;
}

function normalizeSearchValue(value: string): string {
  return value.trim().toLowerCase();
}

function SearchableSelectContent({
  options,
  searchPlaceholder,
  emptyMessage,
}: SearchableSelectContentProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = normalizeSearchValue(query);
  const filteredOptions = normalizedQuery
    ? options.filter((option) => normalizeSearchValue(option.searchText).includes(normalizedQuery))
    : options;

  return (
    <SelectContent>
      <div className="sticky top-0 z-10 bg-[var(--color-surface)] p-1">
        <Input
          aria-label={searchPlaceholder}
          className="h-8"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          placeholder={searchPlaceholder}
        />
      </div>

      {filteredOptions.length > 0 ? (
        filteredOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))
      ) : (
        <div className="px-2.5 py-2 text-[13px] text-[var(--color-text-muted)]">{emptyMessage}</div>
      )}
    </SelectContent>
  );
}

interface CreateLeadModalProps {
  open: boolean;
  onClose: () => void;
}

export function CreateLeadModal({ open, onClose }: CreateLeadModalProps) {
  const { titleId, descriptionId } = useDialogIds();

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId={titleId}
      descriptionId={descriptionId}
      className="max-w-lg"
    >
      {open && (
        <CreateLeadModalContent onClose={onClose} titleId={titleId} descriptionId={descriptionId} />
      )}
    </Dialog>
  );
}

interface CreateLeadModalContentProps {
  onClose: () => void;
  titleId: string;
  descriptionId: string;
}

function CreateLeadModalContent({ onClose, titleId, descriptionId }: CreateLeadModalContentProps) {
  const createLead = useCreateLead();
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [isCountryLoading, setIsCountryLoading] = useState(true);
  const [isStateLoading, setIsStateLoading] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateLeadFormData>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: {
      companyName: "",
      website: "",
      industry: "",
      companySizeRange: ALL_SIZES[0],
      country: "",
      state: "",
      source: ALL_SOURCES[0],
      contactName: "",
      contactEmail: "",
      contactPhone: "",
      contactJobTitle: "",
    },
  });

  const selectedCountry = watch("country");
  useEffect(() => {
    let isActive = true;

    setIsCountryLoading(true);
    GetCountries()
      .then((nextCountries) => {
        if (isActive) setCountries(nextCountries);
      })
      .catch(() => {
        if (isActive) setCountries([]);
      })
      .finally(() => {
        if (isActive) setIsCountryLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    const country = countries.find((item) => item.name === selectedCountry);
    if (!country) {
      setStates([]);
      return;
    }

    let isActive = true;

    setIsStateLoading(true);
    GetState(country.id)
      .then((nextStates) => {
        if (isActive) setStates(nextStates);
      })
      .catch(() => {
        if (isActive) setStates([]);
      })
      .finally(() => {
        if (isActive) setIsStateLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [countries, selectedCountry]);


  async function onSubmit(data: CreateLeadFormData) {
    try {
      await createLead.mutateAsync({
        companyName: data.companyName || undefined,
        website: data.website || undefined,
        industry: data.industry || undefined,
        companySizeRange: data.companySizeRange,
        country: data.country || undefined,
        city: data.state || undefined,
        source: data.source,
        status: "NEW",
        primaryContact: {
          name: data.contactName,
          email: data.contactEmail || undefined,
          phone: data.contactPhone || undefined,
          jobTitle: data.contactJobTitle || undefined,
          isPrimary: true,
        },
      });
      onClose();
    } catch (error) {
      setError("root", { message: await readCreateErrorMessage(error) });
    }
  }

  return (
    <div>
      <DialogTitle id={titleId}>Add lead</DialogTitle>
      <DialogDescription id={descriptionId}>
        Capture a new prospect and its primary contact.
      </DialogDescription>

      <Form onSubmit={handleSubmit(onSubmit)} className="mt-6">
        {errors.root?.message && (
          <div className="rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
            {errors.root.message}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="create-lead-company-name">Company name</Label>
            <Input id="create-lead-company-name" {...register("companyName")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-country">Country</Label>
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(nextCountry) => {
                    field.onChange(nextCountry);
                    setValue("state", "");
                  }}
                  disabled={isCountryLoading || countries.length === 0}
                >
                  <SelectTrigger id="create-lead-country" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue
                      placeholder={isCountryLoading ? "Loading countries" : "Select country"}
                    />
                  </SelectTrigger>
                  <SearchableSelectContent
                    searchPlaceholder="Search countries"
                    emptyMessage="No countries found"
                    options={countries.map((country) => ({
                      value: country.name,
                      searchText: country.name,
                      label: (
                        <span className="flex min-w-0 items-center gap-2">
                          {country.emoji && (
                            <span className="stdropdown-flag shrink-0" aria-hidden="true">
                              {country.emoji}
                            </span>
                          )}
                          <span className="truncate">{country.name}</span>
                        </span>
                      ),
                    }))}
                  />
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-state">State</Label>
            <Controller
              control={control}
              name="state"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(nextState) => {
                    field.onChange(nextState);
                  }}
                  disabled={!selectedCountry || isStateLoading || states.length === 0}
                >
                  <SelectTrigger id="create-lead-state" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue placeholder={isStateLoading ? "Loading states" : "Select state"} />
                  </SelectTrigger>
                  <SearchableSelectContent
                    searchPlaceholder="Search states"
                    emptyMessage="No states found"
                    options={states.map((state) => ({
                      value: state.name,
                      searchText: state.name,
                      label: state.name,
                    }))}
                  />
                </Select>
              )}
            />
          </div>


          <div className="space-y-1.5">
            <Label htmlFor="create-lead-industry">Industry</Label>
            <Input id="create-lead-industry" {...register("industry")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-size">Company size</Label>
            <Controller
              control={control}
              name="companySizeRange"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-lead-size" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {SIZE_LABEL[size]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-lead-source">Source</Label>
            <Controller
              control={control}
              name="source"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-lead-source" ref={field.ref} onBlur={field.onBlur}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_SOURCES.map((source) => (
                      <SelectItem key={source} value={source}>
                        {SOURCE_LABEL[source]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
            Primary contact
          </p>

          <div className="mt-3 grid grid-cols-1 gap-4 min-[480px]:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-name">Name</Label>
              <Input
                id="create-lead-contact-name"
                aria-invalid={!!errors.contactName}
                {...register("contactName")}
              />
              {errors.contactName && (
                <p className="text-xs text-[var(--color-danger)]">{errors.contactName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-job-title">Job title</Label>
              <Input id="create-lead-contact-job-title" {...register("contactJobTitle")} />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-email">Email</Label>
              <Input
                id="create-lead-contact-email"
                type="email"
                aria-invalid={!!errors.contactEmail}
                {...register("contactEmail")}
              />
              {errors.contactEmail && (
                <p className="text-xs text-[var(--color-danger)]">{errors.contactEmail.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-lead-contact-phone">Phone</Label>
              <Input id="create-lead-contact-phone" {...register("contactPhone")} />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button intent="dismissive" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button
            intent="cta"
            type="submit"
            disabled={createLead.isPending}
            isLoading={createLead.isPending}
          >
            Add lead
          </Button>
        </div>
      </Form>
    </div>
  );
}
