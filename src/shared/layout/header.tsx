import { useAuthStore } from "@/auth/store";
import { LocaleSwitcher } from "@/shared/components/locale-switcher";
import { Avatar } from "@/shared/ui/avatar";
import { Bell, Search } from "lucide-react";

interface HeaderProps {
  portalLabel: string;
}

export function Header({ portalLabel }: HeaderProps) {
  const user = useAuthStore((state) => state.session?.user);

  return (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4">
      <div className="flex items-center gap-2">
        <h1 className="text-[13px] font-medium text-[var(--color-text-muted)]">{portalLabel}</h1>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-muted)]"
          aria-label="Search"
        >
          <Search size={15} />
        </button>

        <button
          type="button"
          className="relative inline-flex size-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-faint)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-muted)]"
          aria-label="Notifications"
        >
          <Bell size={15} />
          <span className="absolute end-1.5 top-1.5 size-1.5 rounded-full bg-[var(--color-danger)]" />
        </button>

        <div className="mx-1 h-4 w-px bg-[var(--color-border)]" />

        <LocaleSwitcher />

        <div className="ms-1">
          <Avatar
            size="sm"
            alt={user ? `${user.firstName} ${user.lastName}` : "User"}
            aria-label="User menu"
          />
        </div>
      </div>
    </header>
  );
}
