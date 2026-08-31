---
name: competitor-analysis
description: Deep-research one company (a competitor, an adjacent tool, or a name a customer might confuse us with) and write a structured dossier to docs/research/competitors/<slug>.md. Use when the user says "research <company>", "competitor analysis", "who is <company>", "how are we different from <company>", "look into these companies", or names a list of vendors to size up. Finds the official site, maps its sitemap, crawls the pages that carry positioning (product, use cases, pricing, customers, docs), runs a site: search battery for assets the marketing site hides, profiles the founders/team/size on LinkedIn and Crunchbase, and ends with an explicit "how we are different" delta against EarlBear.
---

# Competitor analysis

One company in, one dossier out. The dossier is the durable artifact — it lives at
`docs/research/competitors/<slug>.md` and is what later work (a positioning post, a
battlecard, a pitch objection-handler) reads instead of re-researching.

The point is **not** a feature checklist. It is to answer three questions a reader
actually has:

1. **What do they sell, and to whom?** — the use cases their own site leads with.
2. **What shape of company is it?** — founders, team, funding, headcount, age. A
   40-person Series B tool and a two-founder wrapper are different threats.
3. **Where do we and they actually differ?** — not "we're better", but the
   structural delta: different job, different buyer, different unit of work.

## Rules that keep a dossier honest

- **Every claim carries a source URL.** If you cannot cite it, write "unverified"
  and say what you looked at. Never fill a gap from memory — pricing, headcount,
  and funding all go stale.
- **Quote their words for positioning.** How a company describes itself is
  evidence; how you'd describe them is interpretation. Keep them separate.
- **Record the date.** A dossier is a snapshot. Stamp `researched: <YYYY-MM-DD>`
  in the frontmatter so a reader knows how much to trust it.
- **Do not scrape behind a login or a paywall**, and do not fetch LinkedIn member
  pages directly (they 999/authwall). Use web search results, company About pages,
  press coverage, and Crunchbase-style profiles instead.
- **Absence is a finding.** No pricing page, no team page, no customer logos — say
  so. It is often the most telling line in the dossier.

## Steps

### 1. Resolve the company to a canonical domain

Do not assume the domain from the name. Search first:

```
WebSearch: "<company>" official site
WebSearch: "<company>" <category hint, e.g. "sales engagement"> pricing
```

Confirm you have the right entity — names collide (Clay the GTM data tool vs. Clay
the CRM vs. Clay the design agency). Record the canonical domain and note any
name collisions you had to rule out, so the next reader doesn't repeat the work.

### 2. Map the site before you crawl it

Run the mapper — it pulls `robots.txt` and every `sitemap.xml` (following sitemap
indexes) and buckets URLs into the sections that carry positioning:

```bash
python3 .claude/skills/competitor-analysis/scripts/site_map.py <domain> --top 40
```

It prints a per-bucket URL count and the highest-signal URLs in each bucket
(`product`, `use-cases`, `solutions`, `pricing`, `customers`, `integrations`,
`docs`, `blog`, `about`, `legal`, `other`). Buckets that are **missing** are
findings — a company with 400 blog URLs and no `use-cases/` bucket is running a
different playbook from one with 30 solution pages.

If the sitemap is blocked or absent, fall back to a `site:` enumeration search
(step 4) and to the nav links on the homepage.

### 3. Crawl the positioning pages

WebFetch, in this order — stop when the picture stops changing:

| page | what to extract |
|---|---|
| homepage | the one-line self-description, the hero claim, the named buyer |
| `/product` or the product nav | the units of work the product operates on |
| `/use-cases`, `/solutions` | **the use-case map — this is the core deliverable** |
| `/pricing` | tiers, the metering unit (seats? credits? emails? records?), the floor price |
| `/customers`, `/case-studies` | who actually buys, and at what size |
| `/integrations` | where they sit in someone else's stack |
| `/about`, `/careers` | team size signal, founding story, where they're hiring |
| docs / API | what the product really does, stripped of marketing |

For the use-case map, capture **their labels verbatim**, then group them yourself.
The metering unit on the pricing page is usually the sharpest single fact in the
whole dossier: it tells you what the company thinks it is selling.

### 4. The `site:` search battery

The marketing site is the curated story. Search finds what it left out. Run these
against the canonical domain, and again without the `site:` operator for outside
coverage:

```
site:<domain> pricing
site:<domain> "case study" OR customers
site:<domain> security OR SOC 2 OR GDPR
site:<domain> careers OR "we're hiring"
site:<domain> changelog OR "release notes"
site:<domain> API OR docs
site:<domain> filetype:pdf
"<company>" review site:g2.com OR site:capterra.com
"<company>" site:news.ycombinator.com
"<company>" site:reddit.com complaints OR alternative
"<company>" alternatives OR "vs"
"<company>" funding OR raised OR Series
"<company>" layoffs OR acquisition OR shut down
```

The `vs` and `alternatives` searches are the highest-yield: the market has already
done the positioning work, and the pages that rank tell you who this company is
*actually* compared against — which is the shortlist a confused customer is on.

### 5. People and shape

```
"<company>" founder OR "co-founder" CEO
"<company>" site:linkedin.com/company
"<company>" founder site:linkedin.com/in
"<company>" site:crunchbase.com
"<company>" employees headcount
"<company>" "Series A" OR "Series B" OR seed
```

Capture, with sources: founders (names + prior background), founding year, HQ,
headcount band, total funding + last round, and any notable investors. Prior
background matters more than the numbers — a founding team out of a sales-tools
company builds a sales tool; a founding team out of infrastructure builds a
platform.

Do **not** fetch `linkedin.com/in/*` or `linkedin.com/company/*` URLs directly —
they authwall. Read the search-result snippets, the company About page, press
coverage, and podcast/conference bios instead. If a number is only in a snippet,
cite the snippet's source and mark the confidence.

### 6. Write the dossier

Copy `reference/dossier-template.md` and fill it in. Keep the section order — later
consumers (posts, battlecards) index into it by heading.

```bash
cp .claude/skills/competitor-analysis/reference/dossier-template.md \
   docs/research/competitors/<slug>.md
```

### 7. The delta section is not optional

The last section, **"How EarlBear is different"**, is the reason the dossier
exists. Write it as a structural contrast, not a scoreboard. The axes that
actually separate things in this market:

- **What the product is a machine for** — do they hand you a *tool* you operate,
  or do they *do the work*? A tool's output is capability; a service's output is
  outcome.
- **Where the human sits** — before the send, after it, or nowhere.
- **The unit of work sold** — a seat, a credit, a contact record, an email sent,
  a store run, an experiment shipped.
- **What happens after the click** — most of this market stops at the reply. If
  we don't, that is the line.
- **Who the buyer is** — a sales team buying pipeline tooling is not the same
  person as a store owner buying growth.

If, after all this, the honest answer is "we overlap on X" — write that down. A
dossier that finds no overlap anywhere usually means the research was shallow.

## Checks

Before calling it done:

```bash
grep -c 'http' docs/research/competitors/<slug>.md    # sources present
npm run posts-check                                    # only if you also wrote a post
```

- Every numeric claim has a URL or an explicit "unverified".
- `researched:` date is today.
- The delta section names a structural difference, not an adjective.
