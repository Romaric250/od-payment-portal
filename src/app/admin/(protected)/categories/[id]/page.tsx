"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { CategoryForm } from "@/components/admin/category-form";
import { StatCard, StatCardCurrency } from "@/components/admin/stat-card";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { Input } from "@/components/ui/input";

interface CategoryDetailPageProps {
  params: { id: string };
}

export default function CategoryDetailPage({ params }: CategoryDetailPageProps) {
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";

  const [category, setCategory] = useState<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    price: number;
    images: string[];
    isActive: boolean;
    displayOrder: number;
    statusPipeline: string[];
  } | null>(null);

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
      fetch(`/api/admin/transactions?categoryId=${params.id}&limit=50`),
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
    return <p className="text-od-text-muted">Loading category...</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">{category.name}</h1>
        <p className="text-sm text-od-text-muted">Category workspace</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardCurrency title="Total Collected" amount={stats.totalCollected} />
        <StatCard
          title="Orders"
          value={`${stats.statusCounts.total}`}
          description={`${stats.statusCounts.successful} successful · ${stats.statusCounts.pending} pending · ${stats.statusCounts.failed} failed`}
        />
        <StatCardCurrency
          title="Average Order"
          amount={stats.averageOrderValue}
        />
        <StatCard
          title="Fulfillment"
          value={Object.entries(stats.fulfillmentBreakdown)
            .map(([k, v]) => `${k}: ${v}`)
            .join(" · ") || "—"}
        />
      </div>

      <CategoryForm initialData={category} />

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-od-navy">Payments</h2>
          <Input
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>
        <TransactionsTable
          transactions={filteredTransactions}
          canWrite={canWrite}
          onStatusChange={handleStatusChange}
          showCategory={false}
        />
      </div>
    </div>
  );
}
