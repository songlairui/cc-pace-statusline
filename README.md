# cc-pace-statusline

A restrained, single-line status line for [Claude Code](https://claude.ai/code) — with a **pace marker** that turns your rate-limit bars into a live "am I ahead or behind on time?" gauge.

```
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%
                                  ^
                              you're here in time;
                              usage is behind pace (good)
```

When the 7-day window drifts off pace by ≥ 20 percentage points, a third segment shows up. Otherwise it stays hidden — no noise, no nagging.

```
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%   7d! ▓▓▓▓│▓░ 90% +33pp
Opus·high   ctx ▓░░░░ 28%   5h ▓░░│░ 23%   7d· ▓░░░│░░ 10% −47pp
```

Read `7d!` as "you're burning the week", `7d·` as "you've got headroom".

## The idea

Most status lines tell you *how much* you've used. They don't tell you *how fast*. A rate-limit bar at 60% means very different things at hour 1 vs hour 4 of a 5-hour window. So this one paints a thin green vertical line — `│` — exactly where "now" sits in the window:

- `5h` bar is **5 cells = 1 cell per hour**
- `7d` bar is **7 cells = 1 cell per day**

The marker lands on the cell for the current hour or day. The distance between the marker and the edge of the filled region is the pace deviation, readable at a glance:

| What you see | What it means |
| --- | --- |
| Marker inside the filled segment | Usage is **ahead** of time-pace — slow down |
| Marker just past the filled edge | On pace |
| Marker far past the filled edge | Plenty of headroom |

## Design constraints

- **One line.** Two-line status bars eat screen and stutter on resize.
- **No emoji.** Width is unpredictable in non-modern terminals; semantics live in color + position.
- **No git, no cwd, no cost, no duration.** Your shell prompt already shows path/branch; cost/duration aren't actionable mid-flow.
- **Only three signals you can act on:** context window, 5-hour rate limit, week-long rate limit (conditional).
- **`!200k`** appears when [`exceeds_200k_tokens`](https://docs.claude.com/en/docs/claude-code/statusline) is true — that's the inflection point where cost and latency change shape.

## Install

Requires Claude Code v2.1.x and Node.js.

```bash
# 1. Drop the script next to your settings
curl -fsSLo ~/.claude/statusline.mjs \
  https://raw.githubusercontent.com/songlairui/cc-pace-statusline/main/statusline.mjs
chmod +x ~/.claude/statusline.mjs

# 2. Add this block to ~/.claude/settings.json
```

```jsonc
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/statusline.mjs",
    "padding": 2,
    "refreshInterval": 300
  }
}
```

`refreshInterval: 300` re-runs the script every 5 minutes so the pace marker advances on idle sessions too. Remove it if you want event-driven updates only.

Settings reload automatically; the change shows up at your next interaction with Claude Code.

## Color rules

| Segment | Green | Yellow | Red |
| --- | --- | --- | --- |
| `ctx` | < 60% | 60–84% | ≥ 85% |
| `5h` | < 50% | 50–79% | ≥ 80% |
| `7d!` (overusing) | — | — | always red |
| `7d·` (underusing) | dim cyan | — | — |
| `!200k` | — | — | always red |

Marker `│` is rendered in bright bold green (`\033[1;92m`) regardless of the bar color, so it stays visible against any threshold tier.

## Tuning

All knobs live at the top of `statusline.mjs`:

```js
const SEVEN_D_THRESHOLD_PP = 20;   // raise to 25 for quieter, lower to 15 for nervier
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;
```

Color thresholds are inline in `render()` — `[60, 85]` for ctx, `[50, 80]` for 5h. Edit as you like.

## What it deliberately leaves out

These were considered and cut. They're easy to add back if you fork.

- Cost (`cost.total_cost_usd`)
- Duration (`cost.total_duration_ms`)
- Git branch / dirty state
- Working directory
- PR badge
- Subagent name
- Output style
- Thinking indicator
- 5h / 7d reset countdowns (the bar + marker already convey this)

The bias: a status line earns its place by showing things you'd otherwise have to remember to check.

## License

MIT.

---

— by songlairui's Claude Opus 4.7
