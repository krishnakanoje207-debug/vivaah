import type { Metadata } from "next";
import { ComingSoon } from "@/components/site/ComingSoon";

export const metadata: Metadata = { title: "Rental terms" };

export default function PoliciesPage() {
  return (
    <ComingSoon
      eyebrow="The fine print"
      title="Rental terms"
      body="Booking, extension and damage policies will be editable by the shop from the admin panel, and shown here in both English and Hindi."
    />
  );
}
