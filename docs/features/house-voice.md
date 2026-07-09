# House voice

The EarlBear blog voice, in one page. The `check-posts.py` hook enforces the hard
rules (emoji, exclamation points) and warns on the soft ones (fluff,
anthropomorphizing, hype); the **`design-post-review`** skill is the human judge
and the place to fix a post against this standard. `new-post`/`enrich-post` defer
here rather than restate it.

## The one rule

**Every sentence carries information** — a fact, a decision, or a consequence. If a
sentence would read the same for any product, or sets a mood without adding a fact,
cut it.

## Do

- **Lead with the point.** The reader should know the claim by the end of the first
  sentence, not after a paragraph of throat-clearing.
- **Specific over vague.** "significantly faster" → the number. "various sources" →
  which ones. Numerics in tables; a `$` or `%` figure needs a footnote (enforced).
- **Sentence case** everywhere — titles, headings, descriptions.
- **State what an actor *does*** with the system, in plain terms.
- **Admit the wrong turn.** The roads not taken and the mistakes are the most useful
  part of a design post; keep them honest, don't straw-man.

## Avoid (the soft check warns on these)

- **Anthropomorphizing.** A system, agent, pipeline, or model does not *meet, want,
  see, hope, believe, think, know,* or *feel*. "Three people meet this agent" says
  nothing — no one *meets* software. Say what the person does with it, and what the
  system does.
- **Scene-setting filler.** "In today's fast-paced world…", "Imagine a…", "At the
  end of the day…" — openers that carry no information. Start with the point.
- **Hype adjectives that assert instead of show.** *seamless, effortless,
  cutting-edge, state-of-the-art, game-changing, world-class, blazing-fast,
  robust and scalable.* Show the fact (the number, the behavior) and let the reader
  conclude it.
- **Emoji and exclamation points** (hard-enforced in title/description; keep the
  discipline in the body).

## Why a soft check, not a hard one

Voice is a judgment call — a legitimate "meets" ("the two lines meet at the origin")
exists, and a quoted source may use a hype word. So the anti-fluff patterns **warn**,
they never fail the build. Treat a warning as a prompt to re-read that sentence, not
a gate to satisfy. The real fix is the `design-post-review` pass.
