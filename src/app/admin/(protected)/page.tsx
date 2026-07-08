"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard, StatCardCurrency } from "@/components/admin/stat-card";
import { AdminPageLoading } from "@/components/admin/admin-loading";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  totalRevenue: number;
  totalWithdrawn: number;
  balance: number;
  revenueByCategory: { name: string; amount: number }[];
  recentTransactions: Array<{
    id: string;
    payerName: string;
    payerPhone: string;
    payerEmail: string;
    amount: number;
    network: string;
    status: string;
    fulfillmentStatus: string | null;
    createdAt: string;
    category: { name: string; statusPipeline: string[] };
  }>;
  counts: { successful: number; pending: number; failed: number };
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { status } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/admin/login");
      return;
    }

    if (status !== "authenticated") return;

    fetch("/api/admin/stats")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "Failed to load dashboard");
        }
        if (!data.counts) {
          throw new Error("Invalid dashboard response");
        }
        setStats(data);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      });
  }, [status, router]);

  if (status === "loading" || (status === "authenticated" && !stats && !error)) {
    return <AdminPageLoading />;
  }

  if (error || !stats) {
    return (
      <p className="text-od-error">
        {error ?? "Unable to load dashboard. Please sign in again."}
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Overview</h1>
        <p className="text-sm text-od-text-muted">
          Revenue, balance, and recent activity
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCardCurrency title="Total Revenue" amount={stats.totalRevenue} />
        <StatCardCurrency title="Total Withdrawn" amount={stats.totalWithdrawn} />
        <StatCardCurrency title="Current Balance" amount={stats.balance} />
        <StatCard
          title="Successful Payments"
          value={String(stats.counts.successful)}
          description={`${stats.counts.pending} pending · ${stats.counts.failed} failed`}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByCategory}>
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="amount" fill="#F5811F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Transactions</CardTitle>
            <Link href="/admin/transactions" className="text-sm text-od-orange">
              View all
            </Link>
          </CardHeader>
          <CardContent>
            <TransactionsTable
              transactions={stats.recentTransactions.map((tx) => ({
                ...tx,
                category: {
                  id: "",
                  name: tx.category.name,
                  statusPipeline: tx.category.statusPipeline,
                },
              }))}
              canWrite={false}
              showCategory
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
