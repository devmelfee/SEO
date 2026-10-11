# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Two audiences use the app today, confirmed by the owner on 2026-10-11:

- **The owner's own team (Melfee).** The app is the team's day-to-day tool for finding and closing local SEO clients.
- **Outside consultants and small marketing agencies (1 to 5 people).** They sell local SEO to local businesses in their city: pet shops, dentists, salons, workshops and so on. The app is sold to them in parallel.

Inside a team, the job splits by profile:

- **Prático** (sells): opens the app and wants to see who to message today, with the message already written.
- **Analista** (decides where to prospect): compares cities and niches, costs and the funnel before spending time and money.
- **Executor** (delivers): after the yes, needs the Google Business Profile texts, the site and the report ready to use.

The main context is the **phone**: users work between visits and in WhatsApp, often with one hand.

## Product Purpose
The app finds businesses in a city that are losing customers on Google. It scores each one from 0 to 100 and gives the reason: no website, few reviews, incomplete profile.

It then turns each business into a sale through four steps:

1. **Buscar:** search a niche and a city.
2. **Abordar:** a personalized WhatsApp message plus reminders.
3. **Propor:** a preview site and a proposal with the business's name, which the client accepts through a link.
4. **Entregar:** Google Business Profile texts generated with AI.

Success means the consultant sends the first proposal within days and closes paying monthly clients.

## Positioning
- **It covers the path from Google Maps to the contract.** Generic CRMs and lead lists stop at the contact. This app delivers the diagnosis, the message, the preview site and the proposal for that specific business.
- **The owner sees their own site before paying.**
- **WhatsApp is always sent by a person.** Each message goes out one by one from the user's own WhatsApp, at a human pace (45 to 90 s apart). The app never mass-sends.

## Operating Context
- WhatsApp is the sales channel. Messages open through `wa.me` links.
- Data comes from Google Maps (Places API) and from the Receita Federal registry via BrasilAPI (CNPJ status, partners, decision maker).
- Leads go out to other CRMs as CSV or through the public API `/api/v1`, using an API key.
- The owner can see what each person spends and set limits per person (Gastos panel).

## Capabilities and Constraints
- **Stack:** Next.js 14 App Router, Supabase and deploy on Vercel. AI through Anthropic (text and site models chosen in Gastos).
- **Language:** Brazilian Portuguese only.
- **Glossary:**
  - Nota de oportunidade: the 0–100 score of how much a business is losing on Google.
  - Onde prospectar: the comparison of cities and niches.
  - Abordagem: the WhatsApp outreach queue and messages.
  - Site de prévia: the preview site shown to the business owner.
  - Proposta: the proposal page the client accepts.
  - Decisor: the person who makes the decision at the business.
- **Contact validation:** link check, CNPJ in the Receita registry and decision maker. A contact that is invalid or has no WhatsApp leaves the queue.
- **Open:** published prices (`PRICING_PUBLISHED` in `app/apresentacao/page.tsx`, values proposed in `docs/oferta-e-preco.md`), automatic checkout (Pix first, see `docs/ROADMAP.md`), and the founder offer.

## Brand Commitments
- **No brand of its own.** Each installation shows the name of the agency that uses it, set in Ajustes (falls back to "SEO Local"). Preview sites and proposals carry the client business's name and the agency's name.
- **Voice:** direct, practical and Brazilian. It speaks like a person, avoids SEO jargon and avoids anything that reads as AI-written. Details in `.agents/product-marketing.md`.

## Evidence on Hand
- **Real data:** 438 of 684 businesses analyzed in Jundiaí had no website of their own (64%).
- **Measured costs:** about R$ 0.20 per Google search of 20 businesses, R$ 0.01 to R$ 1.20 per AI generation.
- **Screenshots:** real app screens in `public/apresentacao/`. Evidence in `evidence/`.
- **Not available yet:** testimonials, customer logos and results case studies. Do not create any until they exist.

## Product Principles
1. **Never promise a Google position or revenue.** Promise only what the delivery controls: a complete profile, a live site and published posts.
2. **The person sends, the app prepares.** Nothing goes out automatically on WhatsApp in the user's name.
3. **Real data or nothing.** Messages, preview sites and proposals use only the business's real data. They do not make up reviews, numbers or claims.
4. **One clear action per screen.** Each profile lands directly on what it needs to do, without excess information.
5. **Cost is always visible.** Every search and generation is logged per person, with its cost.

## Accessibility & Inclusion
- Phone-first use, with touch targets of at least 44 px.
- Readable contrast in bright light (users work on the street).
- Text in plain language for users who don't know SEO.
