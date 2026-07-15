"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { AdminPageLoading } from "@/components/admin/admin-loading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/format";

interface Expense {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  status: string;
  handledAt: string | null;
  createdAt: string;
  category: { id: string; name: string } | null;
  createdBy: { id: string; name: string };
}

interface CategoryOption {
  id: string;
  name: string;
}

function statusVariant(status: string) {
  switch (status) {
    case "HANDLED":
      return "success" as const;
    case "APPROVED":
      return "default" as const;
    default:
      return "warning" as const;
  }
}

export default function ExpensesPage() {
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState<string>("none");
  const [status, setStatus] = useState("PENDING");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const [expensesRes, categoriesRes] = await Promise.all([
      fetch("/api/admin/expenses"),
      fetch("/api/admin/categories"),
    ]);
    setExpenses(await expensesRes.json());
    setCategories(await categoriesRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!canWrite) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          amount: parseInt(amount, 10),
          categoryId: categoryId === "none" ? null : categoryId,
          status,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "Failed to create expense");

      setTitle("");
      setDescription("");
      setAmount("");
      setCategoryId("none");
      setStatus("PENDING");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create expense");
    } finally {
      setSaving(false);
    }
  }

  async function updateExpense(id: string, patch: Record<string, unknown>) {
    const res = await fetch(`/api/admin/expenses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await loadData();
  }

  async function deleteExpense(id: string) {
    if (!confirm("Delete this expense?")) return;
    const res = await fetch(`/api/admin/expenses/${id}`, { method: "DELETE" });
    if (res.ok) await loadData();
  }

  if (loading) return <AdminPageLoading />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Expenses</h1>
        <p className="text-sm text-od-text-muted">
          Operational expense tracking — does not affect payment or withdrawal totals
        </p>
      </div>

      {canWrite && (
        <Card>
          <CardHeader>
            <CardTitle>Record expense</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (XAF)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={1}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Category (optional)</Label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger>
                      <SelectValue placeholder="No category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No category</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="APPROVED">Approved</SelectItem>
                      <SelectItem value="HANDLED">Handled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-od-error">{error}</p>}

              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Add expense"}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="overflow-x-auto rounded-xl border border-od-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-od-border bg-od-bg text-left text-od-text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              {canWrite && <th className="px-4 py-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {expenses.map((expense) => (
              <tr key={expense.id} className="border-b border-od-border last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium text-od-navy">{expense.title}</p>
                  {expense.description && (
                    <p className="text-xs text-od-text-muted">{expense.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">{expense.category?.name ?? "—"}</td>
                <td className="px-4 py-3">{formatCurrency(expense.amount)}</td>
                <td className="px-4 py-3">
                  <Badge variant={statusVariant(expense.status)}>{expense.status}</Badge>
                </td>
                <td className="px-4 py-3">{formatDate(expense.createdAt)}</td>
                {canWrite && (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {expense.status !== "HANDLED" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            updateExpense(expense.id, { status: "HANDLED" })
                          }
                        >
                          Mark handled
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteExpense(expense.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
