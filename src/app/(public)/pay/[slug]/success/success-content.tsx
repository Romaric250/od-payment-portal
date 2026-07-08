"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2 } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";

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
  category: { name: string; slug: string };
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
    const maxAttempts = 40; // ~2 minutes at 3s intervals

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
      <div className="min-h-screen bg-od-bg">
        <PublicHeader />
        <main className="mx-auto flex max-w-lg px-4 py-16 sm:px-6">
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-od-bg">
                <Loader2 className="h-7 w-7 animate-spin text-od-orange" />
              </div>
              <CardTitle>Confirming Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-center text-od-text-muted">
              <p>Please wait while we confirm your payment...</p>
              <p className="text-sm">Do not close this page.</p>
            </CardContent>
          </Card>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
              <CheckCircle2 className="h-9 w-9 text-od-success" />
            </div>
            <CardTitle className="text-2xl text-od-navy">Payment Successful</CardTitle>
            <p className="mt-2 text-sm text-od-text-muted">
              Thank you, {payment.payerName}. Your payment has been received.
            </p>
          </CardHeader>
          <CardContent className="space-y-5 text-sm">
            <div className="rounded-lg border border-green-100 bg-green-50 p-4 text-center">
              <p className="text-od-text-muted">Amount paid</p>
              <p className="text-3xl font-bold text-od-orange">
                {formatCurrency(payment.amount)}
              </p>
            </div>

            <div className="space-y-2 rounded-lg bg-od-bg p-4">
              <div className="flex justify-between gap-4">
                <span className="text-od-text-muted">Category</span>
                <span className="text-right font-medium">{payment.category.name}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-od-text-muted">Transaction ID</span>
                <span className="text-right font-medium">
                  {payment.fapshiTransId ?? payment.externalId}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-od-text-muted">Date</span>
                <span className="text-right font-medium">
                  {formatDate(payment.confirmedAt ?? payment.updatedAt)}
                </span>
              </div>
            </div>

            <p className="rounded-lg border border-od-border bg-white p-4 text-center text-od-text-muted">
              A receipt has been sent to{" "}
              <span className="font-medium text-od-text">{payment.payerEmail}</span>.
              Please check your inbox (and spam folder).
            </p>

            <Button asChild className="w-full">
              <Link href="/">Back to categories</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
