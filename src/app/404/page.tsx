import Link from "next/link";
import { PublicHeader, PublicFooter } from "@/components/public/site-chrome";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-od-bg">
      <PublicHeader />
      <main className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center sm:px-6">
        <p className="text-6xl font-bold text-od-navy">404</p>
        <h1 className="mt-4 text-xl font-semibold text-od-navy">Page not found</h1>
        <p className="mt-2 text-od-text-muted">
          The page you are looking for does not exist.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </main>
      <PublicFooter />
    </div>
  );
}
