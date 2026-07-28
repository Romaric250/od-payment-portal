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
}

export function PostPaymentFollowUpCard({
  followUp,
  className = "",
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
    <div
      className={`rounded-xl border border-od-orange/20 bg-orange-50/60 p-5 ${className}`}
    >
      <h3 className="text-base font-semibold text-od-navy">{title}</h3>
      {description && (
        <div className="mt-3 space-y-3 text-sm leading-relaxed text-od-text">
          {description.split(/\n{2,}/).map((paragraph) => (
            <p key={paragraph}>{paragraph.trim()}</p>
          ))}
        </div>
      )}
      {link && (
        <Button asChild className="mt-4 w-full sm:w-auto">
          <Link href={link} target="_blank" rel="noopener noreferrer">
            {linkLabel}
            <ExternalLink className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
    </div>
  );
}
