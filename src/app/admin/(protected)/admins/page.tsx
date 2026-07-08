"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN";
  accessLevel: "READ_WRITE" | "READ_ONLY";
  isActive: boolean;
}

export default function AdminsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "SUPER_ADMIN">("ADMIN");
  const [accessLevel, setAccessLevel] = useState<"READ_WRITE" | "READ_ONLY">(
    "READ_ONLY"
  );
  const [error, setError] = useState<string | null>(null);

  async function loadAdmins() {
    const res = await fetch("/api/admin/admins");
    if (res.ok) setAdmins(await res.json());
  }

  useEffect(() => {
    if (isSuperAdmin) loadAdmins().catch(console.error);
  }, [isSuperAdmin]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const res = await fetch("/api/admin/admins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role, accessLevel }),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error ?? "Failed");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    await loadAdmins();
  }

  if (!isSuperAdmin) {
    return (
      <p className="text-od-text-muted">
        Only super admins can manage admin accounts.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Admins</h1>
        <p className="text-sm text-od-text-muted">
          Manage admin accounts and access levels
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invite Admin</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Temporary password</Label>
              <PasswordInput
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v: "ADMIN" | "SUPER_ADMIN") => setRole(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Access level</Label>
              <Select
                value={accessLevel}
                onValueChange={(v: "READ_WRITE" | "READ_ONLY") => setAccessLevel(v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="READ_WRITE">Read & Write</SelectItem>
                  <SelectItem value="READ_ONLY">Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-od-error sm:col-span-2">{error}</p>}
            <Button type="submit">Create Admin</Button>
          </form>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-xl border border-od-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-od-border bg-od-bg text-left text-od-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Access</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {admins.map((admin) => (
              <tr key={admin.id} className="border-b border-od-border last:border-0">
                <td className="px-4 py-3 font-medium">{admin.name}</td>
                <td className="px-4 py-3">{admin.email}</td>
                <td className="px-4 py-3">{admin.role}</td>
                <td className="px-4 py-3">{admin.accessLevel}</td>
                <td className="px-4 py-3">
                  <Badge variant={admin.isActive ? "success" : "secondary"}>
                    {admin.isActive ? "Active" : "Inactive"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
