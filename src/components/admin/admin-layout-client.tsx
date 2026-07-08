"use client";

import { SessionProvider } from "next-auth/react";
import { AdminSidebar, AdminTopbar } from "@/components/admin/admin-shell";

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-od-bg">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopbar />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
