// Whether page counting is switched on at all. A plain module, not the client
// component, because the footer and /privacy are server components and a value
// imported from a "use client" file reaches them as a client reference, not as
// the value.
//
// Owner's call, 2 Oct 2026: until she has a Cloudflare Web Analytics token, the
// site does not ask about counting. A consent panel for counting that is not
// happening would ask visitors to agree to nothing. So with no token there is no
// banner, no "Cookie choices" in the footer, and /privacy says nothing is
// counted. Setting the token (it is inlined at build) turns all three on together.
export const BEACON_TOKEN = process.env.NEXT_PUBLIC_CF_BEACON_TOKEN || "";
export const ANALYTICS_ON = BEACON_TOKEN !== "";
