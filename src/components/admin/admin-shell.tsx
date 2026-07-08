"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FolderOpen,
  Receipt,
  Wallet,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/categories", label: "Categories", icon: FolderOpen },
  { href: "/admin/transactions", label: "Transactions", icon: Receipt },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/admins", label: "Admins", icon: Users, superAdminOnly: true },
  { href: "/admin/settings", label: "Settings", icon: Settings, superAdminOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  return (
    <aside className="hidden w-64 shrink-0 border-r border-od-border bg-white lg:block">
      <div className="border-b border-od-border px-6 py-5">
        <p className="font-semibold text-od-navy">Open Dreams</p>
        <p className="text-xs text-od-text-muted">Admin Dashboard</p>
      </div>
      <nav className="space-y-1 p-4">
        {navItems
          .filter((item) => !item.superAdminOnly || isSuperAdmin)
          .map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-od-navy text-white"
                    : "text-od-text-muted hover:bg-od-bg hover:text-od-text"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}

export function AdminTopbar() {
  const { data: session } = useSession();

  return (
    <header className="flex items-center justify-between border-b border-od-border bg-white px-4 py-4 sm:px-6">
      <div>
        <p className="text-sm text-od-text-muted">Signed in as</p>
        <p className="font-medium text-od-navy">{session?.user?.name}</p>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden rounded-full bg-od-bg px-3 py-1 text-xs font-medium text-od-text-muted sm:inline">
          {session?.user?.accessLevel === "READ_WRITE" ? "Read & Write" : "Read Only"}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
