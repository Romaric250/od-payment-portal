function normalizeUrl(url: string): string {
  return url.replace(/\/$/, "");
}

function resolveRequestOrigin(request: Request): string | null {
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!host) return null;

  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");

  return normalizeUrl(`${proto}://${host}`);
}

/**
 * Resolve the public app URL for server-side redirects and links.
 * Prefers explicit env vars, then the incoming request origin (fixes
 * production when NEXT_PUBLIC_APP_URL was baked in at build time).
 */
export function getAppUrl(request?: Request): string {
  if (process.env.APP_URL) {
    return normalizeUrl(process.env.APP_URL);
  }

  if (request) {
    const fromRequest = resolveRequestOrigin(request);
    if (fromRequest) return fromRequest;
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return normalizeUrl(process.env.NEXT_PUBLIC_APP_URL);
  }

  if (process.env.NEXTAUTH_URL) {
    return normalizeUrl(process.env.NEXTAUTH_URL);
  }

  return "http://localhost:3000";
}
