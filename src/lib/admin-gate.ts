export const ADMIN_GATE_COOKIE = "od_admin_gate";

export function isAdminGateOpen(request: {
  cookies: { get: (name: string) => { value: string } | undefined };
  nextUrl: { searchParams: { get: (key: string) => string | null } };
}): boolean {
  const secret = process.env.ADMIN_ACCESS_SECRET;
  if (!secret) return false;

  const authId = request.nextUrl.searchParams.get("authid");
  if (authId === secret) return true;

  return request.cookies.get(ADMIN_GATE_COOKIE)?.value === "1";
}

export function adminGateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  };
}
