---
title: "Life without EarlBear: pricing the growth team you would have to hire"
description: The roles, 2026 salary bands, hiring timeline, and monthly math of growing an ecommerce store by hand — with a calculator you can adjust for your own numbers.
pubDate: 2026-07-03
tags: [growth, economics]
authors: [omar]
draft: false
audience: external
questions:
  - You run an ecommerce store with good traffic and early traction — how do you actually grow it from here?
  - Who would you need to hire to optimize a store by hand, and what experience should each role have?
  - What are realistic 2026 salary bands for a growth team?
  - How long does each kind of change take, and how long does it take to set up and run one A/B test?
  - What does the whole team cost per month, all-in — and how do you run that math for your own store?
---

Say your store works. Traffic is real, orders arrive daily, and revenue has
found a rhythm — call it 50,000 sessions a month converting at 2% on an $80
average order, just under $1M a year.[^scenario] Then growth flattens, and the question
becomes the one every founder eventually types into a search bar: how do I
take this to the next level?

The honest answer, without software that does it for you, is: you hire a team.
Growth is not a tactic you bolt on; it is a full-time loop of analysis,
hypothesis, prioritization, building, testing, and measurement, and every step
of that loop is someone's job. This post prices that answer — the roles, the
salary bands, the calendar, and the monthly bill — so you can see what "do it
manually" actually costs before you choose it.

## What growth work actually is

Growing a store that already has traction is not one big move. It is a queue
of small, testable changes, each of which has to earn its place:

1. **Analyze** — find where the funnel leaks (product page, cart, checkout,
   post-purchase).
2. **Hypothesize** — propose a change that should close the leak.
3. **Prioritize** — rank it against everything else by expected impact and
   effort.
4. **Build** — design, implement, and QA the change behind a flag.
5. **Test** — run an A/B test until the result is statistically conclusive.
6. **Decide** — ship the winner, revert the loser, log what you learned.

Each pass through the loop takes real calendar time, and the build step alone
varies by an order of magnitude:

| Change | Build time |
| --- | --- |
| <span class="num">Copy, pricing display, or CTA tweak</span> | <span class="num">1–2 days</span> |
| <span class="num">New landing page or PDP layout</span> | <span class="num">1–2 weeks</span> |
| <span class="num">Site speed and Core Web Vitals work</span> | <span class="num">1–3 weeks</span> |
| <span class="num">Checkout flow change</span> | <span class="num">2–4 weeks</span> |
| <span class="num">Recommendations or merchandising logic</span> | <span class="num">3–6 weeks</span> |

And building the change is the fast part. The slow part is finding out whether
it worked.

## The A/B test math nobody warns you about

An A/B test needs enough visitors to tell signal from noise. The standard
approximation for the sample size per variant (80% power, 5% significance) is
16·p(1−p)/δ², where p is your baseline conversion rate and δ is the absolute
lift you want to detect.[^miller]

Plug in the store above[^scenario] — 2% baseline conversion:

- Detecting a **10% relative lift** (2.0% → 2.2%) needs about
  <span class="num">78,000 visitors per variant</span> — roughly
  <span class="num">157,000</span> total. At 50,000 sessions a month, that is
  **more than three months for one conclusive test**.[^derived]
- Detecting a **20% relative lift** (2.0% → 2.4%) needs about
  <span class="num">20,000 per variant</span> — call it
  <span class="num">3–4 weeks</span>, if you send it all your traffic.[^derived]

Add one to two weeks up front for instrumenting the test — variant assignment,
event tracking, QA on both arms — and the practical cadence at this traffic
level is roughly **one conclusive experiment per month**, and only for changes
big enough to plausibly move conversion 20%.[^derived] Subtle ideas are
untestable at this scale; you simply cannot afford the calendar.

That cadence is the constraint everything else hangs on: if you can only get
about twelve real answers a year, the people picking and building those twelve
bets had better be good. Which is why the hiring bar — and the payroll — looks
the way it does.

## The team you would hire

A minimal in-house growth team for a store at this stage is six people. The
salary bands below are 2026 US base-salary figures, drawn from published
compensation guides for each role: growth lead,[^ecp][^salarycom] senior
product manager,[^productschool] senior frontend engineer,[^builtin] senior
backend engineer,[^motion] growth data analyst,[^kore1] and support /
operations engineer.[^sre] Your market and remote policy will move them, which
is what the calculator below is for.

