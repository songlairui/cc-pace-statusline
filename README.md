# cc-pace-statusline

> 中文版：[README_zh.md](./README_zh.md)

A restrained, single-line status line for [Claude Code](https://claude.ai/code). Two ideas, one row:

1. A **pace marker** that turns rate-limit bars into a live "am I ahead or behind on time?" gauge — and changes glyph and color when usage crosses the pace line.
2. **Sub-cell precision via boundary-cell color interpolation** — the only cell that does anything clever is the bar's leading edge, which fades from dim background to bar color in proportion to its sub-cell fraction. Every other cell is either solid bar color or solid dim gray. Five cells get effective ~1% precision without any dithering noise.

```
Opus·high   ctx [█▒   ]  28%   5h [█░ │ ]  23%   7d [█▓  │  ]  25%
                                       ↑                  ↑
                                 5h 3h in,           7d day 4 of 7,
                                 23% used —          25% used —
                                 thin green │        thin green │
                                 (behind pace)       (behind pace)
```

When usage races past the pace line, the marker flips to a heavy magenta `┃`:

```
Opus·high   ctx [████▒]  88% !200k   5h [███┃░]  82%   7d [████┃█░]  90%
```

When the marker lands exactly on the bar's boundary cell — the moment of being "right on pace" — that cell is painted in the marker's color instead of the bar's, and the marker glyph turns white. It's a small extra signal that says "this is the threshold."

(Brackets above are documentation only — your terminal renders each cell as a colored slot, no glyphs inside the bar except the marker.)

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

### Color, not glyphs

Every cell is just a colored slot — no internal characters except the marker. Color is the entire visual language:

- **Solid cell** (`█` in the diagrams below): saturated bar color (green / yellow / red by threshold).
- **Empty cell** (` `): dim gray. Always visible as a slot so the bar's extent never disappears.
- **Boundary cell** (`░ ▒ ▓` in the diagrams below): a single cell at the leading edge whose color is **linearly interpolated** between dim gray and the bar's full color, by the sub-cell fraction. This is the only cell that carries sub-cell precision.

```
 0%   [     ]      40%   [██   ]      80%   [████ ]
20%   [█    ]      45%   [██░  ]      88%   [████▒]
25%   [█░   ]      50%   [██▒  ]      95%   [████▓]
30%   [█▒   ]      60%   [███  ]     100%   [█████]
```

(`░ ▒ ▓` in the diagrams are stand-ins for low / mid / high saturation of the boundary cell — in the terminal it's an actual interpolated color, not a glyph.)

Why no Floyd–Steinberg dithering? Tried it. At 5 cells of resolution, error diffusion stops being a perceptual trick and starts being visible noise — every percentage produced a scattered pattern that read as "loud" rather than "fuller / emptier." Color interpolation on a single boundary cell gives the same precision with none of that.

### How the marker composes

The marker (`│` or `┃`) is rendered as a **foreground glyph** on whichever cell it lands on. Terminals draw fg on top of bg, so:

- Marker on an empty cell: marker color line on dim gray.
- Marker on a filled cell: marker color line on bar color (high contrast — bright green vs solid red, bright magenta vs solid yellow, etc.).
- Marker exactly on the boundary cell: that cell's bg is repainted in the marker's color (interpolated by the same sub-cell fraction), and the marker glyph turns white. This is the "right on pace" highlight.

So the marker doesn't fight the bar for cell space; it's a separate channel composed on top.

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

All colors are emitted as 24-bit truecolor (`\033[38;2;r;g;b m` / `\033[48;2;r;g;b m`), so the rendering is consistent across terminal themes.

| Segment | Bar fill color (full cells) | Green band | Yellow band | Red band |
| --- | --- | --- | --- | --- |
| `ctx` | `rgb(60,180,80)` / `rgb(220,180,30)` / `rgb(220,70,70)` | < 60% | 60–84% | ≥ 85% |
| `5h` | same triplet | < 50% | 50–79% | ≥ 80% |
| `7d` | same triplet | < 50% | 50–79% | ≥ 80% |
| `!200k` | — | — | — | always red |

Marker colors are independent of the bar palette: `rgb(80,255,120)` (bright green) for behind, `rgb(255,100,255)` (bright magenta) for ahead. The empty-cell background is `rgb(60,60,60)`. When the marker coincides with the boundary cell, the glyph itself turns white (`rgb(240,240,240)`).

Truecolor is widely supported (Ghostty, iTerm2, Kitty, WezTerm, Alacritty, modern Windows Terminal, recent xterm). If your terminal falls back to 256-color, colors approximate but the layout is unchanged.

## Tuning

```js
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;

const BG_GRAY = [60, 60, 60];
const BAR_GREEN = [60, 180, 80];
const BAR_YELLOW = [220, 180, 30];
const BAR_RED = [220, 70, 70];
const MARKER_BEHIND = [80, 255, 120];
const MARKER_AHEAD = [255, 100, 255];
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
