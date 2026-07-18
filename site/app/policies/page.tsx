import type { Metadata } from "next";
import { Ornament } from "@/components/site/Ornament";
import { Reveal } from "@/components/site/Reveal";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Rental terms" };

// Editorial placeholders — these describe what each section will cover.
// The shop sets the actual terms via the admin panel (EN + HI); nothing here
// is presented as a confirmed policy.
const AREAS = [
  {
    n: "01",
    t: "Booking & pre-payment",
    d: "How much to pay up front to secure your dates, the UPI details we accept, and how the balance is settled.",
  },
  {
    n: "02",
    t: "Extensions",
    d: "Keeping a piece for a few extra days, and how additional dates are arranged when they are free.",
  },
  {
    n: "03",
    t: "Damage & care",
    d: "Caring for your outfit through the celebration, and how accidental marks or damage are handled on return.",
  },
  {
    n: "04",
    t: "Pickup & return",
    d: "Collecting before your day and returning it after — everything happens at the shop, with no shipping.",
  },
];

export default function PoliciesPage() {
  return (
    <section className="bg-porcelain-50 pt-28 pb-28 md:pt-32 md:pb-36">
      <div className="shell">
        <Reveal>
          <p data-reveal className="eyebrow">
            The fine print
          </p>
          <h1 data-reveal className="mt-3 text-h1">
            Rental <em className="italic">terms</em>
          </h1>
          <p data-reveal className="mt-6 max-w-xl text-ink-600 leading-relaxed text-[1.0625rem]">
            The details behind every booking, kept plain and fair. Here is what each part will
            cover once the shop confirms its terms.
          </p>
        </Reveal>

        <div className="my-12 md:my-16">
          <Ornament className="max-w-[16rem]" />
        </div>

        <Reveal className="grid gap-x-12 gap-y-14 sm:grid-cols-2">
          {AREAS.map((a) => (
            <div key={a.n} data-reveal>
              <p className="font-display text-[3.5rem] leading-none text-gold-600/30 tabular">
                {a.n}
              </p>
              <h2 className="mt-5 text-h3">{a.t}</h2>
              <p className="mt-3 max-w-md text-ink-600 leading-relaxed">{a.d}</p>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-20 md:mt-28">
          <div
            data-reveal
            className="rounded-card border border-porcelain-200 bg-porcelain-100 p-8 md:p-10"
          >
            <p className="eyebrow">Being finalised</p>
            <p className="mt-3 max-w-2xl text-ink-600 leading-relaxed">
              Full terms are being set by the shop through its admin panel, and will appear here in
              both English and Hindi. Until then, our team will walk you through everything in
              person or over the phone.
            </p>
            <div className="mt-7 flex flex-wrap gap-4">
              <Button href="/visit" variant="primary">
                Visit the shop
              </Button>
              <Button href="/rentals" variant="ghost">
                Explore rentals
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
