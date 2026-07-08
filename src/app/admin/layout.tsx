import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { AdminProviders } from "@/components/admin/admin-layout-client";
import { ADMIN_GATE_COOKIE } from "@/lib/admin-gate";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = cookies().get(ADMIN_GATE_COOKIE);
  if (!process.env.ADMIN_ACCESS_SECRET || gate?.value !== "1") {
    notFound();
  }

  return <AdminProviders>{children}</AdminProviders>;
}