<figure class="salary" aria-label="2026 base-salary bands by role, low to high with the median marked">
<figcaption>Base salary band by role, with the median marked</figcaption>
<div class="salary-axis" aria-hidden="true"><span style="left:0%">$100k</span><span style="left:38.5%">$150k</span><span style="left:76.9%">$200k</span></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Growth lead</span><span class="salary-exp">8+ yrs; has owned a DTC or marketplace P&amp;L</span></div><div class="salary-track"><span class="salary-bar" style="left:38.5%;width:53.8%"><span class="salary-dot" style="left:65.4%"></span></span></div><div class="salary-val num">$150–220k</div></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Senior product manager</span><span class="salary-exp">5+ yrs; experimentation background</span></div><div class="salary-track"><span class="salary-bar" style="left:23.1%;width:46.1%"><span class="salary-dot" style="left:50.1%"></span></span></div><div class="salary-val num">$130–190k</div></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Senior frontend engineer</span><span class="salary-exp">5+ yrs; storefront performance, feature flags</span></div><div class="salary-track"><span class="salary-bar" style="left:23.1%;width:42.3%"><span class="salary-dot" style="left:50%"></span></span></div><div class="salary-val num">$130–185k</div></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Senior backend engineer</span><span class="salary-exp">5+ yrs; integrations, checkout and pricing</span></div><div class="salary-track"><span class="salary-bar" style="left:26.9%;width:46.2%"><span class="salary-dot" style="left:50%"></span></span></div><div class="salary-val num">$135–195k</div></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Growth data analyst</span><span class="salary-exp">3–5 yrs; experiment statistics, cohort analysis</span></div><div class="salary-track"><span class="salary-bar" style="left:7.7%;width:26.9%"><span class="salary-dot" style="left:50.2%"></span></span></div><div class="salary-val num">$110–145k</div></div>
<div class="salary-row"><div class="salary-head"><span class="salary-role">Support / operations engineer</span><span class="salary-exp">4+ yrs; SRE background; on-call, incident response</span></div><div class="salary-track"><span class="salary-bar" style="left:23.1%;width:34.6%"><span class="salary-dot" style="left:50%"></span></span></div><div class="salary-val num">$130–175k</div></div>
</figure>

The sixth seat is the one founders forget until the first outage. Every change
the team ships is another thing that can break at 2 a.m. — a checkout
regression, a third-party integration that starts timing out, a deploy that
tanks Core Web Vitals. The support / operations engineer owns the
unglamorous half of growth: monitoring and alerting, an on-call rotation,
incident response and postmortems, and the SLOs that turn "the site feels slow"
into a number someone is accountable for. Without that seat the experiment
velocity you paid for leaks straight back out as downtime and firefighting.

### Who owns what

Hiring the six roles is not the same as knowing who does what when a change
moves through the loop. This is where the manual path gets expensive in
coordination, not just salary: every step needs one accountable owner and the
right people consulted, or decisions stall. Mapped as RACI — **R**esponsible
(does the work), **A**ccountable (owns the outcome), **C**onsulted (weighs in),
**I**nformed (kept in the loop):

<figure class="raci" aria-label="RACI matrix: responsibility of each role across the growth loop">
<div class="raci-legend" aria-hidden="true"><span><i class="rb rb-a">A</i>Accountable</span><span><i class="rb rb-r">R</i>Responsible</span><span><i class="rb rb-c">C</i>Consulted</span><span><i class="rb rb-i">I</i>Informed</span></div>
<div class="raci-scroll">
<table class="raci-grid">
<thead><tr><th scope="col">Loop step</th><th scope="col">Growth<br />lead</th><th scope="col">Product<br />mgr</th><th scope="col">Front&shy;end</th><th scope="col">Back&shy;end</th><th scope="col">Analyst</th><th scope="col">Support<br />/ops</th></tr></thead>
<tbody>
<tr><th scope="row">Analyze the funnel</th><td><i class="rb rb-a">A</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-i">I</i></td><td><i class="rb rb-i">I</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-i">I</i></td></tr>
<tr><th scope="row">Hypothesize</th><td><i class="rb rb-c">C</i></td><td><i class="rb rb-ar">A·R</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-i">I</i></td></tr>
<tr><th scope="row">Prioritize</th><td><i class="rb rb-a">A</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td></tr>
<tr><th scope="row">Build the variant</th><td><i class="rb rb-i">I</i></td><td><i class="rb rb-a">A</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-i">I</i></td><td><i class="rb rb-c">C</i></td></tr>
<tr><th scope="row">Run the A/B test</th><td><i class="rb rb-i">I</i></td><td><i class="rb rb-a">A</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-i">I</i></td></tr>
<tr><th scope="row">Decide and ship</th><td><i class="rb rb-a">A</i></td><td><i class="rb rb-r">R</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td></tr>
<tr><th scope="row">Operate and keep it healthy</th><td><i class="rb rb-i">I</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-c">C</i></td><td><i class="rb rb-i">I</i></td><td><i class="rb rb-ar">A·R</i></td></tr>
</tbody>
</table>
</div>
</figure>

