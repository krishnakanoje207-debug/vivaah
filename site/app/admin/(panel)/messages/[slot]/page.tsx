import Link from "next/link";
import { notFound } from "next/navigation";
import { getBookingSettings } from "@/lib/booking";
import { todayIST } from "@/lib/bookingRules";
import { isTemplate, overrideProblem } from "@/lib/comms/messages";
import { readTemplates } from "@/lib/comms/templates";
import { slotBySlug } from "../slug";
import { samples } from "../samples";
import { TemplateEditor } from "../TemplateEditor";

export const dynamic = "force-dynamic";

export default async function EditMessagePage({ params }: { params: Promise<{ slot: string }> }) {
  const slot = slotBySlug((await params).slot);
  if (!slot) notFound();
  const [stored, rules] = await Promise.all([readTemplates(), getBookingSettings()]);

  const own = stored[slot.id];
  const problem = own === undefined ? null : overrideProblem(own, slot);
  // Her saved wording goes back into the fields even when it has a problem, so
  // she can fix it rather than retype it. Only wording that cannot be read at
  // all is replaced by the built-in.
  const initial = isTemplate(own) ? own : slot.builtIn;

  return (
    <div className="max-w-6xl">
      <Link href="/admin/messages" className="text-caption text-ink-600 hover:text-ink-900">
        ‹ Messages
      </Link>
      <header className="mt-1">
        <p className="eyebrow">{slot.who === "customer" ? "To her" : "To the shop"}</p>
        <h1 className="mt-1 font-display text-h2 text-ink-900">{slot.title}</h1>
        <p className="mt-1 text-body text-ink-600">{slot.sent}</p>
        <p className={`mt-3 text-body ${problem ? "text-danger" : "text-ink-900"}`}>
          {own === undefined
            ? "The built-in wording is in use."
            : problem
              ? `Your saved wording is not being used, so the built-in wording goes out instead: ${problem} Fix it below and save.`
              : "Your wording is in use."}
        </p>
      </header>

      <TemplateEditor
        id={slot.id}
        initial={initial}
        saved={own !== undefined}
        samples={samples(todayIST(), rules.expiryMinutes)}
      />
    </div>
  );
}
