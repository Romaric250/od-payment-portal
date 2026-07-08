import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FailedPage({ params }: { params: { slug: string } }) {
  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto max-w-lg px-4 py-16 sm:px-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-2xl text-od-error">
              ✕
            </div>
            <CardTitle>Payment Failed</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-od-text-muted">
              Your payment could not be completed. This may happen if the request
              expired or was declined on your phone.
            </p>
            <Button asChild className="w-full">
              <Link href={`/pay/${params.slug}`}>Try Again</Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/">Back to categories</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
      <PublicFooter />
    </div>
  );
}
