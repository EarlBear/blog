---
company: Apollo.io
slug: apollo-io
domain: apollo.io
category: All-in-one B2B sales intelligence + sales engagement platform ("AI sales platform")
researched: 2026-08-24
confidence: high
---

# Apollo.io

> "The AI sales platform for smarter, faster revenue growth"
> — https://www.apollo.io/

**One-line read:** A contact database with a sequencer bolted on. Apollo sells a
*seat* to a salesperson so they can find a stranger and start a conversation.

## What they sell

Apollo is a B2B contact database — "240M+ contacts and 30M+ companies" — wrapped
in the tooling a sales rep needs to act on it: search, list building, email
sequences, a dialer, meeting booking, call recording, and CRM enrichment. Their own
framing is three verbs: **Build → Execute → Improve**. They claim "over 600,000
companies using Apollo."

## Use cases they lead with

The sitemap has **no `use-cases/` bucket** — Apollo organizes by *persona* and by
*solution* instead, which is itself the tell: it is sold to a job title.

| their label | what it means | source |
|---|---|---|
| Outbound | "Turn hours of prospecting into minutes" — build a list, sequence it | https://www.apollo.io/solutions/outbound-sales-software |
| Inbound | "Qualify and act on inbound leads in seconds" — routing + scoring | https://www.apollo.io/solutions/inbound-lead-conversion |
| Data Enrichment | "Fuel smarter selling with always-fresh data" — fill in CRM gaps | https://www.apollo.io/solutions/b2b-data-enrichment |
| Deal Execution | "Capture every conversation, accelerate every deal" — call recording, deal mgmt | https://www.apollo.io/solutions/outbound-sales-software |

Personas addressed by name: **Sales Leaders, Account Executives, Sales Development,
RevOps, Marketers, Founders** (`/personas/*`, 6 pages).

Also shipped: an **MCP server** (`/product/mcp`) and an API — so the database is
addressable by an agent, not just a human.

**What the site does not claim:** nothing about a customer's *own* website,
storefront, conversion rate, or post-click experience. Apollo's world ends at the
prospect's inbox.

## Pricing and the metering unit

| tier | price (annual) | price (monthly) | credits | source |
|---|---|---|---|---|
| Free | $0 | $0 | limited | https://www.apollo.io/pricing |
| Basic | $49/user/mo | $59/user/mo | 30,000/yr | https://www.warmly.ai/p/blog/apollo-pricing |
| Professional | $79/user/mo | $99/user/mo | 48,000/yr | same |
| Organization | $119/user/mo | $149/user/mo | 72,000/yr, 3-seat minimum | same |

**The metering unit is `seat × credit`.** A credit is burned when you *export a
contact out of Apollo* — 1 for an email, 5 for a mobile. Overages run $0.20 each.
Apollo thinks it is selling **access to records, per salesperson**.

## Who buys it

SMB and mid-market sales teams; the 3-seat minimum on Organization ($4,284/yr
floor) puts real spend at team scale. Named on the homepage: Customer.io, Census,
GTM Ops.

## Shape of the company

| | | source |
|---|---|---|
| founded | 2015, as **ZenProspect**; rebranded to Apollo.io in June 2018 | https://research.contrary.com/company/apollo.io |
| HQ | San Francisco | same |
| founders | Tim Zheng (CEO), Ray Li (CTO, ex-Square), Roy Chung (COO) | same |
| founder background | Zheng built BrainGenie, an adaptive math/science practice product; built prospecting tooling for himself after balking at a $9k/yr ZoomInfo quote. YC W16. | https://www.stacksync.com/blog/the-catastrophe-moat-the-origin-story-of-apollo-io |
| headcount | ~1,600 (2026), up from ~1,000 in 2023 | https://getlatka.com/companies/apolloio |
| funding | $250M total | https://techcrunch.com/2023/08/29/apollo-io-a-full-stack-sales-tech-platform-bags-100m-at-a-1-6b-valuation/ |
| last round | $100M Series D at $1.6B, Aug 2023, led by Bain Capital Ventures | same |
| investors | Bain Capital Ventures, Sequoia, Tribe Capital, Nexus Venture Partners | same |
| revenue | ~$150M ARR (reported) | https://getlatka.com/companies/apolloio |

## What search found that the site didn't

- **A split rating.** 4.7/5 on G2 across ~9,645 reviews, but **2.9/5 on Trustpilot**
  across ~1,049 — Trustpilot is dominated by billing disputes, account suspensions,
  and data-accuracy complaints. https://www.peopledatabenchmarks.com/reviews/apollo
- **Data accuracy is the recurring complaint.** Practitioners report bounce rates
  well above Apollo's claimed ~91% email accuracy; r/coldemail threads cite **32–38%
  bounce even on "verified" exports** through early 2026. Non-US (EMEA, APAC, LATAM)
  coverage is reported as materially weaker. https://nividh.com/reviews/apollo-io-review/
- **Support is their lowest-rated G2 sub-category** (4.2/5).
- The origin story is a founder who couldn't afford ZoomInfo — which explains the
  pricing posture and the "GTM for the rest of us" line.

**Who the market compares them to:** ZoomInfo, Clay, Instantly, Amplemarket,
Lead411, Salesforce/Agentforce.

## Where we overlap

One surface only: **Envoy**, our outreach drafter, needs to discover the business
contact behind a storefront it has audited. That is a contact-discovery problem, and
Apollo sells contact discovery. Apollo could plausibly be a *provider* to Envoy — it
is not a substitute for EarlBear.

## How EarlBear is different

| axis | Apollo.io | EarlBear |
|---|---|---|
| the job it does | help a rep find and email strangers | run a storefront's growth loop |
| tool vs. outcome | tool — you operate it | outcome — the fleet does the work |
| where the human sits | operating the tool all day | reviewing what the fleet already did |
| unit of work sold | seat × exported record | store run / experiment shipped |
| what happens after the click | nothing — Apollo's world ends at the inbox | that is where our work *starts* |
| who the buyer is | a sales team buying pipeline | a store owner buying growth |

Apollo sells a salesperson a faster way to start a conversation. EarlBear doesn't
sell conversations at all — it audits a live storefront, ships A/B experiments
against it, and rolls back the ones that lose. The only place our lines touch is a
single scaffolded step inside one of our four agents.

## Open questions

- Actual bounce rate on Apollo exports in the ecommerce/Shopify segment we scan —
  the public complaints are B2B SaaS-flavored.
- Whether Apollo's MCP server would make it a cheap contact provider for Envoy.

## Sources

- https://www.apollo.io/ — hero, product modules, database size, customer count
- https://www.apollo.io/pricing, https://www.apollo.io/pricing/about-credits — credit semantics
- https://www.warmly.ai/p/blog/apollo-pricing — 2026 tier prices
- https://research.contrary.com/company/apollo.io — founding, history
- https://www.stacksync.com/blog/the-catastrophe-moat-the-origin-story-of-apollo-io — origin story
- https://techcrunch.com/2023/08/29/apollo-io-a-full-stack-sales-tech-platform-bags-100m-at-a-1-6b-valuation/ — Series D
- https://getlatka.com/companies/apolloio — headcount, ARR
- https://www.peopledatabenchmarks.com/reviews/apollo — review split
- https://nividh.com/reviews/apollo-io-review/ — data-accuracy complaints