The pattern that matters: the support / operations engineer is **Accountable**
for the one row nobody else wants — keeping what you shipped alive — and
**Consulted** on every build and ship decision, because reliability is cheapest
when it is designed in, not bolted on after the incident.

Three multipliers sit on top of base salary:

- **Loaded cost.** Payroll taxes, benefits, equipment, and tooling add
  25–40% on top of base.[^hadzima] We use <span class="num">1.30</span> as the
  default below.
- **Recruiting.** Filling a role takes about 44 days on average — senior
  searches run longer[^shrm] — and a contingency agency costs 20–25% of
  first-year salary as a one-time fee, per role.[^leonar]
- **The top-of-market premium.** The bands above are mid-market. If you want the
  people who are demonstrably the best — the top decile, the ones who make the
  whole loop faster — you pay for the tail of the distribution, not the middle.
  Across engineering roles, 90th-percentile ("top of market") base pay runs
  roughly 60–85% above the median, and even reliably landing senior standouts
  usually means 15–20% over the going rate.[^percentile] The calculator's
  **talent tier** slider lets you dial from median to top-of-market and watch
  the bill move.

## The calendar: nine months to a working team

You cannot hire all six at once, because the first hire chooses the rest. The
growth lead takes two to three months to land (search, interviews, notice
period), ramps for a month, and only then starts hiring the product manager,
engineers, analyst, and support engineer. Here is a realistic sequence:

<figure class="gantt" aria-label="Hiring timeline: each role moves through recruiting, ramp-up, and productive phases across nine months">
<figcaption>Time to a productive growth team, by role</figcaption>
<div class="gantt-legend" aria-hidden="true">
<span><i class="sw sw-recruit"></i>Recruiting</span>
<span><i class="sw sw-ramp"></i>Ramp-up</span>
<span><i class="sw sw-prod"></i>Productive</span>
</div>
<div class="gantt-grid">
<div class="gantt-row"><span class="gantt-label">Growth lead</span><span class="gantt-track"><i class="seg seg-recruit" style="left:0%;width:27.4%" title="Growth lead: recruiting, months 0–2.5"></i><i class="seg seg-ramp" style="left:27.8%;width:10.7%" title="Growth lead: ramp-up, months 2.5–3.5"></i><i class="seg seg-prod" style="left:38.9%;width:61.1%" title="Growth lead: productive from month 3.5"></i></span></div>
<div class="gantt-row"><span class="gantt-label">Product manager</span><span class="gantt-track"><i class="seg seg-recruit" style="left:33.3%;width:16.3%" title="Product manager: recruiting, months 3–4.5"></i><i class="seg seg-ramp" style="left:50%;width:10.7%" title="Product manager: ramp-up, months 4.5–5.5"></i><i class="seg seg-prod" style="left:61.1%;width:38.9%" title="Product manager: productive from month 5.5"></i></span></div>
<div class="gantt-row"><span class="gantt-label">Frontend engineer</span><span class="gantt-track"><i class="seg seg-recruit" style="left:33.3%;width:21.8%" title="Frontend engineer: recruiting, months 3–5"></i><i class="seg seg-ramp" style="left:55.6%;width:10.7%" title="Frontend engineer: ramp-up, months 5–6"></i><i class="seg seg-prod" style="left:66.7%;width:33.3%" title="Frontend engineer: productive from month 6"></i></span></div>
<div class="gantt-row"><span class="gantt-label">Backend engineer</span><span class="gantt-track"><i class="seg seg-recruit" style="left:38.9%;width:21.8%" title="Backend engineer: recruiting, months 3.5–5.5"></i><i class="seg seg-ramp" style="left:61.1%;width:10.7%" title="Backend engineer: ramp-up, months 5.5–6.5"></i><i class="seg seg-prod" style="left:72.2%;width:27.8%" title="Backend engineer: productive from month 6.5"></i></span></div>
<div class="gantt-row"><span class="gantt-label">Growth analyst</span><span class="gantt-track"><i class="seg seg-recruit" style="left:44.4%;width:16.3%" title="Growth analyst: recruiting, months 4–5.5"></i><i class="seg seg-ramp" style="left:61.1%;width:10.7%" title="Growth analyst: ramp-up, months 5.5–6.5"></i><i class="seg seg-prod" style="left:72.2%;width:27.8%" title="Growth analyst: productive from month 6.5"></i></span></div>
<div class="gantt-row"><span class="gantt-label">Support engineer</span><span class="gantt-track"><i class="seg seg-recruit" style="left:44.4%;width:21.8%" title="Support engineer: recruiting, months 4–6"></i><i class="seg seg-ramp" style="left:66.7%;width:10.7%" title="Support engineer: ramp-up, months 6–7"></i><i class="seg seg-prod" style="left:77.8%;width:22.2%" title="Support engineer: productive from month 7"></i></span></div>
<div class="gantt-axis" aria-hidden="true"><span>0</span><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span><span>6</span><span>7</span><span>8</span><span class="axis-end">9 mo</span></div>
</div>
</figure>

