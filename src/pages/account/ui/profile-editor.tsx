import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { fieldErrorMap, fieldErrors as toFieldErrors } from "@/shared/i18n";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import type { SelfIdentity, SelfService } from "../api/self-service";

interface ProfileEditorProps {
  identity: SelfIdentity;
  service: SelfService;
}

export function ProfileEditor({ identity, service }: ProfileEditorProps) {
  const { t } = useTranslation("auth");
  const queries = useQueryClient();
  const queryKey = [identity.audience, identity.publicId, "self-profile"];
  const profile = useQuery({
    queryKey,
    queryFn: async ({ signal }) => service.readProfile(signal),
    retry: false,
  });
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const update = useMutation({
    mutationFn: async (input: unknown) => service.updateProfile(input),
    retry: false,
  });
  const editableFields =
    identity.audience === "company"
      ? ["phone", "locale", "timezone", "photoUrl"]
      : ["jobTitle", "team", "locale", "timezone", "photoUrl"];

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profile.data || update.isPending) return;
    setFeedback(null);
    const existing = Object.fromEntries(Object.entries(profile.data));
    const patch: Record<string, unknown> = {};
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string") continue;
      const next = value === "" && name !== "locale" && name !== "timezone" ? null : value;
      if (next !== existing[name]) patch[name] = next;
    }
    const parsed = service.schemas.profile.safeParse(patch, { errorMap: fieldErrorMap(t) });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error.issues, new Set(editableFields)));
      setFeedback(t("journey.checkFields"));
      return;
    }
    setFieldErrors({});
    if (Object.keys(parsed.data).length === 0) {
      setFeedback(t("account.noChanges"));
      return;
    }
    try {
      await update.mutateAsync(parsed.data);
      await queries.invalidateQueries({ queryKey });
      setDraft({});
      setFeedback(t("account.saved"));
    } catch {
      await queries.invalidateQueries({ queryKey });
      setFeedback(t("account.uncertainChange"));
    }
  }

  if (profile.isPending) return <p role="status">{t("account.loading")}</p>;
  if (profile.isError)
    return (
      <div role="status">
        <p>{t("journey.unavailable")}</p>
        <Button className="mt-3" onClick={() => void profile.refetch()}>
          {t("journey.retry")}
        </Button>
      </div>
    );
  const values = Object.fromEntries(Object.entries(profile.data));
  return (
    <div className="max-w-lg space-y-6">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {Object.entries(profile.data)
          .filter(([name]) => !editableFields.includes(name))
          .map(([name, value]) => (
            <div key={name}>
              <dt className="text-xs text-[var(--color-text-muted)]">{t(`account.${name}`)}</dt>
              <dd className="mt-1 break-words text-sm">{value ?? t("account.notProvided")}</dd>
            </div>
          ))}
      </dl>
      {feedback ? (
        <p role="status" className="text-sm">
          {feedback}
        </p>
      ) : null}
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="space-y-4"
        aria-busy={update.isPending}
      >
        {editableFields.map((name) => (
          <div key={name} className="space-y-1.5">
            <Label htmlFor={`profile-${name}`}>{t(`account.${name}`)}</Label>
            <Input
              id={`profile-${name}`}
              name={name}
              value={draft[name] ?? (typeof values[name] === "string" ? values[name] : "")}
              onChange={(event) =>
                setDraft((current) => ({ ...current, [name]: event.target.value }))
              }
              required={name === "locale" || name === "timezone"}
              aria-invalid={Boolean(fieldErrors[name])}
              aria-describedby={fieldErrors[name] ? `profile-${name}-error` : undefined}
              disabled={update.isPending}
              autoComplete="off"
            />
            {fieldErrors[name] ? (
              <p id={`profile-${name}-error`} className="text-xs text-[var(--color-danger)]">
                {fieldErrors[name]}
              </p>
            ) : null}
          </div>
        ))}
        <Button type="submit" intent="cta" disabled={update.isPending} isLoading={update.isPending}>
          {t("account.save")}
        </Button>
      </form>
    </div>
  );
}
