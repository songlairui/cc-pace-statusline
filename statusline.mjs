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
const DIM_CYAN = '\x1b[2;36m';
const MARKER = '\x1b[1;92m';

const SEVEN_D_THRESHOLD_PP = 20;
const FIVE_H_SECONDS = 5 * 3600;
const SEVEN_D_SECONDS = 7 * 86400;

function colorFor(pct, [greenMax, yellowMax]) {
  if (pct < greenMax) return GREEN;
  if (pct < yellowMax) return YELLOW;
  return RED;
}

function bar(pct, cells, markerIdx, color) {
  const filled = Math.round((pct / 100) * cells);
  let out = color;
  for (let i = 0; i < cells; i++) {
    if (i === markerIdx) {
      out += RESET + MARKER + '│' + RESET + color;
    } else {
      out += i < filled ? '▓' : '░';
    }
  }
  return out + RESET;
}

function markerIndex(elapsedRatio, cells) {
  if (elapsedRatio == null) return undefined;
  const i = Math.floor(elapsedRatio * cells);
  return Math.max(0, Math.min(cells - 1, i));
}

function render(d) {
  const parts = [];

  const model = d.model?.display_name ?? '?';
  const effort = d.effort?.level;
  parts.push(BOLD + model + RESET + (effort ? '·' + effort : ''));

  const ctxPct = Math.floor(d.context_window?.used_percentage ?? 0);
  const ctxColor = colorFor(ctxPct, [60, 85]);
  let ctxSeg = 'ctx ' + bar(ctxPct, 5, undefined, ctxColor) + ' ' + ctxPct + '%';
  if (d.exceeds_200k_tokens) ctxSeg += ' ' + RED + BOLD + '!200k' + RESET;
  parts.push(ctxSeg);

  const now = Date.now() / 1000;

  const fh = d.rate_limits?.five_hour;
  if (fh?.used_percentage != null) {
    const pct = Math.floor(fh.used_percentage);
    const color = colorFor(pct, [50, 80]);
    let markerIdx;
    if (fh.resets_at) {
      const elapsed = 1 - (fh.resets_at - now) / FIVE_H_SECONDS;
      markerIdx = markerIndex(elapsed, 5);
    }
    parts.push('5h ' + bar(pct, 5, markerIdx, color) + ' ' + pct + '%');
  }

  const sd = d.rate_limits?.seven_day;
  if (sd?.used_percentage != null && sd.resets_at) {
    const pct = sd.used_percentage;
    const elapsed = 1 - (sd.resets_at - now) / SEVEN_D_SECONDS;
    const expected = Math.max(0, Math.min(1, elapsed)) * 100;
    const deviation = pct - expected;
    if (Math.abs(deviation) >= SEVEN_D_THRESHOLD_PP) {
      const ahead = deviation > 0;
      const color = ahead ? RED : DIM_CYAN;
      const prefix = ahead ? '7d!' : '7d·';
      const markerIdx = markerIndex(elapsed, 7);
      const sign = ahead ? '+' : '−';
      const devStr = sign + Math.round(Math.abs(deviation)) + 'pp';
      const pctInt = Math.floor(pct);
      parts.push(color + prefix + RESET + ' ' + bar(pctInt, 7, markerIdx, color) + ' ' + pctInt + '% ' + color + devStr + RESET);
    }
  }

  return parts.join('   ');
}