The first experiment goes live around month six. Given the test math above,
the first statistically conclusive result — the first time you *know* a change
worked — lands around **month eight or nine**. Until then you are paying full
payroll for setup.

## The math, on your numbers

Every store is different, so here is the whole model in one widget: toggle
roles, adjust salaries to your market, set the overhead multiplier and your
realistic experiment cadence, and read off the bill. Defaults are the
mid-band figures from the table above.

<div class="calc" id="calc">
<div class="calc-roles">
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Growth lead</label><label class="calc-salary">$ <input type="number" data-salary value="185000" min="0" step="5000" aria-label="Growth lead base salary" /></label></div>
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Senior product manager</label><label class="calc-salary">$ <input type="number" data-salary value="160000" min="0" step="5000" aria-label="Senior product manager base salary" /></label></div>
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Senior frontend engineer</label><label class="calc-salary">$ <input type="number" data-salary value="155000" min="0" step="5000" aria-label="Senior frontend engineer base salary" /></label></div>
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Senior backend engineer</label><label class="calc-salary">$ <input type="number" data-salary value="165000" min="0" step="5000" aria-label="Senior backend engineer base salary" /></label></div>
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Growth data analyst</label><label class="calc-salary">$ <input type="number" data-salary value="128000" min="0" step="5000" aria-label="Growth data analyst base salary" /></label></div>
<div class="calc-role"><label class="calc-check"><input type="checkbox" data-role checked /> Support / operations engineer</label><label class="calc-salary">$ <input type="number" data-salary value="150000" min="0" step="5000" aria-label="Support / operations engineer base salary" /></label></div>
</div>
<div class="calc-params">
<label>Talent tier <span class="num" id="tierOut">median</span><input type="range" id="tier" min="0" max="85" step="5" value="0" aria-label="Talent tier premium over median, percent" /></label>
<label>Overhead multiplier <span class="num" id="multOut">1.30</span><input type="range" id="mult" min="1.20" max="1.45" step="0.01" value="1.30" aria-label="Loaded-cost overhead multiplier" /></label>
<label>Conclusive experiments per month <input type="number" id="expPerMo" value="1" min="0.25" max="10" step="0.25" aria-label="Conclusive experiments per month" /></label>
</div>
<div class="calc-tiles">
<div class="tile"><span class="tile-label">Monthly team cost</span><span class="tile-value num" id="outMonthly">–</span></div>
<div class="tile"><span class="tile-label">Annual run rate</span><span class="tile-value num" id="outAnnual">–</span></div>
<div class="tile"><span class="tile-label">First-year total</span><span class="tile-value num" id="outFirstYear">–</span><span class="tile-note">incl. 20% recruiting fees</span></div>
<div class="tile"><span class="tile-label">Cost per conclusive experiment</span><span class="tile-value num" id="outPerExp">–</span></div>
</div>
</div>

