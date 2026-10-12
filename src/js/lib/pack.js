// Own-brand pack shots, drawn from product data. One function per pack shape,
// one shared label, one motif scattered in the pack's "window".
// Used by the build to write assets/packs/<slug>.svg, so every product is consistent.

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function mix(hex, target, t) {
  const a = hex.match(/\w\w/g).map((h) => parseInt(h, 16));
  const b = target.match(/\w\w/g).map((h) => parseInt(h, 16));
  return '#' + a.map((v, i) => Math.round(v + (b[i] - v) * t).toString(16).padStart(2, '0')).join('');
}
const light = (hex, t) => mix(hex, '#ffffff', t);
const dark = (hex, t) => mix(hex, '#000000', t);
function luminance(hex) {
  const [r, g, b] = hex.match(/\w\w/g).map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Break a product name into at most three balanced lines of capitals. */
export function wrapName(name, maxChars) {
  const words = name.toUpperCase().split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > maxChars) { lines.push(line); line = w; } else line = line ? line + ' ' + w : w;
  }
  if (line) lines.push(line);
  while (lines.length > 3) { const last = lines.pop(); lines[lines.length - 1] += ' ' + last; }
  return lines;
}

const CHAR_W = 0.64; // average advance of bold sans capitals, in em

/** The white own-brand label: roundel, name, size. Fits any name into w x h. */
function label(p, x, y, w, h) {
  let size = 17, lines;
  for (; size >= 10; size--) {
    lines = wrapName(p.name, Math.floor((w - 12) / (size * CHAR_W)));
    if (lines.length * size * 1.08 <= h - 24) break;
  }
  const cx = x + w / 2;
  const top = y + 9 + (h - 24 - lines.length * size * 1.08) / 2 + size * 0.86;
  const text = lines.map((ln, i) => {
    const est = ln.length * size * CHAR_W;
    const fit = est > w - 10 ? ` textLength="${w - 10}" lengthAdjust="spacingAndGlyphs"` : '';
    return `<text x="${cx}" y="${(top + i * size * 1.08).toFixed(1)}" font-size="${size}"${fit}>${esc(ln)}</text>`;
  }).join('');
  return `<g font-family="Arial Narrow,Arial,Helvetica,sans-serif" font-weight="700" text-anchor="middle">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#fff"/>` +
    `<rect x="${x}" y="${y}" width="${w}" height="7" fill="#e2001a"/>` +
    `<g fill="#111">${text}</g>` +
    `<text x="${cx}" y="${y + h - 5}" font-size="10" fill="#111" font-weight="400">${esc(p.size)}</text>` +
    `</g>`;
}

const roundel = (x, y) =>
  `<g transform="translate(${x} ${y}) rotate(-8)"><circle r="13" fill="#ffe200" stroke="#111" stroke-width="1.5"/>` +
  `<text y="4.5" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="12" fill="#e2001a">YS</text></g>`;

const MOTIFS = {
  round: (c) => `<circle r="9" fill="${c}"/><circle cx="-3" cy="-3" r="2.5" fill="#fff" opacity=".35"/>`,
  leaf: (c) => `<path d="M0-11C8-6 8 6 0 11C-8 6-8-6 0-11z" fill="${c}"/><path d="M0-8V9" stroke="#fff" stroke-width="1" opacity=".5"/>`,
  floret: (c) => `<circle cx="-5" cy="-3" r="5" fill="${c}"/><circle cx="5" cy="-3" r="5" fill="${c}"/><circle cy="-8" r="5" fill="${c}"/><rect x="-2" y="-1" width="4" height="10" fill="${c}"/>`,
  stick: (c) => `<rect x="-13" y="-4" width="26" height="8" rx="4" fill="${c}"/>`,
  fillet: (c) => `<path d="M-13 0C-13-9 2-10 9-6C15-3 14 6 7 8C-1 10-13 8-13 0z" fill="${c}"/>`,
  slice: (c) => `<path d="M-9 8V-3C-9-10 9-10 9-3V8z" fill="${c}"/>`,
  drop: (c) => `<path d="M0-11C6-3 8 1 8 4A8 8 0 0 1-8 4C-8 1-6-3 0-11z" fill="${c}"/>`,
  tube: (c) => `<path d="M-11-2L8-7L11 2L-8 7z" fill="${c}"/>`,
  wave: (c) => `<path d="M-13 0Q-8-8-3 0T7 0T13-2" fill="none" stroke="${c}" stroke-width="4" stroke-linecap="round"/>`,
  grain: (c) => `<circle cx="-6" cy="-4" r="3" fill="${c}"/><circle cx="5" cy="-6" r="3" fill="${c}"/><circle cx="0" cy="4" r="3" fill="${c}"/><circle cx="9" cy="5" r="3" fill="${c}"/><circle cx="-9" cy="6" r="3" fill="${c}"/>`,
  crescent: (c) => `<path d="M-11 4C-6-8 6-8 11 4C5-1-5-1-11 4z" fill="${c}"/>`,
  bubble: (c) => `<circle r="8" fill="none" stroke="${c}" stroke-width="2.5"/><circle cx="9" cy="-9" r="3.5" fill="none" stroke="${c}" stroke-width="2"/>`,
};

