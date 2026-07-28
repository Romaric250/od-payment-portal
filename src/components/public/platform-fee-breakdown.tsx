import { formatCurrency } from "@/lib/format";
import {
  applyPlatformFee,
  getPlatformFeeAmount,
  PLATFORM_FEE_PERCENT_LABEL,
} from "@/lib/pricing";

interface PlatformFeeBreakdownProps {
  baseAmount: number;
  includePlatformFee?: boolean;
  className?: string;
}

export function PlatformFeeBreakdown({
  baseAmount,
  includePlatformFee = false,
  className = "",
}: PlatformFeeBreakdownProps) {
  if (!includePlatformFee || baseAmount <= 0) {
    return null;
  }

  const feeAmount = getPlatformFeeAmount(baseAmount);
  const totalAmount = applyPlatformFee(baseAmount, true);

  return (
    <div
      className={`space-y-2 rounded-lg border border-od-border bg-od-bg/50 p-4 text-sm ${className}`}
    >
      <div className="flex items-center justify-between gap-4">
        <span className="text-od-text-muted">Subtotal</span>
        <span>{formatCurrency(baseAmount)}</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-od-text-muted">
          Platform fee ({PLATFORM_FEE_PERCENT_LABEL})
        </span>
        <span>{formatCurrency(feeAmount)}</span>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-od-border pt-2 font-semibold text-od-navy">
        <span>Total</span>
        <span>{formatCurrency(totalAmount)}</span>
      </div>
    </div>
  );
}

export function getDisplayPrice(
  basePrice: number,
  includePlatformFee: boolean
): number {
  return applyPlatformFee(basePrice, includePlatformFee);
}
