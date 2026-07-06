const fs = require('fs');
const path = require('path');
const Mustache = require('mustache');
const exporter = require('sass-export').exporter;

// ─── Extract config from SCSS ────────────────────────────────────────────────

const configSrc = fs.readFileSync('./scss/_config.scss', 'utf8');
// sass-export inlines raw source into #{inspect(...)}, so // line comments
// corrupt the expression once newlines are stripped — strip them first.
const stripped = configSrc.replace(/\/\/[^\n]*/g, '');

const tempFile = path.join(__dirname, '.scss-export-tmp.scss');
fs.writeFileSync(tempFile, stripped);

const sassData = exporter({ inputFiles: [tempFile], includePaths: ['./scss/'] }).getStructured();
fs.unlinkSync(tempFile);

// ─── Transform ───────────────────────────────────────────────────────────────

const fitcss = sassData.variables[0].mapValue;

function findEntry(name) {
  return fitcss.find(e => e.name === name);
}

function toSubmap(entry) {
  return Object.fromEntries((entry.mapValue || []).map(e => [e.name, e.value]));
}

const modifier    = findEntry('modifier').value;
const spacingCfg  = toSubmap(findEntry('spacing'));
const fontCfg     = toSubmap(findEntry('font_size'));
const shadowCfg   = toSubmap(findEntry('box_shadow'));

// ─── Scale value computation ──────────────────────────────────────────────────

// JS equivalent of SCSS growthList: initVal followed by `steps` multiplied values
function jsGrowthList(initVal, ratio, steps) {
  const list = [initVal];
  for (let i = 0; i < steps; i++) { initVal *= ratio; list.push(initVal); }
  return list;
}

// Returns { stepIndex: remValue } matching the SCSS scale mixin with $negative: true
// Negative keys run from -(minStep+1) to -1; positive keys from 1 to maxStep.
function stepValueMap(basePos, ratio, maxStep, baseNeg, negRatio, minStep) {
  const pos = jsGrowthList(basePos, ratio, maxStep);
  const neg = jsGrowthList(baseNeg, negRatio, minStep).reverse(); // largest first → key -(minStep+1)
  const map = {};
  neg.forEach((v, i) => { map[-(minStep + 1) + i] = v; });
  for (let i = 1; i <= maxStep; i++) map[i] = pos[i];
  return map;
}

// ─── Step / group builders ────────────────────────────────────────────────────

// Build step class names from max positive down through negative steps.
// The SCSS scale mixin generates minStep+1 negative classes (the base value counts
// as step -(minStep+1) after reversing the growth list), so we match that here.
// When valueMap is provided each step gets a heightRem field for inline styling.
function buildSteps(prefix, maxStep, minStep, suffix = '', valueMap = null) {
  const htmlSuffix = suffix.replace(/\\/g, '');
  const steps = [];
  for (let i = maxStep; i >= 1; i--) {
    const s = { cls: `${prefix}${modifier}${i}${htmlSuffix}` };
    if (valueMap) s.heightRem = parseFloat(valueMap[i].toFixed(4));
    if (i === 1) s.isBase = true;
    steps.push(s);
  }
  for (let i = 1; i <= minStep + 1; i++) {
    const s = { cls: `${prefix}${modifier}${modifier}${i}${htmlSuffix}` };
    if (valueMap) s.heightRem = parseFloat(valueMap[-i].toFixed(4));
    steps.push(s);
  }
  return steps;
}

// Parse breakpoints from raw SCSS (sass-export can't handle the nested toEm() calls)
function parseBreakpointsFromSrc(src) {
  const bpStart = src.indexOf('breakpoints:');
  if (bpStart < 0) return [];
  const openParen = src.indexOf('(', bpStart);
  if (openParen < 0) return [];
  let depth = 0, i = openParen;
  while (i < src.length) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') { depth--; if (depth === 0) break; }
    i++;
  }
  const bpBlock = src.slice(openParen + 1, i);
  const results = [];
  const lineRe = /^\s*(\w+)\s*:.*?syntax\s*:\s*["']([^"']*)["']/gm;
  let m;
  while ((m = lineRe.exec(bpBlock)) !== null) {
    results.push({ label: m[1], syntax: m[2].replace(/\\\\/g, '\\') });
  }
  return results;
}

const breakpoints = parseBreakpointsFromSrc(configSrc);

