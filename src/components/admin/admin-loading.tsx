import { Loader2 } from "lucide-react";

function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-od-border/60 ${className ?? ""}`} />;
}

export function AdminPageLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-od-border bg-white p-6 shadow-sm"
          >
            <Skeleton className="mb-3 h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-od-border bg-white p-6 shadow-sm">
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminLoadingShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-od-bg">
      <aside className="hidden w-64 shrink-0 border-r border-od-border bg-white lg:block">
        <div className="border-b border-od-border px-6 py-5">
          <Skeleton className="h-9 w-36" />
          <Skeleton className="mt-2 h-3 w-28" />
        </div>
        <nav className="space-y-2 p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-od-border bg-white px-4 py-4 sm:px-6">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-32" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="hidden h-7 w-24 sm:block" />
            <Skeleton className="h-9 w-24" />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminDashboardLoading() {
  return (
    <AdminLoadingShell>
      <div className="mb-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-od-orange" />
        <p className="text-sm text-od-text-muted">Loading dashboard...</p>
      </div>
      <AdminPageLoading />
    </AdminLoadingShell>
  );
}
