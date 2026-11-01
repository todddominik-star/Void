// Coral reef map. Same grid rules as the farm.
// Floating things (fish, jellyfish, the whale) hang in the water until the hole
// passes under them, or until a piece they rest on is eaten.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 40 };

export const REEF = {
  id: 'reef', name: 'Reef', tagline: 'A sleepy coral reef. Nobody will miss it.',
  win: 'The reef is gone. Even the whale.',
  start: START, half: HALF,
  ground: '#ecd9a0', skirt: '#d4bd84', sky: '#86cfe3', bg: 'linear-gradient(#5fb7d6, #8ad3e6 55%, #a9e1ec)',
  hemiSky: 0xd8f4ff, hemiGround: 0xc9b27a, sun: 0xf2fbff, caustics: true, bubbles: true,
  build: buildReef,
};

export function buildReef() {
  const B = makeBuilder(777);
  const { set, box, ellipsoid, cylY, cylX, line, chunky, rnd } = B;

  // ---------- small things ----------
  const starfish = (x, z) => {
    set(x, 0, z, C.starfish);
    for (const [a, b] of [[0, -2], [2, -1], [1, 2], [-1, 2], [-2, -1]]) { set(x + a, 0, z + b, C.starfish); set(x + a / 2, 0, z + b / 2, C.starfish); }
  };
  const clam = (x, z) => {
    box(x, 0, z, 3, 1, 3, C.clam);
    set(x + 1, 1, z + 1, C.pearl);
    box(x, 2, z - 1, 3, 1, 2, C.clam);
  };
  const urchin = (x, z) => {
    ellipsoid(x, 1, z, 1.3, 1.1, 1.3, C.urchin);
    for (const [a, b, c] of [[2, 1, 0], [-2, 1, 0], [0, 1, 2], [0, 1, -2], [0, 3, 0]]) set(x + a, b, z + c, C.urchin);
  };
  const grassTuft = (x, z) => {
    const h = 2 + Math.floor(hash(x, z, 5) * 3);
    for (let k = 0; k < h; k++) set(x + (k > 1 && hash(x, k, z) < 0.5 ? 1 : 0), k, z, C.seaGrass);
  };
  const fish = (x, k, z, body, stripe, dir = 1) => {
    // 4 long, facing +x (dir 1) or -x (dir -1)
    for (let a = 0; a < 3; a++) { set(x + a * dir, k, z, a === 1 && stripe !== undefined ? stripe : body); set(x + a * dir, k + 1, z, body); }
    set(x - dir, k, z, body); set(x - dir, k + 1, z, body);   // tail
    set(x - 2 * dir, k - 1, z, body); set(x - 2 * dir, k + 2, z, body);
    set(x + 2 * dir, k + 1, z, C.fishWhite);                 // eye
  };
  const school = (cx, ck, cz, n, body, stripe) => {
    for (let t = 0; t < n; t++) {
      const x = Math.round(cx + (rnd() - 0.5) * 12), k = Math.round(ck + (rnd() - 0.5) * 5), z = Math.round(cz + (rnd() - 0.5) * 10);
      fish(x, Math.max(2, k), z, body, stripe, cx > 0 ? -1 : 1);
    }
  };

  // ---------- corals ----------
  const brainCoral = (x, z, r) => {
    ellipsoid(x, 0, z, r, r * 0.8, r, (i, k, j) => (Math.sin((i - x) * 1.7 + Math.cos((j - z) * 1.3) * 2) > 0.2 ? C.brainCoral : C.turtleSkin), 0, 0);
    if (r >= 3) chunky(x - r, 0, z - r, x + r, r * 0.8, z + r, 2);
  };
  const branchCoral = (x, z, col, h) => {
    const tips = [[x, 0, z]];
    for (let g = 0; g < h; g++) {
      const next = [];
      for (const [a, k, b] of tips) {
        const n = g % 3 === 2 && tips.length < 6 ? 2 : 1;
        for (let t = 0; t < n; t++) {
          const dx = Math.round((hash(a, k + t, b) - 0.5) * 2.4), dz = Math.round((hash(b, k, a + t) - 0.5) * 2.4);
          const p = [a + dx, k + 1, b + dz];
          set(a, k, b, col); set(p[0], p[1], p[2], col);
          next.push(p);
        }
      }
      tips.splice(0, tips.length, ...next);
    }
    for (const [a, k, b] of tips) set(a, k + 1, b, C.pearl);
  };
  const tableCoral = (x, z, r, col) => {
    box(x, 0, z, 2, 4, 2, col);
    cylY(x + 0.5, z + 0.5, 4, 1, r, col);
    cylY(x + 0.5, z + 0.5, 5, 1, r - 1.2, col, 1);
  };
  const seaFan = (x, z) => {
    for (let k = 0; k < 9; k++)
      for (let a = -4; a <= 4; a++) {
        const w = Math.sqrt(Math.max(0, 1 - ((k - 5) / 5) ** 2)) * 4.2;
        if (Math.abs(a) <= w && (a % 2 === 0 || k % 2 === 0)) set(x + a, k, z, C.fan);
      }
    box(x, 0, z, 1, 2, 1, C.urchin);
  };
  const anemone = (x, z) => {
    box(x - 1, 0, z - 1, 3, 2, 3, C.anemone);
    for (const [a, b] of [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, 1], [1, -1], [-1, 1], [0, 0]]) {
      set(x + a, 2, z + b, C.anemone); set(x + a, 3, z + b, C.coralRose);
    }
    fish(x - 1, 5, z + 3, C.clown, C.fishWhite, 1);
    fish(x + 3, 6, z - 2, C.clown, C.fishWhite, -1);
  };
  const kelp = (x, z, h) => {
    for (let k = 0; k < h; k++) {
      const sx = Math.round(Math.sin(k * 0.35 + x) * 1.3);
      set(x + sx, k, z, hash(x, k, z) < 0.5 ? C.kelp : C.kelp2);
      if (k % 4 === 2) set(x + sx + 1, k, z, C.kelp);
      if (k % 4 === 0 && k > 2) set(x + sx - 1, k, z, C.kelp2);
    }
  };
  const rock = (x, z, rx, ry, rz) => {
    ellipsoid(x, 0, z, rx, ry, rz, (i, k, j) => (hash(i >> 1, k >> 1, j >> 1) < 0.4 ? C.rock2 : C.rock), 0, 0);
    chunky(x - rx, 0, z - rz, x + rx, ry, z + rz, rx >= 5 ? 4 : 2);
  };

  // ---------- big set pieces ----------
  const shipwreck = (x, z) => {
    // hull lies along x, slightly sunk into the sand, solid wood inside
    const L = 30, R = 7;
    for (let i = 0; i < L; i++) {
      const t = i / (L - 1);
      const taper = Math.min(1, Math.sin(Math.PI * Math.min(0.999, t * 0.85 + 0.12)) * 1.25);
      const rw = R * taper;
      for (let j = Math.floor(z - rw); j <= Math.ceil(z + rw); j++)
        for (let k = 0; k <= 8; k++) {
          const dz = (j - z) / rw, dk = (k + 3) / 11;
          if (dz * dz + dk * dk > 1) continue;
          const edge = dz * dz + dk * dk > 0.72 || k === 8;
          set(x + i, k, j, edge ? (k % 2 ? C.shipDark : C.shipWood) : C.shipWood);
        }
    }
    chunky(x, 0, z - R, x + L - 1, 7, z + R, 4);
    // broken deck rail and cabin
    box(x + 18, 9, z - 4, 8, 4, 8, C.shipDark, 1);
    box(x + 17, 13, z - 5, 10, 1, 10, C.shipWood);
    // masts: one standing, one snapped and leaning
    for (let k = 9; k < 26; k++) set(x + 10, k, z, C.shipDark);
    box(x + 6, 17, z, 9, 6, 1, (i, k, j) => (hash(i, k, j) < 0.25 ? undefined : C.sail2));
    line(x + 4, 9, z + 1, x - 4, 16, z + 4, C.shipDark);
    // hole in the hull with gold spilling out
    for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) set(x + 3 + a, 3 + b, z + 6, C.gold);
  };
  const treasure = (x, z) => {
    box(x, 0, z, 6, 3, 4, (i, k, j) => (i === x + 2 || i === x + 3 ? C.brass : C.chest));
    box(x, 3, z - 1, 6, 2, 2, C.chest);
    box(x + 1, 3, z + 1, 4, 1, 2, C.gold);
    for (let t = 0; t < 26; t++) set(x - 3 + Math.floor(rnd() * 12), 0, z + 4 + Math.floor(rnd() * 5), rnd() < 0.15 ? C.pearl : C.gold);
  };
  const anchor = (x, z) => {
    for (let k = 0; k < 12; k++) set(x, k, z, C.anchor);
    box(x - 2, 10, z, 5, 1, 1, C.anchor);
    set(x, 12, z, C.anchor); set(x - 1, 13, z, C.anchor); set(x + 1, 13, z, C.anchor); set(x, 14, z, C.anchor);
    for (let a = -4; a <= 4; a++) set(x + a, Math.round(Math.abs(a) * 0.6), z, C.anchor);
    set(x - 5, 3, z, C.anchor); set(x + 5, 3, z, C.anchor);
  };
  const submarine = (x, z) => {
    const L = 22;
    cylX(x + 3, L - 6, 5, z, 4.2, C.sub);
    ellipsoid(x + 3, 5, z, 3.6, 4.2, 4.2, C.sub);
    ellipsoid(x + L - 3, 5, z, 3.6, 4.2, 4.2, C.sub);
    chunky(x, 1, z - 4, x + L, 9, z + 4, 4);
    box(x + 8, 10, z - 2, 6, 4, 4, C.sub);
    for (let k = 14; k < 18; k++) set(x + 10, k, z, C.anchor);
    box(x + 10, 17, z, 3, 1, 1, C.anchor);
    for (const wx of [x + 6, x + 11, x + 16]) { set(wx, 6, z + 4, C.subWindow); set(wx, 6, z - 4, C.subWindow); }
    for (let a = -3; a <= 3; a++) { set(x - 1, 5 + a, z, C.anchor); set(x - 1, 5, z + a, C.anchor); }
    box(x - 1, 0, z - 1, 2, 2, 3, C.anchor); // resting skid
    box(x + L - 4, 0, z - 1, 2, 2, 3, C.anchor);
  };
  const turtle = (x, k, z) => {
    ellipsoid(x, k, z, 4, 1.6, 3, (i, kk, j) => (hash(i, kk, j) < 0.35 ? C.turtleSkin : C.turtleShell));
    box(x + 4, k - 1, z - 1, 3, 2, 2, C.turtleSkin);
    for (const [a, b] of [[-2, -4], [2, -4], [-2, 3], [2, 3]]) box(x + a, k - 1, z + b, 2, 1, 2, C.turtleSkin);
  };
  const jellyfish = (x, k, z) => {
    ellipsoid(x, k, z, 2.4, 1.8, 2.4, C.jelly, 0, k);
    for (const [a, b] of [[-1, -1], [1, 1], [1, -1], [-1, 1], [0, 0]]) for (let t = 1; t < 5; t++) set(x + a, k - t, z + b + (t % 2), C.coralRose);
  };
  const whale = (x, k, z) => {
    ellipsoid(x, k, z, 13, 5, 6, (i, kk, j) => (kk < k - 2 ? C.whaleBelly : C.whale));
    ellipsoid(x - 14, k + 1, z, 3, 1.2, 2, C.whale);          // tail stock
    box(x - 18, k + 1, z - 5, 3, 1, 11, C.whaleDark);         // flukes
    box(x + 2, k - 3, z + 6, 5, 1, 3, C.whaleDark); box(x + 2, k - 3, z - 8, 5, 1, 3, C.whaleDark); // flippers
    set(x + 9, k + 1, z + 6, C.fishWhite); set(x + 9, k + 1, z - 6, C.fishWhite);
    set(x + 3, k + 5, z, C.whaleDark);
    chunky(x - 13, k - 5, z - 6, x + 13, k + 5, z + 6, 4);
  };
  const helmet = (x, z) => {
    ellipsoid(x, 3, z, 3, 3, 3, C.brass, 0, 0);
    box(x - 1, 2, z + 3, 3, 3, 1, C.subWindow);
    box(x - 3, 0, z - 3, 7, 1, 7, C.brass);
  };

  // ---------- layout (camera looks north, from +z) ----------
  // little shells scattered on the sand (bright, so they're easy to spot)
  for (let n = 0; n < 220; n++) {
    const x = Math.round((rnd() - 0.5) * 112), z = Math.round((rnd() - 0.5) * 112);
    if (Math.hypot(x - START.x, z - START.z) < 4) continue;
    set(x, 0, z, [C.clam, C.coralRose, C.starfish, C.pearl][Math.floor(rnd() * 4)]); // little shells
  }
  // starting shallows: small, friendly pieces
  [[-6, 34], [7, 36], [12, 46], [-12, 48], [-2, 52], [16, 52]].forEach(([a, b]) => starfish(a, b));
  [[-16, 36], [4, 48], [20, 42]].forEach(([a, b]) => clam(a, b));
  [[-8, 44], [10, 30], [-20, 52]].forEach(([a, b]) => urchin(a, b));
  for (let n = 0; n < 60; n++) {
    const x = Math.round((rnd() - 0.5) * 50), z = Math.round(28 + rnd() * 30);
    if (Math.hypot(x - START.x, z - START.z) < 5) continue;
    grassTuft(x, z);
  }
  school(6, 3, 42, 5, C.fishYellow, C.fishBlue);
  school(-14, 3, 30, 4, C.fishBlue, C.fishYellow);
  helmet(24, 34);
  // coral garden in the middle
  brainCoral(-10, 18, 3.4); brainCoral(8, 12, 2.6); brainCoral(-2, 4, 4); brainCoral(18, 20, 3);
  [[-18, 10, C.coralPink], [-4, 22, C.coralOrange], [4, 26, C.coralPurple], [12, 4, C.coralPink], [22, 10, C.coralOrange], [-14, 0, C.coralPurple], [0, 14, C.coralRose]]
    .forEach(([a, b, col], t) => branchCoral(a, b, col, 7 + (t % 3) * 2));
  tableCoral(-24, 22, 4, C.coralRose); tableCoral(26, 26, 3.4, C.coralOrange);
  seaFan(-6, 30); seaFan(14, 30); seaFan(28, 2);
  anemone(-26, 4); anemone(6, -6);
  school(0, 8, 12, 7, C.clown, C.fishWhite);
  // kelp forest on the west side
  for (let n = 0; n < 40; n++) {
    const x = Math.round(-38 - rnd() * 18), z = Math.round(-24 + rnd() * 52);
    kelp(x, z, 12 + Math.floor(rnd() * 14));
  }
  turtle(-36, 6, 30);
  school(-44, 9, 0, 6, C.fishWhite, C.fishBlue);
  // shipwreck to the north, with treasure and anchor
  shipwreck(-14, -34);
  treasure(-22, -18);
  anchor(22, -22);
  whale(2, 26, -30);
  // rocky reef wall on the east side, crowned with coral
  rock(44, 18, 6, 5, 8); rock(46, -4, 5, 7, 6); rock(40, -20, 7, 4, 5); rock(50, 36, 4, 3, 5);
  branchCoral(44, 12, C.coralPink, 8); branchCoral(46, -6, C.coralOrange, 9);
  set(44, 6, 18, C.coralPurple);
  submarine(26, -48);
  jellyfish(30, 27, 8); jellyfish(-28, 30, -40); jellyfish(12, 28, 36); jellyfish(38, 32, -36); jellyfish(-20, 26, 18);
  school(34, 6, -8, 6, C.fishYellow, C.fishBlue);
  // boulders and kelp around the edge
  for (let n = 0; n < 22; n++) {
    const t = (n / 22) * Math.PI * 2;
    const x = Math.round(Math.cos(t) * 55), z = Math.round(Math.sin(t) * 55);
    if (Math.abs(x) > 57 || Math.abs(z) > 57 || Math.hypot(x - START.x, z - 55) < 8) continue;
    if (n % 2) rock(x, z, 3, 2.5, 3); else kelp(x, z, 10 + (n % 4) * 3);
  }

  return B.finalize();
}
