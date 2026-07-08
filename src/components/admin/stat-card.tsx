import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
}

export function StatCard({ title, value, description }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-od-text-muted">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold text-od-navy">{value}</p>
        {description && (
          <p className="mt-1 text-xs text-od-text-muted">{description}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function StatCardCurrency({
  title,
  amount,
  description,
}: {
  title: string;
  amount: number;
  description?: string;
}) {
  return (
    <StatCard
      title={title}
      value={formatCurrency(amount)}
      description={description}
    />
  );
}
