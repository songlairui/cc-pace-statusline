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
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const MARKER_BEHIND = '\x1b[92m';
const MARKER_AHEAD = '\x1b[95m';
const BG_DIM = '\x1b[100m';

const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;

const DITHER_LEVELS = [0, 0.25, 0.5, 0.75, 1];
const DITHER_CHARS = [' ', '░', '▒', '▓', '█'];

function quantize(value) {
  let best = 0;
  let bestDelta = Math.abs(value - DITHER_LEVELS[0]);
  for (let i = 1; i < DITHER_LEVELS.length; i++) {
    const d = Math.abs(value - DITHER_LEVELS[i]);
    if (d < bestDelta) { bestDelta = d; best = i; }
  }
  return best;
}

function colorFor(pct, [greenMax, yellowMax]) {
  if (pct < greenMax) return GREEN;
  if (pct < yellowMax) return YELLOW;
  return RED;
}

function bar(pct, cells, markerIdx, markerAhead, barColor) {
  const target = Math.max(0, Math.min(1, pct / 100));
  let error = 0;
  let out = BG_DIM + barColor;
  for (let i = 0; i < cells; i++) {
    const desired = target + error;
    const q = quantize(desired);
    error = desired - DITHER_LEVELS[q];
    if (i === markerIdx) {
      const glyph = markerAhead ? '┃' : '│';
      const color = markerAhead ? MARKER_AHEAD : MARKER_BEHIND;
      out += color + glyph + barColor;
    } else {
      out += DITHER_CHARS[q];
    }
  }
  return out + RESET;
}

function markerIndex(elapsedRatio, cells) {
  if (elapsedRatio == null) return undefined;
  const i = Math.floor(elapsedRatio * cells);
  return Math.max(0, Math.min(cells - 1, i));
}

function renderRateSegment(label, raw, windowSeconds, cells, now) {
  if (raw?.used_percentage == null) return null;
  const pct = Math.floor(raw.used_percentage);
  const color = colorFor(pct, [50, 80]);
  let markerIdx, ahead = false;
  if (raw.resets_at) {
    const elapsed = 1 - (raw.resets_at - now) / windowSeconds;
    markerIdx = markerIndex(elapsed, cells);
    const elapsedPct = Math.max(0, Math.min(1, elapsed)) * 100;
    ahead = pct > elapsedPct;
  }
  return label + ' ' + bar(pct, cells, markerIdx, ahead, color) + ' ' + pct + '%';
}

function render(d) {
  const parts = [];

  const model = d.model?.display_name ?? '?';
  const effort = d.effort?.level;
  parts.push(BOLD + model + RESET + (effort ? '·' + effort : ''));

  const ctxPct = Math.floor(d.context_window?.used_percentage ?? 0);
  const ctxColor = colorFor(ctxPct, [60, 85]);
  let ctxSeg = 'ctx ' + bar(ctxPct, 5, undefined, false, ctxColor) + ' ' + ctxPct + '%';
  if (d.exceeds_200k_tokens) ctxSeg += ' ' + RED + BOLD + '!200k' + RESET;
  parts.push(ctxSeg);

  const now = Date.now() / 1000;

  const fhSeg = renderRateSegment('5h', d.rate_limits?.five_hour, FIVE_H_SECONDS, 5, now);
  if (fhSeg) parts.push(fhSeg);

  const sdSeg = renderRateSegment('7d', d.rate_limits?.seven_day, SEVEN_D_SECONDS, 7, now);
  if (sdSeg) parts.push(sdSeg);

  return parts.join('   ');
}
