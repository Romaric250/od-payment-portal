import { getServerSession } from "next-auth";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { AdminLayoutShell } from "@/components/admin/admin-layout-client";
import { ADMIN_GATE_COOKIE } from "@/lib/admin-gate";

export async function ProtectedAdminContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const gate = cookies().get(ADMIN_GATE_COOKIE);
  if (!process.env.ADMIN_ACCESS_SECRET || gate?.value !== "1") {
    notFound();
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/admin/login");
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
