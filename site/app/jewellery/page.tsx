import type { Metadata } from "next";
import { JewelleryContent } from "./JewelleryContent";

export const metadata: Metadata = { title: "Jewellery on rent" };

export default function JewelleryPage() {
  return <JewelleryContent />;
}
