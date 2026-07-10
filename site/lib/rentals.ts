import type { SpinConfig } from "@/components/site/SpinViewer";

export type Review = {
  name: string;
  rating: number; // 1–5
  body: string;
  verified: boolean;
};

export type Rental = {
  slug: string;
  name: string;
  note: string;
  occasion: string;
  category: string; // rental category slug (lib/categories.ts)
  colourName: string;
  colourHex: string;
  pricePerDay: number | null; // sample rates — real ones set in admin (Phase 1)
  prebook: number | null;
  spin: SpinConfig | null; // null until turntable frames exist
  description: string;
  reviews: Review[]; // stub sample reviews until Phase 2 submission ships
};

// Even-spaced frame stills for the swipeable gallery (front → back).
export function galleryFrames(spin: SpinConfig, n = 5): string[] {
  const idx = Array.from({ length: n }, (_, i) => Math.round((i * (spin.count - 1)) / (n - 1)));
  return idx.map((i) => `${spin.basePath}/${String(i).padStart(spin.pad, "0")}.${spin.ext}`);
}

// Mirrors site/public/rentals/lahenga1/360/metadata.json. All 87 frames
// (2.6°/frame → smooth swing), FULL uncropped 1280×720 frame (watermark painted out).
const LAHENGA1_SPIN: SpinConfig = {
  basePath: "/rentals/lahenga1/360",
  count: 87,
  ext: "webp",
  pad: 3,
  width: 1280,
  height: 720,
  arcDegrees: 225,
  loop: false,
};

export const RENTALS: Rental[] = [
  {
    slug: "sage-rose",
    name: "Sage Rose",
    note: "Hand-embroidered net",
    occasion: "Reception",
    category: "bridal-lehengas",
    colourName: "Sage green",
    colourHex: "#b7c9a8",
    pricePerDay: 2500,
    prebook: 1500,
    spin: LAHENGA1_SPIN,
    description:
      "A soft sage-green lehenga in embroidered net, with pastel floral thread-work and a scalloped hem. The sheer dupatta carries the same delicate motifs — an unhurried, romantic look for receptions and sangeets.",
    reviews: [
      {
        name: "Ananya R.",
        rating: 5,
        body: "Rented this for my reception — even lovelier in person, and the fit was perfect after a quick alteration at the shop.",
        verified: true,
      },
      {
        name: "Priya M.",
        rating: 5,
        body: "The embroidery is so delicate. Being able to spin it online before visiting saved me so much time.",
        verified: true,
      },
      {
        name: "Simran K.",
        rating: 4,
        body: "Beautiful colour and drape. Booking and pickup were smooth.",
        verified: false,
      },
    ],
  },
  {
    slug: "ivory-indo-western",
    name: "Ivory Indo-Western",
    note: "Cape drape",
    occasion: "Sangeet",
    category: "indo-western",
    colourName: "Ivory",
    colourHex: "#efe9dd",
    pricePerDay: null,
    prebook: null,
    spin: null,
    description: "Photography in progress. This piece will get its own turntable view soon.",
    reviews: [],
  },
  {
    slug: "midnight-gown",
    name: "Midnight Gown",
    note: "Sequin bodice",
    occasion: "Reception",
    category: "gowns",
    colourName: "Midnight violet",
    colourHex: "#2f1e4d",
    pricePerDay: null,
    prebook: null,
    spin: null,
    description: "Photography in progress. This piece will get its own turntable view soon.",
    reviews: [],
  },
];

export const featuredRentals = RENTALS.slice(0, 3);
export const getRental = (slug: string) => RENTALS.find((r) => r.slug === slug);

export const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
