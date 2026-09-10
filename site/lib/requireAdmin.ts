// Session gate for admin server actions. Middleware guards /admin *page loads*,
// but a Server Action is a public HTTP endpoint dispatched by id — it is not
// bound to the /admin path the form lives on, so middleware is not a sufficient
// guard. Every mutating action re-checks the cookie here.
// Kept out of lib/adminAuth so that module stays free of `next/headers`
// (middleware imports it).
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession } from "@/lib/adminAuth";

export async function requireAdmin(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!(await verifySession(token))) redirect("/admin/login");
}
