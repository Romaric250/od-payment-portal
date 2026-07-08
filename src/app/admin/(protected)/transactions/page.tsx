"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { TransactionsTable } from "@/components/admin/transactions-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TransactionsPage() {
  const { data: session } = useSession();
  const canWrite = session?.user?.accessLevel === "READ_WRITE";

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
  const [status, setStatus] = useState("ALL");

  const loadTransactions = useCallback(async () => {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    if (status !== "ALL") params.set("status", status);

    const res = await fetch(`/api/admin/transactions?${params}`);
    const data = await res.json();
    setTransactions(data.transactions ?? []);
  }, [search, status]);

  useEffect(() => {
    loadTransactions().catch(console.error);
  }, [loadTransactions]);

  async function handleStatusChange(paymentId: string, fulfillmentStatus: string) {
    const res = await fetch(`/api/admin/transactions/${paymentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fulfillmentStatus }),
    });

    if (res.ok) {
      await loadTransactions();
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-od-navy">Transactions</h1>
        <p className="text-sm text-od-text-muted">
          All payments across categories
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Input
          placeholder="Search payer, phone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="SUCCESSFUL">Successful</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="EXPIRED">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <TransactionsTable
        transactions={transactions}
        canWrite={canWrite}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
}