/** Scatter the product's motif over a box, on a fixed jittered grid. */
function scatter(p, x, y, w, h, colour, id) {
  const draw = MOTIFS[p.motif] || MOTIFS.round;
  const cols = Math.max(2, Math.round(w / 32)), rows = Math.max(1, Math.round(h / 28));
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = (r * 7 + c * 13 + p.id * 5) % 11;
      const px = x + (c + 0.5) * (w / cols) + (k - 5) * 0.9;
      const py = y + (r + 0.5) * (h / rows) + ((k * 3) % 7 - 3);
      out += `<g transform="translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${k * 33 - 160})">${draw(colour)}</g>`;
    }
  }
  return `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath><g clip-path="url(#${id})">${out}</g>`;
}

const SHAPES = {
  // Pillow bag with crimped ends.
  bag(p, t) {
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push(`${36 + i * 8},${i % 2 ? 24 : 30}`);
    for (let i = 16; i >= 0; i--) pts.push(`${36 + i * 8},${i % 2 ? 182 : 176}`);
    return `<polygon points="${pts.join(' ')}" fill="${t.body}"/>` +
      `<path d="M36 34H164V40H36zM36 166H164V172H36z" fill="${t.shade}"/>` +
      scatter(p, 40, 42, 120, 52, t.motif, `m${p.id}`) + label(p, 44, 98, 112, 62) + roundel(150, 52);
  },
  // Black tray, film lid, contents showing, label across the lower half.
  tray(p, t) {
    return `<rect x="18" y="38" width="164" height="128" rx="12" fill="#1c1c1c"/>` +
      `<rect x="27" y="47" width="146" height="110" rx="6" fill="${t.body}"/>` +
      scatter(p, 27, 47, 146, 50, t.motif, `m${p.id}`) +
      `<path d="M27 53L60 47H40z" fill="#fff" opacity=".35"/>` + label(p, 34, 94, 132, 58) + roundel(160, 58);
  },
  tin(p, t) {
    return `<rect x="50" y="34" width="100" height="138" fill="${t.body}"/>` +
      `<ellipse cx="100" cy="172" rx="50" ry="9" fill="#9aa1a8"/><rect x="50" y="34" width="100" height="6" fill="#c5cad0"/>` +
      `<rect x="50" y="166" width="100" height="6" fill="#c5cad0"/><ellipse cx="100" cy="34" rx="50" ry="9" fill="#dfe3e7" stroke="#9aa1a8" stroke-width="1.5"/>` +
      `<ellipse cx="100" cy="34" rx="38" ry="5.5" fill="none" stroke="#9aa1a8" stroke-width="1"/>` +
      scatter(p, 50, 46, 100, 40, t.motif, `m${p.id}`) + label(p, 54, 90, 92, 62) + roundel(138, 58);
  },
  jar(p, t) {
    return `<rect x="62" y="22" width="76" height="20" rx="3" fill="#2b2b2b"/><rect x="62" y="28" width="76" height="3" fill="#555"/>` +
      `<path d="M58 46Q58 42 66 42H134Q142 42 142 46V170Q142 178 134 178H66Q58 178 58 170z" fill="${t.body}"/>` +
      `<path d="M64 48V172" stroke="#fff" stroke-width="4" opacity=".3"/>` +
      scatter(p, 62, 50, 76, 36, t.motif, `m${p.id}`) + label(p, 58, 90, 84, 66) + roundel(132, 62);
  },
  bottle(p, t) {
    return `<rect x="86" y="14" width="28" height="16" rx="2" fill="#e2001a"/>` +
      `<path d="M88 30H112V46Q112 54 124 62Q134 68 134 82V168Q134 178 124 178H76Q66 178 66 168V82Q66 68 76 62Q88 54 88 46z" fill="${t.body}"/>` +
      `<path d="M74 80V170" stroke="#fff" stroke-width="4" opacity=".3"/>` +
      scatter(p, 70, 66, 60, 28, t.motif, `m${p.id}`) + label(p, 62, 98, 76, 64) + roundel(128, 76);
  },
  // Handled jug: milk, laundry liquid.
  jug(p, t) {
    const body = p.cat === 'dairy' ? '#f3f5f6' : t.body;
    return `<rect x="70" y="16" width="34" height="16" rx="3" fill="${p.cat === 'dairy' ? p.tint : '#e2001a'}"/>` +
      `<path d="M66 32H108L150 58Q158 64 158 74V166Q158 178 146 178H56Q44 178 44 166V70Q44 60 52 52z" fill="${body}" stroke="${p.cat === 'dairy' ? '#cfd5d9' : 'none'}" stroke-width="1.5"/>` +
      `<path d="M122 62Q142 66 142 86V110Q142 118 134 118H124Q118 118 118 110V72Q118 62 122 62z" fill="${p.cat === 'dairy' ? '#dfe4e7' : t.shade}"/>` +
      (p.cat === 'dairy' ? `<rect x="44" y="92" width="114" height="8" fill="${p.tint}"/>` : scatter(p, 48, 60, 64, 34, t.motif, `m${p.id}`)) +
      label(p, 48, 104, 106, 60) + roundel(70, 66);
  },
  // Gable-top carton.
  carton(p, t) {
    return `<path d="M62 20H138V30H62z" fill="${t.shade}"/><path d="M62 30H138L150 56H50z" fill="${light(p.tint, 0.25)}"/>` +
      `<rect x="50" y="56" width="100" height="122" fill="${t.body}"/><path d="M50 56H150" stroke="${t.shade}" stroke-width="2"/>` +
      `<circle cx="118" cy="43" r="7" fill="#fff" stroke="${t.shade}" stroke-width="2"/>` +
      scatter(p, 50, 60, 100, 36, t.motif, `m${p.id}`) + label(p, 54, 100, 92, 64) + roundel(138, 70);
  },
  box(p, t) {
    return `<path d="M34 50L46 36H166L154 50z" fill="${t.shade}"/><path d="M154 50L166 36V160L154 174z" fill="${dark(p.tint, 0.35)}"/>` +
      `<rect x="34" y="50" width="120" height="124" fill="${t.body}"/>` +
      scatter(p, 34, 54, 120, 42, t.motif, `m${p.id}`) + label(p, 40, 100, 108, 62) + roundel(140, 66);
  },
  // Sliced loaf in a clear bag, tied at one end.
  loaf(p, t) {
    return `<path d="M30 78Q30 44 62 44H138Q170 44 170 78V160Q170 168 162 168H38Q30 168 30 160z" fill="${t.body}"/>` +
      `<path d="M30 80Q30 52 62 52H138Q170 52 170 80" fill="none" stroke="${t.shade}" stroke-width="6"/>` +
      Array.from({ length: 6 }, (_, i) => `<path d="M${50 + i * 20} 52V96" stroke="${t.shade}" stroke-width="1.5" opacity=".6"/>`).join('') +
      `<path d="M170 96L190 82V134L170 120z" fill="${light(p.tint, 0.6)}"/><rect x="166" y="100" width="8" height="16" fill="#e2001a"/>` +
      label(p, 38, 96, 124, 62) + roundel(52, 70);
  },
  // Vacuum-wrapped block: cheddar.
  block(p, t) {
    return `<path d="M24 62L40 48H176L160 62z" fill="${light(p.tint, 0.3)}"/><path d="M160 62L176 48V146L160 160z" fill="${t.shade}"/>` +
      `<rect x="24" y="62" width="136" height="98" fill="${t.body}"/>` +
      `<path d="M14 62H24V160H14L18 148L14 136L18 124L14 111L18 98L14 86L18 74z" fill="${light(p.tint, 0.5)}"/>` +
      label(p, 32, 74, 120, 74) + roundel(150, 72);
  },
};

/** Complete SVG document for one product's pack shot. */
export function packSvg(p) {
  const draw = SHAPES[p.pack];
  if (!draw) throw new Error(`No pack shape "${p.pack}" for ${p.name}`);
  const pale = luminance(p.tint) > 0.55;
  const tones = { body: p.tint, shade: dark(p.tint, 0.22), motif: pale ? dark(p.tint, 0.2) : light(p.tint, 0.3) };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200" role="img" aria-label="${esc(p.name)}, ${esc(p.size)}">` +
    `<ellipse cx="100" cy="184" rx="72" ry="6" fill="#000" opacity=".12"/>${draw(p, tones)}</svg>`;
}

export const PACK_SHAPES = Object.keys(SHAPES);
