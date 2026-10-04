import { useTranslation } from "react-i18next";
import { groupGrants } from "../model/grants";

interface GrantPickerProps {
  grantable: readonly string[];
  selected: ReadonlySet<string>;
  disabled: boolean;
  onChange: (next: ReadonlySet<string>) => void;
}

/** Grantable actions grouped by resource. Actions are operator-facing contract identifiers. */
export function GrantPicker({ grantable, selected, disabled, onChange }: GrantPickerProps) {
  const { t } = useTranslation("platform-people");

  function toggle(action: string, checked: boolean) {
    const next = new Set(selected);
    if (checked) next.add(action);
    else next.delete(action);
    onChange(next);
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {groupGrants(grantable).map((group) => (
        <fieldset key={group.resource} className="min-w-0 space-y-1.5">
          <legend className="font-semibold" dir="ltr">
            {group.resource}
          </legend>
          {group.actions.map((action) => (
            <label key={action} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-0.5 size-4 accent-[var(--color-primary)]"
                aria-label={t("grants.toggle", { action })}
                checked={selected.has(action)}
                disabled={disabled}
                onChange={(event) => toggle(action, event.target.checked)}
              />
              <span className="min-w-0 break-all" dir="ltr">
                {action}
              </span>
            </label>
          ))}
        </fieldset>
      ))}
    </div>
  );
}
