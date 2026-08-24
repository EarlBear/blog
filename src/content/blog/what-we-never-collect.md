---
title: "What we never collect, and why the raw data never moves"
description: The most important design choice in our telemetry pipeline is a negative one — raw transcripts never leave the machine that wrote them. That single rule rules out the obvious architecture and shapes everything else.
pubDate: 2026-07-04
tags: [engineering, agents]
authors: [omar]
draft: true
audience: internal
design: collection-sync
questions:
  - Do you need a dedicated service to analyze agent transcripts?
  - Where do the raw transcripts get collected — and is there a central copy?
  - Why is syncing the raw files to a central place the wrong design?
  - How can you test uploading only the deltas to a remote database without a cloud account?
---

When you build telemetry over a fleet of machines, the intuitive architecture draws itself:
collect the log files somewhere central, run analysis there, show the results. It is how
most log pipelines work. For agent transcripts, it is the wrong design — and seeing *why*
is the most useful thing about ours.

## The rule that rules out the obvious

Claude Code transcripts are not sanitized logs. They contain file contents, entire prompts,
and — sooner or later — a secret someone pasted into a command. Our first rule, the one that
outranks every efficiency concern, is that **raw transcripts never leave the machine that
wrote them.**

That rule quietly kills the obvious architecture. "Ship the JSONL to a central analyzer"
means raw content leaves the machine. "Sync the files to a bucket for later analysis" means
the same. Any design whose data flow includes *the raw file traveling somewhere* is
disqualified before we compare its other merits. So the interesting questions people ask —
do we need an analysis container, where do we collect the files — mostly answer themselves
once the rule is in front of you.

## Do you need an analysis container? No.

The analysis — turning raw JSONL into derived metrics and redacted excerpts — runs *at the
edge*, on each machine, not in a central service. There is no analysis container, and there
shouldn't be, because a remote analyzer would require shipping it the raw file.

That is affordable because the analyzer is deliberately light: the code that reads a
transcript and derives its metrics imports nothing but the Python standard library — no
heavy dataframe engine, no framework. We checked this the boring, certain way, by parsing
the modules and looking at their imports: zero third-party dependencies. A stdlib-only pure
function runs cheaply anywhere, which is exactly why it can live on every machine instead of
in one privileged box. (It is also why it will port to a distributed engine later without a
rewrite — but that is a different post.)

## Where do the transcripts get collected? They don't.

There is no central pile of raw transcripts, by design. Raw JSONL stays in each machine's
`~/.claude/projects/` and is never collected. What *is* collected — the only thing that
travels — is the *derived* record: token counts, tool names, timings, and two short redacted
excerpts, built from an explicit allowlist of safe fields. Those derived records go to the
shared database; the raw files stay home.

So "where do we collect the JSONLs" has a surprising answer: nowhere central. The database is
the collection point, and it holds no raw content. If we ever genuinely needed raw retained —
for replay, say — that would be a separate, opt-in, encrypted path, never the default. The
default has no route for raw off the machine, which is what makes the security property
structural rather than a policy we have to remember.

## Testing delta uploads without the cloud

The last question — how do you test that only the *new* data uploads to the remote database,
without a cloud account — has a clean answer because of a choice we made elsewhere. Local
development runs a Postgres container that applies the same migrations production does. So
"remote" has a stand-in you can run on your laptop.

That lets us test the real thing: extract a session and push its derived records to the local
database, append new lines to the transcript, run the sync again, and assert that only the
delta was applied — not a full re-push — and that the metrics moved accordingly. The same
test covers the awkward case where a session is rewound and rewritten: the sync detects that
the history changed and re-processes it. All of it runs against a container, no credentials,
the same code path production uses.

## The shape of it

The whole architecture falls out of one negative choice. Raw never moves, so analysis is at
the edge, so there is no central raw store, so what syncs is derived records, so "remote" is
just a database — which a local container can stand in for, which is why the whole thing is
testable on a laptop. The most important thing our telemetry pipeline collects is nothing:
the raw data stays where it was born, and only the safe shadow of it ever travels.
