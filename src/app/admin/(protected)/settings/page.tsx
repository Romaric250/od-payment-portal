"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";

  const [orgName, setOrgName] = useState("Open Dreams");
  const [notificationEmails, setNotificationEmails] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((res) => res.json())
      .then((data) => {
        setOrgName(data.orgName ?? "Open Dreams");
        setNotificationEmails((data.notificationEmails ?? []).join(", "));
      })
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);

    const emails = notificationEmails
      .split(",")
      .map((e) => e.trim())
      .filter(Boolean);

    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orgName, notificationEmails: emails }),
    });

    const result = await res.json();
    if (!res.ok) {
      setError(result.error ?? "Failed to save");
      return;
    }

    setMessage("Settings saved.");
  }

  if (!isSuperAdmin) {
    return (
      <p className="text-od-text-muted">
        Only super admins can update system settings.
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Settings</h1>
        <p className="text-sm text-od-text-muted">
          Notification emails and organization display info
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notification Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Organization name</Label>
              <Input
                id="orgName"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emails">Notification emails</Label>
              <Input
                id="emails"
                placeholder="admin@open-dreams.org, finance@open-dreams.org"
                value={notificationEmails}
                onChange={(e) => setNotificationEmails(e.target.value)}
              />
              <p className="text-xs text-od-text-muted">
                Comma-separated. These addresses receive alerts on successful payments.
              </p>
            </div>
            {error && <p className="text-sm text-od-error">{error}</p>}
            {message && <p className="text-sm text-od-success">{message}</p>}
            <Button type="submit">Save Settings</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
