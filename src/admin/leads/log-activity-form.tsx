import { zodResolver } from "@hookform/resolvers/zod";
import { HTTPError } from "ky";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import { readBackendErrorMessage } from "@/api/error-mapper";
import { asZodEnumValues } from "@/shared/lib/zod-enum";
import { Button } from "@/shared/ui/button";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { useAddLeadActivity } from "./api";
import { ACTIVITY_TYPE_LABEL, LOGGABLE_ACTIVITY_TYPES } from "./labels";

const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

async function readActivityErrorMessage(error: unknown): Promise<string> {
  if (error instanceof HTTPError) {
    const backendMessage = await readBackendErrorMessage(error.response);
    if (backendMessage) return backendMessage;
  }
  return GENERIC_ERROR_MESSAGE;
}

const logActivityFormSchema = z.object({
  type: z.enum(asZodEnumValues(LOGGABLE_ACTIVITY_TYPES)),
  note: z.string().min(1, "Note is required").max(1000, "Note must be 1000 characters or fewer"),
});

type LogActivityFormData = z.infer<typeof logActivityFormSchema>;

interface LogActivityFormProps {
  leadPublicId: string;
}

export function LogActivityForm({ leadPublicId }: LogActivityFormProps) {
  const addActivity = useAddLeadActivity();

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<LogActivityFormData>({
    resolver: zodResolver(logActivityFormSchema),
    defaultValues: { type: LOGGABLE_ACTIVITY_TYPES[0], note: "" },
  });

  async function onSubmit(data: LogActivityFormData) {
    try {
      await addActivity.mutateAsync({ publicId: leadPublicId, input: data });
      reset({ type: data.type, note: "" });
    } catch (error) {
      setError("root", { message: await readActivityErrorMessage(error) });
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 border-b border-[var(--color-border)] p-4"
    >
      {errors.root?.message && (
        <p className="text-xs text-[var(--color-danger)]">{errors.root.message}</p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="space-y-1.5 sm:w-48 sm:shrink-0">
          <Label htmlFor="log-activity-type">Type</Label>
          <Controller
            control={control}
            name="type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="log-activity-type" ref={field.ref} onBlur={field.onBlur}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOGGABLE_ACTIVITY_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {ACTIVITY_TYPE_LABEL[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </div>

        <div className="flex-1 space-y-1.5">
          <Label htmlFor="log-activity-note">Note</Label>
          <Textarea
            id="log-activity-note"
            rows={2}
            aria-invalid={!!errors.note}
            {...register("note")}
          />
          {errors.note && (
            <p className="text-xs text-[var(--color-danger)]">{errors.note.message}</p>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          intent="action"
          type="submit"
          disabled={addActivity.isPending}
          isLoading={addActivity.isPending}
        >
          Log activity
        </Button>
      </div>
    </form>
  );
}
