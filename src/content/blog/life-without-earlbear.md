---
title: "Life without EarlBear: pricing the growth team you would have to hire"
description: The roles, 2026 salary bands, hiring timeline, and monthly math of growing an ecommerce store by hand — with a calculator you can adjust for your own numbers.
pubDate: 2026-07-03
tags: [growth, economics]
authors: [omar]
draft: true
questions:
  - You run an ecommerce store with good traffic and early traction — how do you actually grow it from here?
  - Who would you need to hire to optimize a store by hand, and what experience should each role have?
  - What are realistic 2026 salary bands for a growth team?
  - How long does each kind of change take, and how long does it take to set up and run one A/B test?
  - What does the whole team cost per month, all-in — and how do you run that math for your own store?
---

Say your store works. Traffic is real, orders arrive daily, and revenue has
found a rhythm — call it 50,000 sessions a month converting at 2% on an $80
average order, just under $1M a year. Then growth flattens, and the question
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
lift you want to detect.

Plug in the store above — 2% baseline conversion:

- Detecting a **10% relative lift** (2.0% → 2.2%) needs about
  <span class="num">78,000 visitors per variant</span> — roughly
  <span class="num">157,000</span> total. At 50,000 sessions a month, that is
  **more than three months for one conclusive test**.
- Detecting a **20% relative lift** (2.0% → 2.4%) needs about
  <span class="num">20,000 per variant</span> — call it
  <span class="num">3–4 weeks</span>, if you send it all your traffic.

Add one to two weeks up front for instrumenting the test — variant assignment,
event tracking, QA on both arms — and the practical cadence at this traffic
level is roughly **one conclusive experiment per month**, and only for changes
big enough to plausibly move conversion 20%. Subtle ideas are untestable at
this scale; you simply cannot afford the calendar.

That cadence is the constraint everything else hangs on: if you can only get
about twelve real answers a year, the people picking and building those twelve
bets had better be good. Which is why the hiring bar — and the payroll — looks
the way it does.

## The team you would hire

A minimal in-house growth team for a store at this stage is five people. US
salary bands below are 2026 base-salary figures drawn from published guides
([eCommerce Placement](https://www.ecommerceplacement.com/resources/ecommerce-salary-guide-2026/),
[Product School](https://productschool.com/blog/career-development/product-management-salaries-todays-economy),
[Built In](https://builtin.com/salaries/us/software-engineer),
[Motion Recruitment](https://motionrecruitment.com/it-salary/software),
[KORE1](https://www.kore1.com/data-analyst-salary-guide/)); your market and
remote policy will move them, which is what the calculator below is for.

| Role | Experience you need | Base salary band |
| --- | --- | --- |
| Growth lead | <span class="num">8+ yrs; has owned a DTC or marketplace P&L; sets the roadmap and hires the rest</span> | <span class="num">$150k–$220k</span> |
| Senior product manager | <span class="num">5+ yrs; experimentation background; turns analysis into a ranked backlog</span> | <span class="num">$130k–$190k</span> |
| Senior frontend engineer | <span class="num">5+ yrs; storefront performance, test instrumentation, feature flags</span> | <span class="num">$130k–$185k</span> |
| Senior backend engineer | <span class="num">5+ yrs; integrations, data pipelines, checkout and pricing services</span> | <span class="num">$135k–$195k</span> |
| Growth data analyst | <span class="num">3–5 yrs; experiment statistics, funnel and cohort analysis</span> | <span class="num">$110k–$145k</span> |

Two multipliers sit on top of base salary:

- **Loaded cost.** Payroll taxes, benefits, equipment, and tooling add
  25–40% on top of base. We use <span class="num">1.30</span> as the default
  below.
- **Recruiting.** Filling a senior role takes 40–60 days and, through an
  agency, costs 20–25% of first-year base as a one-time fee — per role.

## The calendar: nine months to a working team

You cannot hire all five at once, because the first hire chooses the rest. The
growth lead takes two to three months to land (search, interviews, notice
period), ramps for a month, and only then starts hiring the product manager,
engineers, and analyst. Here is a realistic sequence:

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
</div>
<div class="calc-params">
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

With the default numbers — all five roles at mid-band, a 1.30 overhead
multiplier — the team costs about <span class="num">$86,000 a month</span>,
just over <span class="num">$1M</span> a year in run rate, and roughly
<span class="num">$1.19M</span> in year one once recruiting fees are in. At
one conclusive experiment a month, every real answer about your store costs
about <span class="num">$86,000</span> — and the first one arrives eight to
nine months after you start the search for your growth lead.

None of this is an argument that the people are overpaid. It is what skilled
people cost, doing a loop that genuinely requires skill. It is an argument
about the shape of the work: for a store under a few million in revenue, the
manual path spends a seven-figure year to run about twelve experiments.

## Why we are building EarlBear

That loop — observe the funnel, form a hypothesis, build the variant, run the
test, ship the winner, watch for regressions — is exactly the loop EarlBear
runs as software. Self-healing ecommerce means the analysis never sleeps, the
test queue never waits on a hiring pipeline, and the cost scales with your
store instead of with US salary bands. Life without EarlBear is not
impossible; it is just nine months and a million dollars away.

## Sources

- [eCommerce salary guide 2026 — eCommerce Placement](https://www.ecommerceplacement.com/resources/ecommerce-salary-guide-2026/)
- [Director of growth salaries — Salary.com](https://www.salary.com/research/salary/listing/director-of-growth-salary)
- [Product management salaries in 2026 — Product School](https://productschool.com/blog/career-development/product-management-salaries-todays-economy)
- [Software engineer salaries — Built In](https://builtin.com/salaries/us/software-engineer)
- [2026 salary guide: software engineers — Motion Recruitment](https://motionrecruitment.com/it-salary/software)
- [Data analyst salary guide 2026 — KORE1](https://www.kore1.com/data-analyst-salary-guide/)
