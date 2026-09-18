import type { Metadata } from "next";
import { SectionEdge } from "@/components/site/SectionEdge";
import { RippleHeading } from "@/components/site/RippleHeading";
import { Reveal } from "@/components/site/Reveal";
import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";
import { SHOP } from "@/lib/site";

/**
 * `/privacy` — what the site does with a customer's details.
 *
 * LAUNCH_CHECKLIST item 15, which was the last of the three "not started"
 * compliance rows that is actually a gap.
 *
 * REVISED 18 Sep 2026, when items 17 and 18 closed together. Cloudflare Web
 * Analytics is installed and the cookie banner is mounted, so the three clauses
 * that turned on there being no analytics had to change with it: 04 gives
 * Cloudflare its third job, 05 no longer says there is nothing to consent to,
 * and 06 names the fourth thing the browser keeps. Cloudflare Web Analytics
 * sets no cookie and does no fingerprinting, which is why 05 still says two
 * cookies and why no fourth company appears in 04.
 *
 * It is needed because the shop now takes a name, a phone number and sometimes
 * an email through the booking form, keeps them in Neon, and as of 17 September
 * can send mail about them through Resend. A site that collects that and says
 * nothing about it is the gap this closes.
 *
 * EVERY CLAUSE BELOW WAS READ OUT OF THE CODE, not adapted from a template.
 * The two cookies are the only two the app sets (`lib/adminAuth.ts` and
 * `lib/bookingAccess.ts`); the four browser-storage keys are the only four
 * anything writes (`lib/selection.ts`, `NewStockPopup`, `Preloader`,
 * `CookieConsent`); the processors are the three the app actually talks to. If
 * any of that changes, this page is wrong and has to change with it, which is
 * what `scripts/verify-privacy.mjs` is for.
 *
 * Two facts are the owner's and are marked as unset rather than invented: how
 * long she keeps a booking, and where a customer writes to ask for deletion.
 * Stating a retention period we have not agreed would be worse than saying it
 * is not set.
 *
 * The page borrows `/policies`' grammar exactly — masthead spread, sticky index
 * beside ruled clauses, dark close — because these two are a pair and a reader
 * who has seen one should recognise the other.
 */

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What Vivaah Dresses and Suits collects when you book, why we hold it, who else sees it, and what stays on your device.",
};

const CLAUSES = [
  {
    id: "collect",
    n: "01",
    title: "What we ask you for",
    covers:
      "To hold a piece we need your name, a phone number, and the dates you want it for. An email address is optional and is only used to send you the booking. You can add a note if there is something we should know. That is everything the form asks, and we do not ask for an address, an age, a photograph or an identity document.",
  },
  {
    id: "why",
    n: "02",
    title: "Why we keep it",
    covers:
      "So we can confirm the booking, set the piece aside for your dates, and reach you about it. We ring before a collection, and if we cannot reach you we may cancel the booking and release the piece. Nothing you give us is used for advertising, and we do not sell it or share it with anyone for marketing.",
  },
  {
    id: "money",
    n: "03",
    title: "Nothing is paid online",
    covers:
      "There is no payment step on this website, so we never receive a card number, a UPI ID or a bank detail of any kind. Everything is settled in person at the shop. If a page ever asks you to pay online, it is not us.",
  },
  {
    id: "who",
    n: "04",
    title: "Who else handles it",
    covers:
      "Three companies. Neon stores the booking. Cloudflare serves the site, runs the check that tells a person from a bot, and counts page views if you have allowed it. Resend sends the emails about your booking, when email is switched on. Nobody else receives your details. The one other thing that reaches outside is the map of the shop on our front page, which is loaded from Google, so opening that page lets Google see that a visit happened.",
  },
  {
    id: "cookies",
    n: "05",
    title: "Cookies, and what stays on your device",
    covers:
      "This site sets two cookies and neither one follows you. One remembers that the shop owner is signed in to her own admin panel. The other is set only if you open your booking with its code and phone number, so the page knows you are allowed to see it. There is no advertising cookie and nothing here is sold to anyone. We also ask, in a panel at the foot of the page, whether we may count which pages get opened. That counting is done by Cloudflare, it sets no cookie of its own and does not try to recognise you or follow you to other sites, and it does not start until you say yes. If you say no, or close the panel without answering, nothing is counted. You can change your answer at any time from Cookie choices in the footer, and switching it off stops the counting from the next page you open.",
  },
  {
    id: "device",
    n: "06",
    title: "What your browser remembers by itself",
    covers:
      "Four things. The pieces you have added to your selection, which new arrivals you have already been shown, whether you have seen the opening animation, and your answer to the counting question above so you are not asked again. All of it is kept by your browser on your own device, is never sent to us, and disappears when you clear your browsing data.",
  },
  {
    id: "keep",
    n: "07",
    title: "How long we keep a booking",
    covers:
      "The shop has not set a period yet, and rather than state one we have not agreed, we are saying so plainly here. Until it is set, ask us and we will tell you what we still hold.",
  },
  {
    id: "rights",
    n: "08",
    title: "Changing your mind",
    covers:
      "You can cancel a booking yourself from its own page until six hours before pickup. You can also ask us to correct what we hold, or to delete it once a booking is finished, and we will do it. The quickest way is to call the shop.",
  },
];

// Shared by the ledger head and every clause so the columns line up, exactly as
// on /policies.
const LEDGER =
  "md:grid-cols-[minmax(0,4rem)_minmax(0,20rem)_1fr] md:gap-10 " +
  "2xl:grid-cols-[minmax(0,3rem)_minmax(0,15rem)_minmax(0,1fr)] 2xl:gap-8";