// Build one group per breakpoint context (default + each declared breakpoint).
// opts: { negRatios, basePos, baseNeg } — when provided, each step gets a heightRem.
function buildGroups(prefix, maxStep, minStep, ratios, opts = null) {
  const contexts = [
    { bpLabel: 'default', ratio: ratios[0] || '', suffix: '', idx: 0 },
    ...breakpoints.map((bp, i) => ({ bpLabel: bp.label, ratio: ratios[i + 1] || '', suffix: bp.syntax, idx: i + 1 })),
  ];
  return contexts.map(ctx => {
    const vmap = opts ? stepValueMap(
      opts.basePos, parseFloat(ctx.ratio), maxStep,
      opts.baseNeg, parseFloat((opts.negRatios || ratios)[ctx.idx]), minStep,
    ) : null;
    return { bpLabel: ctx.bpLabel, ratio: ctx.ratio, steps: buildSteps(prefix, maxStep, minStep, ctx.suffix, vmap) };
  });
}

const typeRatios       = (fontCfg.ratio        || '').trim().split(/\s+/);
const spacingRatios    = (spacingCfg.ratio     || '').trim().split(/\s+/);
const spacingNegRatios = (spacingCfg.neg_ratio || '').trim().split(/\s+/);
const shadowRatios     = (shadowCfg.ratio      || '').trim().split(/\s+/);

const typeGroups    = buildGroups('font', parseInt(fontCfg.max_step), parseInt(fontCfg.min_step), typeRatios);
const spacingGroups = buildGroups('mt',   parseInt(spacingCfg.max_step), parseInt(spacingCfg.min_step), spacingRatios, {
  negRatios: spacingNegRatios,
  basePos:   parseFloat(spacingCfg.base_positive),
  baseNeg:   parseFloat(spacingCfg.base_negative),
});

// Box shadow: only positive steps, no negative. SCSS scale($negative:false) emits steps+1
// classes (initial value + steps growth steps), indexed shadow-1 … shadow-(steps+1).
const shadowSteps = parseInt(shadowCfg.steps);
const shadowGroups = [
  { bpLabel: 'default', ratio: shadowRatios[0] || '', suffix: '' },
  ...breakpoints.map((bp, i) => ({ bpLabel: bp.label, ratio: shadowRatios[i + 1] || '', suffix: bp.syntax })),
].map(ctx => {
  const htmlSuffix = ctx.suffix.replace(/\\/g, '');
  const steps = [];
  for (let i = 1; i <= shadowSteps + 1; i++) {
    steps.push({ cls: `shadow${modifier}${i}${htmlSuffix}`, isBase: i === 1 });
  }
  return { bpLabel: ctx.bpLabel, ratio: ctx.ratio, steps };
});

// Colors  tones are computed by SCSS at build time, not stored in the config,
// so we mirror the fit_color_tones() logic in JS and parse the config directly.

function hexToRgb(hex) {
  if (hex.length === 4) hex = '#' + [...hex.slice(1)].map(c => c + c).join('');
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r,g,b), min = Math.min(r,g,b), l = (max+min)/2;
  if (max === min) return [0, 0, l*100];
  const d = max-min, s = l>0.5 ? d/(2-max-min) : d/(max+min);
  const h = max===r ? ((g-b)/d+(g<b?6:0))/6 : max===g ? ((b-r)/d+2)/6 : ((r-g)/d+4)/6;
  return [h*360, s*100, l*100];
}

