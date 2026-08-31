---
company: Clay
slug: clay
domain: clay.com
category: GTM data orchestration platform ("infrastructure to get any data, run agentic workflows, and launch GTM plays")
researched: 2026-08-24
confidence: high
---

# Clay

> "Build systems to grow revenue" / "Infrastructure to get any data, run agentic workflows, and launch GTM plays."
> — https://www.clay.com/

**One-line read:** A spreadsheet that calls 200+ data vendors and an LLM per cell.
Clay is the *enrichment and orchestration* layer other GTM tools sit on top of — and
of this cohort, the one whose agent story is closest to ours in vocabulary and
furthest from ours in purpose.

**Name collision ruled out:** Clay the GTM data platform (clay.com), not Clay the
personal-CRM app (clay.earth), not the design studio of the same name.

## What they sell

A table where each row is a company or person and each column is an enrichment: a
data provider, an API call, a formula, or an AI agent. Four layers by their own
framing — **data infrastructure** (Audiences, a 200+ provider marketplace, signals
and intent, waterfall enrichment), **agents** (Claygent, an agent plugin CLI/API, an
MCP for reps), **orchestration** (workflows, functions, AI formatting), and
**execution** (ad sync to LinkedIn/Meta/Google, a native sequencer). Claim: "Trusted
by more than 500,000 leading GTM teams."

**Claygent** does "human-like web research" — visits websites, navigates pages, fills
forms, and extracts unstructured information in real time, across thousands of
domains in parallel.

## Use cases they lead with

Clay is the only company in this cohort with a **real `use-cases/` section** — 13
pages, an actual use-case map:

| their label | what it means | source |
|---|---|---|
| Outbound | score, personalize, and sequence cold outreach | https://www.clay.com/use-cases/outbound |
| CRM enrichment | keep Salesforce/HubSpot records fresh | https://www.clay.com/use-cases/crm-enrichment |
| Data enrichment | waterfall across providers to fill a field | https://www.clay.com/use-cases/data-enrichment |
| Inbound enrichment / Automated inbound | enrich a form fill before routing it | https://www.clay.com/use-cases/inbound-enrichment |
| ABM | build and target named-account lists | https://www.clay.com/use-cases/abm |
| TAM sourcing | enumerate the total addressable market | https://www.clay.com/use-cases/tam-sourcing |
| Account research | research an account before a call | https://www.clay.com/use-cases/account-research |
| Rep prospecting / Rep assist | put the above in a rep's hands | https://www.clay.com/use-cases/rep-prospecting |
| Territory planning | split accounts across a team | (nav) |
| PLG assist | act on product-usage signals | https://www.clay.com/use-cases/plg-assist |
| Reverse ETL | push warehouse data back into GTM tools | https://www.clay.com/use-cases/reverse-etl |

**What the site does not claim:** every one of those 13 use cases is about
*learning something about a buyer*. None is about changing anything on the
customer's own property. Clay's output is always a **field in a row**.

## Pricing and the metering unit

| tier | price | metered on | source |
|---|---|---|---|
| Free | $0 | 500 actions/mo, 100 data credits/mo, 200 rows/table | https://www.clay.com/pricing |
| Launch | from $167/mo | 15,000 actions, 3,000 credits, 50,000 rows/table | same |
| Growth | from $446/mo | 40,000 actions, 6,000 credits | same |
| Enterprise | custom | unlimited searches, SSO, RBAC, dedicated strategist | same |

Two separate meters. **Data credits** buy the data itself (from $0.05 each);
**actions** buy the platform work — enriching, running tables, calling AI models,
syncing out (under $0.01 each). A March 2026 repricing replaced Starter/Explorer/Pro
with Launch/Growth and cut marketplace data costs 50–90%.
https://www.devcommx.com/blogs/clay-vs-apollo-vs-instantly-comparison

**The metering unit is `enriched row`.** Clay thinks it is selling **records
resolved**, not seats and not sends. Seats are effectively free; the data is the
product.

## Who buys it

The strongest logo wall of the cohort: Stripe, OpenAI, Anthropic, Figma, Notion,
HubSpot, Canva, Google, Rippling, Workday, Uber, Siemens, eBay, Ramp, Intercom,
Perplexity, Cursor, ElevenLabs. Buyer is **GTM Ops / RevOps** — the technical person
who builds the pipeline machine, not the rep who works it.

## Shape of the company

