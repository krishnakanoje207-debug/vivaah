# Graph Report - D:\vivaah website preview  (2026-07-03)

## Corpus Check
- 157 files · ~247,527 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 104 nodes · 133 edges · 10 communities (8 shown, 2 thin omitted)
- Extraction: 47% EXTRACTED · 53% INFERRED · 0% AMBIGUOUS · INFERRED: 70 edges (avg confidence: 0.85)
- Token cost: 71,000 input · 13,700 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Hero Video & Visual Aesthetic|Hero Video & Visual Aesthetic]]
- [[_COMMUNITY_Frontend Tech & Design References|Frontend Tech & Design References]]
- [[_COMMUNITY_Rental & Retail Catalogue|Rental & Retail Catalogue]]
- [[_COMMUNITY_Booking Engine & Anti-Abuse|Booking Engine & Anti-Abuse]]
- [[_COMMUNITY_Zero-Cost Messaging & Infrastructure|Zero-Cost Messaging & Infrastructure]]
- [[_COMMUNITY_Shop Location & Engagement|Shop Location & Engagement]]
- [[_COMMUNITY_Admin Panel & Content Management|Admin Panel & Content Management]]
- [[_COMMUNITY_UPI Payment Flow|UPI Payment Flow]]
- [[_COMMUNITY_Shop-Pickup Fulfilment|Shop-Pickup Fulfilment]]
- [[_COMMUNITY_Client Deliverables Checklist|Client Deliverables Checklist]]

## God Nodes (most connected - your core abstractions)
1. `Vivaah Website` - 22 edges
2. `Free-Tier Constraint` - 7 edges
3. `UPI QR Manual Verification` - 5 edges
4. `products table` - 5 edges
5. `bookings table` - 5 edges
6. `/admin Page` - 5 edges
7. `Rental Business Model (Lehenga + Jewellery)` - 5 edges
8. `WhatsApp Confirmation from Website's Own SIM` - 5 edges
9. `Recommend Engaging Additions` - 5 edges
10. `WhatsApp Cloud API Messaging` - 4 edges

## Surprising Connections (you probably didn't know these)
- `Free-Tier Constraint` --semantically_similar_to--> `Zero Monthly Running Cost`  [INFERRED] [semantically similar]
  IMPLEMENTATION_PLAN.md → CLIENT_PLAN.md
- `WhatsApp Cloud API Messaging` --semantically_similar_to--> `WhatsApp Confirmation from Website's Own SIM`  [INFERRED] [semantically similar]
  IMPLEMENTATION_PLAN.md → CLIENT_PLAN.md
- `Android SMS Gateway` --semantically_similar_to--> `SMS Confirmation from Owner's Own Phone Number`  [INFERRED] [semantically similar]
  IMPLEMENTATION_PLAN.md → CLIENT_PLAN.md
- `UPI QR Manual Verification` --semantically_similar_to--> `UPI Advance Payment (QR, Number, ID + Reference)`  [INFERRED] [semantically similar]
  IMPLEMENTATION_PLAN.md → CLIENT_PLAN.md
- `Double-Booking Prevention` --semantically_similar_to--> `Double-Booking Impossible (Date Hold)`  [INFERRED] [semantically similar]
  IMPLEMENTATION_PLAN.md → CLIENT_PLAN.md

## Hyperedges (group relationships)
- **Free-Tier Service Stack** — implementation_plan_cloudflare_workers, implementation_plan_supabase, implementation_plan_upstash, implementation_plan_resend [INFERRED 0.85]
- **Customer Messaging Channels** — implementation_plan_whatsapp_cloud_api, implementation_plan_android_sms_gateway, implementation_plan_resend [INFERRED 0.75]
- **Booking & Double-Booking Prevention Flow** — implementation_plan_bookings, implementation_plan_booking_items, implementation_plan_gist_exclusion_constraint, implementation_plan_pending_booking_expiry, implementation_plan_buffer_days [INFERRED 0.85]
- **What the Client Must Provide** — client_plan_client_provides, client_plan_spare_sim, client_plan_upi_payment, client_plan_google_maps_visit_us, client_plan_domain_cost [EXTRACTED 1.00]
- **Customer Booking Journey** — client_plan_booking_journey, client_plan_upi_payment, client_plan_double_booking_prevention, client_plan_one_tap_confirm, client_plan_auto_cancel_unconfirmed, client_plan_cleaning_gap [EXTRACTED 1.00]
- **Zero-Cost Confirmation Messaging** — client_plan_zero_cost_messaging, client_plan_whatsapp_confirmation, client_plan_sms_confirmation, client_plan_spare_sim [EXTRACTED 1.00]
- **Aesthetic Elements Form the Dusk Bridal Colour Palette** — hero_video_marigold_garlands, hero_video_fairy_lights, hero_video_rose_petals_garden, hero_video_dusk_lighting, hero_video_bridal_lehenga, hero_video_colour_palette [INFERRED 0.85]

## Communities (10 total, 2 thin omitted)

