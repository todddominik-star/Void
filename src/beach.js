// Beach map: warm sand at the front where the hole starts, a giant sand castle in the
// middle, cabanas and palms to the west, a lifeguard tower and volleyball to the east,
// a wooden pier running out into the sea, boats and floats on the water, and a lighthouse.
// The sea is painted by the ground shader (map.beach = true); things on it float at k = 0.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 48 };
export const SHORE = -16; // the shader draws the waterline around here (it wobbles a little)

export const BEACH = {
  id: 'beach', name: 'Beach', tagline: 'Sun, sand and a sand castle. Mind the crabs.',
  win: 'The beach is empty. Even the sand castle.',
  start: START, half: HALF,
  // umbrellas drop lots of cubes at once, so the Beach asks for more before each size-up
  levels: [0.02, 0.055, 0.1, 0.17, 0.26, 0.37, 0.5, 0.66],
  ground: '#efd9a0', skirt: '#d8bd7f', sky: '#cdeefc', bg: 'linear-gradient(#a9e0f8, #def4fd 60%, #cdeefc)',
  hemiSky: 0xf2fbff, hemiGround: 0xd8c08a, sun: 0xfff3dc, caustics: false, bubbles: false, beach: true,
  fogFar: 6,
  build: buildBeach,
};

export function buildBeach() {
  const B = makeBuilder(1984);
  const { set, box, ellipsoid, cylY, cylX, line, chunky, rnd } = B;
  const shoreAt = (x) => SHORE + Math.sin(x * 0.07) * 3 + Math.sin(x * 0.19 + 1) * 1.5;
  const onSand = (x, z, pad = 0) => z > shoreAt(x) + pad;

  // ---------- beach things ----------
  const umbrella = (x, z, a, b) => {
    for (let k = 0; k < 7; k++) set(x, k, z, C.trim);
    for (let r = 0; r <= 4; r++) {
      const k = 8 - Math.floor(r * 0.6);
      for (let t = 0; t < 32; t++) {
        const ang = (t / 32) * Math.PI * 2;
        set(x + Math.cos(ang) * r, k, z + Math.sin(ang) * r, Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8) % 2 ? a : b);
      }
    }
    set(x, 9, z, a);
  };
  const towel = (x, z, col, stripe) => box(x, 0, z, 3, 1, 6, (i, k, j) => ((j - z) % 2 ? col : stripe));
  const beachBall = (x, z) => ellipsoid(x, 1.2, z, 1.4, 1.3, 1.4, (i, k, j) => [C.awningRed, C.ball, C.fishBlue, C.towelYellow][Math.floor(((Math.atan2(j - z, i - x) + Math.PI) / (Math.PI * 2)) * 4) % 4]);
  const bucket = (x, z, col) => {
    cylY(x, z, 0, 3, 1.4, col, 0.9);
    line(x - 1, 3, z, x + 1, 4, z, C.anchor);
    line(x + 2, 0, z + 1, x + 3, 3, z + 2, C.palmTrunk); set(x + 2, 0, z + 1, C.anchor); // spade
  };
  const crab = (x, z) => {
    box(x, 0, z, 3, 1, 2, C.crab);
    set(x + 1, 1, z, C.crab); set(x, 1, z - 1, C.cowBlack); set(x + 2, 1, z - 1, C.cowBlack); // eyes on stalks
    for (const dx of [-1, 3]) { set(x + dx, 0, z, C.crab); set(x + dx, 1, z - 1, C.crab); } // claws
    for (const dx of [-1, 3]) set(x + dx, 0, z + 1, C.crab);
  };
  const shell = (x, z) => set(x, 0, z, [C.clam, C.towelPink, C.pearl, C.starfish][Math.floor(rnd() * 4)]);
  const palm = (x, z, h) => {
    let px = x, pz = z;
    for (let k = 0; k < h; k++) { px += 0.18; set(px, k, pz, k % 2 ? C.palmTrunk : C.wood); }
    const tx = Math.round(px), tk = h;
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]])
      for (let s = 1; s <= 5; s++) set(tx + a * s, tk - Math.floor(s * s / 8), pz + b * s, s % 2 ? C.palm : C.palm2);
    set(tx, tk, pz, C.palm); set(tx + 1, tk - 1, pz, C.cob); set(tx, tk - 1, pz + 1, C.cob); // coconuts
  };
  const cabana = (x, z, col) => {
    for (const [a, b] of [[0, 0], [6, 0], [0, 6], [6, 6]]) for (let k = 0; k < 6; k++) set(x + a, k, z + b, C.wood);
    for (let t = 0; t < 4; t++) for (let i = x - 1 + t; i <= x + 7 - t; i++) for (let j = z - 1 + t; j <= z + 7 - t; j++)
      if (i === x - 1 + t || i === x + 7 - t || j === z - 1 + t || j === z + 7 - t) set(i, 6 + t, j, (i + j) % 2 ? col : C.awningWhite);
    for (let k = 1; k < 6; k++) for (let i = x + 1; i < x + 6; i++) if ((i + k) % 3) set(i, k, z, (k % 2 ? col : C.awningWhite));
    box(x + 2, 0, z + 2, 3, 1, 3, C.towelTeal); // a lounger inside
  };
  const lifeguard = (x, z) => {
    for (const [a, b] of [[0, 0], [4, 0], [0, 4], [4, 4]]) for (let k = 0; k < 7; k++) set(x + a, k, z + b, C.trim);
    box(x, 7, z, 5, 4, 5, (i, k, j) => (k === 9 && (j === z + 4) ? C.window : C.lighthouse), 1);
    for (let t = 0; t < 2; t++) box(x - 1 + t, 11 + t, z - 1 + t, 7 - 2 * t, 1, 7 - 2 * t, C.trim);
    for (let s = 0; s < 7; s++) set(x + 2, s, z + 5 + s, C.wood); // ramp
    for (let k = 13; k < 17; k++) set(x + 2, k, z + 2, C.anchor);
    for (let a = 1; a <= 3; a++) set(x + 2 + a, 16, z + 2, C.awningRed);
  };
  const volleyball = (x, z) => {
    for (const dz of [0, 14]) for (let k = 0; k < 8; k++) set(x, k, z + dz, C.trim);
    for (let j = z; j <= z + 14; j++) { set(x, 7, j, C.trim); set(x, 5, j, C.trim); if (j % 2) set(x, 6, j, C.trim); }
    beachBall(x + 6, z + 5);
  };
  const surfboard = (x, z, col) => { for (let k = 0; k < 7; k++) for (let a = 0; a < 2; a++) if (!(k === 6 && a)) set(x + a, k, z, k === 3 ? C.trim : col); };
  const cooler = (x, z) => { box(x, 0, z, 4, 3, 3, C.fishBlue); box(x, 3, z, 4, 1, 3, C.trim); };
  const iceCreamStand = (x, z) => {
    box(x, 0, z, 9, 4, 5, (i, k, j) => (k === 3 ? C.iceCream : C.trim), 1);
    for (const [a, b] of [[0, 0], [8, 0], [0, 4], [8, 4]]) for (let k = 4; k < 8; k++) set(x + a, k, z + b, C.wood);
    for (let i = x - 1; i <= x + 9; i++) for (let j = z - 1; j <= z + 5; j++) set(i, 8, j, (i + 20) % 2 ? C.iceCream : C.mint);
    // a giant cone on the roof
    for (let k = 0; k < 5; k++) cylY(x + 4, z + 2, 9 + k, 1, 0.4 + k * 0.35, C.bun);
    ellipsoid(x + 4, 15.5, z + 2, 2, 1.7, 2, C.iceCream);
    set(x + 4, 17, z + 2, C.crab);
  };
  const sandCastle = (cx, cz) => {
    // moat
    for (let i = cx - 17; i <= cx + 17; i++) for (let j = cz - 17; j <= cz + 17; j++) {
      const d = Math.max(Math.abs(i - cx), Math.abs(j - cz));
      if (d >= 14 && d <= 16) set(i, 0, j, hash(i, j, 1) < 0.2 ? C.stream2 : C.water);
    }
    for (let i = cx - 2; i <= cx + 2; i++) for (let j = cz + 14; j <= cz + 16; j++) set(i, 1, j, C.wood); // little bridge
    const sand = (i, k, j) => (hash(i >> 1, k >> 1, j >> 1) < 0.3 ? C.castleSand2 : C.castleSand);
    // walls: a square ring, 3 thick, 7 high, with crenellations
    for (let i = cx - 12; i <= cx + 12; i++) for (let j = cz - 12; j <= cz + 12; j++) {
      const d = Math.max(Math.abs(i - cx), Math.abs(j - cz));
      if (d < 10 || d > 12) continue;
      const gate = Math.abs(i - cx) <= 1 && j > cz + 9;
      for (let k = gate ? 4 : 0; k < 7; k++) set(i, k, j, C.castleSand);
      if (d === 12 && (i + j) % 2 === 0) set(i, 7, j, C.castleSand2);
    }
    chunky(cx - 12, 0, cz - 12, cx + 12, 6, cz + 12, 4);
    // four round towers with pointed tops and little flags
    for (const [a, b] of [[-12, -12], [12, -12], [-12, 12], [12, 12]]) {
      cylY(cx + a, cz + b, 0, 11, 3.6, C.castleSand);
      for (let k = 0; k < 5; k++) cylY(cx + a, cz + b, 11 + k, 1, 3.4 - k * 0.7, C.castleSand2);
      for (let k = 16; k < 19; k++) set(cx + a, k, cz + b, C.palmTrunk);
      set(cx + a + 1, 18, cz + b, C.awningRed); set(cx + a + 2, 18, cz + b, C.awningRed); set(cx + a + 1, 17, cz + b, C.awningRed);
      chunky(cx + a - 4, 0, cz + b - 4, cx + a + 4, 10, cz + b + 4, 4);
    }
    // the keep, with a seashell crown and the tallest flag
    box(cx - 5, 0, cz - 5, 11, 12, 11, sand);
    chunky(cx - 5, 0, cz - 5, cx + 5, 11, cz + 5, 4);
    cylY(cx, cz, 12, 6, 3.2, C.castleSand);
    for (let k = 0; k < 4; k++) cylY(cx, cz, 18 + k, 1, 3 - k * 0.7, C.castleSand2);
    for (let a = 0; a < 12; a++) { const t = (a / 12) * Math.PI * 2; set(cx + Math.cos(t) * 5, 12, cz + Math.sin(t) * 5, a % 2 ? C.pearl : C.towelPink); }
    for (let k = 22; k < 27; k++) set(cx, k, cz, C.palmTrunk);
    for (let a = 1; a <= 4; a++) for (let k = 24; k < 27; k++) set(cx + a, k, cz, k === 25 ? C.towelYellow : C.fishBlue);
    // windows made of shells, pressed into the front of the keep
    for (const wx of [-3, 2]) { set(cx + wx, 7, cz + 6, C.cowBlack); set(cx + wx + 1, 7, cz + 6, C.cowBlack); }
    set(cx, 3, cz + 6, C.palmTrunk); set(cx - 1, 3, cz + 6, C.palmTrunk); set(cx, 4, cz + 6, C.palmTrunk); set(cx - 1, 4, cz + 6, C.palmTrunk);
  };

  // ---------- on the water ----------
  const sailboat = (x, z) => {
    for (let i = 0; i < 14; i++) {
      const w = Math.round(3 - Math.abs(i - 6) * 0.35);
      for (let j = -w; j <= w; j++) { set(x + i, 0, z + j, C.hull); set(x + i, 1, z + j, Math.abs(j) === w ? C.hull : C.wood); }
    }
    for (let k = 2; k < 18; k++) set(x + 6, k, z, C.palmTrunk);
    for (let k = 4; k < 17; k++) for (let a = 1; a <= Math.floor((17 - k) * 0.55); a++) set(x + 6 + a, k, z, k % 4 === 0 ? C.awningRed : C.sail);
  };
  const rowboat = (x, z) => {
    for (let i = 0; i < 8; i++) { const w = i < 1 || i > 6 ? 0 : 1; for (let j = -w - 1; j <= w + 1; j++) set(x + i, 0, z + j, Math.abs(j) === w + 1 ? C.awningRed : C.wood); }
    line(x + 3, 1, z - 4, x + 5, 1, z + 4, C.palmTrunk);
  };
  const buoy = (x, z) => { cylY(x, z, 0, 2, 1.2, C.lighthouse); cylY(x, z, 2, 1, 1.2, C.trim); set(x, 3, z, C.lighthouse); };
  const ring = (x, z, col) => { for (let t = 0; t < 16; t++) { const a = (t / 16) * Math.PI * 2; set(x + Math.cos(a) * 2, 0, z + Math.sin(a) * 2, t % 4 < 2 ? col : C.trim); } };
  const dolphin = (x, z, k0) => {
    for (let s = 0; s < 9; s++) {
      const k = k0 + Math.round(Math.sin((s / 8) * Math.PI) * 4);
      set(x + s, k, z, C.dolphin); set(x + s, k - 1, z, s > 1 && s < 7 ? C.whaleBelly : C.dolphin);
    }
    set(x + 4, k0 + 6, z, C.dolphin); // fin
    set(x - 1, k0 + 1, z, C.dolphin); set(x - 1, k0 - 1, z, C.dolphin); // tail
  };
  const rubberDuck = (x, z) => {
    ellipsoid(x, 1.5, z, 3, 2, 2.4, C.duckToy);
    ellipsoid(x - 2, 4, z, 1.6, 1.5, 1.5, C.duckToy);
    box(x - 4, 3, z, 2, 1, 1, C.beak); set(x - 3, 5, z - 1, C.cowBlack);
    chunky(x - 3, 0, z - 3, x + 3, 3, z + 3, 2);
  };
  const lighthouse = (x, z) => {
    ellipsoid(x, 0, z, 7, 3, 6, (i, k, j) => (hash(i, k, j) < 0.4 ? C.rock2 : C.rock), 0, 0);
    chunky(x - 7, 0, z - 6, x + 7, 3, z + 6, 4);
    for (let k = 3; k < 30; k++) cylY(x, z, k, 1, 3.4 - k * 0.04, Math.floor(k / 4) % 2 ? C.lighthouse : C.trim);
    cylY(x, z, 30, 3, 2.6, C.lit);
    cylY(x, z, 33, 1, 3.2, C.anchor);
    for (let k = 0; k < 3; k++) cylY(x, z, 34 + k, 1, 2.6 - k, C.lighthouse);
    chunky(x - 4, 3, z - 4, x + 4, 29, z + 4, 4);
  };
  const gull = (x, k, z) => { set(x, k, z, C.gull); set(x + 1, k, z, C.gull); set(x - 1, k + 1, z, C.gullWing); set(x - 2, k + 2, z, C.gullWing); set(x + 2, k + 1, z, C.gullWing); set(x + 3, k + 2, z, C.gullWing); set(x + 2, k, z, C.beak); };

  // ---------- layout (camera looks north from the sand; the sea is at the back) ----------
  // towels and umbrellas near the start
  const cols = [[C.awningRed, C.trim], [C.fishBlue, C.trim], [C.towelYellow, C.awningRed], [C.towelTeal, C.trim], [C.towelPink, C.trim]];
  [[-16, 44], [14, 42], [-28, 34], [26, 32], [-6, 30], [10, 54], [-22, 54]].forEach(([x, z], i) => {
    umbrella(x, z, ...cols[i % cols.length]);
    towel(x + 3, z - 2, [C.towelTeal, C.towelPink, C.towelYellow, C.fishBlue][i % 4], C.trim);
  });
  beachBall(4, 38); beachBall(-34, 48); beachBall(32, 50);
  bucket(-8, 40, C.awningRed); bucket(18, 34, C.towelYellow); bucket(-20, 26, C.fishBlue);
  for (let n = 0; n < 14; n++) {
    const x = Math.round((rnd() - 0.5) * 100), z = Math.round(-6 + rnd() * 60);
    if (Math.hypot(x - START.x, z - START.z) < 6 || (Math.abs(x) < 20 && Math.abs(z - 8) < 20)) continue;
    crab(x, z);
  }
  for (let n = 0; n < 90; n++) {
    const x = Math.round((rnd() - 0.5) * 110), z = Math.round(rnd() * 60 - 8);
    if (!onSand(x, z, 1) || Math.hypot(x - START.x, z - START.z) < 4) continue;
    shell(x, z);
  }
  // the sand castle
  sandCastle(0, 6);
  // west: cabanas, palms, the ice cream stand
  cabana(-50, 30, C.fishBlue); cabana(-50, 16, C.awningRed); cabana(-38, 42, C.towelTeal);
  iceCreamStand(-44, 0);
  for (const [x, z, h] of [[-56, 46], [-34, 22], [-56, 6], [-30, 4], [44, 46], [52, 20], [-44, 54]].map(([a, b], i) => [a, b, 10 + (i % 3) * 2])) palm(x, z, h);
  // east: lifeguard tower, volleyball, surfboards, coolers
  lifeguard(36, -4);
  volleyball(30, 22);
  surfboard(48, 34, C.towelTeal); surfboard(51, 34, C.towelPink); surfboard(54, 34, C.towelYellow);
  cooler(40, 46); cooler(-14, 50);
  // the pier, running out into the sea
  for (let z = SHORE + 6; z >= -54; z--) for (let x = -30; x <= -26; x++) {
    set(x, 1, z, (z % 2 ? C.wood : C.woodDark));
    if ((x === -30 || x === -26) && z % 4 === 0) { set(x, 0, z, C.woodDark); set(x, 2, z, C.woodDark); set(x, 3, z, C.woodDark); }
  }
  box(-32, 0, -58, 9, 2, 5, C.woodDark); // end platform
  for (let k = 2; k < 6; k++) set(-28, k, -57, C.palmTrunk); set(-28, 6, -57, C.lit);
  // on the water
  sailboat(14, -36); rowboat(-46, -28); rubberDuck(-8, -30);
  for (const [x, z] of [[-56, -20], [-10, -22], [30, -22], [54, -26], [6, -48]]) buoy(x, z);
  ring(20, -24, C.towelPink); ring(-40, -40, C.awningRed); ring(42, -40, C.fishBlue);
  dolphin(30, -48, 3); dolphin(-14, -50, 4);
  lighthouse(44, -50);
  // seagulls over the sand
  for (const [x, k, z] of [[-10, 18, 20], [22, 20, 12], [-36, 16, 34], [8, 22, -10], [40, 18, 30]]) gull(x, k, z);

  return B.finalize();
}
