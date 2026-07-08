"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ProcessingContent({ slug }: { slug: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentId = searchParams.get("paymentId");
  const [message, setMessage] = useState("Confirming your payment...");

  useEffect(() => {
    if (!paymentId) return;

    let active = true;

    async function poll() {
      try {
        const res = await fetch(`/api/payments/${paymentId}`);
        const data = await res.json();

        if (!active) return;

        if (data.status === "SUCCESSFUL") {
          router.replace(`/pay/${slug}/success?paymentId=${paymentId}`);
          return;
        }

        if (data.status === "FAILED" || data.status === "EXPIRED") {
          router.replace(`/pay/${slug}/failed?paymentId=${paymentId}`);
          return;
        }

        setMessage("Waiting for payment confirmation...");
      } catch {
        setMessage("Checking payment status...");
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [paymentId, slug, router]);

  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto flex max-w-lg px-4 py-16 sm:px-6">
        <Card className="w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-od-bg">
              <Loader2 className="h-7 w-7 animate-spin text-od-orange" />
            </div>
            <CardTitle>Processing Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center text-od-text-muted">
            <p>{message}</p>
            <p className="text-sm">
              Please wait while we confirm your payment status. Do not close this
              page.
            </p>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