### Community 0 - "Hero Video & Visual Aesthetic"
Cohesion: 0.15
Nodes (17): Video Played on Hero Section (Frames Provided), Cinematic Video Hero Opening, Anime (Kling AI) Art Style, Bridal Lehenga and Ethnic Wear, Dusk Bridal Colour Palette (Purple, Marigold, Rose, Deep Red, Gold), Palette and Aesthetic Drive Website Design Direction, Dusk Lighting, Fairy Lights (+9 more)

### Community 1 - "Frontend Tech & Design References"
Cohesion: 0.14
Nodes (17): Y-Axis Rotating Lehenga Like Slamdunk Site, Spin-Around (Y-Axis Rotating) Lehenga Photos, Cloudflare Workers, Vivaah Implementation Plan, GSAP, Hero Video Section, Next.js, react-three-fiber (+9 more)

### Community 2 - "Rental & Retail Catalogue"
Cohesion: 0.16
Nodes (16): Rental Scope: Only Lehenga + Jewellery, Retail Categories with Generic Selling Pages, Retail Scope: Everything Else, Semi-Rental Business (Rent + Retail, Female-Only), Availability Calendar (Free/Booked Dates), Colour-Dot Swatch Selector for Retail Dresses, Complete-the-Look Jewellery Suggestions, Rental Business Model (Lehenga + Jewellery) (+8 more)

### Community 3 - "Booking Engine & Anti-Abuse"
Cohesion: 0.17
Nodes (15): Rate Limiting in the Website, Auto-Cancel of Unconfirmed/Fake Bookings, Customer Booking Journey (Step-by-Step), Automatic Cleaning-Gap Days Between Bookings, Double-Booking Impossible (Date Hold), booking_items table, bookings table, Buffer Days (+7 more)

### Community 4 - "Zero-Cost Messaging & Infrastructure"
Cohesion: 0.20
Nodes (14): Whole Project Made for Free (Mention Any Charges), Messages from Owner's Own Number (Cut Charges), WhatsApp Details with Website Link for Engagement, Domain Cost (~Rs700-900/yr, Paid by Client), SMS Confirmation from Owner's Own Phone Number, Spare SIM Card for Website's WhatsApp, WhatsApp Confirmation from Website's Own SIM, Zero-Cost Messaging Rationale (+6 more)

### Community 5 - "Shop Location & Engagement"
Cohesion: 0.20
Nodes (10): Booking Details Delivered With Shop Location, Recommend Engaging Additions, Browse by Occasion (Bridal/Sangeet/Mehendi/Reception), Free Google Business Listing (Maps Discovery), Google Maps 'Visit Us' + Get Directions, Hindi/English One-Tap Language Switch, 'Tell Me When It's Free' Waitlist, 'Book a Trial Visit' Appointment (+2 more)

### Community 6 - "Admin Panel & Content Management"
Cohesion: 0.29
Nodes (8): All Content Customizable Through Admin Page, Booking Duration Extension Charges, Admin Control Panel (Owner Self-Service), Admin Phone Push Notification on New Booking, Booking Extension (Extra-Days) Charges, /admin Page, settings table, site_content table

### Community 7 - "UPI Payment Flow"
Cohesion: 0.83
Nodes (4): Prebooking Charges (for Lehengas), One-Tap Payment Confirmation by Owner, UPI Advance Payment (QR, Number, ID + Reference), UPI QR Manual Verification

## Knowledge Gaps
- **29 isolated node(s):** `Vivaah Implementation Plan`, `GSAP`, `Upstash`, `Resend`, `categories table` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Vivaah Website` connect `Frontend Tech & Design References` to `Hero Video & Visual Aesthetic`, `Rental & Retail Catalogue`, `Booking Engine & Anti-Abuse`, `Zero-Cost Messaging & Infrastructure`, `UPI Payment Flow`?**
  _High betweenness centrality (0.552) - this node is a cross-community bridge._
- **Why does `bookings table` connect `Booking Engine & Anti-Abuse` to `Admin Panel & Content Management`, `UPI Payment Flow`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **Why does `UPI QR Manual Verification` connect `UPI Payment Flow` to `Frontend Tech & Design References`, `Booking Engine & Anti-Abuse`?**
  _High betweenness centrality (0.232) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Vivaah Hero Section Video` (e.g. with `Hero Video Section` and `Cinematic Video Hero Opening`) actually correct?**
  _`Vivaah Hero Section Video` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 6 inferred relationships involving `Free-Tier Constraint` (e.g. with `Cloudflare Workers` and `Supabase`) actually correct?**
  _`Free-Tier Constraint` has 6 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `UPI QR Manual Verification` (e.g. with `bookings table` and `UPI Advance Payment (QR, Number, ID + Reference)`) actually correct?**
  _`UPI QR Manual Verification` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `products table` (e.g. with `categories table` and `/rentals Page`) actually correct?**
  _`products table` has 4 INFERRED edges - model-reasoned connections that need verification._