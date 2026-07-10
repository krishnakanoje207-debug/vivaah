import type { SpinConfig } from "@/components/site/SpinViewer";

export type Rental = {
  slug: string;
  name: string;
  note: string;
  occasion: string;
  colourName: string;
  colourHex: string;
  pricePerDay: number | null; // sample rates — real ones set in admin (Phase 1)
  prebook: number | null;
  spin: SpinConfig | null; // null until turntable frames exist
  description: string;
};

// Mirrors site/public/rentals/lahenga1/360/metadata.json (P0.4 output).
const LAHENGA1_SPIN: SpinConfig = {
  basePath: "/rentals/lahenga1/360",
  count: 32,
  ext: "webp",
  pad: 3,
  width: 576,
  height: 720,
  arcDegrees: 90,
  loop: false,
};

export const RENTALS: Rental[] = [
  {
    slug: "sage-rose",
    name: "Sage Rose",
    note: "Hand-embroidered net",
    occasion: "Reception",
    colourName: "Sage green",
    colourHex: "#b7c9a8",
    pricePerDay: 2500,
    prebook: 1500,
    spin: LAHENGA1_SPIN,
    description:
      "A soft sage-green lehenga in embroidered net, with pastel floral thread-work and a scalloped hem. The sheer dupatta carries the same delicate motifs — an unhurried, romantic look for receptions and sangeets.",
  },
  {
    slug: "marigold-silk",
    name: "Marigold Silk",
    note: "Zardozi bodice",
    occasion: "Sangeet",
    colourName: "Marigold",
    colourHex: "#d98a2b",
    pricePerDay: null,
    prebook: null,
    spin: null,
    description: "Photography in progress. This piece will get its own turntable view soon.",
  },
  {
    slug: "rosewood-velvet",
    name: "Rosewood Velvet",
    note: "Bridal drape",
    occasion: "Bridal",
    colourName: "Deep rose",
    colourHex: "#8e3b4a",
    pricePerDay: null,
    prebook: null,
    spin: null,
    description: "Photography in progress. This piece will get its own turntable view soon.",
  },
];

export const featuredRentals = RENTALS.slice(0, 3);
export const getRental = (slug: string) => RENTALS.find((r) => r.slug === slug);

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
