// Farm map, built entirely from 1x1x1 cubes.
// Grid: i = x (east), j = z (south, toward camera), k = height (0 = sitting on ground).
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

export const HALF = 60;      // board half-size in cubes
export const START = { x: 0, z: 40 };

export const FARM = {
  id: 'farm', name: 'Farm', tagline: 'A quiet farm, waiting to be swallowed.',
  win: 'The whole farm is gone. Every last cube.',
  start: START, half: HALF,
  ground: '#9fd47c', skirt: '#7fbc63', sky: '#cfe9f7', bg: 'linear-gradient(#bfe3f6, #dff1fb 60%, #cfe9f7)',
  hemiSky: 0xeaf6ff, hemiGround: 0x86b46f, sun: 0xfff1dc, caustics: false, bubbles: false,
  build: buildFarm,
};

export function buildFarm() {
  const B = makeBuilder(12345);
  const { set, del, box, ellipsoid, cylY, cylX, cylZ, chunky, rnd } = B;

  // ---------- objects ----------
  const chicken = (x, z) => {
    set(x, 0, z + 1, C.beak); set(x + 1, 0, z + 1, C.beak);
    box(x, 1, z, 2, 2, 3, C.chicken);
    box(x, 3, z, 2, 1, 1, C.chicken);
    set(x, 4, z, C.comb);
    set(x, 3, z - 1, C.beak);
    set(x + 1, 3, z + 2, C.chicken);
  };
  const duck = (x, z) => {
    box(x, 1, z, 2, 1, 3, C.duck);
    set(x, 2, z, C.duck); set(x + 1, 2, z, C.duck);
    set(x, 2, z - 1, C.beak);
  };
  const cow = (x, z) => {
    const spot = (i, k, j) => (hash(Math.floor(i / 2), Math.floor(k / 2), Math.floor(j / 2)) < 0.35 ? C.cowBlack : C.cowWhite);
    for (const [dx, dz] of [[0, 0], [3, 0], [0, 6], [3, 6]]) box(x + dx, 0, z + dz, 1, 2, 1, C.cowWhite);
    box(x, 2, z, 4, 3, 7, spot);
    chunky(x, 2, z, x + 3, 4, z + 6, 2);
    box(x, 3, z - 3, 4, 3, 3, C.cowWhite);
    box(x, 3, z - 4, 4, 2, 1, C.pink);
    set(x - 1, 5, z - 2, C.cowBlack); set(x + 4, 5, z - 2, C.cowBlack);
    set(x + 1, 2, z + 4, C.pink); set(x + 2, 2, z + 4, C.pink);
    set(x + 2, 4, z + 7, C.cowWhite); set(x + 2, 3, z + 7, C.cowBlack);
  };
  const pig = (x, z) => {
    for (const [dx, dz] of [[0, 0], [2, 0], [0, 4], [2, 4]]) set(x + dx, 0, z + dz, C.pinkDark);
    box(x, 1, z, 3, 3, 5, C.pink);
    chunky(x, 1, z, x + 2, 3, z + 4, 2);
    box(x, 2, z - 2, 3, 2, 2, C.pink);
    box(x + 1, 2, z - 3, 1, 1, 1, C.pinkDark);
    set(x, 4, z - 1, C.pinkDark); set(x + 2, 4, z - 1, C.pinkDark);
    set(x + 1, 3, z + 5, C.pinkDark);
  };
  const sheep = (x, z) => {
    for (const [dx, dz] of [[0, 0], [3, 0], [0, 4], [3, 4]]) set(x + dx, 0, z + dz, C.sheepFace);
    box(x, 1, z, 4, 3, 5, (i, k, j) => (hash(i, k, j) < 0.5 ? C.wool : C.wool2));
    chunky(x, 1, z, x + 3, 3, z + 4, 2);
    box(x + 1, 4, z + 1, 2, 1, 3, C.wool);
    box(x + 1, 2, z - 2, 2, 2, 2, C.sheepFace);
  };
  const tree = (x, z, h, r, apples = 0) => {
    box(x, 0, z, 2, h, 2, C.trunk);
    const ck = h + r - 1;
    if (r >= 3) chunky(x - r, ck - r, z - r, x + r + 1, ck + r, z + r + 1, 2);
    ellipsoid(x + 0.5, ck, z + 0.5, r, r * 0.9, r, (i, k, j) => {
      const t = hash(i, k, j);
      if (apples && t < apples) return C.apple;
      return t < 0.45 ? C.leaf : t < 0.8 ? C.leaf2 : C.leafDark;
    }, r > 3 ? 2 : 0);
  };
  const pine = (x, z, h) => {
    box(x, 0, z, 1, 3, 1, C.trunk);
    for (let k = 2; k < h; k++) {
      const r = Math.max(0.6, (h - k) * 0.42);
      for (let i = -Math.ceil(r); i <= Math.ceil(r); i++)
        for (let j = -Math.ceil(r); j <= Math.ceil(r); j++)
          if (Math.hypot(i, j) <= r) set(x + i, k, z + j, hash(i, k, j) < 0.5 ? C.pine : C.pine2);
    }
  };
  const pumpkin = (x, z, r) => {
    if (r > 2.2) chunky(x - r, 0, z - r, x + r, r * 1.6, z + r, 2);
    ellipsoid(x, r * 0.8, z, r, r * 0.8, r, (i, k, j) => (Math.round(Math.atan2(j - z, i - x) * 3) % 2 === 0 ? C.pumpkin : C.pumpkinDark));
    set(Math.round(x), Math.round(r * 1.6) + 1, Math.round(z), C.stem);
    set(Math.round(x), Math.round(r * 1.6) + 2, Math.round(z), C.stem);
  };
  const hayBale = (x, z) => { chunky(x, 0, z - 3, x + 3, 4, z + 3, 4); cylX(x, 4, 2, z, 2.4, (i, k, j) => {
    const d = Math.hypot(k - 2, j - z);
    if (i === x || i === x + 3) return Math.round(d) % 2 ? C.hayDark : C.hay;
    return hash(i, k, j) < 0.3 ? C.hayDark : C.hay;
  }); };
  const hayStack = (x, z) => {
    box(x, 0, z, 4, 2, 3, C.hay); box(x + 1, 2, z, 2, 1, 3, C.hayDark);
    chunky(x, 0, z, x + 3, 1, z + 2, 2);
  };
  const flower = (x, z, col) => { set(x, 0, z, C.stem); set(x, 1, z, col); };
  const fenceLine = (x0, z0, x1, z1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(z1 - z0));
    for (let s = 0; s <= n; s++) {
      const i = Math.round(x0 + ((x1 - x0) * s) / n), j = Math.round(z0 + ((z1 - z0) * s) / n);
      if (s % 3 === 0) { set(i, 0, j, C.woodDark); set(i, 1, j, C.woodDark); set(i, 2, j, C.woodDark); }
      else { set(i, 1, j, C.wood); set(i, 2, j, C.wood); }
    }
  };
  const barn = (x, z) => {
    const W = 22, D = 16, H = 10;
    const wall = (i, k, j) => {
      const corner = (i === x || i === x + W - 1) && (j === z || j === z + D - 1);
      if (corner || k === H - 1) return C.trim;
      return k % 3 === 0 ? C.redDark : C.red;
    };
    box(x, 0, z, W, H, D, wall, 2);
    // the barn is packed with hay: big blocks you can only swallow once you've grown
    box(x + 2, 1, z + 2, W - 4, 8, D - 4, (i, k, j) => (hash(i >> 2, k >> 2, j >> 2) < 0.3 ? C.hayDark : C.hay));
    chunky(x, 0, z, x + W - 1, H - 2, z + D - 3, 4);
    // big front doors (facing camera at +z)
    const fz = z + D - 1, cx = x + W / 2;
    for (let i = cx - 4; i < cx + 4; i++)
      for (let k = 0; k < 7; k++) {
        const u = i - (cx - 4), v = k;
        const edge = u === 0 || u === 7 || v === 6 || u === 3 || u === 4;
        const diag = Math.abs(u % 4 - v * 0.55) < 0.7 || Math.abs((3 - (u % 4)) - v * 0.55) < 0.7;
        set(i, k, fz, edge || diag ? C.trim : C.redDark);
      }
    // gambrel roof
    const hw = [12, 11, 10, 9, 7, 5, 3, 1];
    const mid = x + (W - 1) / 2;
    for (let t = 0; t < hw.length; t++) {
      const k = H + t, outer = hw[t], inner = t + 1 < hw.length ? hw[t + 1] : -1;
      for (let i = x - 2; i < x + W + 2; i++) {
        const dx = Math.abs(i - mid);
        for (let j = z - 1; j <= z + D; j++) {
          if (dx <= outer && dx > inner - 0.01) set(i, k, j, C.roofBarn);
          else if (dx <= inner && (j === z || j === z + D - 1)) set(i, k, j, t === 4 && dx < 2 ? C.trim : C.red);
        }
      }
    }
    // hayloft opening with hay peeking out
    set(Math.floor(mid), H + 3, fz + 1, C.hay); set(Math.ceil(mid), H + 3, fz + 1, C.hay);
  };
  const silo = (x, z) => {
    cylY(x, z, 0, 20, 4.6, (i, k, j) => (Math.hypot(i - x, j - z) < 3.3 ? C.grain : k % 5 === 4 ? C.siloBand : C.silo));
    chunky(x - 5, 0, z - 5, x + 5, 19, z + 5, 4);
    for (let k = 20; k < 25; k++) {
      const r = Math.sqrt(Math.max(0, 4.2 * 4.2 - ((k - 19.5) * 1.05) ** 2));
      cylY(x, z, k, 1, r, C.dome, 1.2);
    }
  };
  const farmhouse = (x, z) => {
    const W = 15, D = 11, H = 7;
    box(x, 0, z, W, H, D, (i, k, j) => {
      const front = j === z + D - 1 || j === z;
      const win = front && (k === 2 || k === 3 || k === 5) && ((i - x) % 4 === 2 || (i - x) % 4 === 3) && k !== 4;
      if (win && k !== 4) return C.window;
      return C.houseWall;
    }, true);
    for (let k = 0; k < 4; k++) { set(x + 7, k, z + D - 1, C.woodDark); set(x + 8, k, z + D - 1, C.woodDark); }
    box(x + 4, 0, z + D, 7, 1, 3, C.wood); // porch
    for (let t = 0; t < 7; t++)
      for (let i = x - 1; i <= x + W; i++)
        for (let j = z - 1 + t; j <= z + D - t; j++) {
          const edge = j === z - 1 + t || j === z + D - t;
          if (edge) set(i, H + t, j, C.roofBlue);
          else if (i === x || i === x + W - 1) set(i, H + t, j, C.houseWall);
        }
    box(x + 11, H + 2, z + 3, 2, 7, 2, C.brick);
  };
  const windmill = (x, z) => {
    for (let k = 0; k < 16; k++) {
      const w = k < 6 ? 6 : k < 11 ? 5 : 4;
      const o = Math.floor((6 - w) / 2);
      box(x + o, k, z + o, w, 1, w, (i, kk, j) => (kk % 4 === 3 ? C.woodDark : C.cream), true);
    }
    box(x + 1, 16, z + 1, 4, 2, 4, C.roofBarn);
    set(x + 2, 18, z + 2, C.roofBarn); set(x + 3, 18, z + 3, C.roofBarn);
    const hx = x + 3, hk = 15, hz = z + 6;
    set(hx, hk, z + 5, C.woodDark); set(hx, hk, hz, C.woodDark);
    for (let s = 1; s <= 9; s++) {
      // diagonal X of sails
      for (const [sx, sk] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const i = hx + sx * s, k = hk + sk * s;
        set(i, k, hz, C.woodDark);
        if (s > 2) {
          set(i + sx, k, hz, C.blade); set(i, k + sk, hz, C.blade);
          set(i + 2 * sx, k, hz, C.blade); set(i, k + 2 * sk, hz, C.blade); set(i + sx, k + sk, hz, C.blade);
        }
      }
    }
  };
  const tractor = (x, z) => {
    box(x + 1, 2, z, 4, 3, 8, C.tractor);
    chunky(x + 1, 2, z, x + 4, 4, z + 3, 2);
    box(x + 1, 5, z + 4, 4, 4, 4, (i, k, j) => (k > 5 && k < 8 && (i === x + 1 || i === x + 4 || j === z + 4 || j === z + 7) ? C.window : C.tractor));
    box(x + 1, 9, z + 4, 4, 1, 4, C.tractorYellow);
    box(x + 2, 5, z + 1, 1, 3, 1, C.metal);
    for (const side of [x - 1, x + 5]) {
      cylX(side, 2, 3, z + 6, 3, (i, k, j) => (Math.hypot(k - 3, j - (z + 6)) < 1.3 ? C.tractorYellow : C.tire));
      cylX(side, 2, 1.5, z + 1, 1.5, (i, k, j) => (Math.hypot(k - 1.5, j - (z + 1)) < 0.6 ? C.tractorYellow : C.tire));
    }
  };
  const corn = (x, z) => {
    const h = 5 + Math.floor(hash(x, z, 1) * 2);
    for (let k = 0; k < h; k++) set(x, k, z, C.stalk);
    set(x, h, z, C.cob);
    if (hash(x, z, 2) < 0.5) set(x + 1, 3, z, C.leaf); else set(x, 3, z + 1, C.leaf);
  };
  const sunflower = (x, z) => {
    for (let k = 0; k < 7; k++) set(x, k, z, C.stem);
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) set(x + a, 8 + b, z + 1, C.seedHead);
    for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-2, 1], [2, -1], [1, 2], [-1, -2], [-2, -1], [2, 1], [1, -2], [-1, 2]])
      set(x + a, 8 + b, z + 1, C.petal);
    set(x + 1, 3, z, C.leaf); set(x - 1, 5, z, C.leaf);
  };
  const scarecrow = (x, z) => {
    for (let k = 0; k < 9; k++) set(x, k, z, C.woodDark);
    for (let i = -3; i <= 3; i++) set(x + i, 6, z, i === 0 ? C.shirt : C.straw);
    box(x - 1, 4, z, 3, 3, 1, C.shirt);
    box(x - 1, 8, z, 3, 2, 1, C.straw);
    box(x - 2, 10, z - 1, 5, 1, 3, C.hat); set(x, 11, z, C.hat);
  };
  const pond = (cx, cz, r) => {
    for (let i = Math.floor(cx - r - 2); i <= cx + r + 2; i++)
      for (let j = Math.floor(cz - r - 2); j <= cz + r + 2; j++) {
        const d = Math.hypot((i - cx) * 0.85, j - cz);
        if (d <= r) set(i, 0, j, hash(i, j, 3) < 0.15 ? C.waterLight : C.water);
        else if (d <= r + 1.2 && hash(i, j, 4) < 0.5) set(i, 0, j, C.stone);
      }
    for (const [a, b] of [[-3, 2], [4, -2], [1, 4], [-5, -3]]) { set(cx + a, 1, cz + b, C.lily); set(cx + a + 1, 1, cz + b, C.lily); }
    set(cx + 4, 1, cz + 4, C.flowerPink);
    duck(cx - 1, cz - 2); duck(cx + 3, cz + 1);
    for (const [a, b] of [[-r - 1, 0], [-r, 3], [r + 1, -2]]) for (let k = 0; k < 4; k++) set(Math.round(cx + a), k, Math.round(cz + b), C.reed);
  };
  const coop = (x, z) => {
    box(x, 0, z, 1, 2, 1, C.woodDark); box(x + 5, 0, z, 1, 2, 1, C.woodDark);
    box(x, 0, z + 4, 1, 2, 1, C.woodDark); box(x + 5, 0, z + 4, 1, 2, 1, C.woodDark);
    box(x, 2, z, 6, 4, 5, (i, k, j) => (j === z + 4 && k === 2 && (i === x + 2 || i === x + 3) ? C.woodDark : C.redDark), true);
    for (let t = 0; t < 3; t++) box(x - 1 + t, 6 + t, z - 1, 8 - 2 * t, 1, 7, C.roofBarn);
    for (let s = 0; s < 3; s++) set(x + 2, s, z + 5 + s, C.wood);
  };
  const garden = (x, z, rows, len) => {
    for (let r = 0; r < rows; r++) {
      const j = z + r * 3;
      for (let i = x; i < x + len; i++) {
        set(i, 0, j, C.soil);
        if (r % 2 === 0) { if (i % 2 === 0) set(i, 1, j, C.carrotLeaf); }
        else if (i % 3 === 0) { set(i, 1, j, C.cabbage); }
      }
    }
    for (let i = x; i < x + len; i += 4) set(i, 1, z + 1, C.carrot);
  };
  const beehive = (x, z) => {
    box(x, 0, z, 3, 1, 3, C.woodDark);
    box(x, 1, z, 3, 3, 3, (i, k, j) => (k === 2 ? C.duck : C.beeBox));
    set(x + 1, 1, z + 3, C.cowBlack);
    box(x - 1, 4, z - 1, 5, 1, 5, C.trim);
  };
  const well = (x, z) => {
    cylY(x, z, 0, 3, 2.6, (i, k, j) => (hash(i, k, j) < 0.4 ? C.stoneDark : C.stone), 1);
    set(x, 0, z, C.water);
    for (const dx of [-2, 2]) for (let k = 3; k < 7; k++) set(x + dx, k, z, C.woodDark);
    for (let t = 0; t < 2; t++) box(x - 3 + t, 7 + t, z - 2 + t, 7 - 2 * t, 1, 5 - 2 * t, C.roofBarn);
  };
  const trough = (x, z) => { box(x, 0, z, 6, 2, 3, C.metal, true); box(x + 1, 1, z + 1, 4, 1, 1, C.water); };
  const mailbox = (x, z) => { for (let k = 0; k < 3; k++) set(x, k, z, C.woodDark); box(x, 3, z - 1, 1, 2, 3, C.shirt); set(x + 1, 4, z - 1, C.red); };
  const wheelbarrow = (x, z) => {
    cylX(x + 1, 1, 1, z, 1, C.tire);
    box(x, 2, z + 1, 3, 2, 4, C.red, true);
    box(x + 1, 3, z + 2, 1, 1, 2, C.pumpkin);
    set(x, 1, z + 5, C.wood); set(x + 2, 1, z + 5, C.wood);
  };
  // Tethered hot-air balloon: eat the rope's anchor and the whole thing drops.
  const balloon = (x, z) => {
    box(x - 1, 0, z - 1, 3, 1, 3, C.stone);
    for (let k = 1; k < 14; k++) set(x, k, z, C.rope);
    box(x - 2, 14, z - 2, 5, 3, 5, C.basket, true);
    for (const [a, b] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) for (let k = 17; k < 20; k++) set(x + a, k, z + b, C.rope);
    const stripes = [C.balloonRed, C.balloonYellow, C.balloonBlue, C.balloonGreen];
    ellipsoid(x, 26, z, 6, 7, 6, (i, k, j) => stripes[(Math.floor(((Math.atan2(j - z, i - x) + Math.PI) / (2 * Math.PI)) * 8)) % 4], 1.5);
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) if (Math.hypot(i, j) < 2.6) set(x + i, 19, z + j, C.balloonRed);
  };

  // ---------- layout (camera looks north, from +z) ----------
  // start meadow: small things
  const chickens = [[-6, 36], [4, 34], [9, 40], [-10, 44], [-3, 50], [12, 50], [6, 54], [-14, 52]];
  chickens.forEach(([a, b]) => chicken(a, b));
  for (let n = 0; n < 70; n++) {
    const x = Math.round((rnd() - 0.5) * 50), z = Math.round(30 + rnd() * 28);
    if (Math.hypot(x - START.x, z - START.z) < 4) continue;
    flower(x, z, [C.flowerPink, C.flowerPurple, C.duck, C.trim][n % 4]);
  }
  coop(-24, 38);
  garden(18, 34, 5, 14);
  mailbox(-2, 58);
  wheelbarrow(14, 52);
  well(-12, 26);
  // pumpkin patch
  for (let n = 0; n < 9; n++) pumpkin(-44 + (n % 3) * 7 + rnd() * 2, 34 + Math.floor(n / 3) * 7 + rnd() * 2, 1.6 + rnd() * 1.4);
  for (let n = 0; n < 30; n++) set(Math.round(-46 + rnd() * 20), 0, Math.round(32 + rnd() * 22), C.stem);
  // sunflower row
  for (let x = -6; x <= 26; x += 4) sunflower(x, 22);
  // pond
  pond(30, 8, 8);
  // corn field + scarecrow
  for (let x = -54; x <= -24; x += 2) for (let z = -14; z <= 18; z += 2) if (Math.hypot(x + 39, z - 2) > 3) corn(x, z);
  scarecrow(-39, 2);
  // barn, silo, tractor, hay
  barn(-11, -26);
  silo(20, -20);
  tractor(14, -6);
  hayBale(-20, -4); hayBale(-18, 4); hayBale(-14, -10);
  hayStack(2, 2); hayStack(-6, 4);
  trough(4, -3);
  // farmhouse, windmill
  farmhouse(-40, -48);
  windmill(36, -50);
  // paddock with cows & sheep
  fenceLine(4, -56, 30, -56); fenceLine(30, -56, 30, -34); fenceLine(30, -34, 4, -34); fenceLine(4, -34, 4, -56);
  cow(8, -50); cow(18, -46); sheep(24, -52); sheep(10, -40); sheep(20, -39);
  // pig pen
  fenceLine(-58, -2, -58, 16); fenceLine(-58, 16, -46, 16); fenceLine(-46, 16, -46, -2); fenceLine(-46, -2, -58, -2);
  for (let i = -57; i < -46; i++) for (let j = -1; j < 16; j++) if (hash(i, j, 9) < 0.35) set(i, 0, j, C.mud);
  pig(-55, 4); pig(-51, 10); pig(-50, 1);
  // orchard + beehives
  for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) tree(42 + a * 7, -24 + b * 8, 4, 3, 0.12);
  beehive(48, 34); beehive(53, 34); beehive(48, 40);
  // balloon surprise
  balloon(40, 48);
  // border trees
  for (let n = 0; n < 26; n++) {
    const t = n / 26 * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 55), z = Math.round(Math.sin(t) * 55);
    if (Math.abs(x) > 58 || Math.abs(z) > 58) continue;
    const near = (px, pz, r) => Math.hypot(x - px, z - pz) < r;
    if (near(40, 48, 10) || near(-40, -43, 12) || near(39, -47, 9) || near(0, 58, 6)) continue;
    if (n % 2) pine(x, z, 9 + (n % 3) * 2); else tree(x, z, 3, 2.5);
  }

  return B.finalize();
}
