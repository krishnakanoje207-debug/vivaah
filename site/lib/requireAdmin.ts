// Session gate for admin server actions. Middleware guards /admin *page loads*,
// but a Server Action is a public HTTP endpoint dispatched by id — it is not
// bound to the /admin path the form lives on, so middleware is not a sufficient
// guard. Every mutating action re-checks the cookie here.
// Kept out of lib/adminAuth so that module stays free of `next/headers`
// (middleware imports it).
//
// This is also where a revoked session is caught (SECURITY_HARDENING_SPEC S2).
// Middleware checks only the signature and the expiry, because it runs on the
// Edge and making it authoritative would put a query in front of every admin
// request; it is also the layer that had the bypass CVE patched on 10 September,
// which is a reason to lean on it less rather than more. The two paths that
// actually matter both come through a database-backed check instead: every
// mutating action calls this, and every authenticated page renders inside the
// (panel) layout, which calls it too.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, readSession } from "@/lib/adminAuth";
import { sessionsValidFrom } from "@/lib/adminSessions";

export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const claims = await readSession(token);
  if (!claims) redirect("/admin/login");
  if (claims.iat < (await sessionsValidFrom())) redirect("/admin/login?revoked=1");
}
