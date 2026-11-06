// Haunted map, at dusk: a tall Victorian house with a centre tower rising from the ground,
// a porch wing, glowing windows. Graveyards and a crypt to the west, a twisted old tree and a
// second little graveyard to the east, a giant jack-o-lantern and a pumpkin patch at the front,
// a bubbling cauldron, ghosts, bats and a witch floating overhead, and the moon at the back.
// Things that glow use the self-lit palette colours (glowOrange, ghost, moon, ...).
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 48 };

export const HAUNTED = {
  id: 'haunted', name: 'Haunted', tagline: 'A creaky old house on a spooky night. Boo.',
  win: 'The house is gone. Even the moon.',
  start: START, half: HALF,
  ground: '#66755f', skirt: '#46503f', sky: '#4a4372', bg: 'linear-gradient(#231d44, #3d3466 55%, #4a4372)',
  hemiSky: 0x9a96e0, hemiGround: 0x3e4a40, sun: 0xc4c8ff, hemiI: 1.05, sunI: 1.35, glow: 1.25,
  caustics: false, bubbles: false, mist: true,
  fogFar: 10,
  levels: [0.008, 0.024, 0.05, 0.09, 0.16, 0.27, 0.41, 0.6],
  build: buildHaunted,
};

export function buildHaunted() {
  const B = makeBuilder(1031);
  const { set, box, ellipsoid, cylY, line, chunky, rnd } = B;
  const near = (x, z, r) => Math.hypot(x - START.x, z - START.z) < r;

  // weathered clapboard: two greys in 2-high bands, dark trim every floor, a few rotten boards
  const wall = (i, k, j) => {
    if (k % 8 === 7) return C.sidingDark;
    if (hash(i, k, j) < 0.05) return C.sidingDark;
    return (k >> 1) % 2 ? C.siding : C.siding2;
  };
  const shingles = (i, k, j) => (hash(i >> 1, k, j >> 1) < 0.3 ? C.shingle2 : C.shingle);
  const WIN = [C.glowOrange, C.glowYellow, C.glowGreen, C.glowPurple, C.iron, C.glowOrange, C.glowPurple];
  let wn = 0;
  // arched window, 3 wide x 5 tall, on a face looking +z (dir 'z') or along x ('x')
  const windowAt = (x, k, z, dir = 'z', col = WIN[wn++ % WIN.length]) => {
    for (let a = 0; a < 3; a++) for (let b = 0; b < 4; b++) {
      const c = b === 3 && a !== 1 ? col : (a === 1 && b === 2 ? C.sidingDark : col); // a little cross bar
      dir === 'z' ? set(x + a, k + b, z, c) : set(x, k + b, z + a, c);
    }
    dir === 'z' ? set(x + 1, k + 4, z, col) : set(x, k + 4, z + 1, col);
    // sill and arch trim
    for (let a = -1; a <= 3; a++) dir === 'z' ? set(x + a, k - 1, z + 1, C.sidingDark) : set(x + 1 * Math.sign(x), k - 1, z + a, C.sidingDark);
    dir === 'z' ? (set(x, k + 4, z, C.sidingDark), set(x + 2, k + 4, z, C.sidingDark), set(x + 1, k + 5, z, C.sidingDark))
      : (set(x, k + 4, z, C.sidingDark), set(x, k + 4, z + 2, C.sidingDark), set(x, k + 5, z + 1, C.sidingDark));
  };
  // a steep mansard roof on a box (x0..x1, z0..z1), starting at k0, `h` layers
  const mansard = (x0, z0, x1, z1, k0, h) => {
    for (let i = x0 - 1; i <= x1 + 1; i++) for (let j = z0 - 1; j <= z1 + 1; j++)
      if (i === x0 - 1 || i === x1 + 1 || j === z0 - 1 || j === z1 + 1) set(i, k0, j, C.sidingDark); // cornice
    for (let t = 0; t < h; t++) {
      const a = Math.floor(t * 0.55), k = k0 + 1 + t;
      for (let i = x0 + a; i <= x1 - a; i++) for (let j = z0 + a; j <= z1 - a; j++) {
        const edge = Math.min(i - x0 - a, x1 - a - i, j - z0 - a, z1 - a - j);
        if (edge < 2 || t === h - 1) set(i, k, j, shingles(i, k, j));
      }
    }
  };

  // ---------- the house ----------
  const house = () => {
    // main block: x -16..14, z -38..-22, three floors
    box(-16, 0, -38, 31, 24, 17, wall, 2);
    chunky(-16, 0, -38, 14, 23, -22, 2);
    for (let i = -16; i <= 14; i++) set(i, 0, -22, i % 2 ? C.lattice : C.iron); // lattice skirt
    mansard(-16, -38, 14, -22, 24, 8);
    chunky(-16, 25, -38, 14, 32, -22, 2);
    // dormers with orange "eye" windows, like the monster house
    for (const dx of [-13, 8]) {
      box(dx, 26, -24, 5, 5, 3, wall);
      set(dx + 1, 27, -22, C.glowOrange); set(dx + 2, 27, -22, C.glowOrange); set(dx + 3, 27, -22, C.glowOrange);
      set(dx + 1, 28, -22, C.glowOrange); set(dx + 2, 28, -22, C.iron); set(dx + 3, 28, -22, C.glowOrange);
      set(dx + 2, 29, -22, C.glowOrange);
      for (let t = 0; t < 3; t++) for (let a = t; a < 5 - t; a++) for (let j = -24; j <= -21; j++) set(dx + a, 31 + t, j, C.shingle2);
    }
    // chimney
    box(9, 24, -33, 3, 13, 3, C.brick); box(8, 37, -34, 5, 1, 5, C.iron);
    // front windows, three floors either side of the tower
    for (const k of [2, 10, 18]) for (const x of [-14, -10, 7, 11]) windowAt(x, k, -22);
    // side windows on the west wall
    for (const k of [2, 10, 18]) for (const z of [-35, -29]) windowAt(-16, k, z, 'x');

    // centre tower: from the ground to the sky, sticking out in front of the house
    box(-5, 0, -24, 11, 34, 11, wall, 2);
    chunky(-5, 0, -24, 5, 33, -14, 2);
    for (let i = -5; i <= 5; i++) set(i, 0, -14, i % 2 ? C.lattice : C.iron);
    // boarded-up window on the ground floor, just like the photo
    for (let i = -2; i <= 2; i++) for (let k = 2; k <= 7; k++) {
      const plank = (i + k) % 4 === 0 || (i - k + 40) % 5 === 0;
      set(i, k, -14, plank ? C.plank : C.iron);
      if (plank) set(i, k, -13, C.plank);
    }
    windowAt(-1, 10, -14, 'z', C.glowOrange);
    windowAt(-1, 18, -14, 'z', C.glowPurple);
    set(-2, 26, -14, C.glowYellow); set(-2, 27, -14, C.glowYellow); set(-2, 28, -14, C.glowYellow);
    set(2, 26, -14, C.glowYellow); set(2, 27, -14, C.glowYellow); set(2, 28, -14, C.glowYellow);
    for (const x of [-5, 5]) windowAt(x, 18, -21, 'x', C.glowGreen);
    mansard(-5, -24, 5, -14, 34, 7);
    chunky(-5, 35, -24, 5, 41, -14, 2);
    // a widow's walk on top, and a spike
    for (let i = -2; i <= 2; i++) for (let j = -21; j <= -17; j++) if (i === -2 || i === 2 || j === -21 || j === -17) if ((i + j) % 2 === 0) set(i, 42, j, C.iron);
    for (let k = 42; k < 46; k++) set(0, k, -19, C.iron);
    // tower dormer
    set(-1, 37, -16, C.glowOrange); set(0, 37, -16, C.glowOrange); set(1, 37, -16, C.glowOrange); set(0, 38, -16, C.glowOrange);

    // east wing with the porch and front door
    box(15, 0, -36, 12, 16, 14, wall, 2);
    chunky(15, 0, -36, 26, 15, -23, 2);
    mansard(15, -36, 26, -23, 16, 5);
    for (const x of [17, 22]) windowAt(x, 9, -23);
    windowAt(26, 9, -32, 'x', C.glowPurple);
    // door
    for (let k = 1; k <= 6; k++) for (let i = 19; i <= 21; i++) set(i, k, -23, k === 5 && i === 20 ? C.glowYellow : C.porch);
    // porch deck, posts, roof (a balcony on top), railings and steps
    box(15, 0, -22, 12, 2, 6, (i, k) => (k === 1 ? C.plank : (i % 2 ? C.lattice : C.iron)));
    for (const [x, z] of [[15, -17], [26, -17], [15, -22], [26, -22]]) for (let k = 2; k < 9; k++) set(x, k, z, C.porch);
    box(14, 9, -23, 14, 1, 8, C.shingle2);
    for (let i = 14; i <= 27; i++) if (i % 2 === 0) set(i, 10, -16, C.porch);
    for (let i = 15; i <= 26; i++) if (i < 19 || i > 21) { set(i, 3, -17, C.porch); if (i % 2) set(i, 2, -17, C.porch); }
    for (let i = 19; i <= 21; i++) { set(i, 1, -16, C.plank); set(i, 0, -15, C.plank); }
    // a pumpkin by the door
    ellipsoid(17, 3, -19, 1.4, 1.1, 1.4, C.pumpkin); set(17, 3, -18, C.glowOrange); set(17, 4, -18, C.glowOrange);
  };

  // ---------- spooky bits ----------
  const tombstone = (x, z, type) => {
    const st = (i, k, j) => (hash(i, k, j) < 0.25 ? C.tombMoss : type % 2 ? C.tomb : C.tomb2);
    if (type === 0) { box(x, 0, z, 3, 4, 1, st); set(x + 1, 4, z, st(x, 4, z)); }
    else if (type === 1) { for (let k = 0; k < 6; k++) set(x + 1, k, z, st(x, k, z)); set(x, 4, z, st(x, 4, z)); set(x + 2, 4, z, st(x, 3, z)); }
    else if (type === 2) { box(x, 0, z, 2, 2, 2, st); for (let k = 2; k < 8; k++) set(x, k, z, st(x, k, z)); }
    else { box(x, 0, z, 3, 3, 1, st); set(x, 3, z - 1, st(x, 3, z)); set(x + 1, 3, z - 1, st(x, 3, z)); } // leaning
    if (type !== 2) box(x, 0, z + 1, 3, 1, 3, (i, k, j) => (hash(i, k, j) < 0.2 ? C.hauntGrass : C.grave)); // the grave mound
  };
  const ironFence = (x0, z0, x1, z1, gapA = 1e9, gapB = -1e9) => {
    const posts = [];
    for (let i = x0; i <= x1; i++) { posts.push([i, z0]); posts.push([i, z1]); }
    for (let j = z0 + 1; j < z1; j++) { posts.push([x0, j]); posts.push([x1, j]); }
    for (const [i, j] of posts) {
      const along = j === z0 || j === z1 ? i : j;
      if (along >= gapA && along <= gapB) continue;
      set(i, 1, j, C.iron); set(i, 3, j, C.iron);
      if ((i + j) % 2 === 0) { set(i, 0, j, C.iron); set(i, 2, j, C.iron); set(i, 4, j, C.iron); }
    }
  };
  const graveyard = (x0, z0, cols, rows) => {
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const x = x0 + 3 + c * 5 + (r % 2), z = z0 + 3 + r * 7;
      tombstone(x, z, Math.floor(rnd() * 4));
    }
  };
  const handFromGrave = (x, z) => { for (let k = 1; k < 3; k++) set(x, k, z, C.bone); set(x - 1, 3, z, C.bone); set(x, 3, z, C.bone); set(x + 1, 3, z, C.bone); set(x - 1, 2, z, C.bone); };
  const bone = (x, z) => { set(x, 0, z, C.bone); set(x + 1, 0, z, C.bone); set(x + 2, 0, z, C.bone); set(x, 0, z + 1, C.bone); set(x + 2, 0, z + 1, C.bone); };
  const crypt = (x, z) => {
    const st = (i, k, j) => (hash(i >> 1, k >> 1, j >> 1) < 0.3 ? C.keep2 : C.keep);
    box(x - 1, 0, z - 1, 15, 1, 13, C.cobble);
    box(x, 1, z, 13, 10, 10, st, 2);
    chunky(x, 1, z, x + 12, 10, z + 9, 2);
    box(x - 1, 11, z - 1, 15, 1, 12, C.keep2);
    for (let t = 0; t < 5; t++) for (let i = x + t; i <= x + 12 - t; i++) for (let j = z - 1; j <= z + 10; j++) if (j === z + 10 || t === 4 || j === z - 1) set(i, 12 + t, j, C.keep2);
    for (const cx of [x, x + 3, x + 9, x + 12]) for (let k = 1; k < 11; k++) set(cx, k, z + 11, C.keep);
    for (let k = 1; k < 8; k++) for (let i = x + 5; i <= x + 7; i++) set(i, k, z + 10, k < 7 && i !== x + 6 ? C.iron : C.glowGreen); // the door, glowing round the edges
    for (let k = 1; k < 8; k++) { set(x + 4, k, z + 10, C.glowGreen); set(x + 8, k, z + 10, C.glowGreen); }
    set(x + 6, 14, z + 10, C.bone); // a skull over the door
    // a coffin in front
    for (let j = 0; j < 7; j++) { const w = j === 0 || j === 6 ? 0 : j < 3 ? 1 : 1; for (let a = -w - (j === 2 ? 1 : 0); a <= w + (j === 2 ? 1 : 0); a++) { set(x + 6 + a, 0, z + 13 + j, C.porch); set(x + 6 + a, 1, z + 13 + j, C.plank); } }
    set(x + 6, 2, z + 15, C.bone); set(x + 6, 2, z + 16, C.bone); set(x + 5, 2, z + 15, C.bone); set(x + 7, 2, z + 15, C.bone);
  };
  const twistedTree = (x0, z0) => {
    let px = x0, pz = z0;
    const pts = [];
    const TOP = 30;
    for (let k = 0; k <= TOP; k++) {
      px = x0 + Math.sin(k * 0.24) * 2.8; pz = z0 + Math.cos(k * 0.19) * 1.7 - 1.7;
      const r = Math.max(1.3, 4.0 - k * 0.09);
      cylY(px, pz, k, 1, r, (i, kk, j) => (hash(i, kk, j) < 0.35 ? C.bark2 : C.bark));
      pts.push([px, pz]);
    }
    chunky(x0 - 7, 0, z0 - 7, x0 + 7, 18, z0 + 7, 2);
    // a face in the bark: glowing red eyes and a dark mouth
    const [fx, fz] = pts[9];
    set(fx - 1, 10, fz + 3, C.eyeRed); set(fx + 1, 10, fz + 3, C.eyeRed);
    for (const a of [-1, 0, 1]) set(fx + a, 6, fz + 3.2, C.iron); set(fx, 7, fz + 3.2, C.iron); set(fx, 5, fz + 3.2, C.iron);
    // gnarled roots
    for (let t = 0; t < 7; t++) {
      const a = (t / 7) * Math.PI * 2 + 0.3;
      let rx = x0, rz = z0 - 1;
      for (let s = 0; s < 8; s++) { const aa = a + Math.sin(s * 0.8) * 0.5; rx += Math.cos(aa); rz += Math.sin(aa); set(rx, s < 3 ? 1 : 0, rz, C.bark2); set(rx, 0, rz, C.bark); }
    }
    // twisting branches that reach out and curl
    const ends = [];
    const NB = 11;
    for (let t = 0; t < NB; t++) {
      const k0 = Math.round(13 + (t % 5) * 3.3);
      let [bx, bz] = pts[Math.min(TOP, k0)], bk = k0, a = (t / NB) * Math.PI * 2 + (t % 3) * 0.2;
      for (let s = 0; s < 16; s++) {
        a += 0.17 * (t % 2 ? 1 : -1);
        bx += Math.cos(a) * 1.0; bz += Math.sin(a) * 0.8; bk += s < 11 ? 0.72 : -0.5;
        set(bx, bk, bz, C.bark); if (s < 7) { set(bx, bk - 1, bz, C.bark2); set(bx + 1, bk, bz, C.bark); }
        // twigs that fork upward, with a little fork of their own
        if (s === 5 || s === 10) {
          const ta = a + (s === 5 ? 1.4 : -1.3);
          let tx = bx, tk = bk, tz = bz;
          for (let q = 1; q < 5; q++) { tx += Math.cos(ta); tz += Math.sin(ta); tk += 0.9; set(tx, tk, tz, C.bark2); }
          set(tx + Math.cos(ta - 1.2), tk + 1, tz + Math.sin(ta - 1.2), C.bark2);
        }
      }
      ends.push([Math.round(bx), Math.round(bk), Math.round(bz)]);
    }
    // a crown of short, crooked twigs at the very top
    const [cxx, czz] = pts[TOP];
    for (let t = 0; t < 6; t++) { const a = t * 1.05; for (let q = 1; q < 5; q++) set(cxx + Math.cos(a + q * 0.3) * q * 0.8, TOP + q, czz + Math.sin(a + q * 0.3) * q * 0.8, C.bark2); }
    // a lantern hanging from one branch, a spider dangling from another, crows on two more
    const [lx, lk, lz] = ends[1];
    for (let k = lk - 1; k > lk - 4; k--) set(lx, k, lz, C.iron);
    set(lx, lk - 4, lz, C.glowYellow); set(lx, lk - 5, lz, C.glowYellow); set(lx, lk - 6, lz, C.iron);
    const [sx, sk, sz] = ends[4];
    for (let k = sk - 1; k > 9; k--) set(sx, k, sz, C.bone);
    ellipsoid(sx, 8, sz, 1.3, 1.1, 1.3, C.iron); set(sx, 8, sz + 1, C.eyeRed);
    for (const d of [-1, 1]) for (const q of [-1, 0, 1]) { set(sx + d * 2, 8, sz + q, C.iron); set(sx + d * 3, 7, sz + q, C.iron); }
    for (const e of [ends[2], ends[5]]) { set(e[0], e[1] + 1, e[2], C.bat); set(e[0] + 1, e[1] + 1, e[2], C.bat); set(e[0] + 1, e[1] + 2, e[2], C.bat); set(e[0] + 2, e[1] + 1, e[2], C.beak); }
  };
  const bareTree = (x, z, h) => {
    for (let k = 0; k < h; k++) set(x + (k > h * 0.6 ? 1 : 0), k, z, k % 3 ? C.bark : C.bark2);
    for (const [a, b, l] of [[1, 0, 4], [-1, 0, 3], [0, 1, 3], [0, -1, 4], [1, 1, 3]]) {
      const k0 = h - 2 - l + 2;
      for (let s = 1; s <= l; s++) set(x + a * s, k0 + s, z + b * s, C.bark);
    }
  };
  const jackOLantern = (cx, cz) => {
    const R = 8, H = 6.5, K = 6;
    ellipsoid(cx, K, cz, R, H, R * 0.85, (i, k, j) => {
      const u = i - cx, v = k - K;
      if (j - cz > 2) {
        const eye = v >= 0.5 && v <= 3.5 && Math.abs(Math.abs(u) - 3.5) <= (3.5 - v) * 0.75 + 0.3;
        const nose = v >= -1 && v <= 0 && Math.abs(u) <= 0.6 - v * 0.6;
        const mouth = v <= -2 && v >= -4.5 + (u * u) / 14 && Math.abs(u) <= 5.5 && !(v === -2 && (Math.abs(u) === 2 || Math.abs(u) === 4)) && !(v <= -4 && Math.abs(u) === 1);
        if (eye || nose || mouth) return C.glowOrange;
      }
      const ang = Math.atan2(j - cz, i - cx);
      return Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 14) % 2 ? C.pumpkin : C.pumpkinDark;
    }, 2, 0);
    chunky(cx - R, 0, cz - R, cx + R, K + 6, cz + 2, 2);
    for (let k = 0; k < 4; k++) set(cx + (k > 2 ? 1 : 0), K + 6 + k, cz, C.stem);
    set(cx + 2, K + 9, cz, C.stem);
    for (const [a, b] of [[-2, 1], [-3, 1], [2, -1], [3, -2]]) set(cx + a, K + 6, cz + b, C.leaf);
  };
  const pumpkin = (x, z, r, carved) => {
    ellipsoid(x, r * 0.8, z, r, r * 0.8, r, (i, k, j) => ((i + j) % 3 ? C.pumpkin : C.pumpkinDark), 0, 0);
    set(x, Math.round(r * 1.6), z, C.stem);
    if (carved) { set(x - 1, Math.round(r), z + Math.ceil(r), C.glowOrange); set(x + 1, Math.round(r), z + Math.ceil(r), C.glowOrange); set(x, Math.round(r * 0.5), z + Math.ceil(r), C.glowOrange); }
  };
  const lampPost = (x, z) => { for (let k = 0; k < 7; k++) set(x, k, z, C.iron); set(x, 7, z, C.glowYellow); set(x, 8, z, C.iron); };
  const cauldron = (x, z) => {
    for (const [a, b] of [[-2, -2], [2, 2], [-2, 2], [2, -2]]) set(x + a, 0, z + b, C.iron);
    for (const a of [-1, 0, 1]) { set(x + a, 0, z, C.bark); set(x, 0, z + a, C.bark); }
    set(x, 1, z, C.glowOrange); set(x + 1, 1, z, C.glowOrange); set(x - 1, 1, z + 1, C.glowOrange);
    cylY(x, z, 2, 4, 3, C.cauldron, 1);
    cylY(x, z, 5, 1, 2.2, C.glowGreen);
    for (let t = 0; t < 16; t++) { const a = (t / 16) * Math.PI * 2; set(x + Math.cos(a) * 3.4, 6, z + Math.sin(a) * 3.4, C.iron); }
    // bubbles drifting up out of the pot
    for (const [a, k, b] of [[0, 8, 0], [1, 10, -1], [-1, 12, 1], [0, 14, 0]]) set(x + a, k, z + b, C.glowGreen);
    line(x + 4, 0, z - 1, x + 6, 9, z - 2, C.plank); for (let q = 0; q < 3; q++) set(x + 4 + (q % 2), q, z - 1 + q - 1, C.hay); // a broom
  };
  const ghost = (x, k, z) => {
    // about three-quarters of the old size
    ellipsoid(x, k + 5, z, 1.8, 1.7, 1.8, C.ghost);
    for (let t = 0; t < 5; t++) {
      const r = 1.8 + t * 0.26, kk = k + 4 - t;
      cylY(x, z, kk, 1, r, (i, _, j) => {
        if (t < 4) return Math.hypot(i - x, j - z) > r - 1.1 ? C.ghost : undefined;
        const a = Math.atan2(j - z, i - x); return Math.sin(a * 5) > -0.2 ? C.ghost : undefined; // wavy hem
      });
    }
    set(x - 1, k + 6, z + 2, C.iron); set(x + 1, k + 6, z + 2, C.iron); // eyes
    set(x, k + 4, z + 2, C.iron);                                     // "oooo"
    for (const d of [-1, 1]) { set(x + d * 3, k + 4, z, C.ghost); set(x + d * 3, k + 5, z + 1, C.ghost); } // waving arms
  };
  const bat = (x, k, z) => {
    set(x, k, z, C.bat); set(x, k + 1, z, C.bat); set(x, k, z + 1, C.eyeRed);
    for (const d of [-1, 1]) { set(x + d, k + 1, z, C.bat); set(x + d * 2, k + 2, z, C.bat); set(x + d * 3, k + 1, z, C.bat); set(x + d * 2, k + 1, z, C.bat); }
  };
  const witch = (x, k, z) => {
    for (let s = -6; s <= 6; s++) set(x + s, k, z, C.plank);
    for (let s = 7; s <= 9; s++) for (const d of [-1, 0, 1]) set(x + s, k + d, z + (s > 7 ? d : 0), C.hay);
    box(x - 1, k + 1, z - 1, 3, 3, 3, C.witch);            // robe
    box(x - 2, k + 1, z - 1, 1, 2, 3, C.witch);
    ellipsoid(x, k + 5, z, 1.2, 1.2, 1.2, C.witchSkin);    // head
    set(x - 1, k + 5, z + 1, C.iron);
    for (let i = x - 2; i <= x + 2; i++) for (let j = z - 2; j <= z + 2; j++) set(i, k + 6, j, C.witch); // hat brim
    set(x, k + 7, z, C.witch); set(x, k + 8, z, C.witch); set(x + 1, k + 9, z, C.witch); set(x + 2, k + 9, z, C.witch);
    set(x + 1, k + 3, z + 1, C.witchSkin); set(x + 2, k + 2, z + 1, C.witchSkin); // hand on the broom
    set(x - 3, k + 2, z, C.glowPurple); // a cape clasp catching the light
  };
  const blackCat = (x, k, z) => {
    box(x, k, z, 1, 2, 2, C.iron); set(x, k + 2, z + 1, C.iron); set(x, k + 3, z + 1, C.iron);
    set(x, k + 2, z + 2, C.glowYellow); set(x, k + 1, z - 1, C.iron); set(x, k + 2, z - 2, C.iron);
  };
  const scarecrow = (x, z) => {
    for (let k = 0; k < 9; k++) set(x, k, z, C.bark);
    for (let a = -3; a <= 3; a++) set(x + a, 6, z, a % 3 ? C.candyPurple : C.hay);
    box(x - 1, 3, z, 3, 3, 1, C.candyPurple);
    ellipsoid(x, 9.5, z, 1.6, 1.4, 1.6, C.pumpkin);
    set(x - 1, 10, z + 1, C.glowOrange); set(x + 1, 10, z + 1, C.glowOrange); set(x, 9, z + 2, C.glowOrange);
    for (let i = x - 2; i <= x + 2; i++) set(i, 11, z, C.hat);
  };
  const candyCorn = (x, z) => { set(x, 0, z, C.cob); set(x, 1, z, C.candyOrange); set(x, 2, z, C.candyWhite); };
  const wrapped = (x, z) => { set(x - 1, 0, z, C.candyWhite); set(x, 0, z, C.candyPurple); set(x + 1, 0, z, C.candyWhite); };
  const moon = (cx, ck, z) => {
    for (let i = cx - 8; i <= cx + 8; i++) for (let k = ck - 8; k <= ck + 8; k++) {
      const d = Math.hypot(i - cx, k - ck);
      if (d > 8) continue;
      const crater = Math.hypot(i - cx + 3, k - ck - 2) < 1.8 || Math.hypot(i - cx - 2, k - ck + 3) < 2.3 || Math.hypot(i - cx - 4, k - ck - 4) < 1;
      set(i, k, z, crater ? C.tomb : C.moon);
      if (d < 6) set(i, k, z - 1, C.moon);
    }
    chunky(cx - 8, ck - 8, z - 1, cx + 8, ck + 8, z, 2);
  };

  // ---------- layout (the camera looks north from the front gate) ----------
  house();
  // the path up to the tower, lamp posts, and the iron fence across the front yard
  for (let z = -12; z <= 42; z++) for (let x = -2; x <= 2; x++) if (!near(x, z, 5) && hash(x, z, 7) < 0.72) set(x, 0, z, hash(x, z, 8) < 0.5 ? C.tomb : C.tomb2);
  for (const z of [-4, 8, 20, 32]) { lampPost(-5, z); lampPost(5, z); }
  ironFence(-26, -6, 26, -6, -3, 3);
  blackCat(12, 5, -6);
  // west: the big graveyard, fenced, with the crypt behind it
  ironFence(-58, -18, -28, 14, -4, 0);
  graveyard(-57, -16, 5, 4);
  handFromGrave(-44, 2); handFromGrave(-34, -9);
  crypt(-56, -48);
  for (const [x, z] of [[-24, -10], [-22, 6], [-60 + 4, 18], [-30, 18]]) bone(x, z);
  // east: the twisted tree and a little crooked graveyard behind it
  twistedTree(42, -4);
  ironFence(30, -56, 56, -36, 40, 44);
  graveyard(30, -55, 4, 2);
  handFromGrave(46, -40);
  // the front: a giant jack-o-lantern, a pumpkin patch with a scarecrow, a witch's cauldron
  jackOLantern(-26, 28);
  for (let n = 0, made = 0; n < 60 && made < 16; n++) {
    const x = Math.round(14 + rnd() * 36), z = Math.round(18 + rnd() * 30);
    if (near(x, z, 8) || Math.abs(x - 34) < 3 && Math.abs(z - 30) < 3) continue;
    pumpkin(x, z, 1.4 + rnd() * 1.1, made % 3 === 0); made++;
    for (let s = 1; s < 4; s++) set(x + s, 0, z - s, C.stem);
  }
  scarecrow(34, 30);
  box(46, 0, 14, 4, 3, 3, C.hay); box(47, 3, 14, 3, 2, 3, C.hayDark); box(16, 0, 46, 4, 3, 3, C.hay);
  cauldron(20, 6);
  // the dead wood round the back and sides
  for (const [x, z, h] of [[-26, -50, 12], [-14, -54, 10], [-2, -50, 13], [12, -54, 11], [24, -48, 12], [-58, 30, 10], [-50, 44, 12], [56, 4, 11], [54, 44, 10], [-8, 18, 9], [28, -24, 10], [-28, -30, 11], [-40, 30, 9], [58, -24, 12]])
    bareTree(x, z, h);
  // scattered leaves, grass, candy and bones
  for (let n = 0; n < 220; n++) {
    const x = Math.round((rnd() - 0.5) * 116), z = Math.round((rnd() - 0.5) * 116);
    if (near(x, z, 4)) continue;
    const r = rnd();
    set(x, 0, z, r < 0.45 ? C.deadLeaf : r < 0.65 ? C.candyOrange : r < 0.85 ? C.hauntGrass : C.bark2);
  }
  for (let n = 0; n < 22; n++) {
    const x = Math.round((rnd() - 0.5) * 100), z = Math.round(rnd() * 60 - 4);
    if (near(x, z, 5) || Math.abs(x) < 4) continue;
    n % 2 ? candyCorn(x, z) : wrapped(x, z);
  }
  // in the air: ghosts, bats, a witch on her broom, and the moon
  for (const [x, k, z] of [[-36, 17, 24], [32, 15, -14], [-16, 22, -2], [14, 25, 22], [-44, 21, -32], [26, 27, -44], [-4, 29, 10], [50, 18, 26]]) ghost(x, k, z);
  for (let n = 0; n < 12; n++) bat(Math.round((rnd() - 0.5) * 100), Math.round(20 + rnd() * 16), Math.round(-50 + rnd() * 64));
  witch(-12, 26, 30);
  moon(36, 36, -58);
  bat(31, 39, -55); bat(40, 33, -55);

  return B.finalize();
}
