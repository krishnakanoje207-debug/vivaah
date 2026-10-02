import Link from "next/link";
import { SLOTS, overrideProblem, type Slot } from "@/lib/comms/messages";
import { readTemplates } from "@/lib/comms/templates";
import { slugOf } from "./slug";

export const dynamic = "force-dynamic";

const GROUPS = [
  { who: "customer", label: "To her", caption: "What a customer is told as her booking moves." },
  { who: "owner", label: "To the shop", caption: "The alerts that tell you a booking needs you." },
] as const;

export default async function AdminMessagesPage() {
  const stored = await readTemplates();

  return (
    <div className="max-w-4xl">
      <header>
        <p className="eyebrow">Vivaah</p>
        <h1 className="mt-1 font-display text-h2 text-ink-900">Messages</h1>
        <p className="mt-2 max-w-xl text-body text-ink-600">
          The emails sent when a booking moves. Change the wording of any of them here. A message you
          have not changed uses the built-in wording.
        </p>
        {/* Not a database read: whether email can send at all is an env var. */}
        {!process.env.RESEND_API_KEY && (
          <p className="mt-2 max-w-xl text-body text-ink-600">
            Email is not set up for the shop yet, so nothing is being sent. The wording is kept for when
            it is.
          </p>
        )}
      </header>

      {GROUPS.map((g) => (
        <section key={g.who} className="mt-10" aria-labelledby={`group-${g.who}`}>
          <div className="ornament mb-2">
            <h2 id={`group-${g.who}`} className="eyebrow">
              {g.label}
            </h2>
          </div>
          <p className="mb-4 text-caption text-ink-600">{g.caption}</p>
          <ul className="flex flex-col gap-3">
            {SLOTS.filter((s) => s.who === g.who).map((s) => (
              <li key={s.id}>
                <Row slot={s} stored={stored[s.id]} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Row({ slot, stored }: { slot: Slot; stored: unknown }) {
  const problem = stored === undefined ? null : overrideProblem(stored, slot);
  return (
    <Link
      href={`/admin/messages/${slugOf(slot)}`}
      className="flex flex-col gap-2 rounded-card border border-ink-900/10 bg-white p-4 shadow-card transition-colors hover:border-violet-300 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
    >
      <span className="min-w-0">
        <span className="block font-display text-h3 text-ink-900">{slot.title}</span>
        <span className="block text-caption text-ink-600">{slot.sent}</span>
        {problem && (
          <span className="mt-1 block text-caption text-danger">
            Your wording is not being used: {problem}
          </span>
        )}
      </span>
      <span
        className={`shrink-0 self-start rounded-full px-3 py-1 text-caption font-medium sm:self-center ${
          stored === undefined
            ? "bg-porcelain-200 text-ink-600"
            : problem
              ? "bg-danger/10 text-danger"
              : "bg-violet-100 text-violet-800"
        }`}
      >
        {stored === undefined ? "Built-in wording" : problem ? "Needs fixing" : "Your wording"}
      </span>
    </Link>
  );
}
