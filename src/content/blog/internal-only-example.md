---
title: Internal-only example post
description: A fixture post that exists only on the internal blog, used to prove the audience split.
pubDate: 2026-07-03
tags: [meta]
authors: [omar]
audience: internal
questions:
  - How do we mark a post as internal-only?
  - Where does an internal post publish, and where does it never appear?
---

This post is marked `audience: internal` in its frontmatter, so it belongs only
to the internal blog at blog.internal.earlbear.com. It should never appear on the
public site at blog.earlbear.com.

On localhost you see it alongside the external posts (with an "internal" badge),
because the dev server shows every audience so authors can work on their whole
set. The two production builds each show exactly one audience.

## How the split works

The audience is chosen at build time by `PUBLIC_AUDIENCE`. The external build
keeps only posts explicitly marked external — an allowlist, so a post with a
missing or mistyped audience simply disappears from the public site rather than
leaking onto it. The internal build keeps only internal posts and deploys behind
a Cloudflare Access login wall.

You can delete this fixture once the audience split is verified end to end.
