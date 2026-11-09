// City at dusk: downtown towers with glowing windows, a river down the right side crossed by a
// red suspension bridge, an elevated train across the back, a tower crane over a building going
// up, shops and a plaza at the front, a park, cars with their lights on, and a blimp overhead.
// Things meant to collapse dramatically run side to side (bridge, train, crane jib) so you see
// them fall in profile, and they're built as separate groups (bridge halves, train spans) so
// each falls when its own supports go. Streets, the river and the park are painted on the ground.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 50 };

export const CITY = {
  id: 'city', name: 'City', tagline: 'Downtown at dusk. Lights on, nobody home.',
  win: 'The city is gone. Even the bridge.',
  start: START, half: HALF,
  ground: '#5b5f6e', skirt: '#40434f', sky: '#53466f', bg: 'linear-gradient(#2a2350, #6a4f7c 55%, #e08a6a)',
  hemiSky: 0xb0a8e8, hemiGround: 0x4a4a58, sun: 0xffc9a0, hemiI: 1.05, sunI: 1.3, glow: 1.35,
  caustics: false, bubbles: false, city: true,
  fogFar: 7,
  levels: [0.008, 0.024, 0.05, 0.09, 0.16, 0.27, 0.41, 0.6],
  build: buildCity,
};

export function buildCity() {
  const B = makeBuilder(777);
  const { set, box, ellipsoid, cylY, line, chunky, rnd } = B;
  const near = (x, z, r) => Math.hypot(x - START.x, z - START.z) < r;
  const WARM = [C.glowYellow, C.glowYellow, C.glowOrange, C.blueWin];

  // ---------- a tower: windows on the faces you see, a plain back, and a roof ----------
  // (the back wall is two thick so it merges into big blocks; the window faces stay single cubes)
  const tower = (x0, z0, w, d, h, wall, opts = {}) => {
    const x1 = x0 + w - 1, z1 = z0 + d - 1, lit = opts.lit ?? 0.6, wins = opts.wins || WARM;
    const face = (u, k, edge) => {
      if (k < 3) return k === 2 ? wall : (u % 3 === 0 ? wall : C.blueWin);  // lit lobby
      if (k % 3 === 0 || edge) return wall;
      return hash(u * 7 + x0, k, z0) < lit ? wins[Math.floor(hash(u, k, x0) * wins.length)] : C.cockpit;
    };
    for (let k = 0; k < h; k++) {
      for (let i = x0; i <= x1; i++) { set(i, k, z1, face(i, k, i === x0 || i === x1)); set(i, k, z0, wall); set(i, k, z0 + 1, wall); }
      for (let j = z0 + 2; j < z1; j++) { set(x0, k, j, face(j, k, false)); set(x1, k, j, face(j, k, false)); }
    }
    chunky(x0, 0, z0, x1, h - 1, z0 + 1, 2);
    box(x0, h, z0, w, 1, d, opts.roof || C.concreteDark);
    for (let i = x0; i <= x1; i++) { set(i, h + 1, z0, wall); set(i, h + 1, z1, wall); }
    for (let j = z0; j <= z1; j++) { set(x0, h + 1, j, wall); set(x1, h + 1, j, wall); }
    const cx = Math.round((x0 + x1) / 2), cz = Math.round((z0 + z1) / 2);
    if (opts.water) { // a wooden water tank on legs
      for (const [a, b] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) for (let k = h + 1; k < h + 3; k++) set(cx + a, k, cz + b, C.iron);
      cylY(cx, cz, h + 3, 3, 1.8, C.barrel); cylY(cx, cz, h + 6, 1, 1.2, C.hat);
    }
    if (opts.antenna) { for (let k = h + 1; k < Math.min(45, h + 6); k++) set(cx, k, cz, C.iron); set(cx, Math.min(45, h + 6), cz, C.eyeRed); }
    if (opts.spire) { for (let t = 0; t < 3; t++) box(cx - 2 + t, h + 1 + t, cz - 2 + t, 5 - t * 2, 1, 5 - t * 2, C.roofSteel); for (let k = h + 4; k <= 45; k++) set(cx, k, cz, C.roofSteel); }
    if (opts.billboard) { box(x0 + 1, h + 2, z1, w - 2, 3, 1, (i, k) => ((i + k) % 2 ? opts.billboard : C.trim)); for (const i of [x0 + 2, x1 - 2]) set(i, h + 1, z1, C.iron); }
    if (opts.helipad) { box(cx - 2, h + 1, cz - 2, 5, 1, 5, C.concrete); set(cx, h + 2, cz, C.glowYellow); }
    if (opts.ac) for (let n = 0; n < 3; n++) box(x0 + 1 + n * 3, h + 1, z0 + 2, 2, 1, 2, C.metal);
  };
  // a little shop: lit storefront, a striped awning, a neon sign, lit rooms upstairs
  const shop = (x0, z0, w, h, wall, awn) => {
    tower(x0, z0, w, 6, h, wall, { lit: 0.55, wins: [C.glowYellow, C.glowOrange] });
    for (let i = x0; i < x0 + w; i++) { set(i, 1, z0 + 5, i % 2 ? C.glowOrange : C.glowYellow); set(i, 3, z0 + 6, (i - x0) % 2 ? awn : C.trim); }
    set(x0 + Math.floor(w / 2), 4, z0 + 6, rnd() < 0.5 ? C.neonPink : C.neonCyan); set(x0 + Math.floor(w / 2) + 1, 4, z0 + 6, rnd() < 0.5 ? C.neonPink : C.neonCyan);
  };

  // ---------- the suspension bridge over the river (runs side to side) ----------
  // Built as two halves with a gap in the middle, each hanging from its own tower, so eating a
  // tower's legs brings its whole half down: tower top, cables and deck.
  const bridge = () => {
    const Z0 = -37, DK = 8;
    const half = (xa, xb, tx, capX) => {
      for (let x = xa; x <= xb; x++) for (let z = Z0; z <= Z0 + 2; z++) set(x, DK, z, C.concreteDark);
      for (let x = xa; x <= xb; x += 2) { set(x, DK + 1, Z0 - 1, C.girder); set(x, DK + 1, Z0 + 3, C.girder); }
      for (const z of [Z0 - 1, Z0 + 3]) for (const dx of [0, 1]) for (let k = 0; k <= 40; k++) set(tx + dx, k, z, C.girder);
      for (const k of [DK - 1, 24, 39]) for (let z = Z0 - 1; z <= Z0 + 3; z++) { set(tx, k, z, C.girder); set(tx + 1, k, z, C.girder); }
      // main cables (two), sagging from the tower top toward each end of this half, with hangers
      for (const z of [Z0 - 1, Z0 + 3]) for (let x = xa; x <= xb; x++) {
        const end = x < tx ? xa : xb, span = Math.abs(end - tx) || 1, t = Math.abs(x - tx) / span;
        const ck = Math.round(40 - (40 - (end === capX ? DK + 2 : DK + 14)) * (1 - Math.pow(1 - t, 1.8)));
        set(x, ck, z, C.girder);
        if (x % 2 === 0) for (let k = DK + 1; k < ck; k++) set(x, k, z, C.metal);
      }
    };
    half(18, 43, 33, 18);
    half(45, 58, 53, 58);
    // the approach ramp from downtown (its own piece, on little pillars)
    for (let x = 8; x <= 16; x++) { const k = Math.round(((x - 8) / 8) * (DK - 1)); for (let z = Z0; z <= Z0 + 2; z++) set(x, k, z, C.concreteDark); if (x % 3 === 0) for (let kk = 0; kk < k; kk++) set(x, kk, Z0 + 1, C.concrete); }
    // a few cars on the bridge, lights on
    for (const [x, col] of [[22, C.bag1], [30, C.taxi], [48, C.bag2], [55, C.trim]]) { box(x, DK + 1, Z0, 3, 1, 2, col); set(x + 2, DK + 1, Z0 + 2, C.glowYellow); set(x, DK + 1, Z0 + 2, C.eyeRed); }
  };

  // ---------- the elevated train across the back (side to side), in spans on pillars ----------
  const train = () => {
    const Z = -25, K = 10;
    for (let p = -54; p <= 22; p += 8) {
      box(p, 0, Z, 2, K, 2, C.concrete);
      chunky(p, 0, Z, p + 1, K - 1, Z + 1, 2);
      // the span sitting on this pillar, with a one-cube joint before the next
      for (let x = p - 3; x <= p + 4; x++) for (let z = Z - 1; z <= Z + 2; z++) set(x, K, z, z === Z - 1 || z === Z + 2 ? C.roofSteel : C.concreteDark);
      for (let x = p - 3; x <= p + 4; x++) { set(x, K + 1, Z - 1, C.iron); set(x, K + 1, Z + 2, C.iron); }
    }
    // the train: four cars, each sitting inside one span
    for (const p of [-38, -30, -22, -14]) {
      box(p - 2, K + 1, Z - 1, 6, 3, 4, (i, k, j) => (k === K + 2 && (i + 10) % 2 === 0 && (j === Z - 1 || j === Z + 2) ? C.blueWin : k === K + 1 && (j === Z - 1 || j === Z + 2) ? C.neonCyan : C.terminalWall), 1);
    }
    set(-17 + 3, K + 2, Z, C.glowYellow); set(-17 + 3, K + 2, Z + 1, C.glowYellow); // headlights
    // the station at the end of the line
    box(20, 0, Z - 4, 2, K, 2, C.concrete); box(26, 0, Z - 4, 2, K, 2, C.concrete);
    box(19, K, Z - 5, 10, 1, 4, C.concrete);
    for (const x of [20, 27]) for (let k = K + 1; k < K + 5; k++) set(x, k, Z - 4, C.iron);
    box(19, K + 5, Z - 5, 10, 1, 4, C.roofSteel);
    for (let i = 21; i <= 26; i++) set(i, K + 6, Z - 3, i % 2 ? C.neonPink : C.trim);
  };

  // ---------- tower crane over a building going up (jib runs side to side) ----------
  const crane = () => {
    const MX = -44, MZ = -36;
    for (let k = 0; k < 38; k++) { for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) if (k % 4 !== 2 || (a + b) % 2 === 0) set(MX + a, k, MZ + b, C.tug); }
    box(MX - 1, 38, MZ - 1, 4, 3, 4, C.tug); set(MX + 2, 39, MZ + 2, C.glowYellow); // the cab, lit
    // jib out to the east, counter-jib with its weight to the west
    for (let x = MX - 12; x <= MX + 22; x++) { set(x, 41, MZ, C.tug); set(x, 41, MZ + 1, C.tug); if (x % 3 === 0) set(x, 42, MZ, C.tug); }
    box(MX - 12, 38, MZ - 1, 4, 3, 4, C.concrete);
    for (let x = MX - 2; x <= MX + 18; x += 4) line(MX, 46 - 1, MZ, x, 42, MZ, C.iron);
    set(MX + 22, 42, MZ, C.eyeRed);
    // the hook and a steel beam hanging from it
    for (let k = 40; k > 24; k--) set(MX + 16, k, MZ, C.iron);
    box(MX + 12, 23, MZ, 9, 1, 1, C.girder);
    // the building going up: steel frame, a couple of finished floors
    for (let x = -40; x <= -28; x += 4) for (let z = -44; z <= -32; z += 4) for (let k = 0; k < 20; k++) set(x, k, z, C.girder);
    for (const k of [6, 12, 19]) { for (let x = -40; x <= -28; x++) for (const z of [-44, -40, -36, -32]) set(x, k, z, C.girder); for (let z = -44; z <= -32; z++) for (const x of [-40, -36, -32, -28]) set(x, k, z, C.girder); }
    box(-40, 0, -44, 13, 1, 13, C.concrete);
    box(-40, 6, -44, 13, 1, 13, (i, k, j) => ((i + j) % 5 ? C.concrete : C.concreteDark));
  };

  // ---------- street life ----------
  const car = (x, z, col, dirX = 1) => {
    box(x, 0, z, 5, 1, 3, col); box(x + 1, 1, z, 3, 1, 3, (i) => (i === x + 1 || i === x + 3 ? C.cockpit : col));
    const front = dirX > 0 ? x + 4 : x, back = dirX > 0 ? x : x + 4;
    set(front, 0, z, C.glowYellow); set(front, 0, z + 2, C.glowYellow); set(back, 0, z, C.eyeRed); set(back, 0, z + 2, C.eyeRed);
  };
  const carZ = (x, z, col) => { box(x, 0, z, 3, 1, 5, col); box(x, 1, z + 1, 3, 1, 3, (i, k, j) => (j === z + 1 || j === z + 3 ? C.cockpit : col)); set(x, 0, z + 4, C.glowYellow); set(x + 2, 0, z + 4, C.glowYellow); set(x, 0, z, C.eyeRed); set(x + 2, 0, z, C.eyeRed); };
  const lamp = (x, z) => { for (let k = 0; k < 6; k++) set(x, k, z, C.iron); set(x, 6, z, C.glowYellow); };
  const lights = (x, z) => { for (let k = 0; k < 5; k++) set(x, k, z, C.iron); set(x, 5, z, C.eyeRed); set(x, 6, z, C.glowYellow); set(x, 7, z, C.glowGreen); };
  const tree = (x, z) => { for (let k = 0; k < 3; k++) set(x, k, z, C.trunk); ellipsoid(x, 4, z, 1.8, 1.8, 1.8, (i, k, j) => (hash(i, k, j) < 0.4 ? C.pine : C.leafDark)); };
  const blimp = (x, k, z) => {
    ellipsoid(x, k, z, 8, 2.8, 2.8, C.terminalWall, 1);
    for (let i = x - 4; i <= x + 4; i++) for (let kk = k - 1; kk <= k + 1; kk++) set(i, kk, z + 3, (i + kk) % 3 ? C.neonPink : C.neonCyan); // the ad, glowing
    for (const d of [-1, 1]) { set(x - 8, k + d * 2, z, C.jetRed); set(x - 7, k + d * 2, z, C.jetRed); set(x - 8, k, z + d * 2, C.jetRed); }
    box(x - 1, k - 4, z - 1, 3, 1, 2, C.metal); set(x, k - 4, z + 1, C.glowYellow);
  };

  // ---------- layout (camera looks north from the plaza; river down the right side) ----------
  // front row (z 38-58): shops either side of the plaza
  shop(-56, 40, 7, 9, C.brick, C.jetRed); shop(-48, 40, 8, 12, C.facadeTan, C.towelTeal); shop(-39, 40, 6, 7, C.keep2, C.bag5);
  shop(-26, 40, 7, 10, C.brick, C.towelYellow); shop(-18, 40, 7, 8, C.facadeTan, C.jetRed);
  shop(12, 40, 6, 9, C.keep, C.towelPink); shop(19, 40, 7, 12, C.brick, C.bag2); shop(27, 40, 6, 8, C.facadeTan, C.towelTeal);
  // the plaza: a fountain, trees, benches of light
  cylY(0, 46, 0, 1, 3.5, C.keep2); cylY(0, 46, 1, 1, 2.8, C.water); for (let k = 2; k < 5; k++) set(0, k, 46, C.blueWin); set(0, 5, 46, C.foam);
  for (const [x, z] of [[-6, 54], [6, 54], [-7, 42], [7, 42]]) tree(x, z);
  // downtown, middle row (z 12-30)
  tower(-56, 14, 12, 12, 34, C.keep, { water: true });
  tower(-24, 14, 10, 10, 44, C.slate, { antenna: true, wins: [C.blueWin, C.blueWin, C.glowYellow] });
  tower(-10, 18, 8, 8, 26, C.facadeTan, { ac: true });
  tower(10, 14, 12, 10, 38, C.brick, { water: true });
  tower(24, 16, 8, 10, 30, C.keep2, { billboard: C.neonPink });
  // downtown, back row (z -12 to 4)
  tower(-54, -10, 12, 12, 40, C.glass2, { wins: [C.blueWin, C.blueWin, C.neonCyan], lit: 0.7, helipad: true });
  tower(-24, -10, 12, 10, 42, C.concrete, { spire: true });
  tower(-6, -8, 8, 8, 20, C.brick, { ac: true });
  tower(10, -10, 12, 10, 36, C.facadeTan, { antenna: true });
  tower(24, -8, 8, 10, 22, C.keep, { billboard: C.neonCyan });
  // east bank strip: a warehouse and a little lighthouse
  box(52, 0, 4, 6, 6, 14, (i, k) => (k === 3 && i % 2 ? C.glowYellow : C.brick), 1);
  cylY(55, 24, 0, 10, 1.5, (i, k) => (k % 3 ? C.trim : C.jetRed)); set(55, 10, 24, C.glowYellow); set(55, 11, 24, C.glowYellow);
  // the big set pieces
  bridge();
  train();
  crane();
  // the park at the back
  for (const [x, z] of [[-20, -50], [-12, -54], [-4, -48], [-18, -40], [-8, -42], [0, -54]]) tree(x, z);
  cylY(-10, -47, 0, 1, 2.5, C.keep2); set(-10, 1, -47, C.blueWin); set(-10, 2, -47, C.blueWin);
  // warehouses at the back right, before the river
  box(12, 0, -56, 18, 7, 10, (i, k) => (k === 4 && i % 3 === 0 ? C.glowOrange : C.keep2), 1);
  chunky(12, 0, -56, 29, 6, -47, 2);
  // streets: lamps, traffic lights, cars (lights on)
  for (const z of [34, 8, -16]) for (let x = -54; x <= 30; x += 12) { lamp(x, z - 4.5); lamp(x + 6, z + 4.5); }
  for (const [x, z] of [[-34, 30], [-26, 30], [0, 30], [8, 4], [-34, 4], [-26, -12], [8, -12]]) lights(x, z);
  const cols = [C.bag1, C.bag2, C.trim, C.cowBlack, C.taxi, C.taxi, C.bag3, C.jetRed, C.bag4];
  for (const z of [34, 8, -16]) for (let n = 0; n < 6; n++) {
    const x = -56 + n * 15 + Math.floor(rnd() * 5);
    if (x > 28 || near(x, z, 6)) continue;
    car(x, z + (n % 2 ? 1 : -3), cols[Math.floor(rnd() * cols.length)], n % 2 ? 1 : -1);
  }
  for (const x of [-30, 4]) for (let n = 0; n < 4; n++) { const z = -50 + n * 26 + Math.floor(rnd() * 6); if (near(x, z, 7)) continue; carZ(x + (n % 2 ? 0 : -3), z, cols[Math.floor(rnd() * cols.length)]); }
  box(-46, 0, 31, 12, 3, 3, (i, k) => (k === 1 && i % 2 ? C.glowYellow : C.bus)); // a city bus
  // a blimp drifting over the river
  blimp(43, 38, 6);
  // people out for the evening
  for (let n = 0, made = 0; n < 200 && made < 30; n++) {
    const x = Math.round((rnd() - 0.5) * 70) - 10, z = Math.round(36 + rnd() * 3);
    if (near(x, z, 5)) continue;
    set(x, 0, z, C.cowBlack); set(x, 1, z, cols[n % cols.length]); set(x, 2, z, rnd() < 0.5 ? C.skin : C.skin2); made++;
  }

  return B.finalize();
}
