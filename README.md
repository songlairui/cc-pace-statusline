# cc-pace-statusline

> 中文版：[README_zh.md](./README_zh.md)

A restrained, single-line status line for [Claude Code](https://claude.ai/code). Two ideas, one row:

1. A **pace marker** that turns rate-limit bars into a live "am I ahead or behind on time?" gauge — and changes glyph/color when usage crosses the pace line.
2. **Floyd–Steinberg dithering** on the bars themselves, so 5 cells can represent percentage at ~1% precision instead of 20%-step jumps.

```
Opus·high   ctx ░░░░▒ 28%   5h ░░░│░ 23%   7d ░░░░│░░ 25%
                                  ↑                ↑
                           5h is 3h in,      7d is day 4 of 7,
                           usage at 23%      usage at 25%, marker
                           is behind pace    is past pace — relaxed
                           — thin green │
```

When usage races past the pace line, the marker flips to a heavy magenta `┃`:

```
Opus·high   ctx █▓█▓█ 88% !200k   5h ▓█▓▓┃ 82%   7d █▓█▓┃█▓ 90%
```

(In the terminal each bar sits on a dim gray background, so cells whose dither value lands at zero stay visible as gray slots rather than disappearing.)

So the marker itself is the alert. You don't have to compare positions of fill-edge and marker — the marker color/weight already says "you're past pace."

## What you're seeing

### The pace marker

Each rate-limit bar has one extra glyph — the **pace marker** — at the cell representing "now" inside that window.

- `5h` bar: **5 cells = 1 cell per hour**
- `7d` bar: **7 cells = 1 cell per day**

It comes in two forms:

| Glyph | Color | Meaning |
| --- | --- | --- |
| `│` (thin) | bright green | Usage is **behind** time-pace — you have headroom |
| `┃` (heavy) | bright magenta | Usage is **ahead** of time-pace — slow down |

The decision is `usage_pct > elapsed_pct`. The marker carries this signal regardless of where it lands inside the bar texture, so no position-math is needed to read state.

### The bar texture is dithering, not noise

Each cell renders one of five density levels — `' ', ░, ▒, ▓, █` — chosen by **1D Floyd–Steinberg error diffusion**. Crucially, the levels match the *perceived* darkness of each glyph (`░` already reads as ~25% dark, not ~33%), so the bar's average density actually corresponds to the true percentage rather than overshooting. Different percentages produce visually distinct textures:

```
 5%   [    ░    ]    50%   [  ▒▒▒▒▒  ]
12%   [   ░ ░   ]    67%   [  ▓▒▓▓▒  ]
20%   [  ░░ ░░  ]    75%   [  ▓▓▓▓▓  ]
28%   [  ░░░░▒  ]    88%   [  █▓█▓█  ]
35%   [  ░▒░▒░  ]    95%   [  ██▓██  ]
44%   [  ▒▒░▒▒  ]   100%   [  █████  ]
```

(Brackets here are documentation only — in the terminal the bar is wrapped in a dim gray background, so empty cells stay visible as slots.)

Side-effect: small percentage changes shift the texture noticeably. A naive binary bar would stay frozen between 20% jumps; here every percentage point displaces the pattern.

### Why 7d is always on

Earlier versions hid the 7-day segment unless usage deviated from time-pace by ≥ 20 pp. That made appearance *itself* carry a hidden, threshold-based meaning — a status line shouldn't ask you to remember a rule. Now `7d` is always present whenever the data is available. Day 1 with the marker hugging the left edge is still informative: "the week just started, you have everything."

## Design constraints

- **One line.** Two-line status bars eat screen and stutter on resize.
- **No emoji.** Width is unpredictable in non-modern terminals; semantics live in color + position.
- **No git, no cwd, no cost, no duration.** Your shell prompt already shows path/branch; cost/duration aren't actionable mid-flow.
- **Three signals only:** context window, 5-hour rate limit, 7-day rate limit.
- **`!200k`** appears when [`exceeds_200k_tokens`](https://docs.claude.com/en/docs/claude-code/statusline) is true — the inflection point where cost and latency change shape.

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

| Segment | Bar palette | Green band | Yellow band | Red band |
| --- | --- | --- | --- | --- |
| `ctx` | dithered `' '░▒▓█` on dim gray bg | < 60% | 60–84% | ≥ 85% |
| `5h` | dithered `' '░▒▓█` on dim gray bg | < 50% | 50–79% | ≥ 80% |
| `7d` | dithered `' '░▒▓█` on dim gray bg | < 50% | 50–79% | ≥ 80% |
| `!200k` | — | — | — | always red |

Pace marker color is independent of the bar palette: bright green for behind, bright magenta for ahead. This keeps it readable against any threshold tier and against the gray bar background.

## Tuning

```js
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;
const DITHER_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const DITHER_CHARS = [' ', '░', '▒', '▓', '█'];
```

Color thresholds are inline in the segment renderers — `[60, 85]` for ctx, `[50, 80]` for 5h and 7d. Edit as you like.

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

## Discuss

- Twitter / X: <https://x.com/songlairui/status/2066161137000034570>
- Weibo: <https://weibo.com/1770160121/R47P6jQS4>

## License

MIT.

---

— by songlairui's Claude Opus 4.7
