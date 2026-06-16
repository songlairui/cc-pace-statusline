#!/usr/bin/env node
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  let d;
  try { d = JSON.parse(buf); } catch { process.exit(0); }
  process.stdout.write(render(d) + '\n');
});

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

const BG_GRAY = [60, 60, 60];
const WHITE = [240, 240, 240];
const BAR_GREEN = [60, 180, 80];
const BAR_YELLOW = [220, 180, 30];
const BAR_AMBER = [230, 130, 40];
const BAR_RED = [220, 70, 70];
const MARKER_BEHIND = [80, 255, 120];
const MARKER_AHEAD = [255, 100, 255];
const ALERT_RED = [255, 80, 80];
const IDLE_HINT = [200, 200, 100];

const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;

function fg([r, g, b]) { return `\x1b[38;2;${r};${g};${b}m`; }
function bgc([r, g, b]) { return `\x1b[48;2;${r};${g};${b}m`; }
function mix([r1, g1, b1], [r2, g2, b2], t) {
  return [
    Math.round(r1 + (r2 - r1) * t),
    Math.round(g1 + (g2 - g1) * t),
    Math.round(b1 + (b2 - b1) * t),
  ];
}

function barColorFor(pct, [greenMax, yellowMax]) {
  if (pct < greenMax) return BAR_GREEN;
  if (pct < yellowMax) return BAR_YELLOW;
  return BAR_RED;
}

function paceColor(pct, elapsedPct) {
  if (pct >= 95) return BAR_RED;
  if (elapsedPct == null) return barColorFor(pct, [50, 80]);
  const lead = pct - elapsedPct;
  if (lead >= 40) return BAR_RED;
  if (lead >= 25) return BAR_AMBER;
  if (lead >= 10) return BAR_YELLOW;
  if (elapsedPct >= 40) {
    if (lead <= -40) return BAR_RED;
    if (lead <= -25) return BAR_AMBER;
    if (lead <= -10) return BAR_YELLOW;
  }
  return BAR_GREEN;
}

function bar(pct, cells, markerIdx, markerAhead, barFill) {
  const filledF = Math.max(0, Math.min(cells, (pct / 100) * cells));
  const fullCount = Math.floor(filledF);
  const fraction = filledF - fullCount;
  const markerColor = markerAhead ? MARKER_AHEAD : MARKER_BEHIND;
  const markerGlyph = markerAhead ? '┃' : '│';

  let out = '';
  for (let i = 0; i < cells; i++) {
    const isMarker = i === markerIdx;
    const isBoundary = i === fullCount && fraction > 0;

    let cellBg;
    if (isMarker && isBoundary) {
      cellBg = mix(BG_GRAY, markerColor, fraction);
    } else if (i < fullCount) {
      cellBg = barFill;
    } else if (isBoundary) {
      cellBg = mix(BG_GRAY, barFill, fraction);
    } else {
      cellBg = BG_GRAY;
    }

    out += bgc(cellBg);
    if (isMarker) {
      const glyphColor = isBoundary ? WHITE : markerColor;
      out += fg(glyphColor) + markerGlyph;
    } else {
      out += ' ';
    }
  }
  return out + RESET;
}

function markerIndex(elapsedRatio, cells) {
  if (elapsedRatio == null) return undefined;
  const i = Math.floor(elapsedRatio * cells);
  return Math.max(0, Math.min(cells - 1, i));
}

const MAX_PALETTE = [
  [220, 230, 245],
  [180, 215, 240],
  [190, 200, 245],
  [210, 195, 240],
  [235, 205, 225],
  [245, 220, 195],
  [235, 230, 210],
  [215, 230, 220],
];
const MAX_GLYPHS = ['◆', '◈', '◇', '◈'];

const TOP_TIER_MODELS = /\b(opus|fable)\b/i;

function maxSignature(now, modelId, modelName) {
  const id = (modelId || '') + ' ' + (modelName || '');
  if (!TOP_TIER_MODELS.test(id)) return null;
  const glyph = MAX_GLYPHS[Math.floor(now / 2) % MAX_GLYPHS.length];
  const color = MAX_PALETTE[Math.floor(now / 3) % MAX_PALETTE.length];
  return fg(color) + BOLD + glyph + RESET;
}

function renderRateSegment(label, raw, windowSeconds, cells, now, opts = {}) {
  if (raw?.used_percentage == null) return null;
  const pct = Math.floor(raw.used_percentage);
  let markerIdx, ahead = false, elapsedPct = null;
  if (raw.resets_at) {
    const elapsed = 1 - (raw.resets_at - now) / windowSeconds;
    markerIdx = markerIndex(elapsed, cells);
    elapsedPct = Math.max(0, Math.min(1, elapsed)) * 100;
    ahead = pct > elapsedPct;
  }
  const fill = opts.pace ? paceColor(pct, elapsedPct) : barColorFor(pct, [50, 80]);
  const idle = elapsedPct == null && opts.idleGlyph
    ? fg(IDLE_HINT) + BOLD + opts.idleGlyph + RESET + ' '
    : '';
  return label + ' ' + idle + bar(pct, cells, markerIdx, ahead, fill) + ' ' + pct + '%';
}

function render(d) {
  const parts = [];

  const model = d.model?.display_name ?? '?';
  const effort = d.effort?.level;
  parts.push(BOLD + model + RESET + (effort ? '·' + effort : ''));

  const ctxPct = Math.floor(d.context_window?.used_percentage ?? 0);
  const ctxFill = barColorFor(ctxPct, [60, 85]);
  let ctxSeg = 'ctx ' + bar(ctxPct, 5, undefined, false, ctxFill) + ' ' + ctxPct + '%';
  if (d.exceeds_200k_tokens) ctxSeg += ' ' + fg(ALERT_RED) + BOLD + '!200k' + RESET;
  parts.push(ctxSeg);

  const now = Date.now() / 1000;

  const fhSeg = renderRateSegment('5h', d.rate_limits?.five_hour, FIVE_H_SECONDS, 5, now, { idleGlyph: '▷' });
  if (fhSeg) parts.push(fhSeg);

  const sdSeg = renderRateSegment('7d', d.rate_limits?.seven_day, SEVEN_D_SECONDS, 7, now, { pace: true });
  if (sdSeg) parts.push(sdSeg);

  const sig = maxSignature(now, d.model?.id, d.model?.display_name);
  const body = parts.join('   ');
  return sig ? sig + ' ' + body : body;
}
