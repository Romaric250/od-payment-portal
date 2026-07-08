import Link from "next/link";

export function PublicHeader() {
  return (
    <header className="border-b border-od-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-od-navy text-sm font-bold text-white">
            OD
          </div>
          <div>
            <p className="text-sm font-semibold text-od-navy">Open Dreams</p>
            <p className="text-xs text-od-text-muted">Payment Portal</p>
          </div>
        </Link>
      </div>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-od-border bg-white">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <p className="text-center text-sm text-od-text-muted">
          Secure payments powered by MTN Mobile Money & Orange Money via Fapshi.
        </p>
        <p className="mt-2 text-center text-sm text-od-text-muted">
          Questions? Contact{" "}
          <a
            href="mailto:info@open-dreams.org"
            className="text-od-navy underline-offset-4 hover:underline"
          >
            info@open-dreams.org
          </a>
        </p>
      </div>
    </footer>
  );
}
