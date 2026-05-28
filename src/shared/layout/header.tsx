import { useAuthStore } from "@/auth/store";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { ThemeToggle } from "@/shared/components/theme-toggle";
import { Avatar } from "@/shared/ui/avatar";
import { Button } from "@/shared/ui/button";
import { Bell, HelpCircle, Search } from "lucide-react";

export function Header() {
  const user = useAuthStore((state) => state.session?.user);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6">
      {/* Search */}
      <div className="relative w-full max-w-[400px]">
        <Search
          size={15}
          className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-[var(--color-text-faint)]"
        />
        <input
          type="search"
          aria-label="Search"
          placeholder="Search people, docs, actions…"
          className="h-[34px] w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] py-0 pe-[70px] ps-9 text-[13px] text-[var(--color-text)] outline-none transition-colors placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/10"
        />
        <kbd className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2 rounded border border-[var(--color-border)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-text-faint)]">
          ⌘K
        </kbd>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Actions */}
      <div className="flex items-center gap-1">
        <div className="relative">
          <Button
            intent="toggle"
            size="iconSm"
            aria-label="Notifications"
            leadingIcon={<Bell size={16} />}
            iconOnly
          />
          <span className="pointer-events-none absolute end-1.5 top-1.5 size-1.5 rounded-full bg-[var(--color-danger)] ring-2 ring-[var(--color-bg)]" />
        </div>

        <Button
          intent="toggle"
          size="iconSm"
          aria-label="Help"
          leadingIcon={<HelpCircle size={16} />}
          iconOnly
        />

        <div className="mx-1 h-5 w-px bg-[var(--color-border)]" />

        <ThemeToggle />
        <LocaleSwitcher />

        <Avatar
          size="sm"
          initials={user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
          alt={user ? `${user.firstName} ${user.lastName}` : "User"}
          className="ms-1 cursor-pointer"
        />
      </div>
    </header>
  );
}
