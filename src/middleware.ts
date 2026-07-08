import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_GATE_COOKIE,
  adminGateCookieOptions,
  isAdminGateOpen,
} from "@/lib/admin-gate";

function notFoundResponse(req: NextRequest) {
  return NextResponse.rewrite(new URL("/404", req.url));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isAdminApi = pathname.startsWith("/api/admin/");

  if (!isAdminPage && !isAdminApi) {
    return NextResponse.next();
  }

  const secret = process.env.ADMIN_ACCESS_SECRET;
  if (!secret) {
    console.error("ADMIN_ACCESS_SECRET is not configured");
    return notFoundResponse(req);
  }

  const authId = req.nextUrl.searchParams.get("authid");
  const gateOpen = isAdminGateOpen(req);

  // Valid secret in URL — set cookie and redirect to clean URL
  if (authId === secret) {
    const url = req.nextUrl.clone();
    url.searchParams.delete("authid");
    const response = NextResponse.redirect(url);
    response.cookies.set(ADMIN_GATE_COOKIE, "1", adminGateCookieOptions());
    return response;
  }

  if (!gateOpen) {
    if (isAdminApi) {
      return new NextResponse(null, { status: 404 });
    }
    return notFoundResponse(req);
  }

  // Admin API — require JWT, return 401 (gate passed but not logged in)
  if (isAdminApi) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Admin login — allow without session
  if (pathname === "/admin/login") {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
    return NextResponse.next();
  }

  // Protected admin pages — require session
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    return NextResponse.redirect(new URL("/admin/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"],
};
