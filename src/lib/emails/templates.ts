interface EmailLayoutProps {
  title: string;
  preview?: string;
  children: string;
}

export function emailLayout({ title, preview, children }: EmailLayoutProps): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#F7F8FA;font-family:Inter,Arial,sans-serif;color:#101828;">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;">${preview}</div>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F8FA;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E4E7EC;border-radius:12px;overflow:hidden;">
          <tr>
            <td style="background:#0B2545;padding:24px 32px;">
              <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:600;">Open Dreams</h1>
              <p style="margin:8px 0 0;color:#D0D5DD;font-size:14px;">Payment Portal</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${children}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px;background:#F7F8FA;border-top:1px solid #E4E7EC;">
              <p style="margin:0;color:#667085;font-size:12px;text-align:center;">
                Open Dreams · open-dreams.org
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function adminPaymentNotificationEmail(params: {
  payerName: string;
  amount: number;
  categoryName: string;
  transactionId: string;
  network: string;
  timestamp: string;
  adminUrl: string;
}): string {
  const amountFormatted = new Intl.NumberFormat("fr-CM").format(params.amount);
  return emailLayout({
    title: "Payment Successful",
    preview: `${params.payerName} paid ${amountFormatted} FCFA`,
    children: `
      <h2 style="margin:0 0 16px;font-size:18px;color:#0B2545;">Payment Successful</h2>
      <p style="margin:0 0 24px;color:#667085;line-height:1.6;">
        <strong style="color:#101828;">${params.payerName}</strong> paid
        <strong style="color:#F5811F;">${amountFormatted} FCFA</strong> for
        <strong style="color:#101828;">${params.categoryName}</strong>.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#667085;">Transaction ID</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.transactionId}</td></tr>
        <tr><td style="padding:8px 0;color:#667085;">Network</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.network}</td></tr>
        <tr><td style="padding:8px 0;color:#667085;">Date</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.timestamp}</td></tr>
      </table>
      <a href="${params.adminUrl}" style="display:inline-block;background:#F5811F;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        View in Dashboard
      </a>
    `,
  });
}

export function payerReceiptEmail(params: {
  payerName: string;
  amount: number;
  categoryName: string;
  transactionId: string;
  orgName: string;
}): string {
  const amountFormatted = new Intl.NumberFormat("fr-CM").format(params.amount);
  return emailLayout({
    title: "Payment Receipt",
    preview: `Thank you for your payment of ${amountFormatted} FCFA`,
    children: `
      <h2 style="margin:0 0 16px;font-size:18px;color:#0B2545;">Thank You, ${params.payerName}</h2>
      <p style="margin:0 0 24px;color:#667085;line-height:1.6;">
        Your payment to ${params.orgName} has been received successfully.
      </p>
      <div style="background:#F7F8FA;border-radius:8px;padding:20px;margin-bottom:24px;">
        <p style="margin:0 0 8px;color:#667085;font-size:14px;">Amount paid</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#F5811F;">${amountFormatted} FCFA</p>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="padding:8px 0;color:#667085;">Category</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.categoryName}</td></tr>
        <tr><td style="padding:8px 0;color:#667085;">Transaction ID</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.transactionId}</td></tr>
      </table>
      <p style="margin:24px 0 0;color:#667085;line-height:1.6;">
        Thank you for supporting Open Dreams.
      </p>
    `,
  });
}

export function adminInviteEmail(params: {
  name: string;
  email: string;
  loginUrl: string;
  temporaryPassword: string;
}): string {
  return emailLayout({
    title: "Admin Account Created",
    preview: "Your Open Dreams admin account has been created",
    children: `
      <h2 style="margin:0 0 16px;font-size:18px;color:#0B2545;">Welcome, ${params.name}</h2>
      <p style="margin:0 0 24px;color:#667085;line-height:1.6;">
        An admin account has been created for you on the Open Dreams Payment Portal.
      </p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
        <tr><td style="padding:8px 0;color:#667085;">Email</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.email}</td></tr>
        <tr><td style="padding:8px 0;color:#667085;">Temporary password</td><td style="padding:8px 0;text-align:right;font-weight:600;">${params.temporaryPassword}</td></tr>
      </table>
      <p style="margin:0 0 24px;color:#667085;line-height:1.6;">
        Please sign in and change your password immediately.
      </p>
      <a href="${params.loginUrl}" style="display:inline-block;background:#F5811F;color:#FFFFFF;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;">
        Sign In
      </a>
    `,
  });
}
