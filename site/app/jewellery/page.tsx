import type { Metadata } from "next";
import { JewelleryContent } from "./JewelleryContent";

export const metadata: Metadata = {
  title: "Jewellery on rent",
  description:
    "Necklaces, temple gold, jhumkas and bangles, rented alongside an outfit and matched to it in the shop. Never sold separately.",
};

export default function JewelleryPage() {
  return <JewelleryContent />;
}
