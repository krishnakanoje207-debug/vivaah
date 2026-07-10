import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/ComingSoon";

export const metadata: Metadata = { title: "Jewellery on rent" };

export default function JewelleryPage() {
  return (
    <ComingSoon
      eyebrow="Complete the look"
      title="Jewellery on rent"
      body="Rentable jewellery — bookable on its own or paired with a lehenga for your dates — arrives with the rental engine in the next build phase."
    />
  );
}