<style>
.salary { --salary-head: 210px; --salary-val: 82px; margin: var(--space-8) 0; }
.salary figcaption { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text); margin-bottom: var(--space-5); }
.salary-axis { position: relative; height: 14px; margin: 0 calc(var(--salary-val) + var(--space-4)) var(--space-2) calc(var(--salary-head) + var(--space-4)); }
.salary-axis span { position: absolute; transform: translateX(-50%); font-size: var(--fs-xs); font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-text-muted); }
.salary-row { display: grid; grid-template-columns: var(--salary-head) 1fr var(--salary-val); align-items: center; gap: var(--space-4); padding: var(--space-3) 0; }
.salary-row + .salary-row { border-top: 1px solid var(--color-border-subtle); }
.salary-head { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.salary-role { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text); }
.salary-exp { font-size: var(--fs-xs); color: var(--color-text-muted); line-height: var(--lh-snug); }
.salary-track { position: relative; height: 22px; }
.salary-bar { position: absolute; top: 50%; height: 8px; border-radius: var(--radius-pill); background: color-mix(in oklab, var(--eb-data-2) 30%, transparent); transform: translateY(-50%); }
.salary-dot { position: absolute; top: 50%; width: 11px; height: 11px; border-radius: 50%; background: var(--eb-data-2); transform: translate(-50%, -50%); box-shadow: 0 0 0 2px var(--color-surface); }
.salary-val { text-align: right; font-size: var(--fs-xs); font-variant-numeric: tabular-nums; color: var(--color-text-secondary); white-space: nowrap; }
@media (max-width: 560px) { .salary { --salary-head: 1fr; } .salary-axis { display: none; } .salary-row { grid-template-columns: 1fr auto; grid-template-areas: "head val" "track track"; gap: var(--space-1) var(--space-3); } .salary-head { grid-area: head; } .salary-val { grid-area: val; } .salary-track { grid-area: track; } }
.raci { margin: var(--space-6) 0 var(--space-8); }
.raci-legend { display: flex; flex-wrap: wrap; gap: var(--space-4); margin-bottom: var(--space-4); font-size: var(--fs-xs); color: var(--color-text-secondary); }
.raci-legend span { display: inline-flex; align-items: center; gap: var(--space-2); }
.raci-scroll { overflow-x: auto; }
.raci-grid { border-collapse: collapse; width: 100%; font-size: var(--fs-sm); }
.raci-grid th, .raci-grid td { padding: var(--space-2) var(--space-1); text-align: center; }
.raci-grid thead th { font-size: var(--fs-xs); font-weight: var(--fw-semibold); color: var(--color-text-secondary); line-height: var(--lh-snug); vertical-align: bottom; border-bottom: 1px solid var(--color-border); }
.raci-grid tbody th { text-align: left; font-weight: var(--fw-medium); color: var(--color-text); white-space: nowrap; padding-right: var(--space-4); }
.raci-grid tbody tr + tr th, .raci-grid tbody tr + tr td { border-top: 1px solid var(--color-border-subtle); }
.rb { display: inline-flex; align-items: center; justify-content: center; min-width: 22px; height: 22px; padding: 0 var(--space-1); border-radius: var(--radius-sm); font-family: var(--font-mono); font-size: 11px; font-weight: var(--fw-semibold); line-height: 1; }
.rb-a { background: var(--color-accent); color: var(--color-text-inverse); }
.rb-r { background: color-mix(in oklab, var(--eb-data-2) 22%, var(--color-surface)); color: var(--eb-data-2); }
.rb-ar { background: var(--color-accent); color: var(--color-text-inverse); }
.rb-c { background: transparent; color: var(--color-text-secondary); box-shadow: inset 0 0 0 1px var(--color-border); }
.rb-i { background: transparent; color: var(--color-text-muted); }
.gantt { margin: var(--space-8) 0; }
.gantt figcaption { font-size: var(--fs-sm); font-weight: var(--fw-semibold); color: var(--color-text); margin-bottom: var(--space-3); }
.gantt-legend { display: flex; gap: var(--space-5); font-size: var(--fs-xs); font-family: var(--font-mono); color: var(--color-text-secondary); margin-bottom: var(--space-4); }
.gantt-legend span { display: inline-flex; align-items: center; gap: var(--space-2); }
.gantt-legend .sw { width: 10px; height: 10px; border-radius: var(--radius-xs); display: inline-block; }
.sw-recruit, .seg-recruit { background: var(--eb-data-1); }
.sw-ramp, .seg-ramp { background: var(--eb-data-3); }
.sw-prod, .seg-prod { background: var(--eb-data-4); }
.gantt-row { display: grid; grid-template-columns: 132px 1fr; align-items: center; gap: var(--space-3); }
.gantt-row + .gantt-row { margin-top: var(--space-2); }
.gantt-label { font-size: var(--fs-xs); font-family: var(--font-mono); color: var(--color-text-secondary); text-align: right; }
.gantt-track { position: relative; height: 26px; background-image: repeating-linear-gradient(to right, var(--color-border-subtle) 0 1px, transparent 1px calc(100% / 9)); border-left: 1px solid var(--color-border-subtle); }
.gantt .seg { position: absolute; top: 5px; height: 16px; border-radius: 2px; }
.gantt .seg:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
.gantt .seg-prod { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
.gantt .seg:hover { filter: brightness(1.12); }
.gantt-axis { display: grid; grid-template-columns: repeat(9, 1fr) auto; margin-left: calc(132px + var(--space-3)); border-top: 1px solid var(--color-border-subtle); padding-top: var(--space-1); font-size: var(--fs-xs); font-family: var(--font-mono); font-variant-numeric: tabular-nums; color: var(--color-text-muted); }
.gantt-axis .axis-end { text-align: right; }
@media (max-width: 560px) { .gantt-row { grid-template-columns: 96px 1fr; } .gantt-axis { margin-left: calc(96px + var(--space-3)); } }
.calc { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: var(--space-6); margin: var(--space-8) 0; }
.calc-role { display: flex; justify-content: space-between; align-items: center; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: 1px solid var(--color-border-subtle); font-size: var(--fs-sm); }
.calc-check { display: flex; align-items: center; gap: var(--space-2); }
.calc-check input { accent-color: var(--color-accent); }
.calc-role.is-off .calc-salary { opacity: 0.45; }
.calc-salary { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--color-text-secondary); }
.calc input[type='number'] { font-family: var(--font-mono); font-variant-numeric: tabular-nums; font-size: var(--fs-xs); color: var(--color-text); background: var(--color-surface-sunken); border: 1px solid var(--color-border); border-radius: var(--radius-sm); padding: var(--space-1) var(--space-2); width: 96px; }
.calc-params { display: flex; flex-wrap: wrap; gap: var(--space-6); padding: var(--space-4) 0; font-size: var(--fs-sm); }
.calc-params label { display: flex; flex-direction: column; gap: var(--space-2); flex: 1 1 220px; }
.calc-params input[type='range'] { accent-color: var(--color-accent); }
.calc-params .num { font-family: var(--font-mono); color: var(--color-text-secondary); }
.calc-tiles { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-3); margin-top: var(--space-4); }
.tile { background: var(--color-surface-sunken); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: var(--space-4); display: flex; flex-direction: column; gap: var(--space-1); }
.tile-label { font-size: var(--fs-xs); color: var(--color-text-secondary); }
.tile-value { font-size: var(--fs-h3); font-weight: var(--fw-semibold); color: var(--color-text); }
.tile-note { font-size: var(--fs-xs); color: var(--color-text-muted); }
</style>

