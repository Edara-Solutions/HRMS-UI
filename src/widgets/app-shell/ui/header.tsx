import type { ReactNode } from "react";
import { useCurrentSession } from "@/shared/auth";
import { Avatar } from "@/shared/ui/avatar";
import { LocaleSwitcher } from "@/shared/ui/locale-switcher";
import { ThemeToggle } from "@/shared/ui/theme-toggle";

interface HeaderProps {
  search?: ReactNode;
  help?: ReactNode;
  notifications?: ReactNode;
}

export function Header({ search, help, notifications }: HeaderProps) {
  const user = useCurrentSession()?.user;
  return (
    <header className="flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-bg)] px-3 sm:px-6">
      <div className="me-auto flex min-w-0 items-center">{search}</div>
      {help}
      {notifications}
      <ThemeToggle />
      <LocaleSwitcher />
      <Avatar
        size="sm"
        initials={user ? `${user.firstName[0]}${user.lastName[0]}` : "?"}
        alt={user ? `${user.firstName} ${user.lastName}` : "User"}
      />
    </header>
  );
}
