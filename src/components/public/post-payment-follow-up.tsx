import Link from "next/link";
import { ExternalLink } from "lucide-react";
import {
  getPostPaymentLinkLabel,
  getPostPaymentTitle,
  hasPostPaymentFollowUp,
  type PostPaymentFollowUp,
} from "@/lib/post-payment";
import { Button } from "@/components/ui/button";

interface PostPaymentFollowUpCardProps {
  followUp: Partial<PostPaymentFollowUp>;
  className?: string;
  /** Hide title when the parent page already shows a section heading */
  compact?: boolean;
}

export function PostPaymentFollowUpCard({
  followUp,
  className = "",
  compact = false,
}: PostPaymentFollowUpCardProps) {
  if (!hasPostPaymentFollowUp(followUp)) {
    return null;
  }

  const title = getPostPaymentTitle(
    followUp.postPaymentTitle,
    followUp.categoryType
  );
  const description = followUp.postPaymentDescription?.trim();
  const link = followUp.postPaymentLink?.trim();
  const linkLabel = getPostPaymentLinkLabel(followUp.postPaymentLinkLabel);

  return (
    <div className={`space-y-4 ${className}`}>
      {!compact && (
        <h3 className="text-base font-semibold text-od-navy">{title}</h3>
      )}
      {compact && title && (
        <p className="text-sm font-medium text-od-navy">{title}</p>
      )}
      {description && (
        <div className="space-y-3 text-sm leading-relaxed text-od-text">
          {description.split(/\n{2,}/).map((paragraph, index) => (
            <p
              key={`${index}-${paragraph.slice(0, 24)}`}
              className="whitespace-pre-wrap break-words"
            >
              {paragraph.trim()}
            </p>
          ))}
        </div>
      )}
      {link && (
        <Button asChild className="h-11 w-full sm:w-auto">
          <Link href={link} target="_blank" rel="noopener noreferrer">
            <span className="truncate">{linkLabel}</span>
            <ExternalLink className="ml-2 h-4 w-4 shrink-0" />
          </Link>
        </Button>
      )}
    </div>
  );
}