<script>
(function () {
  var calc = document.getElementById('calc');
  if (!calc) return;
  var fmt = function (n) {
    return '$' + Math.round(n).toLocaleString('en-US');
  };
  var update = function () {
    var base = 0;
    calc.querySelectorAll('.calc-role').forEach(function (row) {
      var on = row.querySelector('[data-role]').checked;
      var salary = parseFloat(row.querySelector('[data-salary]').value) || 0;
      row.classList.toggle('is-off', !on);
      if (on) base += salary;
    });
    var tierPct = parseFloat(document.getElementById('tier').value) || 0;
    var tierMult = 1 + tierPct / 100;
    document.getElementById('tierOut').textContent =
      tierPct === 0
        ? 'median'
        : '+' + tierPct + '%' + (tierPct >= 60 ? ' (top of market)' : '');
    base = base * tierMult;
    var mult = parseFloat(document.getElementById('mult').value);
    var expPerMo = parseFloat(document.getElementById('expPerMo').value) || 0;
    document.getElementById('multOut').textContent = mult.toFixed(2);
    var monthly = (base * mult) / 12;
    document.getElementById('outMonthly').textContent = fmt(monthly);
    document.getElementById('outAnnual').textContent = fmt(base * mult);
    document.getElementById('outFirstYear').textContent = fmt(base * mult + base * 0.2);
    document.getElementById('outPerExp').textContent =
      expPerMo > 0 ? fmt(monthly / expPerMo) : '–';
  };
  calc.addEventListener('input', update);
  update();
})();
</script>

