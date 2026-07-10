import { Ornament } from "@/components/site/Ornament";
import { Button } from "@/components/ui/Button";

// Placeholder for sections that arrive in later build phases, so nav never 404s.
export function ComingSoon({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <section className="bg-porcelain-50 pt-32 pb-28">
      <div className="shell max-w-2xl text-center">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-3 text-h1">{title}</h1>
        <div className="my-8">
          <Ornament className="mx-auto max-w-[12rem]" />
        </div>
        <p className="mx-auto max-w-lg text-ink-600">{body}</p>
        <div className="mt-9 flex justify-center gap-4">
          <Button href="/rentals" variant="primary">
            Explore rentals
          </Button>
          <Button href="/visit" variant="ghost">
            Visit the shop
          </Button>
        </div>
      </div>
    </section>
  );
}
