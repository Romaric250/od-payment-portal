"use client";

import { Badge } from "@/components/ui/badge";
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
  showCategory?: boolean;
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

export function TransactionsTable({
  transactions,
  canWrite,
  onStatusChange,
  showCategory = true,
}: TransactionsTableProps) {
  if (transactions.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-od-border bg-white p-8 text-center text-od-text-muted">
        No transactions found.
      </div>
    );
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
          </tr>
        </thead>
        <tbody>
          {transactions.map((tx) => (
            <tr key={tx.id} className="border-b border-od-border last:border-0">
              <td className="px-4 py-3">
                <p className="font-medium text-od-text">{tx.payerName}</p>
                <p className="text-xs text-od-text-muted">{tx.payerPhone}</p>
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
              <td className="px-4 py-3 text-od-text-muted">
                {formatDate(tx.createdAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
