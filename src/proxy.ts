import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { COMMUNITY_SLUG_HEADER } from "@/lib/app";

/**
 * Lightweight routing gate: redirects visitors without a session cookie to /login.
 * Real authorization (membership, admin role) happens in layouts, server actions and route handlers
 * via requireMember()/assertMember() – never rely on this file alone.
 *
 * It also hands the community slug of `/c/<slug>/…` to the root layout as a request header, so the
 * first paint already wears that community's colors.
 */
const PUBLIC_PREFIXES = ["/login", "/join", "/api/auth", "/api/health"];


export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestHeaders = new Headers(request.headers);
  const slug = /^\/c\/([^/]+)/.exec(pathname)?.[1];
  // Never trust a client-supplied value: only the path decides.
  requestHeaders.delete(COMMUNITY_SLUG_HEADER);
  if (slug) requestHeaders.set(COMMUNITY_SLUG_HEADER, slug);

  if (!PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && !getSessionCookie(request, { cookiePrefix: "courses" })) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)"],
};