function hslToHex(h, s, l) {
  s = Math.max(0, Math.min(100,s)) / 100;
  l = Math.max(0, Math.min(100,l)) / 100;
  const a = s * Math.min(l, 1-l);
  const f = n => {
    const k = (n + h/30) % 12;
    const c = l - a * Math.max(Math.min(k-3, 9-k, 1), -1);
    return Math.round(255*c).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function jsFitColorTones(base, lighterSteps, darkerSteps, lighterEnd, darkerEnd, lighterSatInc, darkerSatInc) {
  const [r,g,b] = hexToRgb(base);
  const [h,s,l] = rgbToHsl(r,g,b);
  const tones = [{ tone: 'base', hex: base }];
  for (let i = 1; i <= lighterSteps; i++) {
    const stepL = l + (lighterEnd - l) * (i / lighterSteps);
    const stepS = Math.max(0, Math.min(100, s + s * lighterSatInc * i));
    tones.push({ tone: String(i), hex: hslToHex(h, stepS, stepL) });
  }
  for (let i = 1; i <= darkerSteps; i++) {
    const stepL = l - (l - darkerEnd) * (i / darkerSteps);
    const stepS = Math.max(0, Math.min(100, s + s * darkerSatInc * i));
    tones.push({ tone: String(-i), hex: hslToHex(h, stepS, stepL) });
  }
  return tones;
}

function parseColorConfig(src) {
  const colorStart = src.indexOf('colors:');
  if (colorStart < 0) return { lighterSteps: 3, darkerSteps: 2, hues: [] };
  const openParen = src.indexOf('(', colorStart);
  let depth = 0, i = openParen;
  while (i < src.length) {
    if (src[i] === '(') depth++;
    else if (src[i] === ')') { depth--; if (depth === 0) break; }
    i++;
  }
  const block = src.slice(openParen+1, i);

  const lighterSteps = parseInt((block.match(/lighter_steps\s*:\s*(\d+)/) || [,'3'])[1]);
  const darkerSteps  = parseInt((block.match(/darker_steps\s*:\s*(\d+)/)  || [,'2'])[1]);

  const hues = [];
  const huesKeyStart = block.indexOf('hues:');
  if (huesKeyStart >= 0) {
    const huesOpen = block.indexOf('(', huesKeyStart);
    let hd = 0, j = huesOpen;
    while (j < block.length) {
      if (block[j] === '(') hd++;
      else if (block[j] === ')') { hd--; if (hd === 0) break; }
      j++;
    }
    const huesBlock = block.slice(huesOpen+1, j);

    const hueRe = /(\w+)\s*:\s*\(/g;
    let hm;
    while ((hm = hueRe.exec(huesBlock)) !== null) {
      const name = hm[1];
      const hueOpen = hm.index + hm[0].length - 1;
      let kd = 0, k = hueOpen;
      while (k < huesBlock.length) {
        if (huesBlock[k] === '(') kd++;
        else if (huesBlock[k] === ')') { kd--; if (kd === 0) break; }
        k++;
      }
      const hb = huesBlock.slice(hueOpen+1, k);
      const base = (hb.match(/base\s*:\s*(#[0-9a-fA-F]{3,8})/) || [])[1];
      if (!base) continue;
      hues.push({
        name,
        base,
        lighterEnd:    parseFloat((hb.match(/lighter_end\s*:\s*([\d.]+)/)          || [,'95'])[1]),
        darkerEnd:     parseFloat((hb.match(/darker_end\s*:\s*([\d.]+)/)           || [,'5'])[1]),
        lighterSatInc: parseFloat((hb.match(/lighter_sat_increase\s*:\s*([\d.]+)/) || [,'0'])[1]),
        darkerSatInc:  parseFloat((hb.match(/darker_sat_increase\s*:\s*([\d.]+)/)  || [,'0'])[1]),
      });
    }
  }
  return { lighterSteps, darkerSteps, hues };
}

const colorConfig = parseColorConfig(configSrc);

const colors = colorConfig.hues.map(hue => ({
  name: hue.name,
  swatches: jsFitColorTones(
    hue.base,
    colorConfig.lighterSteps, colorConfig.darkerSteps,
    hue.lighterEnd, hue.darkerEnd,
    hue.lighterSatInc, hue.darkerSatInc,
  ).map(({ tone, hex }) => {
    const suffix = tone === 'base' ? '' : `${modifier}${tone}`;
    return { hex, tone, colorClass: `color-${hue.name}${suffix}`, bgClass: `bg-${hue.name}${suffix}` };
  }),
}));

// Build tone-row × hue-column grid for the color matrix
function toneToNum(tone) {
  if (tone === 'base') return 0;
  return parseInt(tone, 10); 
}

const allTonesSet = new Set();
colors.forEach(({ swatches }) => swatches.forEach(({ tone }) => allTonesSet.add(tone)));
const sortedTones = Array.from(allTonesSet).sort((a, b) => toneToNum(b) - toneToNum(a));

const colorHues = colors.map(({ name }) => ({ name }));

const colorRows = sortedTones.map(tone => ({
  label: tone,
  isBase: tone === 'base',
  cells: colors.map(({ swatches }) => {
    const sw = swatches.find(s => s.tone === tone);
    return sw
      ? { filled: true, hex: sw.hex, colorClass: sw.colorClass, bgClass: sw.bgClass }
      : { filled: false };
  }),
}));

// ─── Render ──────────────────────────────────────────────────────────────────

const template = fs.readFileSync('./preview.mustache', 'utf8');
const html = Mustache.render(template, { colors, colorHues, colorRows, typeGroups, spacingGroups, shadowGroups });

fs.writeFileSync('./preview.html', html);
console.log('Generated preview2.html');
