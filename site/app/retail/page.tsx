import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/ComingSoon";

export const metadata: Metadata = { title: "The boutique" };

export default function RetailPage() {
  return (
    <ComingSoon
      eyebrow="Not just rentals"
      title="The boutique, to buy"
      body="Sarees, gowns, anarkalis and more — browse by category, pick your colour and size, and reserve for pickup. The retail storefront comes online in a later build phase."
    />
  );
}
