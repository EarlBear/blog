---
name: audience-audit
description: Audit which blog posts should be internal vs external, and move mis-classified ones. Use when the user asks "should this post be internal or external", "audit the posts' audiences", "which posts should move", "is anything internal marked public", or after adding posts, before a public deploy. Reviews each post's *content* against the internal/external criteria (the guard hooks only check the declared value, not whether it fits) and recommends moves — most importantly catching internal material that's marked public.
---

# Audit post audiences

The blog serves two audiences from one repo (see `docs/features/audience-split.md`):
**external** (public, `blog.earlbear.com`) and **internal** (org-gated,
`blog.internal.earlbear.com`). The safety machinery — the allowlist filter, the
`check-audience.py` guard, the deploy gate — guarantees a *declared* internal post
never leaks externally. But none of it judges whether a post is *labeled correctly
in the first place*. That judgment is this skill's job.

The stakes are asymmetric: **an internal-sounding post marked `external` is a
disclosure risk** (it ships to the public site). A public post marked `internal` is
only over-restricted. So weight the audit toward catching the first.

## Run the check first

`npm run audience-fit-check` (`.claude/hooks/check-audience-fit.py`) scans every
post's content for signals and flags likely mismatches — start there to get the
short list, then apply judgment. It's advisory (never blocks); it surfaces
candidates, it doesn't decide.

## The criteria

Read each flagged post (and spot-check the rest) and classify by what it *reveals*:

**Should be `internal`** if it contains any of:
- **Unreleased or unshipped work** framed as not-yet-public (roadmap, "we haven't
  launched this," internal betas).
- **Internal infrastructure detail** that isn't already public: internal hostnames
  (`*.internal.earlbear.com`), the internal deploy path (Cloudflare Access, wrangler
  project names), internal dashboards/tools by name.
- **Operational specifics** you wouldn't hand a competitor or attacker: exact
  secret-handling internals beyond the public gist, on-call/runbook detail, capacity
  numbers, security controls described precisely enough to probe.
- **Candid internal commentary** — naming customers, deals, mistakes, or people in a
  way that's fine in-house but not for the public.

**Fine as `external`** if it's the blog's normal fare: product/engineering
storytelling written *for* the public — "here's how we built X," lessons learned,
architecture at a level you'd happily show a customer. Most posts are this. When a
post is borderline, ask: *would we be comfortable a competitor read this?* If yes,
external; if it makes you hesitate, internal.

Note the current posts describe real EarlBear systems (the agentic workflow, the
telemetry pipeline) but at a *storytelling* level — that's external-safe. It tips
to internal only when it exposes something unreleased or operationally sensitive.

## Recommending and making moves

1. For each flagged post, decide: leave, or move — and **say why** in one line
   (which criterion it hits). Don't move on the check's say-so alone; the check
   finds candidates, you make the call.
2. To move a post, change only its `audience:` frontmatter field
   (`external` ↔ `internal`). Nothing else changes — the same source post just
   builds into a different site.
3. **Verify the move didn't leak.** Before any public deploy, build external and run
   the deploy gate: `npm run build:external && npm run audience-check` (greps the
   built `dist/` — the real artifact). A post moved to `internal` must be absent
   from the external `dist/`.
4. Record notable moves (and the reason) so the classification rationale is
   discoverable, not just a silent frontmatter flip.

## When to run

- **Before a public deploy** — a fast pass so nothing internal ships. Cheap
  insurance for a one-way, irreversible disclosure.
- **After drafting or importing posts**, especially any touching infra, security,
  or unreleased work.
- **When the criteria themselves shift** (a feature launches → its post may move
  from internal to external).

## Notes

- This is judgment, not automation. The check narrows the field; a human confirms.
- The guard hooks and this audit are complementary: the guards make sure a *declared*
  audience is honored and can't leak; this makes sure the declaration is *right*.
- If you find yourself unsure on a genuinely sensitive post, default to `internal`
  and ask — the reversible mistake is keeping something private too long, not the
  irreversible one of publishing it.
