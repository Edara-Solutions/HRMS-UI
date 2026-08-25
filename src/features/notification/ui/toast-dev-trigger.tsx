import { Button } from "@/shared/ui/button";
import { type ToastRequest, type ToastTone, useToastStore } from "../model/toast-store";

/**
 * Scaffolding that stands in for the arrival feed until it is wired up (HRMS-UI#57): one button per
 * tone so the stack, the pill and the sticky danger toast can be exercised by hand. Rendered only
 * under `import.meta.env.DEV`, so its labels are intentionally untranslated. Delete this file and
 * its mount in the toaster once toasts arrive from the feed.
 */
const demoToasts: Record<ToastTone, ToastRequest> = {
  info: { typeKey: "platform.lead-created" },
  success: { typeKey: "company.role-assigned", params: { roleName: "Payroll Manager" } },
  warning: { typeKey: "platform.conversion-requested" },
  danger: {
    typeKey: "company.subscription-changed",
    params: { planName: "Growth", status: "past due" },
    tone: "danger",
  },
};

export function ToastDevTrigger() {
  const showToast = useToastStore((state) => state.showToast);

  return (
    <div className="pointer-events-auto flex flex-wrap justify-end gap-1">
      {Object.entries(demoToasts).map(([tone, request]) => (
        <Button key={tone} variant="subtle" size="xs" onClick={() => showToast(request)}>
          {tone}
        </Button>
      ))}
    </div>
  );
}
