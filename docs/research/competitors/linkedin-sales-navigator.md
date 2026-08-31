---
company: LinkedIn Sales Navigator
slug: linkedin-sales-navigator
domain: linkedin.com/sales-navigator
category: Premium search-and-alerts layer over LinkedIn's member graph
researched: 2026-08-24
confidence: medium-high
---

# LinkedIn Sales Navigator

> A premium subscription for B2B professionals doing "advanced lead targeting,
> prospect tracking, and social selling."
> — https://snov.io/blog/what-is-linkedin-sales-navigator/

**One-line read:** Not a product in the same sense as the other four. It is a paid
**search filter and alert feed over LinkedIn's member graph**, sold per seat, with
a small allowance of InMails. It is the *source* the rest of this cohort scrapes,
enriches, and sends against.

**Note on scope:** "Navigator" in the WhatsApp thread almost certainly means
LinkedIn Sales Navigator. It is Microsoft-owned and does not publish a standalone
sitemap, so this dossier leans on the official help pages plus third-party
coverage rather than a site crawl.

## What they sell

Access, not automation:

- **40+ "spotlight" search filters** over the member graph, with unlimited searches
  and up to 2,500 results per query (versus 100 on a free account).
- **Lead and account lists**, saved leads, tags and notes.
- **Real-time buyer-intent alerts** — job changes, company news, engagement.
- **Smart Links** for tracking whether a deck was opened.
- **50 InMail credits per month** on every tier.
- CRM sync (Salesforce, HubSpot) on the higher tiers.

## Use cases they lead with

| their label | what it means | source |
|---|---|---|
| Lead and account search | find the right person inside the right company | https://www.linkedin.com/help/sales-navigator/answer/a1645134 |
| Buyer intent alerts | be told when something changes at a saved account | https://evaboot.com/blog/linkedin-sales-navigator-benefits |
| Social selling | warm the relationship inside LinkedIn before pitching | https://snov.io/blog/what-is-linkedin-sales-navigator/ |
| Smart Links | see who read the deck | same |
| CRM sync | write the graph back into Salesforce/HubSpot | same |

**What it explicitly does not do** — and this is the whole point of the entry:

- **No bulk email.** Outreach happens as InMail, inside LinkedIn, capped at 50/mo.
- **No CSV export.** There is no built-in way to export a lead list, which is
  precisely why an entire scraper economy (Evaboot, PhantomBuster, Wiza, Kanbox)
  exists around it.
- **No automation.** It won't send automated connection requests or messages.
- **A hard 2,500-profile ceiling** per search, no matter how large the result set.
- **Nothing outside LinkedIn.** Every datapoint comes from the member graph.

https://www.trykondo.com/blog/overcoming-linkedin-sales-navigator-limitations

## Pricing and the metering unit

| tier | monthly | annual | source |
|---|---|---|---|
| Core | $119.99/seat | $89.99/seat ($1,079.88/yr) | https://www.cleanlist.ai/blog/2026-05-08-linkedin-sales-navigator-pricing-guide |
| Advanced | $159.99/seat | $149.99/seat ($1,799.88/yr) | same |
| Advanced Plus | custom (~$1,300–1,600/seat/yr) | — | same |

**The metering unit is `seat`** — flat, per person, regardless of usage. LinkedIn is
selling **a person's access to the graph**. That is the oldest and least
usage-shaped business model in this cohort, and it works because the underlying
asset (1.3B+ members, 64M+ companies) is not reproducible.

## Who buys it

Individual reps and sales teams, at essentially every company size. LinkedIn's own
commissioned economics claim a 312% three-year ROI and payback under six months —
treat as vendor-supplied.
https://linkedin.github.io/linkedin-sales-navigator-roi-calculator/

## Shape of the company

| | | source |
|---|---|---|
| owner | Microsoft (acquired LinkedIn 2016) | — |
| product launched | 2014 | https://snov.io/blog/what-is-linkedin-sales-navigator/ |
| underlying asset | 1.3B+ LinkedIn members, 64M+ company pages | https://www.factors.ai/blog/linkedin-sales-navigator-cost |
| headcount / revenue | not separately disclosed — a product line, not a company | — |

There is no founder story here, and that is a finding: Navigator is a subscription
line inside a platform monopoly, not a startup with a thesis.

## What search found that the site didn't

- The most common thing written about Sales Navigator is **how to get data out of
  it** — a whole tool category (Evaboot, Kanbox, PhantomBuster, Wiza, Skrapp) exists
  to defeat the export restriction. That tells you the product's actual role in the
  market: **the seed list**, which somebody else enriches and somebody else sends.
- Practitioners cite the 2,500-result cap and manual CRM sync as the top friction.
- Instantly and lemlist both build LinkedIn steps into their sequences, and lemlist
  sells "LinkedIn Prospecting" as a product module — they treat Navigator's graph as
  a channel, not a competitor.

**Who the market compares them to:** Apollo (as a cheaper database with export),
ZoomInfo, Cognism, and the scraper tools that sit on top of it.

## Where we overlap

None. Navigator has no ecommerce surface, no site auditing, no experimentation, and
no notion of a storefront. The only conceivable point of contact is that a human at
EarlBear might use it, the way any company might.

## How EarlBear is different

| axis | Sales Navigator | EarlBear |
|---|---|---|
| the job it does | find and watch people inside LinkedIn | run a storefront's growth loop |
| tool vs. outcome | tool — a search box with alerts | outcome — the fleet does the work |
| where the human sits | doing 100% of the work | reviewing what the fleet already did |
| unit of work sold | seat | store run / experiment shipped |
| what happens after the click | out of scope; there is barely a click | the entire product |
| who the buyer is | an individual rep | a store owner buying growth |

Sales Navigator is a directory with a subscription. If a customer thinks we are
that, the confusion is about the word "leads," not about anything either product
does.

## Open questions

- Whether Navigator came up in the WhatsApp thread as a *competitor* or as a
  *tool we might buy* for Envoy's contact-discovery step. Worth asking — the answer
  changes whether it belongs in the post at all, and the post currently treats it as
  the far end of the confusion spectrum.

## Sources

- https://www.linkedin.com/help/sales-navigator/answer/a1645134 — official usage limits
- https://snov.io/blog/what-is-linkedin-sales-navigator/ — features, launch year
- https://www.trykondo.com/blog/overcoming-linkedin-sales-navigator-limitations — export/automation limits
- https://www.cleanlist.ai/blog/2026-05-08-linkedin-sales-navigator-pricing-guide — 2026 pricing
- https://www.factors.ai/blog/linkedin-sales-navigator-cost — graph size
- https://evaboot.com/blog/linkedin-sales-navigator-benefits — feature detail
