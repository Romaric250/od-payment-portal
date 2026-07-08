"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

interface Withdrawal {
  id: string;
  amount: number;
  note: string | null;
  reference: string | null;
  createdAt: string;
  createdBy: { name: string };
}

export default function WithdrawalsPage() {
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";

  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadWithdrawals() {
    const res = await fetch("/api/admin/withdrawals");
    setWithdrawals(await res.json());
  }

  useEffect(() => {
    loadWithdrawals().catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseInt(amount, 10),
          note: note || null,
          reference: reference || null,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed");

      setAmount("");
      setNote("");
      setReference("");
      await loadWithdrawals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Withdrawals</h1>
        <p className="text-sm text-od-text-muted">
          Record funds withdrawn from the collection account
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Create Withdrawal</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (XAF)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={100}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="note">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
              {error && (
                <p className="text-sm text-od-error sm:col-span-2">{error}</p>
              )}
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Record Withdrawal"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-od-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-od-border bg-od-bg text-left text-od-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Note</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">By</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {withdrawals.map((w) => (
              <tr key={w.id} className="border-b border-od-border last:border-0">
                <td className="px-4 py-3 font-medium">{formatCurrency(w.amount)}</td>
                <td className="px-4 py-3">{w.note ?? "—"}</td>
                <td className="px-4 py-3">{w.reference ?? "—"}</td>
                <td className="px-4 py-3">{w.createdBy.name}</td>
                <td className="px-4 py-3">{formatDate(w.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
