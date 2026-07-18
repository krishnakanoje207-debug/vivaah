import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/adminAuth";

export async function middleware(req: NextRequest) {
  // Never guard the login page (would loop redirecting it to itself).
  if (req.nextUrl.pathname === "/admin/login") return NextResponse.next();

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verifySession(token)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/admin/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/admin/:path*"],
};
