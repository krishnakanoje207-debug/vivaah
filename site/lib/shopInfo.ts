// The shop's details as the owner saves them in Settings. SERVER CODE ONLY.
//
// Neon's `settings` row `shop_info` is the truth; Cloudflare KV (`SHOP_KV`)
// holds a copy, because the footer shows the address and hours on EVERY route,
// including /visit, /policies, /privacy and the 404, which otherwise touch no
// database. A Neon read there would wake a free-tier database that sleeps after
// five idle minutes just to print an address; a KV read is served from the edge.
//
//   read:  KV -> on a miss, Neon, and the copy is written back -> on any
//          failure, the built-in values in lib/site.ts.
//   write: saveShop (admin Settings) updates Neon and then the KV copy.
//
// KV is eventually consistent and edge reads are cached for 60s, so a saved
// change reaches every visitor within about a minute. Outside the Worker (the
// tsx gates, `next dev` before its bindings are up) there is no KV and this
// reads Neon directly.
//
// Anything left empty falls back: the address, map link and hours to the
// built-in values, the rest to nothing, and each page hides a row whose value
// is empty rather than printing a placeholder at a customer.

import { cache } from "react";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { sql } from "@/lib/db";
import { SHOP } from "@/lib/site";

const KEY = "shop_info";

/** What the old copy said when the owner had given no figure: a typical market price. */
export const DEFAULT_PURCHASE_PRICE = 80_000;

export type Shop = {
  address: string;
  /** False while the address is still the built-in placeholder. Gates the map embed. */
  realAddress: boolean;
  mapsUrl: string;
  mapsEmbedUrl: string;
  hours: string;
  town: string;
  gettingHere: string;
  whyBack: string;
  purchasePrice: number;
  retention: string;
  /** /policies' terms in the shop's own words. Empty means not written yet. */
  terms: { extensions: string; damage: string; pickup: string; charges: string };
};

type Stored = Record<string, unknown>;

function kv(): KVNamespace | undefined {
  try {
    return getCloudflareContext().env.SHOP_KV;
  } catch {
    return undefined;
  }
}

export function shape(v: Stored): Shop {
  const s = (k: string) => (typeof v[k] === "string" ? (v[k] as string).trim() : "");
  const realAddress = s("address") !== "";
  const address = realAddress ? s("address") : SHOP.address;
  // The keyless `?q=` form needs no API key and no billing account.
  const q = encodeURIComponent(`${SHOP.name}, ${address}`);
  const price = v.purchase_price;
  return {
    address,
    realAddress,
    mapsUrl: s("maps_url") || (realAddress ? `https://maps.google.com/?q=${q}` : SHOP.mapsUrl),
    mapsEmbedUrl: realAddress ? `https://maps.google.com/maps?q=${q}&output=embed` : SHOP.mapsEmbedUrl,
    hours: s("hours") || SHOP.hours,
    town: s("town"),
    gettingHere: s("getting_here"),
    whyBack: s("why_back"),
    purchasePrice: typeof price === "number" && Number.isInteger(price) && price > 0 ? price : DEFAULT_PURCHASE_PRICE,
    retention: s("retention"),
    terms: {
      extensions: s("terms_extensions"),
      damage: s("terms_damage"),
      pickup: s("terms_pickup"),
      charges: s("terms_charges"),
    },
  };
}

/** The shop's details for this request. Never throws. */
export const getShop = cache(async (): Promise<Shop> => {
  const store = kv();
  try {
    const hit = await store?.get<Stored>(KEY, { type: "json", cacheTtl: 60 });
    if (hit) return shape(hit);
  } catch {
    // Fall through to Neon.
  }
  try {
    const rows = await sql<{ value: Stored }>`select value from settings where key = ${KEY}`;
    const value = rows[0]?.value ?? {};
    await mirror(value);
    return shape(value);
  } catch {
    return shape({});
  }
});

/** Put Neon's value in KV. A failed write only means the next read goes to Neon. */
export async function mirror(value: Stored): Promise<void> {
  try {
    await kv()?.put(KEY, JSON.stringify(value));
  } catch {
    // Nothing to do: the read path heals it.
  }
}
