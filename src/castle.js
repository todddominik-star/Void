// Castle map: a market village at the front, a moat and drawbridge, stone curtain walls with
// round towers, a courtyard with a smithy and an archery range, a great keep with a tall tower,
// a tournament field to the west, an orchard to the east, and a dragon asleep in the woods behind.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 49 };

export const CASTLE = {
  id: 'castle', name: 'Castle', tagline: 'A proud old castle. It had a good run.',
  win: 'The castle is gone. The dragon never woke up.',
  start: START, half: HALF,
  ground: '#93cf6e', skirt: '#73b152', sky: '#d3ebf8', bg: 'linear-gradient(#bde0f5, #e6f3fb 60%, #d3ebf8)',
  hemiSky: 0xeef7ff, hemiGround: 0x82b169, sun: 0xfff0d8, caustics: false, bubbles: false,
  fogFar: 6,
  levels: [0.008, 0.024, 0.05, 0.09, 0.16, 0.27, 0.41, 0.6],
  build: buildCastle,
};

// walls: outer edge of the curtain wall
const W = { x0: -32, x1: 32, z0: -40, z1: 12, t: 4, h: 12 };

export function buildCastle() {
  const B = makeBuilder(1066);
  const { set, del, has, box, ellipsoid, cylY, cylX, cylZ, line, chunky, rnd } = B;
  const stone = (i, k, j) => (hash(i >> 1, k >> 1, j >> 1) < 0.25 ? C.keep2 : C.keep);

  // ---------- building pieces ----------
  const crenellate = (x0, z0, x1, z1, k, col = C.keep2) => {
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const edge = i === x0 || i === x1 || j === z0 || j === z1;
      if (edge && ((i + j) & 2) === 0) set(i, k, j, col);
    }
  };
  const flag = (x, k, z, col, len = 5) => {
    for (let t = 0; t < 5; t++) set(x, k + t, z, C.anchor);
    for (let a = 1; a <= len; a++) for (let b = 0; b < 3; b++) if (b > 0 || a < len) set(x + a, k + 2 + b, z, col);
  };
  const roundTower = (cx, cz, r, h, roofCol, flagCol) => {
    cylY(cx, cz, 0, h, r, C.keep);
    chunky(cx - r, 0, cz - r, cx + r, h - 1, cz + r, 4);
    // ring of merlons, then a cone roof in two-tone rows
    for (let a = 0; a < 24; a++) if (a % 2 === 0) { const t = (a / 24) * Math.PI * 2; set(cx + Math.cos(t) * (r - 0.4), h, cz + Math.sin(t) * (r - 0.4), C.keep2); }
    const rh = Math.round(r * 1.9);
    for (let k = 0; k < rh; k++) cylY(cx, cz, h + 1 + k, 1, (r - 0.6) * (1 - k / rh) + 0.5, k % 2 ? C.slate : roofCol);
    flag(Math.round(cx), h + 1 + rh, Math.round(cz), flagCol, 4);
  };
  const banner = (x, k0, z, len, col, face = 1) => {
    // hangs one cube proud of a wall face (face = +1 south, -1 north)
    for (let k = k0; k > k0 - len; k--) for (let a = 0; a < 3; a++) set(x + a, k, z, a === 1 && (k === k0 - 2 || k === k0 - 3) ? C.bannerGold : col);
    set(x + 1, k0 - len, z, col);
  };
  const windowAt = (x, k, z) => { set(x, k, z, C.lit); set(x + 1, k, z, C.lit); set(x, k + 1, z, C.lit); set(x + 1, k + 1, z, C.lit); set(x, k - 1, z, C.keepDark); set(x + 1, k - 1, z, C.keepDark); };

  const cottage = (x, z, w, d, roofCol) => {
    const H = 5;
    box(x, 0, z, w, H, d, (i, k, j) => {
      const corner = (i === x || i === x + w - 1) && (j === z || j === z + d - 1);
      const face = j === z + d - 1 || j === z || i === x || i === x + w - 1;
      if (face && (corner || k === 0 || k === H - 1 || (i - x) % 4 === 0 && j !== z && j !== z + d - 1)) return C.timber;
      return C.plaster;
    });
    chunky(x + 1, 1, z + 1, x + w - 2, H - 2, z + d - 2, 2);
    // door and lit windows on the front (south) face, one cube proud
    box(x + Math.floor(w / 2), 0, z + d, 2, 3, 1, C.timber);
    for (const wx of [x + 1, x + w - 3]) { set(wx, 2, z + d, C.lit); set(wx + 1, 2, z + d, C.lit); }
    // gable roof running east-west
    for (let t = 0; t <= Math.ceil(d / 2); t++)
      for (let i = x - 1; i <= x + w; i++) {
        set(i, H + t, z - 1 + t, t % 2 ? C.slate : roofCol);
        set(i, H + t, z + d - t, t % 2 ? C.slate : roofCol);
        if (i === x || i === x + w - 1) for (let j = z + t; j < z + d - t; j++) set(i, H + t, j, C.plaster);
      }
    box(x + w - 3, H + 1, z + 1, 2, Math.ceil(d / 2) + 2, 2, C.brick);
    // flower box
    for (let a = 0; a < 2; a++) { set(x + 1 + a, 1, z + d + 1, C.timber); set(x + 1 + a, 2, z + d + 1, a ? C.flowerPink : C.petal); }
  };
  const stall = (x, z, col) => {
    box(x, 0, z, 6, 2, 3, C.crate);
    for (const [a, b] of [[0, 0], [5, 0], [0, 2], [5, 2]]) for (let k = 2; k < 5; k++) set(x + a, k, z + b, C.timber);
    for (let a = -1; a <= 6; a++) for (let b = -1; b <= 3; b++) set(x + a, 5 + (b < 0 || b > 2 ? -1 : 0), z + b, (a + 10) % 2 ? col : C.awningWhite);
    const goods = [C.apple, C.pumpkin, C.cob, C.cabbage, C.carrot];
    for (let a = 0; a < 6; a++) set(x + a, 2, z + 1, goods[(a + x) % goods.length]);
  };
  const barrel = (x, z) => { cylY(x, z, 0, 3, 1.3, (i, k, j) => (k === 1 ? C.anchor : C.barrel)); };
  const crates = (x, z) => { box(x, 0, z, 2, 2, 2, C.crate); box(x + 2, 0, z, 2, 2, 2, C.crate); box(x + 1, 2, z, 2, 2, 2, C.crate); };
  const lantern = (x, z) => { for (let k = 0; k < 5; k++) set(x, k, z, C.timber); set(x, 5, z, C.lit); set(x, 6, z, C.anchor); };
  const roundTree = (x, z, h, r, apples = 0) => {
    box(x, 0, z, 2, h, 2, C.trunk);
    const ck = h + r - 1;
    ellipsoid(x + 0.5, ck, z + 0.5, r, r * 0.9, r, (i, k, j) => {
      const t = hash(i, k, j);
      if (apples && t < apples) return C.apple;
      return t < 0.45 ? C.leaf : t < 0.8 ? C.leaf2 : C.leafDark;
    }, r > 3 ? 2 : 0);
    if (r >= 3) chunky(x - r, ck - r, z - r, x + r + 1, ck + r, z + r + 1, 2);
  };
  const pine = (x, z, h) => {
    for (let k = 0; k < 3; k++) set(x, k, z, C.trunk);
    for (let k = 2; k < h; k++) {
      const r = Math.max(0.6, (h - k) * 0.42);
      for (let i = -Math.ceil(r); i <= Math.ceil(r); i++)
        for (let j = -Math.ceil(r); j <= Math.ceil(r); j++)
          if (Math.hypot(i, j) <= r) set(x + i, k, z + j, hash(i, k, j) < 0.5 ? C.pine : C.pine2);
    }
  };
  const tent = (x, z, col) => {
    cylY(x, z, 0, 4, 3.4, (i, k, j) => (Math.floor((Math.atan2(j - z, i - x) + Math.PI) / (Math.PI / 4)) % 2 ? col : C.awningWhite), 0.9);
    for (let k = 0; k < 5; k++) cylY(x, z, 4 + k, 1, 3.8 * (1 - k / 5) + 0.3, k % 2 ? C.awningWhite : col);
    flag(x, 9, z, C.banner, 3);
    set(x, 1, z + 3, C.cowBlack); set(x, 2, z + 3, C.cowBlack); // open flap
  };
  const target = (x, z) => {
    for (const a of [-2, 2]) for (let k = 0; k < 4; k++) set(x + a, k, z + 1, C.timber);
    for (let a = -3; a <= 3; a++) for (let b = -3; b <= 3; b++) {
      const d = Math.hypot(a, b);
      if (d > 3.3) continue;
      set(x + a, 6 + b, z, d < 1 ? C.bannerGold : d < 2 ? C.banner : d < 2.8 ? C.target : C.banner);
    }
  };
  const dummy = (x, z) => {
    for (let k = 0; k < 3; k++) set(x, k, z, C.timber);
    box(x - 1, 3, z, 3, 3, 1, C.straw); set(x, 6, z, C.straw); set(x, 7, z, C.straw);
    for (let a = -2; a <= 2; a++) set(x + a, 5, z, a === 0 ? C.straw : C.timber);
  };
  const hayBale = (x, z) => { cylX(x, 4, 2, z, 2.2, (i, k, j) => (hash(i, k, j) < 0.3 ? C.hayDark : C.hay)); chunky(x, 0, z - 3, x + 3, 4, z + 3, 4); };

  // ---------- the moat, drawbridge and road ----------
  for (let x = W.x0 - 5; x <= W.x1 + 5; x++)
    for (let z = W.z0 - 5; z <= W.z1 + 5; z++) {
      const inside = x >= W.x0 - 1 && x <= W.x1 + 1 && z >= W.z0 - 1 && z <= W.z1 + 1;
      if (inside) continue;
      const rim = x === W.x0 - 5 || x === W.x1 + 5 || z === W.z0 - 5 || z === W.z1 + 5;
      set(x, 0, z, rim ? (hash(x, z, 1) < 0.5 ? C.stone : C.stoneDark) : hash(x, z, 2) < 0.15 ? C.stream2 : C.water);
    }
  for (let x = -3; x <= 3; x++) for (let z = W.z1 + 1; z <= W.z1 + 6; z++) set(x, 1, z, x === -3 || x === 3 ? C.timber : (z % 2 ? C.wood : C.woodDark));
  line(-3, 9, W.z1 + 1, -3, 2, W.z1 + 6, C.anchor); line(3, 9, W.z1 + 1, 3, 2, W.z1 + 6, C.anchor); // chains
  for (let z = W.z1 + 7; z <= 58; z++) for (let x = -3; x <= 3; x++) if (Math.hypot(x, z - 34) > 5.5) set(x, 0, z, hash(x, z, 4) < 0.35 ? C.stone : C.cobble);
  // village fountain on the road
  cylY(0, 34, 0, 2, 4.4, C.keep2);
  cylY(0, 34, 1, 1, 3.4, (i, k, j) => (hash(i, j, 3) < 0.2 ? C.stream2 : C.water));
  for (let k = 2; k < 6; k++) set(0, k, 34, k === 5 ? C.foam : C.keep);
  for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(a, 5, 34 + b, C.stream2);

  // ---------- curtain walls, gatehouse and towers ----------
  const wallCell = (x, z) => (x >= W.x0 && x < W.x0 + W.t) || (x <= W.x1 && x > W.x1 - W.t) || (z >= W.z0 && z < W.z0 + W.t) || (z <= W.z1 && z > W.z1 - W.t);
  for (let x = W.x0; x <= W.x1; x++)
    for (let z = W.z0; z <= W.z1; z++) {
      if (!wallCell(x, z)) continue;
      const gate = Math.abs(x) <= 3 && z > W.z1 - W.t;
      for (let k = 0; k < W.h; k++) {
        if (gate && k < 8) continue;
        set(x, k, z, C.keep);
      }
    }
  chunky(W.x0, 0, W.z0, W.x1, W.h - 1, W.z1, 4);
  // walkway merlons along both edges of the wall top
  crenellate(W.x0, W.z0, W.x1, W.z1, W.h);
  crenellate(W.x0 + W.t - 1, W.z0 + W.t - 1, W.x1 - W.t + 1, W.z1 - W.t + 1, W.h);
  // portcullis in the gate
  for (let x = -3; x <= 3; x++) for (let k = 0; k < 8; k++) if (x % 2 === 0 || k % 3 === 2) set(x, k, W.z1 - 1, C.anchor);
  // gatehouse towers flanking the gate
  for (const gx of [-9, 5]) {
    box(gx, 0, W.z1 - 5, 5, 16, 8, C.keep);
    chunky(gx, 0, W.z1 - 5, gx + 4, 15, W.z1 + 2, 4);
    crenellate(gx, W.z1 - 5, gx + 4, W.z1 + 2, 16);
    banner(gx + 1, 14, W.z1 + 3, 6, gx < 0 ? C.banner : C.bannerBlue);
  }
  roundTower(W.x0, W.z1, 5.5, 18, C.roofCastle, C.banner);
  roundTower(W.x1, W.z1, 5.5, 18, C.roofCastle, C.bannerBlue);
  roundTower(W.x0, W.z0, 5.5, 20, C.roofCastle, C.bannerBlue);
  roundTower(W.x1, W.z0, 5.5, 20, C.roofCastle, C.banner);

  // ---------- the keep ----------
  const K = { x0: -12, x1: 12, z0: -34, z1: -18, h: 20 };
  box(K.x0, 0, K.z0, K.x1 - K.x0 + 1, K.h, K.z1 - K.z0 + 1, stone);
  chunky(K.x0, 0, K.z0, K.x1, K.h - 1, K.z1, 4);
  crenellate(K.x0, K.z0, K.x1, K.z1, K.h);
  for (const wx of [-9, -4, 3, 8]) { windowAt(wx, 7, K.z1 + 1); windowAt(wx, 14, K.z1 + 1); }
  for (const wz of [-30, -24]) { windowAt(K.x0 - 1, 10, wz); windowAt(K.x1 + 1, 10, wz); }
  box(-2, 0, K.z1 + 1, 4, 6, 1, C.timber); set(-1, 6, K.z1 + 1, C.timber); set(0, 6, K.z1 + 1, C.timber);
  banner(-12 + 2, 18, K.z1 + 1, 7, C.banner); banner(8, 18, K.z1 + 1, 7, C.bannerBlue);
  // great tower on top of the keep
  cylY(0, -26, K.h, 12, 4.4, C.keep);
  chunky(-5, K.h, -31, 5, K.h + 11, -21, 4);
  for (let k = 0; k < 9; k++) cylY(0, -26, K.h + 12 + k, 1, 4.6 * (1 - k / 9) + 0.4, k % 2 ? C.slate : C.roofCastle);
  windowAt(-1, K.h + 6, -21);
  flag(0, K.h + 21, -26, C.banner, 5);

  // ---------- courtyard ----------
  for (let z = W.z1 - W.t; z > K.z1 + 1; z--) for (let x = -2; x <= 1; x++) set(x, 0, z, hash(x, z, 4) < 0.35 ? C.stone : C.cobble);
  // smithy with a glowing forge and an anvil
  box(-26, 0, -12, 8, 5, 6, (i, k, j) => (k === 0 || k === 4 || i === -26 || i === -19 ? C.timber : C.plaster));
  chunky(-25, 1, -11, -20, 3, -8, 2);
  for (let t = 0; t < 4; t++) box(-27 + t, 5 + t, -13 + t, 10 - 2 * t, 1, 8 - 2 * t, t % 2 ? C.slate : C.roofTile);
  box(-24, 0, -5, 3, 2, 2, C.keepDark); set(-23, 2, -5, C.ember); set(-22, 2, -5, C.ember); set(-23, 2, -4, C.lit);
  box(-19, 0, -4, 2, 1, 1, C.anchor); box(-20, 1, -4, 4, 1, 1, C.anchor);
  // archery range and training dummies
  target(18, -10); target(25, -10);
  dummy(12, 0); dummy(16, 3); dummy(20, 0);
  // well, crates, barrels, trees
  cylY(10, -10, 0, 3, 2.4, C.keep2, 1); set(10, 0, -10, C.water);
  for (const dx of [-2, 2]) for (let k = 3; k < 7; k++) set(10 + dx, k, -10, C.timber);
  box(8, 7, -11, 5, 1, 3, C.roofTile);
  crates(-12, 2); crates(-16, 4); barrel(-8, 5); barrel(9, 5); barrel(11, 3);
  roundTree(-24, 2, 3, 2.6); roundTree(22, -16, 3, 2.6);
  lantern(-5, 2); lantern(5, 2);

  // ---------- village (outside the moat) ----------
  cottage(-30, 24, 10, 7, C.roofTile);
  cottage(-32, 40, 9, 7, C.roofCastle);
  cottage(18, 22, 10, 7, C.roofCastle);
  cottage(24, 38, 9, 7, C.roofTile);
  cottage(-18, 48, 9, 6, C.roofTile);
  stall(-14, 28, C.awningRed); stall(8, 29, C.awningYellow); stall(9, 44, C.awningRed);
  // hay cart
  box(14, 2, 50, 4, 2, 7, C.wood); for (const zz of [51, 55]) for (const xx of [13, 18]) cylZ(zz, 1, 1.4, xx, 1.4, C.timber);
  ellipsoid(16, 5, 53.5, 2.4, 2, 3.6, (i, k, j) => (hash(i, k, j) < 0.3 ? C.hayDark : C.hay), 0, 4);
  barrel(-6, 22); barrel(6, 54); crates(26, 50);
  for (const z of [22, 30, 40, 50]) { lantern(-5, z); lantern(5, z); }
  for (let n = 0; n < 80; n++) {
    const x = Math.round((rnd() - 0.5) * 80), z = Math.round(20 + rnd() * 38);
    if (Math.abs(x) < 6 || Math.hypot(x - START.x, z - START.z) < 5) continue;
    set(x, 0, z, C.stem); set(x, 1, z, [C.flowerPink, C.flowerPurple, C.petal, C.trim][n % 4]);
  }
  for (const [a, b] of [[-40, 30], [-42, 50], [38, 28], [42, 48], [-22, 56], [32, 56], [-4, 58]]) roundTree(a, b, 3, 2.6);

  // ---------- tournament field (west) ----------
  for (let z = -24; z <= 6; z++) { set(-46, 1, z, C.wood); set(-46, 2, z, z % 2 ? C.banner : C.awningWhite); if (z % 3 === 0) set(-46, 0, z, C.timber); }
  tent(-53, -20, C.tentPurple); tent(-53, -6, C.awningRed); tent(-53, 8, C.bannerBlue); tent(-41, 18, C.awningYellow);
  for (const z of [-26, -14, -2]) { box(-42, 0, z, 3, 3, 3, C.timber); flag(-41, 3, z + 1, z % 2 ? C.banner : C.bannerBlue, 3); }

  // ---------- orchard and hay (east) ----------
  for (let a = 0; a < 2; a++) for (let b = 0; b < 4; b++) roundTree(44 + a * 7, -22 + b * 8, 3, 2.8, 0.12);
  hayBale(42, 16); hayBale(47, 22); hayBale(40, 24);

  // ---------- the dragon, asleep in the woods behind the castle ----------
  for (let n = 0; n < 26; n++) {
    const x = Math.round(-54 + rnd() * 108), z = Math.round(-58 + rnd() * 10);
    if (Math.hypot(x - 24, z - 52 + 0) < 16 || Math.abs(x) + Math.abs(z) > 104) continue;
    pine(x, z, 9 + Math.floor(rnd() * 5));
  }
  {
    const dx = 26, dz = -52;
    ellipsoid(dx, 0, dz, 12, 3, 7, (i, k, j) => (hash(i >> 1, k, j >> 1) < 0.4 ? C.rock2 : C.rock), 0, 0); // rocky bed
    chunky(dx - 12, 0, dz - 7, dx + 12, 3, dz + 7, 4);
    // curled body: a ring of overlapping segments
    for (let t = 0; t < 14; t++) {
      const a = Math.PI * 0.15 + (t / 13) * Math.PI * 1.55;
      const sx = dx + Math.cos(a) * 7, sz = dz + Math.sin(a) * 4.4;
      const rr = 3.1 - t * 0.12;
      ellipsoid(sx, 4 + rr * 0.7, sz, rr, rr * 0.8, rr, (i, k, j) => (k < 4 + rr * 0.35 ? C.dragonBelly : hash(i, k, j) < 0.3 ? C.dragonDark : C.dragon));
      if (t % 2 === 0) set(Math.round(sx), Math.round(4 + rr * 1.55), Math.round(sz), C.dragonBelly); // spine spikes
    }
    chunky(dx - 11, 3, dz - 8, dx + 11, 10, dz + 8, 2);
    // tail curling round the front
    for (let t = 0; t < 12; t++) { const a = Math.PI * 1.7 + t * 0.18; set(Math.round(dx + Math.cos(a) * (8 + t * 0.3)), 4, Math.round(dz + Math.sin(a) * (5 + t * 0.25)), C.dragon); }
    // head resting on the rock, eyes shut
    const hx = dx + 7, hz = dz + 5;
    box(hx, 4, hz, 5, 3, 4, C.dragon);
    box(hx + 5, 4, hz + 1, 3, 2, 2, C.dragon);
    set(hx + 7, 5, hz + 1, C.cowBlack); set(hx + 7, 5, hz + 2, C.cowBlack);
    for (const zz of [hz, hz + 3]) { set(hx + 2, 6, zz, C.cowBlack); set(hx, 7, zz, C.trim); set(hx - 1, 8, zz, C.trim); }
    // folded wings
    for (let a = 0; a < 7; a++) for (let b = 0; b <= 6 - a; b++) { set(dx - 2 + a, 9 + b, dz - 1, C.dragonDark); set(dx - 2 + a, 9 + b, dz + 1, C.dragonDark); }
    // a little hoard of gold
    for (let n = 0; n < 40; n++) set(dx - 8 + Math.floor(rnd() * 6), Math.floor(rnd() * 2) + 3, dz + 3 + Math.floor(rnd() * 3), rnd() < 0.15 ? C.pearl : C.gold);
    // "Z z z" floating above the head
    const Z = (x0, k0, s) => { for (let a = 0; a < s; a++) { set(x0 + a, k0 + s - 1, hz + 1, C.trim); set(x0 + a, k0, hz + 1, C.trim); set(x0 + s - 1 - a, k0 + a, hz + 1, C.trim); } };
    Z(hx + 2, 11, 4); Z(hx + 6, 16, 3); Z(hx + 9, 20, 3);
  }

  return B.finalize();
}
