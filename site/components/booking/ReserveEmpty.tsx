import { Button } from "@/components/ui/Button";

/**
 * /reserve with nothing bookable in it: a link with no pieces, pieces that have
 * since been taken off the rail, or every piece removed on the page itself.
 * Typographic poster, like the 404, with the two real ways back.
 */
export function ReserveEmpty() {
  return (
    <section className="bg-porcelain-50 pt-24 pb-28 md:pt-32 md:pb-36">
      <div className="shell">
        <p className="eyebrow">Reserve online, collect at the shop</p>
        <h1 className="mt-3 max-w-[18ch] text-h1">
          Nothing to reserve <em className="italic">yet</em>
        </h1>
        <p className="mt-6 max-w-[46ch] text-body text-ink-600">
          Choose a piece to rent, then reserve your dates from its page or from
          your selection.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button href="/rentals" variant="primary">
            See what is in for rent
          </Button>
          <Button href="/jewellery" variant="ghost">
            Jewellery to rent
          </Button>
        </div>
      </div>
    </section>
  );
}
