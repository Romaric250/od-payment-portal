import { Resend } from "resend";
import { env } from "@/lib/env";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!env.resendApiKey) return null;
  if (!resendClient) {
    resendClient = new Resend(env.resendApiKey);
  }
  return resendClient;
}

export async function sendEmail(params: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn("Resend not configured — skipping email:", params.subject);
    return null;
  }

  return resend.emails.send({
    from: env.emailFrom,
    to: params.to,
    subject: params.subject,
    html: params.html,
  });
}
