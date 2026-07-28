"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency, formatDate } from "@/lib/format";

interface Transaction {
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
}

interface TransactionsTableProps {
  transactions: Transaction[];
  canWrite: boolean;
  onStatusChange?: (paymentId: string, status: string) => Promise<void>;
  onConfirmPayment?: (paymentId: string) => Promise<void>;
  showCategory?: boolean;
  showFormResponses?: boolean;
}

function statusVariant(status: string) {
  switch (status) {
    case "SUCCESSFUL":
      return "success" as const;
    case "PENDING":
    case "INITIATED":
      return "warning" as const;
    case "FAILED":
    case "EXPIRED":
      return "destructive" as const;
    default:
      return "secondary" as const;
  }
}

function canManuallyConfirm(status: string): boolean {
  return status === "PENDING" || status === "INITIATED";
}

export function TransactionsTable({
  transactions,
  canWrite,
  onStatusChange,
  onConfirmPayment,
  showCategory = true,
  showFormResponses = false,
}: TransactionsTableProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-od-border bg-white p-8 text-center text-od-text-muted">
        No transactions found.
      </div>
    );
  }

  async function handleConfirm(paymentId: string, payerName: string) {
    if (
      !onConfirmPayment ||
      !window.confirm(
        `Mark ${payerName}'s payment as successful? Confirmation emails will be sent.`
      )
    ) {
      return;
    }

    setConfirmingId(paymentId);
    try {
      await onConfirmPayment(paymentId);
    } finally {
      setConfirmingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-od-border bg-white">
      <table className="min-w-full text-sm">
        <thead className="border-b border-od-border bg-od-bg text-left text-od-text-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Payer</th>
            {showCategory && <th className="px-4 py-3 font-medium">Category</th>}
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Network</th>
            <th className="px-4 py-3 font-medium">Payment</th>
            <th className="px-4 py-3 font-medium">Fulfillment</th>
            <th className="px-4 py-3 font-medium">Date</th>
            {canWrite && onConfirmPayment && (
              <th className="px-4 py-3 font-medium">Actions</th>
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-od-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-od-text">{tx.payerName}</p>
                <p className="text-xs text-od-text-muted">{tx.payerPhone}</p>
                <p className="text-xs text-od-text-muted">{tx.payerEmail}</p>
                {showFormResponses && tx.formResponses && tx.formResponses.length > 0 && (
                  <div className="mt-2 space-y-0.5">
                    {tx.formResponses.map((response) => (
                      <p key={response.fieldKey} className="text-xs text-od-text-muted">
                        {response.fieldKey}: {response.value}
                      </p>
                    ))}
                  </div>
                )}
              </td>
              {showCategory && (
                <td className="px-4 py-3">{tx.category.name}</td>
              )}
              <td className="px-4 py-3 font-medium">{formatCurrency(tx.amount)}</td>
              <td className="px-4 py-3">{tx.network}</td>
              <td className="px-4 py-3">
                <Badge variant={statusVariant(tx.status)}>{tx.status}</Badge>
              </td>
              <td className="px-4 py-3">
                {canWrite && onStatusChange && tx.status === "SUCCESSFUL" ? (
                  <Select
                    value={tx.fulfillmentStatus ?? tx.category.statusPipeline[0]}
                    onValueChange={(value) => onStatusChange(tx.id, value)}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tx.category.statusPipeline.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <span>{tx.fulfillmentStatus ?? "—"}</span>
                )}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-od-text-muted">
                {formatDate(tx.createdAt)}
              </td>
              {canWrite && onConfirmPayment && (
                <td className="px-4 py-3">
                  {canManuallyConfirm(tx.status) ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={confirmingId === tx.id}
                      onClick={() => handleConfirm(tx.id, tx.payerName)}
                    >
                      {confirmingId === tx.id ? "Confirming..." : "Mark successful"}
                    </Button>
                  ) : (
                    <span className="text-xs text-od-text-muted">—</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