| | | source |
|---|---|---|
| founded | June 2017 | https://research.contrary.com/company/clay |
| HQ | New York | https://betakit.com/canadian-founded-clay-raises-100-million-usd-series-c-led-by-alphabets-growth-fund/ |
| founders | Kareem Amin (CEO), Nicolae Rusan; Varun Anand joined as Head of Operations, late 2021 | https://research.contrary.com/company/clay |
| founder background | met at McGill, both started at Microsoft; built Shared Web, pivoted to Frame (acquired by Sailthru, 2012); Amin then VP Product at the Wall Street Journal, Rusan VP Product at Dow Jones | same |
| headcount | ~1,000 (2026), up from ~299 in 2024 | https://tracxn.com/d/companies/clay |
| funding | $100M Series C led by **CapitalG** (Alphabet) at **$3.1B** | https://pulse2.com/clay-100-million-series-c-raised-at-3-1-billion-valuation-for-ai-based-gtm-development-platform/ |
| latest mark | employee tender offer announced Jan 28, 2026 at **$5B**, led by DST Global | https://getlatka.com/companies/clay |
| revenue | ~$100M ARR (reported) | same |

## What search found that the site didn't

- **Clay is the assumed center of the modern stack, not a competitor to the
  senders.** The canonical guidance is "Clay and Instantly are designed to be used
  together"; Instantly lists Clay in its own marketplace; lemlist is positioned as
  complementary. https://www.devcommx.com/blogs/clay-vs-apollo-vs-instantly-comparison
- **Claygent's scope is deliberately narrow** — "researching companies and people
  for go-to-market purposes." Clay's own framing is that constraining the domain is
  what makes evaluation and quality possible: a "fat long tail" of questions inside
  one narrow domain. https://openai.com/index/clay/
- The recommended pattern in the community is explicitly **human-in-the-loop**:
  Claygent drafts, a person approves the send.
- Credit burn is the recurring practitioner complaint — web-scraping columns consume
  credits fast, and teams are advised to audit every research trace.

**Who the market compares them to:** Apollo (as the cheaper all-in-one), ZoomInfo,
Common Room, and "Clay + a sender" as the composite.

## Where we overlap

This is the real one. Clay ships **agents that browse the live web and extract
structured findings** — which, described that way, is Scout. Both of us run a fleet
of browsing agents against a list of domains and write structured rows.

The difference is what the row is *for*. Claygent visits a prospect's site to learn
something **about the buyer** so a rep can write a better first line. Scout walks a
storefront as a first-time customer with intent to buy, measuring **LCP, CLS, TTFB
and the friction that costs a sale** — findings about the *store*, which Medic then
fixes through reversible A/B experiments on the live site. Clay's agent produces a
data point. Ours produces a change to someone's revenue.

Clay also validates our architecture from the outside: their narrow-domain argument
for agent quality is the same argument behind our one-job-per-agent fleet.

## How EarlBear is different

| axis | Clay | EarlBear |
|---|---|---|
| the job it does | resolve any datapoint about any buyer | run a storefront's growth loop |
| tool vs. outcome | infrastructure — you build the system on it | outcome — the system already exists and runs |
| where the human sits | building tables and approving sends | reviewing what the fleet already shipped |
| unit of work sold | enriched row (credits + actions) | store run / experiment shipped |
| what happens after the click | out of scope — the row is the deliverable | the entire product |
| who the buyer is | GTM Ops building a pipeline machine | a store owner buying growth |
| what its agents look at | the buyer's public footprint, to describe them | the customer's own storefront, to fix it |

Clay is a factory for facts about strangers. EarlBear is a crew that works on your
store. The vocabulary collides — agents, enrichment, browsing the web — and the
object of the work does not.

## Open questions

- Whether Clay's data marketplace would be a sane provider for Envoy's
  contact-discovery step (the same question we have about Apollo, with better
  waterfall coverage and worse unit economics).

## Sources

- https://www.clay.com/ — hero, capability layers, logo wall, customer count
- https://www.clay.com/pricing — two-meter model, credit and action costs
- https://www.clay.com/use-cases/outbound — the 13 use-case labels
- https://www.clay.com/claygent — agent capabilities
- https://research.contrary.com/company/clay — founding, founder background
- https://pulse2.com/clay-100-million-series-c-raised-at-3-1-billion-valuation-for-ai-based-gtm-development-platform/ — Series C
- https://getlatka.com/companies/clay — $5B tender, ARR
- https://openai.com/index/clay/ — narrow-domain agent design
