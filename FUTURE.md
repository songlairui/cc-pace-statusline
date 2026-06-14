# FUTURE — queued improvements

Concrete optimization ideas, captured so we can pick them up later without rederiving the reasoning.

> Status: shelved. Nothing here is implemented yet.

---

## 1. Rethink the 7d visibility rule

**Today.** The 7-day segment appears only when usage deviates from time-pace by ≥ 20 pp.

**Problem with this.** The rule is *dynamic*. From the user's seat, the segment appears and disappears for reasons they can't predict without holding the threshold in their head. A status line should reward glance-recognition; a segment whose presence itself carries no fixed semantic isn't doing that.

**Proposed direction.** Make the visibility rule *static* — present or absent on a condition the user can name. Two candidates, in order of bias:

- **A. Always show 7d.** Even on day 1 with the marker at the left edge and almost no fill, the bar is still informative — it's "the week's budget, with this week's clock laid over it." No mystery about why it's there.
- **B. Always show 7d, except day 1.** Day 1 = fresh window, no meaningful pace yet. From day 2 onward, the marker has somewhere useful to sit. The user knows exactly when the segment appears (day 2) and disappears (after reset).

Bias is A. It's simpler, and day 1 is informative *because* it's empty — the marker hugging the left edge tells you "the week just started, you have everything."

**Knock-on.** Drop `SEVEN_D_THRESHOLD_PP`. The `7d!` / `7d·` prefix variants still make sense as *colorings* (overusing vs underusing) but no longer as gating.

**Width budget.** Always-on 7d adds ~16 chars permanently. We were already comfortable at 80 cols. Should still fit; verify on the smallest terminal we want to support.

---

## 2. Color the marker by whether it overlaps a filled or empty cell

**Today.** The marker `│` is rendered in bright bold green regardless of what's underneath. The user has to *compare positions* of marker vs fill-edge to read "ahead vs behind."

**Idea.** Make the marker itself the alert by coloring it according to its overlap:

- Marker on a `▓` cell (`filled_count > marker_idx`) → usage has crossed the pace line → **ahead** (warning).
- Marker on a `░` cell (`filled_count ≤ marker_idx`) → usage has not yet reached the pace line → **behind** (fine).

**Color choice — open.** We need contrast against the bar's threshold color (which may itself be red when usage is high). Naive "red marker on red bar" disappears. Some options to test:

- Use a *hue outside the bar palette* for the "ahead" marker: bright magenta `\033[1;95m` or bright yellow `\033[1;93m`. Bar palette is green/yellow/red, so magenta stands apart cleanly.
- Use a *different glyph* for ahead vs behind: thin `│` (U+2502) for behind, heavy `┃` (U+2503) for ahead. Same color, different weight. Lower contrast risk.
- Use *both* — bright magenta + heavy glyph for ahead, bright green + thin glyph for behind.

**Trap to avoid.** If the marker now carries the ahead/behind signal, the existing `7d!` / `7d·` prefix becomes redundant on that segment. We may want to drop the prefix in favor of just the colored marker. Less symbol noise.

**Concrete proposal to try first.**

```
behind:  bright green + thin │ (current style)
ahead:   bright magenta + heavy ┃
```

---

## 3. Floyd–Steinberg-style dithering on the bar

**Premise.** We have two channels that don't merge cleanly: usage % (cumulative) and time % (cumulative). The current design renders them as two visual primitives — fill + marker — in the same row. Two channels, two encodings.

**What if one bar carried both, via density texture?** Each cell would not be `▓`/`░` binary, but one of N density levels (`░ ▒ ▓ █` is 4; with bold/dim and underscores you can push to ~8). The level at cell *i* would encode the *local* delta between expected and actual at that time-slice.

This requires history — without a record of "what was actual usage at each past time slice," we can't render the texture. So this proposal has a dependency:

- **Persistence layer.** The script would log `(timestamp, used_percentage, rate_limits.*.used_percentage)` on each invocation to a small file keyed by session or window. Roll-up: per cell of the bar (= per hour for 5h, per day for 7d), compute the actual-vs-expected delta.

**Two design sketches.**

- **Sketch A — error-diffusion shading.** For each cell, compute local delta `d_i = actual_i - expected_i`. Quantize to N density levels. Apply Floyd–Steinberg-style error propagation across cells so the rendered density wave looks continuous rather than stepped. Reader sees a *shape* — bursty mid-week, then quiet — instead of one summary number.
- **Sketch B — usage history sparkline replacing the bar.** Forget cumulative bars; render a per-cell sparkline of *recent* usage rate. Marker still shows "now." Density encodes "how hot was each slice." Loses the cumulative reading but gains shape literacy. The two could coexist as alternative modes.

**Why this is interesting.** A status line can show *amount* and *pace*. A history-aware one can show *temperament* — were you steady or bursty. That's a third axis the current design can't reach.

**Why this is hard.** Persistence touches filesystem, schema, cleanup-on-reset, multi-session interference. Has to be paid for honestly. Worth a separate spike.

---

## Triage

| Idea | Effort | Reversibility | Priority |
| --- | --- | --- | --- |
| 1 — 7d always-on | small | trivially reversible | first |
| 2 — overlap-colored marker | small | trivially reversible | second |
| 3 — dithered history | large (needs persistence) | needs design doc first | research |

---

— ideas by songlairui, captured by his Claude Opus 4.7
