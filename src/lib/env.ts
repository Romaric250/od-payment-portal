function requireEnv(key: string, fallback?: string): string {
  const value = process.env[key] ?? fallback;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? "",
  nextAuthUrl: process.env.NEXTAUTH_URL ?? "http://localhost:3000",
  nextAuthSecret: process.env.NEXTAUTH_SECRET ?? "",
  fapshiEnv: (process.env.FAPSHI_ENV ?? "sandbox") as "sandbox" | "live",
  fapshiApiUser: process.env.FAPSHI_API_USER ?? "",
  fapshiApiKey: process.env.FAPSHI_API_KEY ?? "",
  fapshiWebhookSecret: process.env.FAPSHI_WEBHOOK_SECRET ?? "",
  fapshiBaseUrl:
    process.env.FAPSHI_ENV === "live"
      ? "https://live.fapshi.com"
      : "https://sandbox.fapshi.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  emailFrom: process.env.EMAIL_FROM ?? "Open Dreams <payments@open-dreams.org>",
  appUrl:
    process.env.APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000",
  uploadthingToken: process.env.UPLOADTHING_TOKEN ?? "",
  adminAccessSecret: process.env.ADMIN_ACCESS_SECRET ?? "",
};

export function assertServerEnv() {
  requireEnv("DATABASE_URL");
  requireEnv("NEXTAUTH_SECRET");
}
