# cc-statusline arena — DRAFT

A side project inside `cc-pace-statusline` for studying how the open-source community designs Claude Code status lines, so this one can stay sharp by knowing exactly **where it stops** and **where the others go**.

> Status: scratchpad. Not a published comparison yet.

## Why an arena, not just a "list of alternatives"

The point isn't "look at all the options." The point is to **stress-test our own restraint**. Every entrant in the arena is allowed to show us something we cut on purpose; we either learn the cut was wrong, or we re-confirm it and write down *why* with a concrete counterexample. Without an arena, restraint becomes a personal taste claim. With one, it becomes a defended position.

## Positioning of this project

Restated here so the arena has a clean baseline to compare against:

- **One line. No emoji. No git, cwd, cost, duration.**
- **Three signals only:** ctx, 5h rate limit, 7d rate limit (always-on; no hidden gating rules).
- **Pace marker** that changes glyph and color when usage crosses the time-pace line — the marker *is* the ahead/behind signal.
- **Boundary-cell color interpolation** — sub-cell precision from a single gradient cell at the bar's leading edge, with the rest of the bar staying as clean solid color blocks. (F-S dithering was tried and dropped — visible noise at 5-cell resolution.)
- **Depth over breadth:** one direction, drilled deep.

If an entrant beats us *inside* this scope (e.g. a sharper rendering of the same three signals), we lose and copy. If an entrant offers a feature outside this scope, we note *why we chose not to* with the counter-evidence ready.

## Method

Per entrant:

1. **Install** in a clean fixture (a recorded session with a fixed JSON payload).
2. **Screenshot** at four canonical states:
   - `low` — ctx 12%, 5h 8%, 7d on pace
   - `mid` — ctx 55%, 5h 50%, 7d on pace
   - `hot` — ctx 88%, 5h 82%, !200k, 7d +33pp ahead
   - `cold` — ctx 12%, 5h 8%, 7d −47pp behind
4. **Score** on axes (table below).
5. **Verdict**: keep, learn, or reject — with a sentence each.

The fixture script lives at `arena/fixture/` (TODO). It takes a JSON payload and pipes it to each entrant's command in a known terminal (Ghostty, 100 cols, dark theme).

## Comparison axes

| Axis | What it measures |
| --- | --- |
| **Signal density** | Useful info per character of screen real estate |
| **Decision support** | Can you act on what it shows, or is it post-hoc accounting? |
| **Noise floor** | What's always-on that probably shouldn't be |
| **Time literacy** | Does it tell you anything about pace, not just amount? |
| **Failure modes** | What it looks like when fields are absent/null (fresh session, no rate_limits, no PR) |
| **Terminal fragility** | Does it require true color, ligatures, NerdFont, double-width emoji, etc.? |
| **Resize behaviour** | How it degrades at 60 cols / 80 cols / 120 cols |
| **Refresh model** | Event-driven only, or polled; cost when idle |

## Candidates to round up

Initial leads (from the official statusLine docs and casual search). Need to actually try each.

- **[ccstatusline](https://github.com/sirmalloc/ccstatusline)** — referenced by Anthropic's docs. The default "community standard." Need to see what they include.
- **[starship-claude](https://github.com/martinemde/starship-claude)** — Starship integration. Different design philosophy (theming-first).
- **Anthropic docs samples** — the multi-line example with progress bar + git, the cost-and-duration single-line, the OSC 8 link example. These are the "what most users will copy" baselines.
- _TBD_ — sweep `cc-statusline`, `claude-statusline`, `claude-code-statusline` on GitHub. Add anything with > 5 stars and a working install path.

## Scoring template (per entrant)

```
## <name> · <repo url>

**Stance**: <one-line summary of what the author optimized for>

**Screenshots**: arena/shots/<slug>-{low,mid,hot,cold}.png

**Axes**:
| axis | score | note |
| --- | --- | --- |
| Signal density | 1-5 | |
| Decision support | 1-5 | |
| Noise floor | 1-5 | (5 = clean) |
| Time literacy | 1-5 | |
| Failure modes | 1-5 | |
| Terminal fragility | 1-5 | (5 = portable) |
| Resize behaviour | 1-5 | |
| Refresh model | event/poll/hybrid | |

**Verdict**: keep / learn / reject
**Why**: <one sentence>
**What it taught us**: <one sentence — even if rejected>
```

## Open questions

- What's a fair fixture for `rate_limits.*`? Subscription-only and time-sensitive. Probably best to mock the JSON.
- Screenshot reproducibility — automate via `expect` or a recorded `script(1)` session? Or just take terminal screenshots manually first round.
- Do we publish the arena as part of the README, or as a separate `arena/RESULTS.md`?
- Inviting authors to PR their own scoring — yes/no?

## Next actions

- [ ] Sweep GitHub for cc-statusline forks/alternatives. Aim for ~6–10 entrants.
- [ ] Write `arena/fixture/mock-input.json` × 4 states.
- [ ] Decide screenshot tooling.
- [ ] Score `ccstatusline` and `starship-claude` first (the well-known ones), publish as `arena/RESULTS.md` v0.

---

— by songlairui's Claude Opus 4.7