export default function PrivacyPage() {
  return (
    <>
      {/* ---------- Masthead ---------------------------------------------- */}
      <section className="bg-porcelain-50 pt-24 pb-20 md:pt-28 md:pb-24">
        <div className="shell-wide">
          <div className="grid gap-12 lg:grid-cols-[1fr_minmax(0,20rem)] lg:items-end lg:gap-24">
            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,32ch)] 2xl:items-end 2xl:gap-16">
              <div>
                <p className="eyebrow">Privacy</p>
                <RippleHeading
                  as="h1"
                  className="mt-5 max-w-[16ch] text-h1 text-ink-900 2xl:max-w-none"
                >
                  What we hold, and what we never ask for.
                </RippleHeading>
              </div>
              <p className="mt-8 max-w-[58ch] text-ink-600 2xl:mt-0">
                A name, a number and your dates are all it takes to hold a piece. This page
                says where that goes, who else touches it, and what your own browser keeps
                without telling us.
              </p>
            </div>

            <dl className="border-t border-ink-900/15 text-caption">
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Applies to</dt>
                <dd className="text-ink-900">This website</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Tracking</dt>
                <dd className="text-ink-900">Only if you allow it</dd>
              </div>
              <div className="flex justify-between gap-6 border-b border-ink-900/15 py-3">
                <dt className="eyebrow">Updated</dt>
                <dd className="tabular text-ink-900">18 September 2026</dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      {/* ---------- The document ------------------------------------------- */}
      <section className="relative bg-porcelain-100 py-14 md:py-20">
        <SectionEdge
          seed={41}
          paper="var(--color-porcelain-50)"
          reveal="var(--color-porcelain-100)"
        />

        <div className="shell-wide relative">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,15rem)_1fr] lg:gap-24">
            <nav aria-label="This page" className="lg:sticky lg:top-24 lg:self-start">
              <p className="eyebrow">Contents</p>
              <ol className="mt-5 border-t border-ink-900/15">
                {CLAUSES.map((c) => (
                  <li key={c.id} className="border-b border-ink-900/15">
                    <a
                      href={`#${c.id}`}
                      className="flex items-baseline gap-4 py-3 text-ink-600 transition-colors duration-[180ms] hover:text-ink-900"
                    >
                      <span className="tabular text-caption text-gold-700">{c.n}</span>
                      <span>{c.title}</span>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>

            <div>
              <div
                className={`hidden border-b border-ink-900/25 pb-4 text-caption text-ink-600 md:grid 2xl:hidden ${LEDGER}`}
              >
                <span className="eyebrow">No.</span>
                <span className="eyebrow">Term</span>
                <span className="eyebrow">What it means</span>
              </div>

              <Reveal className="2xl:grid 2xl:grid-cols-2 2xl:gap-x-16 2xl:border-t 2xl:border-ink-900/25">
                {CLAUSES.map((c) => (
                  <article
                    key={c.id}
                    id={c.id}
                    data-reveal
                    className={`grid scroll-mt-28 gap-3 border-b border-ink-900/15 py-8 md:items-baseline md:py-10 ${LEDGER}`}
                  >
                    <p className="tabular text-caption text-gold-700">{c.n}</p>
                    <h2 className="text-h3 text-ink-900">{c.title}</h2>
                    <p className="max-w-[62ch] text-ink-600">{c.covers}</p>
                  </article>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Close --------------------------------------------------- */}
      <section className="grain relative bg-violet-950 py-24 on-dark md:py-32">
        <SectionEdge
          seed={42}
          paper="var(--color-porcelain-100)"
          reveal="var(--color-violet-950)"
        />

        <div className="shell-wide relative">
          <Ornament className="max-w-[7rem]" />

          <div className="mt-10 grid items-start gap-12 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-24">
            <div className="2xl:grid 2xl:grid-cols-[minmax(0,1fr)_minmax(0,38ch)] 2xl:gap-16">
              <div>
                <RippleHeading className="max-w-[18ch] text-h2 text-porcelain-50 2xl:max-w-[26ch]">
                  Ask us anything about your details.
                </RippleHeading>
              </div>
              <div>
                <p className="mt-8 max-w-[62ch] text-violet-300 2xl:mt-0">
                  If you want to know what we hold, have it corrected, or have it removed
                  once your booking is finished, tell us and we will sort it out. A phone
                  call is the quickest way, and you will be speaking to the same people who
                  run the shop.
                </p>
                <div className="mt-10 flex flex-wrap gap-4">
                  <Button href="/policies" variant="primary-dark">
                    Rental terms
                  </Button>
                  <Button href="/visit" variant="ghost-dark">
                    Visit the shop
                  </Button>
                </div>
              </div>
            </div>

            <dl className="border-t border-porcelain-50/20 text-caption">
              <div className="border-b border-porcelain-50/20 py-4">
                <dt className="eyebrow">Ask in person</dt>
                <dd className="mt-2 text-porcelain-50">{SHOP.address}</dd>
                <dd className="tabular mt-1 text-violet-300">{SHOP.hours}</dd>
              </div>
              <div className="border-b border-porcelain-50/20 py-4">
                <dt className="eyebrow">Ask by phone</dt>
                <dd className="mt-2">
                  <a
                    href={`tel:${SHOP.phone.replace(/\s/g, "")}`}
                    className="tabular text-porcelain-50 underline-offset-4 hover:underline"
                  >
                    {SHOP.phone}
                  </a>
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>
    </>
  );
}
