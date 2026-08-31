---
company: lemlist (lempire)
slug: lemlist
domain: lemlist.com
category: Multichannel outbound sequencing platform ("The AI Outbound Platform")
researched: 2026-08-24
confidence: high
---

# lemlist

> "The AI Outbound Platform for Relevant Outreach at Every Scale"
> — https://lemlist.com/
>
> "Cover your TAM with AI agents that research, personalize, and engage prospects on autopilot."

**One-line read:** Sequencing across *every* channel — email, LinkedIn, phone, SMS,
WhatsApp — with personalization as the differentiator. Where Instantly optimizes
volume, lemlist optimizes relevance.

## What they sell

A 650M+ lead database, an email finder/verifier, multichannel sequences, LinkedIn
prospecting, in-app calling, SMS and WhatsApp, a unified inbox, deliverability
setup (**lemwarm**), and an AI campaign builder (**lemAgent**) plus intent-signal
and enrichment agents. Claim: "20,000+ other sales teams run their entire outbound
in lemlist."

Notably, lemlist ships a **CLI, an MCP server, and a `/claude-skills/` library** —
they are building for agent-driven operation, not just a UI.

## Use cases they lead with

No `use-cases/` bucket either; lemlist organizes by **channel** and by **vertical
intent signals** (`/product/intent-signals/for-sales`, `for-fintech`,
`for-recruiting`, `for-marketing`).

| their label | what it means | source |
|---|---|---|
| Multichannel Sequences | one cadence across email + LinkedIn + SMS + WhatsApp + calls | https://lemlist.com/ |
| LinkedIn Prospecting | connection requests and DMs inside the sequence | same |
| Intent Signals | trigger outreach on a detected buying signal | https://lemlist.com/product/intent-signals |
| Deliverability (lemwarm) | warm the domain so the sequence lands | https://lemlist.com/product/lemwarm |
| lemAgent | conversational campaign builder | https://lemlist.com/product/lemagent |
| Data Enrichment Agents | fill in the record | https://lemlist.com/ |

Personas named: **Sales Reps, Sales Leaders, RevOps, Founders.**

**lemAgent's approval gate is worth quoting**, because it is the closest thing in
this cohort to our own rule:

> "Nothing launches without your approval. lemAgent hands you the full campaign for
> review: the brief, the list, the sequence, and every message. Edit what you want,
> approve the rest, and launch without leaving the chat."
> — https://lemlist.com/product/lemagent

**What the site does not claim:** anything about the recipient's website or what
happens after they reply. Same boundary as the rest of the cohort.

## Pricing and the metering unit

| tier | price (annual) | price (monthly) | metered on | source |
|---|---|---|---|---|
| Email | $55/user/mo | $69/user/mo | 50,000 emails/mo, unlimited users & senders | https://lemlist.com/pricing |
| Multichannel | $87/user/mo | $109/user/mo | unlimited messages, 5 senders/user | same |
| Enterprise | custom | — | ≥5 senders/user, SSO/SAML | same |
| Credits (add-on) | 1 credit = $0.01 | — | verified email 5cr, phone 20cr, intent signal 20–400cr | same |

**The metering unit is `seat × channel`,** with data sold separately as credits.
lemlist thinks it is selling **a rep's reach across channels**.

## Who buys it

European-leaning SMB and mid-market sales teams; 30 published success stories
including Spendesk, Mindee, iRev, Devlo. Testimonials cite Paddle and ElevenLabs.

## Shape of the company

| | | source |
|---|---|---|
| founded | 2018 | https://saasclub.io/podcast/lempire-guillaume-mobeche-405/ |
| HQ | Paris, France | same |
| founder | Guillaume Moubeche (CEO of lempire) | same |
| founder background | build-in-public operator; lempire is a portfolio — lemlist, lemwarm, Taplio, Tweet Hunter, lemcal | same |
| headcount | ~160 (2026) | https://getlatka.com/companies/lemlist |
| funding | **bootstrapped**; $30M raised in a 2021 *secondary* at a $150M valuation — founders selling shares, not new VC into the company | same |
| revenue | ~$53M ARR (2026), up from ~$40M (2025) | same |

## What search found that the site didn't

- The market files lemlist as the **personalization/multichannel** option, opposite
  Instantly's volume play: "Instantly is built for high-volume sending with large
  warmup pools… Lemlist focuses on multichannel, highly personalized lower-volume
  outreach." https://www.devcommx.com/blogs/clay-vs-apollo-vs-instantly-comparison
- The standard head-to-head is **Clay vs lemlist framed as complementary**, not
  competitive — "Clay excels at data enrichment, lemlist dominates multichannel
  outreach." https://www.autotouch.ai/post/clay-vs-lemlist
- The bootstrapped-with-a-secondary structure is unusual and is a deliberate part of
  Moubeche's public brand.

**Who the market compares them to:** Instantly, Smartlead, Apollo, Saleshandy,
Salesloft/Outreach at the top end.

## Where we overlap

The **approval gate**, conceptually. lemAgent drafts a full campaign and refuses to
launch without a human. That is genuinely the same instinct as Envoy's "drafts and
queues, never sends" — and it is the one place a reader could reasonably say
"isn't that what you do?" The difference is what sits on either side of the gate:
lemlist gates *a campaign to strangers*; we gate *a message about a specific
storefront problem we found by walking that storefront*.

## How EarlBear is different

| axis | lemlist | EarlBear |
|---|---|---|
| the job it does | reach a prospect on whichever channel they answer | run a storefront's growth loop |
| tool vs. outcome | tool — a sequencer a rep operates | outcome — the fleet does the work |
| where the human sits | approves the campaign, then it sends autonomously | approves *and sends*; the agent never sends |
| unit of work sold | seat × channel, plus data credits | store run / experiment shipped |
| what happens after the click | out of scope | the entire product |
| who the buyer is | a sales rep or RevOps lead | a store owner buying growth |

lemlist is the best-mannered tool in this cohort and still stops in the same place
all of them do: at the moment a stranger replies. EarlBear's work is measured on a
storefront's conversion rate weeks later.

## Open questions

- lemlist ships `/claude-skills/` and an MCP server — worth reading as prior art for
  how a GTM tool exposes itself to an agent, independent of any competitive question.

## Sources

- https://lemlist.com/ — hero, modules, database size, customer count
- https://lemlist.com/pricing — tiers and credit costs
- https://lemlist.com/product/lemagent — the approval-gate quote
- https://getlatka.com/companies/lemlist — ARR, headcount, funding structure
- https://saasclub.io/podcast/lempire-guillaume-mobeche-405/ — founding, bootstrap story
- https://www.autotouch.ai/post/clay-vs-lemlist — market positioning vs Clay
