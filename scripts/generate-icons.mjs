// Dependency-free PNG icon generator. Run with: node scripts/generate-icons.mjs
// Produces:
//   public/icon-192.png         (Android home screen, manifest)
//   public/icon-512.png         (Android splash, manifest)
//   public/icon-512-maskable.png (Android adaptive icon)
//   public/apple-touch-icon.png (iOS home screen, 180x180)
import { writeFileSync, mkdirSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// ---- minimal PNG encoder (RGBA, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const tb = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([tb, data])), 0);
  return Buffer.concat([len, tb, data, crc]);
}
function encodePNG(w, h, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = w * 4;
  const raw = Buffer.alloc((stride + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

// ---- icon design ----
const COLORS = {
  bg: [15, 23, 42],     // slate-900
  tile: [14, 165, 233], // sky-500
  fg: [255, 255, 255],
};
// 5x7 bitmap for the letter "S"
const S_PATTERN = [
  '.XXXX',
  'X....',
  'X....',
  '.XXX.',
  '....X',
  '....X',
  'XXXX.',
];

function makeIcon(size, { maskable = false } = {}) {
  const px = Buffer.alloc(size * size * 4);
  const set = (x, y, [r, g, b]) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = 255;
  };
  // Full-bleed background (acts as the maskable safe-zone backdrop)
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) set(x, y, COLORS.bg);
  // Inner rounded tile. Maskable variant keeps content inside the 80% safe zone.
  const inset = Math.round(size * (maskable ? 0.18 : 0.08));
  const innerSize = size - inset * 2;
  const radius = Math.round(innerSize * 0.18);
  for (let y = 0; y < innerSize; y++) {
    for (let x = 0; x < innerSize; x++) {
      const dx = x < radius ? radius - 1 - x : (x >= innerSize - radius ? x - (innerSize - radius) : 0);
      const dy = y < radius ? radius - 1 - y : (y >= innerSize - radius ? y - (innerSize - radius) : 0);
      if (dx > 0 && dy > 0 && dx * dx + dy * dy > radius * radius) continue;
      set(x + inset, y + inset, COLORS.tile);
    }
  }
  // Letter "S" centered, ~62% of inner size
  const cell = Math.floor(innerSize * 0.62 / 7);
  const sW = cell * 5, sH = cell * 7;
  const ox = inset + Math.floor((innerSize - sW) / 2);
  const oy = inset + Math.floor((innerSize - sH) / 2);
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 5; c++) {
      if (S_PATTERN[r][c] !== 'X') continue;
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) {
        set(ox + c * cell + dx, oy + r * cell + dy, COLORS.fg);
      }
    }
  }
  return encodePNG(size, size, px);
}

mkdirSync(resolve(ROOT, 'public'), { recursive: true });
const targets = [
  ['public/icon-192.png', makeIcon(192)],
  ['public/icon-512.png', makeIcon(512)],
  ['public/icon-512-maskable.png', makeIcon(512, { maskable: true })],
  ['public/apple-touch-icon.png', makeIcon(180)],
];
for (const [rel, buf] of targets) {
  writeFileSync(resolve(ROOT, rel), buf);
  console.log(`wrote ${rel} (${buf.length} bytes)`);
}
