// Valley map: a flat meadow (glen) at the front ringed by trees, earthy terraced
// hills behind it, and a range of stone mountains with snow caps at the back.
// A stream falls from the mountains, winds through the hills and fills a lake in the meadow.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 4, z: 44 };

export const VALLEY = {
  id: 'valley', name: 'Valley', tagline: 'A meadow, the hills, then the mountains.',
  win: 'The valley is gone, mountains and all.',
  start: START, half: HALF,
  ground: '#8fcf6b', skirt: '#6fb04f', sky: '#d5ecf7', bg: 'linear-gradient(#b9def4, #e3f2fa 60%, #d5ecf7)',
  hemiSky: 0xeef7ff, hemiGround: 0x7fae66, sun: 0xfff3df, caustics: false, bubbles: false,
  fogFar: 6,
  levels: [0.006, 0.018, 0.04, 0.08, 0.15, 0.26, 0.4, 0.58], // big map: early sizes come sooner
  build: buildValley,
};

// smooth value noise
function vnoise(x, z, s) {
  const xi = Math.floor(x / s), zi = Math.floor(z / s);
  const fx = x / s - xi, fz = z / s - zi;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  const a = hash(xi, zi, 11), b = hash(xi + 1, zi, 11), c = hash(xi, zi + 1, 11), d = hash(xi + 1, zi + 1, 11);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// the stream: a winding line from the waterfall at the mountain foot down to the lake
const STREAM = [[10, -29], [8, -22], [2, -16], [-2, -9], [2, -2], [-4, 6], [-10, 13], [-16, 20], [-20, 27]];
const LAKE = { x: -22, z: 33, rx: 12, rz: 7.5 };
function distToStream(x, z) {
  let best = Infinity;
  for (let i = 0; i < STREAM.length - 1; i++) {
    const [ax, az] = STREAM[i], [bx, bz] = STREAM[i + 1];
    const dx = bx - ax, dz = bz - az;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    best = Math.min(best, Math.hypot(x - ax - dx * t, z - az - dz * t));
  }
  return best;
}
const inLake = (x, z) => ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2 <= 1;

// height of the land (in cubes) at a column
const PEAKS = [[-44, -48, 34, 11], [-22, -52, 40, 12], [0, -47, 30, 10], [22, -53, 38, 12], [44, -46, 31, 11], [-8, -58, 26, 9], [34, -59, 28, 9]];
function mountainH(x, z) {
  let h = 0;
  for (const [px, pz, ph, pr] of PEAKS) {
    const d = Math.hypot((x - px) / pr, (z - pz) / (pr * 0.9));
    h = Math.max(h, ph * Math.max(0, 1 - d * 0.62) ** 1.5);
  }
  // a long ridge joining the peaks
  const ridge = Math.max(0, 1 - Math.abs(z + 48) / 13) * 16;
  return Math.max(h, ridge) + vnoise(x, z, 6) * 3 - 1.5;
}
function hillH(x, z) {
  if (z > 12) return 0;
  const t = Math.min(1, Math.max(0, (12 - z) / 34)); // 0 at the meadow, 1 at the mountain foot
  const sides = Math.max(0, (Math.abs(x) - 36) / 20) * 6; // hills curl around the meadow's sides
  const raw = t * 10 + vnoise(x + 100, z, 9) * 5 * t + sides * (1 - t * 0.5) - 1.2;
  return Math.max(0, Math.floor(raw / 2) * 2); // terraces two cubes high
}
function sideHillH(x, z) {
  if (z <= 12) return 0;
  const raw = Math.max(0, (Math.abs(x) - 44) / 16) * 7 + vnoise(x, z + 50, 7) * 2 - 1;
  return Math.max(0, Math.floor(raw / 2) * 2);
}
function landH(x, z) {
  let h = Math.max(hillH(x, z), sideHillH(x, z));
  if (z < -24) h = Math.max(h, Math.round(mountainH(x, z)));
  // the stream cuts a channel down to the valley floor
  const ds = distToStream(x, z);
  if (ds < 2.2) h = 0;
  else if (ds < 4.5) h = Math.min(h, Math.floor((ds - 2.2) * 2));
  if (inLake(x, z)) h = 0;
  return Math.min(42, Math.max(0, h));
}

export function buildValley() {
  const B = makeBuilder(2024);
  const { set, box, ellipsoid, cylX, cylY, chunky, rnd } = B;
  const H = {};
  const hAt = (x, z) => H[x + ',' + z] ?? 0;

  // ---------- terrain ----------
  for (let x = -60; x <= 60; x++) for (let z = -60; z <= 60; z++) H[x + ',' + z] = landH(x, z);
  for (let x = -60; x <= 60; x++)
    for (let z = -60; z <= 60; z++) {
      const h = hAt(x, z);
      if (!h) continue;
      // lowest neighbour: cubes above it are visible on a cliff face; cubes below it are hidden inside
      const low = Math.min(hAt(x - 1, z), hAt(x + 1, z), hAt(x, z - 1), hAt(x, z + 1));
      const mountain = z < -24 && h > 12;
      for (let k = 0; k < h; k++) {
        const depth = h - 1 - k; // 0 = the top cube
        const seen = depth === 0 || k >= low;
        let col;
        if (mountain) {
          if (k >= 30 || (k >= 25 && depth < 3 && hash(x, k, z) < 0.6)) col = seen && hash(x, z, k) < 0.3 ? C.snow2 : C.snow;
          else if (depth === 0 && k < 14) col = hash(x, z, 3) < 0.5 ? C.moss : C.meadow2; // green lower slopes
          else if (!seen) col = C.mtn;
          else col = hash(x >> 1, k >> 1, z >> 1) < 0.3 ? C.mtn2 : hash(x, k, z) < 0.15 ? C.mtnLight : C.mtn;
        } else if (depth === 0) col = vnoise(x, z, 5) > 0.45 ? (hash(x, z, 1) < 0.5 ? C.meadow : C.meadow2) : C.earthLight;
        else col = seen && k % 3 === 2 ? C.earthDark : C.earth;
        set(x, k, z, col);
      }
    }
  chunky(-60, 0, -60, 60, 44, 14, 4);
  chunky(-60, 0, 14, -42, 12, 60, 2); chunky(42, 0, 14, 60, 12, 60, 2);

  // ---------- water ----------
  // lake in the meadow, stones round the edge, lily pads and reeds
  for (let x = Math.floor(LAKE.x - LAKE.rx - 2); x <= LAKE.x + LAKE.rx + 2; x++)
    for (let z = Math.floor(LAKE.z - LAKE.rz - 2); z <= LAKE.z + LAKE.rz + 2; z++) {
      const d = ((x - LAKE.x) / LAKE.rx) ** 2 + ((z - LAKE.z) / LAKE.rz) ** 2;
      if (d <= 1) set(x, 0, z, hash(x, z, 7) < 0.18 ? C.stream2 : C.water);
      else if (d <= 1.35 && hash(x, z, 8) < 0.45) set(x, 0, z, hash(x, z, 9) < 0.5 ? C.stone : C.stoneDark);
    }
  for (const [a, b] of [[-4, -2], [5, 2], [1, 4], [-8, 3], [7, -3]]) { set(LAKE.x + a, 1, LAKE.z + b, C.lily); set(LAKE.x + a + 1, 1, LAKE.z + b, C.lily); }
  set(LAKE.x + 5, 2, LAKE.z + 2, C.flowerPink);
  for (const [a, b] of [[-12, 1], [-11, 4], [11, -3], [12, 1], [-6, -7]]) for (let k = 0; k < 3 + (a & 1); k++) set(LAKE.x + a, k, LAKE.z + b, C.reed);
  // the stream bed
  for (let x = -40; x <= 40; x++)
    for (let z = -32; z <= 30; z++) {
      if (inLake(x, z)) continue;
      const ds = distToStream(x, z);
      if (ds < 1.6) set(x, 0, z, hash(x, z, 5) < 0.2 ? C.foam : hash(x, z, 6) < 0.5 ? C.stream2 : C.stream);
      else if (ds < 2.3 && hash(x, z, 4) < 0.35) set(x, 0, z, C.stone);
    }
  // waterfall down the mountain face where the stream starts
  {
    const [wx, wz] = STREAM[0];
    for (let z = wz - 1; z >= wz - 9; z--)
      for (let x = wx - 1; x <= wx + 1; x++) {
        const h = hAt(x, z);
        for (let k = Math.max(0, h - 2); k < h; k++) set(x, k, z, (k + z) % 3 === 0 ? C.foam : C.stream2);
      }
    for (let k = 0; k < 3; k++) for (let x = wx - 2; x <= wx + 2; x++) set(x, 0, wz + 1 + (k % 2), C.foam); // splash pool
  }
  // a little plank bridge where the stream crosses the meadow
  for (let x = -14; x <= -6; x++) for (let z = 15; z <= 17; z++) set(x, 1, z, z === 16 ? C.wood : C.woodDark);
  for (const x of [-14, -6]) for (const z of [15, 17]) set(x, 2, z, C.woodDark);

  // ---------- trees and plants ----------
  const pine = (x, z, h, base = 0) => {
    for (let k = 0; k < 3; k++) set(x, base + k, z, C.trunk);
    for (let k = 2; k < h; k++) {
      const r = Math.max(0.6, (h - k) * 0.42);
      for (let i = -Math.ceil(r); i <= Math.ceil(r); i++)
        for (let j = -Math.ceil(r); j <= Math.ceil(r); j++)
          if (Math.hypot(i, j) <= r) set(x + i, base + k, z + j, hash(i, k, j) < 0.5 ? C.pine : C.pine2);
    }
    set(x, base + h, z, C.pine2);
  };
  const roundTree = (x, z, h, r, base = 0, fall = false) => {
    box(x, base, z, 2, h, 2, C.trunk);
    const ck = base + h + r - 1;
    ellipsoid(x + 0.5, ck, z + 0.5, r, r * 0.9, r, (i, k, j) => {
      const t = hash(i, k, j);
      if (fall) return t < 0.5 ? C.aspen : t < 0.8 ? C.goldenrod : C.leaf2;
      return t < 0.45 ? C.leaf : t < 0.8 ? C.leaf2 : C.leafDark;
    }, r > 3 ? 2 : 0);
    if (r >= 3) chunky(x - r, ck - r, z - r, x + r + 1, ck + r, z + r + 1, 2);
  };
  const birch = (x, z, h, base = 0) => {
    for (let k = 0; k < h; k++) set(x, base + k, z, k % 3 === 1 ? C.cowBlack : C.birch);
    ellipsoid(x, base + h + 1, z, 2.2, 2.6, 2.2, (i, k, j) => (hash(i, k, j) < 0.5 ? C.moss : C.leaf), 0);
  };
  const bush = (x, z, base = 0) => {
    ellipsoid(x, base + 1, z, 2, 1.5, 2, (i, k, j) => (hash(i, k, j) < 0.12 ? C.berry : hash(i, k, j) < 0.6 ? C.leaf2 : C.leafDark), 0, base);
  };
  const flower = (x, z, col) => { set(x, 0, z, C.stem); set(x, 1, z, col); if (hash(x, z, 3) < 0.3) set(x, 2, z, col); };
  const tuft = (x, z) => { set(x, 0, z, C.moss); if (hash(x, z, 2) < 0.4) set(x, 1, z, C.meadow); };
  const mushroom = (x, z) => {
    set(x, 0, z, C.birch); set(x, 1, z, C.birch);
    box(x - 1, 2, z - 1, 3, 1, 3, (i, k, j) => ((i + j) % 2 === 0 ? C.shroomCap : C.birch));
    set(x, 3, z, C.shroomCap);
  };
  const log = (x, z) => {
    cylX(x, 9, 1.2, z, 1.3, (i, k, j) => (i === x || i === x + 8 ? (Math.hypot(k - 1.2, j - z) < 0.7 ? C.earthLight : C.wood) : hash(i, k, j) < 0.2 ? C.moss : C.trunk));
  };
  const stump = (x, z) => { cylY(x, z, 0, 2, 1.4, (i, k, j) => (k === 1 ? C.earthLight : C.trunk)); };
  const boulder = (x, z, r) => {
    ellipsoid(x, 0, z, r, r * 0.75, r, (i, k, j) => (k >= r * 0.6 && hash(i, j, 2) < 0.6 ? C.moss : hash(i, k, j) < 0.4 ? C.stoneDark : C.stone), 0, 0);
    if (r >= 2.5) chunky(x - r, 0, z - r, x + r, r, z + r, 2);
  };

  const clearOfWater = (x, z, pad = 2) => distToStream(x, z) > 3 + pad && !inLake(x, z) && ((x - LAKE.x) / (LAKE.rx + pad)) ** 2 + ((z - LAKE.z) / (LAKE.rz + pad)) ** 2 > 1;
  const nearStart = (x, z, r) => Math.hypot(x - START.x, z - START.z) < r;

  // meadow floor: flowers, tufts, mushrooms, a log, a few stumps and boulders
  const blooms = [C.flowerPink, C.flowerPurple, C.bluebell, C.lupine, C.goldenrod, C.trim, C.petal];
  for (let n = 0; n < 260; n++) {
    const x = Math.round(-38 + rnd() * 76), z = Math.round(18 + rnd() * 40);
    if (!clearOfWater(x, z, 0) || nearStart(x, z, 3)) continue;
    if (rnd() < 0.6) flower(x, z, blooms[n % blooms.length]); else tuft(x, z);
  }
  // patches of lupines
  for (const [px, pz] of [[16, 30], [26, 46], [-6, 52], [-30, 50]])
    for (let n = 0; n < 14; n++) {
      const x = Math.round(px + (rnd() - 0.5) * 7), z = Math.round(pz + (rnd() - 0.5) * 5);
      if (clearOfWater(x, z, 0) && !nearStart(x, z, 3)) { set(x, 0, z, C.stem); set(x, 1, z, C.lupine); set(x, 2, z, C.lupine); set(x, 3, z, C.bluebell); }
    }
  [[12, 38], [-2, 32], [22, 54], [-14, 46], [30, 24]].forEach(([a, b]) => mushroom(a, b));
  log(14, 22);
  [[-34, 22], [24, 40], [6, 56]].forEach(([a, b]) => stump(a, b));
  boulder(30, 34, 2.8); boulder(-8, 24, 2); boulder(20, 18, 2.2); boulder(-36, 42, 3);
  [[-2, 40], [10, 50], [-26, 22], [34, 52]].forEach(([a, b]) => bush(a, b));

  // the ring of trees around the glen
  const ring = [];
  for (let x = -40; x <= 40; x += 5) ring.push([x + Math.round((rnd() - 0.5) * 3), 13 + Math.round(rnd() * 4)]);
  for (let z = 20; z <= 56; z += 5) { ring.push([-44 - Math.round(rnd() * 4), z]); ring.push([44 + Math.round(rnd() * 4), z]); }
  ring.forEach(([x, z], i) => {
    if (!clearOfWater(x, z, 1)) return;
    const base = hAt(x, z);
    const pick = i % 5;
    if (pick === 0 || pick === 3) pine(x, z, 11 + (i % 3) * 2, base);
    else if (pick === 1) birch(x, z, 7 + (i % 2) * 2, base);
    else roundTree(x, z, 3 + (i % 2), 3, base, i % 7 === 2);
  });
  // trees up on the hills
  for (let n = 0; n < 46; n++) {
    const x = Math.round(-54 + rnd() * 108), z = Math.round(-26 + rnd() * 36);
    if (!clearOfWater(x, z, 1)) continue;
    const base = hAt(x, z);
    if (base < 2) continue;
    if (rnd() < 0.55) pine(x, z, 9 + Math.floor(rnd() * 5), base);
    else roundTree(x, z, 3, 2.5, base, rnd() < 0.25);
  }
  // a few hardy pines on the lower mountain slopes
  for (let n = 0; n < 16; n++) {
    const x = Math.round(-54 + rnd() * 108), z = Math.round(-38 + rnd() * 10);
    const base = hAt(x, z);
    if (base < 8 || base > 22 || !clearOfWater(x, z, 1)) continue;
    pine(x, z, 8 + Math.floor(rnd() * 3), base);
  }

  return B.finalize();
}
