import { Suspense } from "react";
import { AdminDashboardLoading } from "@/components/admin/admin-loading";
import { ProtectedAdminContent } from "./protected-content";

export default function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<AdminDashboardLoading />}>
      <ProtectedAdminContent>{children}</ProtectedAdminContent>
    </Suspense>
  );
}
