"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Pencil } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  CategoryEditDialog,
  type CategoryEditData,
} from "@/components/admin/category-edit-dialog";
import { StatCard, StatCardCurrency } from "@/components/admin/stat-card";
import { AdminPageLoading } from "@/components/admin/admin-loading";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CategoryDetailPageProps {
  params: { id: string };
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";

  const [category, setCategory] = useState<CategoryEditData | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const [stats, setStats] = useState<{
    totalCollected: number;
    statusCounts: {
      total: number;
      successful: number;
      pending: number;
      failed: number;
    };
    fulfillmentBreakdown: Record<string, number>;
    averageOrderValue: number;
    totalExpenses: number;
    netBalance: number;
    expenseCounts: {
      total: number;
      pending: number;
      approved: number;
      handled: number;
    };
  } | null>(null);

  const [transactions, setTransactions] = useState<
    Array<{
      id: string;
      payerName: string;
      payerPhone: string;
      payerEmail: string;
      amount: number;
      network: string;
      status: string;
      fulfillmentStatus: string | null;
      createdAt: string;
      formResponses?: Array<{ fieldKey: string; value: string }>;
      category: {
        id: string;
        name: string;
        statusPipeline: string[];
      };
    }>
  >([]);

  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    const [categoryRes, statsRes, txRes] = await Promise.all([
      fetch(`/api/admin/categories/${params.id}`),
      fetch(`/api/admin/categories/${params.id}/stats`),
      fetch(`/api/admin/transactions?categoryId=${params.id}&limit=100`),
    ]);

    setCategory(await categoryRes.json());
    setStats(await statsRes.json());
    const txData = await txRes.json();
    setTransactions(txData.transactions ?? []);
  }, [params.id]);

  useEffect(() => {
    loadData().catch(console.error);
  }, [loadData]);

  async function handleStatusChange(paymentId: string, status: string) {
    const res = await fetch(`/api/admin/transactions/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillmentStatus: status }),
    });

    if (res.ok) {
      await loadData();
    }
  }

  async function handleConfirmPayment(paymentId: string) {
    const res = await fetch(`/api/admin/transactions/${paymentId}/confirm`, {
      method: "POST",
    });

    if (!res.ok) {
      const result = await res.json();
      setActionError(result.error ?? "Could not confirm payment.");
      return;
    }

    setActionError(null);
    await loadData();
  }

  async function handleExport() {
    setExporting(true);
    setExportError(null);

    try {
      const query = new URLSearchParams({
        categoryId: params.id,
        status: "SUCCESSFUL",
      });
      if (exportStartDate) query.set("startDate", exportStartDate);
      if (exportEndDate) query.set("endDate", exportEndDate);

      const res = await fetch(`/api/admin/transactions/export?${query}`);

      if (!res.ok) {
        const result = await res.json().catch(() => null);
        setExportError(
          result?.error ?? "Unable to generate the export file. Please try again."
        );
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${category?.slug ?? "category"}-successful-payments${
        exportStartDate || exportEndDate
          ? `-${exportStartDate || "start"}-to-${exportEndDate || "end"}`
          : ""
      }.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Unable to generate the export file. Please try again.");
    } finally {
      setExporting(false);
    }
  }

  const filteredTransactions = transactions.filter((tx) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      tx.payerName.toLowerCase().includes(q) ||
      tx.payerPhone.includes(q) ||
      tx.payerEmail.toLowerCase().includes(q)
    );
  });

  if (!category || !stats) {
    return <AdminPageLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-od-navy">{category.name}</h1>
          <p className="text-sm text-od-text-muted">
            {category.categoryType} · {category.isActive ? "Active" : "Inactive"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-end justify-end gap-3">
            <div className="space-y-1">
              <Label htmlFor="exportStartDate" className="text-xs text-od-text-muted">
                Export from
              </Label>
              <Input
                id="exportStartDate"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="exportEndDate" className="text-xs text-od-text-muted">
                Export to
              </Label>
              <Input
                id="exportEndDate"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-[160px]"
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
            >
              <Download className="mr-2 h-4 w-4" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          </div>
          <p className="text-xs text-od-text-muted">
            Leave dates empty to export all successful payments.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            {canWrite && (
              <Button type="button" onClick={() => setEditOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit category
              </Button>
            )}
            <Button type="button" variant="outline" asChild>
              <Link href="/admin/expenses">View expenses</Link>
            </Button>
          </div>
        </div>
      </div>

      {(exportError || actionError) && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-od-error">
          {exportError ?? actionError}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardCurrency title="Total Collected" amount={stats.totalCollected} />
        <StatCard
          title="Orders"
          value={`${stats.statusCounts.total}`}
          description={`${stats.statusCounts.successful} successful · ${stats.statusCounts.pending} pending · ${stats.statusCounts.failed} failed`}
        />
        <StatCardCurrency title="Expenses" amount={stats.totalExpenses} />
        <StatCardCurrency title="Net Balance" amount={stats.netBalance} />
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-od-navy">Transactions</h2>
            <p className="text-sm text-od-text-muted">
              Review payments and confirm pending transactions when needed.
            </p>
          </div>
          <Input
            placeholder="Search by name, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <TransactionsTable
          transactions={filteredTransactions}
          canWrite={canWrite}
          onStatusChange={handleStatusChange}
          onConfirmPayment={canWrite ? handleConfirmPayment : undefined}
          showCategory={false}
          showFormResponses
        />
      </div>

      <CategoryEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        category={category}
        onUpdated={loadData}
      />
    </div>
  );
}