With the default numbers — all six roles at mid-band, a 1.30 overhead
multiplier — the team costs about <span class="num">$102,000 a month</span>,[^derived]
about <span class="num">$1.23M</span> a year in run rate, and roughly
<span class="num">$1.41M</span> in year one once recruiting fees are in. At
one conclusive experiment a month, every real answer about your store costs
about <span class="num">$102,000</span> — and the first one arrives eight to
nine months after you start the search for your growth lead.

None of this is an argument that the people are overpaid. It is what skilled
people cost, doing a loop that genuinely requires skill. It is an argument
about the shape of the work: for a store under a few million in revenue, the
manual path spends well over a million dollars a year to run about twelve
experiments — and to keep the results alive once they ship.

## Why we are building EarlBear

That loop — observe the funnel, form a hypothesis, build the variant, run the
test, ship the winner, watch for regressions — is exactly the loop EarlBear
runs as software. Self-healing ecommerce means the analysis never sleeps, the
test queue never waits on a hiring pipeline, and the cost scales with your
store instead of with US salary bands. Life without EarlBear is not
impossible; it is just nine months and a million dollars away.

[^scenario]: The store in this post is illustrative — 50,000 sessions a month, a 2% conversion rate, and an $80 average order value, chosen to sit near typical mid-market ecommerce figures. Substitute your own numbers in the calculator.

[^derived]: Derived figure — computed from the scenario assumptions, the cited salary bands, and the sample-size formula, not taken from an external source. The calculator recomputes it from your inputs.

[^miller]: Miller, Evan. "Sample Size Calculator." *Evan's Awesome A/B Tools*, n.d., https://www.evanmiller.org/ab-testing/sample-size.html.

[^ecp]: "eCommerce Salary Guide 2026: Compensation Benchmarks for Every Role." *eCommerce Placement*, 2026, https://www.ecommerceplacement.com/resources/ecommerce-salary-guide-2026/.

[^salarycom]: "Director of Growth Salary in the United States." *Salary.com*, 2026, https://www.salary.com/research/salary/listing/director-of-growth-salary.

[^productschool]: "The Hard Truth About Product Management Salaries in 2026." *Product School*, 2026, https://productschool.com/blog/career-development/product-management-salaries-todays-economy.

[^builtin]: "2026 Software Engineer Salary in US." *Built In*, 2026, https://builtin.com/salaries/us/software-engineer.

[^motion]: "2026 Salary Guide: Software Engineers and Developers." *Motion Recruitment*, 2026, https://motionrecruitment.com/it-salary/software.

[^kore1]: "Data Analyst Salary Guide 2026: Pay by Level, City & Skill." *KORE1*, 2026, https://www.kore1.com/data-analyst-salary-guide/.

[^sre]: "Site Reliability Engineer Salary Guide 2026." *KORE1*, 2026, https://www.kore1.com/sre-salary-guide-2026/.

[^percentile]: "Engineering: Average Salary & Pay Trends 2026." *Glassdoor*, 2026, https://www.glassdoor.com/Salaries/engineering-salary-SRCH_KO0,11.htm. The 60–85% figure is the gap between median and 90th-percentile base pay across engineering roles reported here and in the U.S. Bureau of Labor Statistics percentile wage data ("Percentile Wages." *U.S. Bureau of Labor Statistics*, 2024, https://www.bls.gov/oes/oes_perc.htm).

[^hadzima]: Hadzima, Joseph. "How Much Does an Employee Cost?" *MIT Sloan School of Management, Boston Business Journal series*, n.d., https://web.mit.edu/e-club/Archive/hadzima/pdf/how-much-does-an-employee-cost.pdf.

[^shrm]: "Cost Per Hire Calculator: SHRM Formula & Benchmarks." *Teamed*, 2026, https://www.teamed.global/insights/cost-per-hire-calculator-shrm-formula-and-benchmarks.

[^leonar]: "How Much Do Recruitment Agencies Charge?" *Leonar*, 2026, https://www.leonar.app/blog/how-much-do-recruitment-agencies-charge/.
