"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, Mail } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { PostPaymentFollowUpCard } from "@/components/public/post-payment-follow-up";
import { hasPostPaymentFollowUp } from "@/lib/post-payment";

interface PaymentDetails {
  id: string;
  status: string;
  amount: number;
  fapshiTransId: string | null;
  externalId: string;
  payerEmail: string;
  payerName: string;
  confirmedAt: string | null;
  updatedAt: string;
  category: {
    name: string;
    slug: string;
    categoryType?: string;
    postPaymentTitle: string | null;
    postPaymentDescription: string | null;
    postPaymentLink: string | null;
    postPaymentLinkLabel: string | null;
  };
}

function ReceiptDetails({ payment }: { payment: PaymentDetails }) {
  const transactionId = payment.fapshiTransId ?? payment.externalId;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-green-100 bg-green-50 px-4 py-5 sm:px-5">
        <p className="text-sm text-od-text-muted">Amount paid</p>
        <p className="mt-1 text-3xl font-bold tracking-tight text-od-orange sm:text-4xl">
          {formatCurrency(payment.amount)}
        </p>
      </div>

      <dl className="space-y-3 rounded-xl bg-od-bg p-4 sm:p-5">
        <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
          <dt className="text-sm text-od-text-muted">Category</dt>
          <dd className="text-sm font-medium text-od-navy">{payment.category.name}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
          <dt className="text-sm text-od-text-muted">Transaction</dt>
          <dd className="break-all text-sm font-medium text-od-navy">{transactionId}</dd>
        </div>
        <div className="grid gap-1 sm:grid-cols-[7rem_1fr] sm:gap-4">
          <dt className="text-sm text-od-text-muted">Date</dt>
          <dd className="text-sm font-medium text-od-navy">
            {formatDate(payment.confirmedAt ?? payment.updatedAt)}
          </dd>
        </div>
      </dl>

      <div className="flex gap-3 rounded-xl border border-od-border bg-white p-4 text-sm text-od-text-muted">
        <Mail className="mt-0.5 h-4 w-4 shrink-0 text-od-orange" aria-hidden />
        <p>
          {hasPostPaymentFollowUp(payment.category) ? (
            <>
              A receipt with next steps was sent to{" "}
              <span className="break-all font-medium text-od-text">{payment.payerEmail}</span>.
            </>
          ) : (
            <>
              A receipt was sent to{" "}
              <span className="break-all font-medium text-od-text">{payment.payerEmail}</span>.
            </>
          )}{" "}
          Check your inbox and spam folder.
        </p>
      </div>
    </div>
  );
}

export default function SuccessContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");

  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [confirming, setConfirming] = useState(true);

  useEffect(() => {
    if (!paymentId) {
      router.replace("/");
      return;
    }

    let active = true;
    let attempts = 0;
    const maxAttempts = 40;

    async function poll() {
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        const data = await res.json();

        if (!active) return;

        if (!res.ok) {
          router.replace("/");
          return;
        }

        if (data.status === "FAILED" || data.status === "EXPIRED") {
          router.replace(`/pay/${slug}/failed?paymentId=${paymentId}`);
          return;
        }

        if (data.status === "SUCCESSFUL") {
          if (data.category?.slug !== slug) {
            router.replace("/");
            return;
          }
          setPayment(data);
          setConfirming(false);
          return;
        }

        attempts += 1;
        if (attempts >= maxAttempts) {
          router.replace(`/pay/${slug}/failed?paymentId=${paymentId}`);
        }
      } catch {
        if (active) {
          attempts += 1;
        }
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paymentId, slug, router]);

  if (confirming || !payment) {
    return (
      <div className="flex min-h-screen flex-col bg-od-bg">
        <PublicHeader />
        <main className="mx-auto flex w-full max-w-lg flex-1 items-center px-4 py-8 sm:px-6">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-od-bg">
                <Loader2 className="h-7 w-7 animate-spin text-od-orange" />
              </div>
              <CardTitle>Confirming Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-center text-sm text-od-text-muted">
              <p>Please wait while we confirm your payment...</p>
              <p>Do not close this page.</p>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  const showFollowUp = hasPostPaymentFollowUp(payment.category);

  return (
    <div className="flex min-h-screen flex-col bg-od-bg">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 sm:py-10 lg:py-12">
        <div className="mb-6 flex items-start gap-4 sm:mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 sm:h-14 sm:w-14">
            <CheckCircle2 className="h-7 w-7 text-od-success sm:h-8 sm:w-8" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-od-navy sm:text-3xl">
              Payment successful
            </h1>
            <p className="mt-1 text-sm text-od-text-muted sm:text-base">
              Thank you, {payment.payerName}. Your payment has been received.
            </p>
          </div>
        </div>

        <div
          className={
            showFollowUp
              ? "grid gap-6 lg:grid-cols-2 lg:items-start lg:gap-8"
              : "mx-auto max-w-xl"
          }
        >
          <Card className="h-fit">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-od-navy">Payment receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <ReceiptDetails payment={payment} />
            </CardContent>
          </Card>

          {showFollowUp && (
            <Card className="h-fit border-od-orange/20 bg-orange-50/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-od-navy">Your next steps</CardTitle>
                <p className="text-sm text-od-text-muted">
                  Same details are in your email — you can also use the link below.
                </p>
              </CardHeader>
              <CardContent>
                <PostPaymentFollowUpCard followUp={payment.category} compact />
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-6 sm:mt-8">
          <Button asChild className="w-full sm:w-auto">
            <Link href="/">Back to categories</Link>
          </Button>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
