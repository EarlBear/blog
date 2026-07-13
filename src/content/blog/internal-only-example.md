---
title: How the audience split works
description: "This blog builds two sites from one repo — a public external one and an access-gated internal one — chosen at build time by a single frontmatter field. This post is itself internal, so it doubles as the live proof: you are reading it on the internal site, and it never appears on the public one."
pubDate: 2026-07-03
tags: [meta]
authors: [omar]
audience: internal
questions:
  - How do we mark a post as internal-only?
  - Where does an internal post publish, and where does it never appear?
---

*New here? [Start with the whole system](/blog/start-here-the-whole-system) — what EarlBear is and the stack this runs on.*

This post is marked `audience: internal` in its frontmatter, so it belongs only
to the internal blog at blog.internal.earlbear.com. It should never appear on the
public site at blog.earlbear.com — and because you are reading it on the internal
site, it is its own proof that the split works.

On localhost you see it alongside the external posts (with an "internal" badge),
because the dev server shows every audience so authors can work on their whole
set. The two production builds each show exactly one audience.

## How the split works

The audience is chosen at build time by `PUBLIC_AUDIENCE`. The external build
keeps only posts explicitly marked external — an allowlist, so a post with a
missing or mistyped audience simply disappears from the public site rather than
leaking onto it. The internal build keeps only internal posts and deploys behind
a Cloudflare Access login wall.

That fail-closed allowlist is the point: the safe default is *vanish*, never
*leak*. So this post stays — the simplest live check that the split still holds.
If it ever shows up on blog.earlbear.com, something is broken.
