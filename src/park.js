// Amusement Park: built for big falls. Almost everything stands high on thin legs, so eating
// a support brings cubes crashing down. The roller coaster track is laid in short spans with a
// one-cube gap between them, so each span falls on its own when its supports are eaten.
// Entrance arch at the front, carousel in the middle, the roller coaster running side to side
// across the back (lift hill, drop, hills, a loop facing you), Ferris wheel on the left, drop
// tower and swing ride either side of the carousel, log flume into a pond on the right, bumper cars, snack stands, balloons and a
// hot-air balloon floating overhead. Paths and the pond are painted by the ground shader.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 50 };

export const PARK = {
  id: 'park', name: 'Park', tagline: 'Rides, lights and cotton candy. Hold on tight.',
  win: 'The park is closed. Forever.',
  start: START, half: HALF,
  ground: '#8fd06d', skirt: '#6fb152', sky: '#cfeaf8', bg: 'linear-gradient(#a8daf5, #e6f4fb 60%, #cfeaf8)',
  hemiSky: 0xf2f8ff, hemiGround: 0x86b46f, sun: 0xfff2dc, caustics: false, bubbles: false, park: true,
  fogFar: 6,
  levels: [0.01, 0.03, 0.06, 0.1, 0.17, 0.28, 0.42, 0.6],
  build: buildPark,
};

export function buildPark() {
  const B = makeBuilder(2024);
  const { set, box, ellipsoid, cylY, line, chunky, rnd } = B;
  const near = (x, z, r) => Math.hypot(x - START.x, z - START.z) < r;
  const RIDE = [C.jetRed, C.bag2, C.towelYellow, C.towelTeal, C.towelPink, C.bag4, C.bag5, C.mint];

  // ---------- roller coaster ----------
  const coaster = () => {
    // the ride path: x, k (height of the track), z. The loop is inserted as its own points.
    const P = [];
    const add = (x, k, z) => P.push([x, k, z]);
    // it runs side to side across the back so you see every span fall in profile:
    // out along z = -44 (high), home along z = -57 (low)
    add(30, 3, -55); add(46, 3, -55); add(53, 4, -52); add(54, 6, -47); add(50, 6, -44);
    // the lift hill, climbing west
    for (let t = 0; t <= 1.001; t += 0.1) add(48 - t * 26, 6 + t * 30, -44);
    add(18, 37, -44); add(14, 34, -44);
    // the big drop and camel-back hills
    add(8, 20, -44); add(2, 5, -44); add(-8, 14, -44); add(-16, 5, -44); add(-24, 12, -44); add(-33, 4, -44);
    // the loop, face-on to the camera (it drifts back a little so the track can pass itself)
    const LX = -42, LR = 7, LK = 4 + LR;
    for (let a = 0; a <= Math.PI * 2 + 0.01; a += Math.PI / 14) add(LX - Math.sin(a) * LR, LK - Math.cos(a) * LR, -44 - (a / (Math.PI * 2)) * 5);
    // round the end and home along the back
    add(-48, 4, -51); add(-50, 4, -55); add(-44, 4, -57); add(-24, 7, -57); add(-6, 3, -57); add(12, 6, -57); add(24, 3, -56); add(30, 3, -55);
    // walk the path in small steps, laying rails and ties, supports under every few steps,
    // and a gap every so often so the track breaks into separate spans
    let dist = 0, nx = 1, nz = 0, lastSup = -99, span = 0, lastGap = 0;
    for (let s = 0; s < P.length - 1; s++) {
      const [x0, k0, z0] = P[s], [x1, k1, z1] = P[s + 1];
      const len = Math.hypot(x1 - x0, k1 - k0, z1 - z0), steps = Math.max(1, Math.ceil(len * 2));
      const hx = x1 - x0, hz = z1 - z0, hl = Math.hypot(hx, hz);
      if (hl > 0.3) { nx = -hz / hl; nz = hx / hl; }
      for (let q = 0; q < steps; q++) {
        const t = q / steps, x = x0 + hx * t, k = k0 + (k1 - k0) * t, z = z0 + hz * t;
        dist += len / steps;
        if (dist - lastGap > 12 && k > 3) { lastGap = dist; span++; continue; } // a joint between spans
        if (dist - lastGap < 0.6) continue;
        set(x + nx * 1.2, k, z + nz * 1.2, C.jetRed);
        set(x - nx * 1.2, k, z - nz * 1.2, C.jetRed);
        if (Math.round(dist * 2) % 3 === 0) set(x, k - 1, z, C.trim); // ties
        // supports: a white column down to the ground, a couple per span
        if (dist - lastSup > 5.5 && k > 2 && dist - lastGap > 2 && dist - lastGap < 10) {
          lastSup = dist;
          for (let kk = 0; kk < k - 1; kk++) set(x, kk, z, C.trim);
          if (k > 14) for (let kk = 0; kk < k * 0.5; kk++) { set(x + nx * (2.5 - kk * 0.12), kk, z + nz * (2.5 - kk * 0.12), C.trim); set(x - nx * (2.5 - kk * 0.12), kk, z - nz * (2.5 - kk * 0.12), C.trim); }
        }
      }
    }
    // a train of cars climbing the lift hill
    for (let c = 0; c < 4; c++) {
      const x = 40 - c * 3.4, k = Math.round(6 + ((48 - x) / 26) * 30 + 1);
      box(Math.round(x) - 1, k, -45, 3, 2, 3, RIDE[c % RIDE.length]);
      set(Math.round(x), k + 2, -44, C.skin); set(Math.round(x) - 1, k + 2, -44, C.skin2);
    }
    // the station, beside the home stretch
    box(32, 0, -52, 13, 1, 3, C.concrete);
    for (const x of [32, 44]) for (const z of [-52, -50]) for (let k = 1; k < 6; k++) set(x, k, z, C.trim);
    box(31, 6, -53, 15, 1, 5, (i) => (i % 2 ? C.jetRed : C.trim));
  };

  // ---------- Ferris wheel (faces the camera) ----------
  const ferris = (xc, zc) => {
    const R = 17, KC = 22;
    for (let a = 0; a < Math.PI * 2; a += 0.02) for (const dz of [-1, 1]) set(xc + Math.cos(a) * R, KC + Math.sin(a) * R, zc + dz, C.trim);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      for (const dz of [-1, 1]) line(xc, KC, zc + dz, xc + Math.cos(a) * R, KC + Math.sin(a) * R, zc + dz, C.metal);
      // a gondola hanging from the rim
      const gx = Math.round(xc + Math.cos(a) * R), gk = Math.round(KC + Math.sin(a) * R);
      set(gx, gk, zc, C.metal); set(gx, gk - 1, zc, C.metal);
      box(gx - 1, gk - 4, zc - 1, 3, 3, 3, (ii, kk) => (kk === gk - 2 ? C.window : RIDE[i % RIDE.length]));
    }
    for (let dz = -2; dz <= 2; dz++) ellipsoid(xc, KC, zc + dz, 1.6, 1.6, 0.5, C.gold);
    // A-frame legs on both sides
    for (const dz of [-3, 3]) for (const sx of [-1, 1]) line(xc + sx * 9, 0, zc + dz, xc, KC, zc + Math.sign(dz), C.metal);
    for (const dz of [-3, 3]) for (const sx of [-1, 1]) line(xc + sx * 9 + 1, 0, zc + dz, xc + 1, KC, zc + Math.sign(dz), C.metal);
    box(xc - 3, 0, zc + 4, 6, 3, 3, C.towelTeal); set(xc, 3, zc + 5, C.gold); // ticket hut
  };

  // ---------- drop tower ----------
  const dropTower = (x, z) => {
    box(x - 1, 0, z - 1, 3, 43, 3, (i, k) => (Math.floor(k / 4) % 2 ? C.jetRed : C.trim));
    chunky(x - 1, 0, z - 1, x + 1, 42, z + 1, 2);
    // the seat ring, stopped near the top
    for (let i = x - 4; i <= x + 4; i++) for (let j = z - 4; j <= z + 4; j++) {
      const d = Math.max(Math.abs(i - x), Math.abs(j - z));
      if (d >= 2 && d <= 4) { set(i, 30, j, C.metal); if (d === 4) { set(i, 31, j, RIDE[(i + j + 40) % RIDE.length]); if ((i + j) % 2 === 0) set(i, 32, j, C.skin); } }
    }
    box(x - 3, 43, z - 3, 7, 2, 7, C.towelYellow);
    for (const [a, b] of [[-3, -3], [3, 3], [-3, 3], [3, -3]]) set(x + a, 45, z + b, C.balloonRed);
    box(x - 4, 0, z - 4, 9, 1, 9, C.concrete);
  };

  // ---------- swing ride ----------
  const swings = (x, z) => {
    cylY(x, z, 0, 1, 4, C.concrete);
    cylY(x, z, 1, 17, 1.4, C.towelPink);
    for (let k = 18; k < 21; k++) cylY(x, z, k, 1, 7.5 - (k - 18) * 1.6, (i, kk, j) => (Math.floor((Math.atan2(j - z, i - x) + Math.PI) / (Math.PI / 6)) % 2 ? C.towelPink : C.towelYellow));
    set(x, 21, z, C.gold); set(x, 22, z, C.balloonRed);
    for (let n = 0; n < 12; n++) {
      const a = (n / 12) * Math.PI * 2 + 0.2;
      const tx = x + Math.cos(a) * 10, tz = z + Math.sin(a) * 10;
      line(x + Math.cos(a) * 6.5, 17, z + Math.sin(a) * 6.5, tx, 10, tz, C.metal);
      set(tx, 9, tz, RIDE[n % RIDE.length]); set(tx, 10, tz, C.skin);
    }
  };

  // ---------- carousel ----------
  const carousel = (x, z) => {
    cylY(x, z, 0, 1, 8.5, (i, k, j) => (Math.hypot(i - x, j - z) > 7.5 ? C.gold : C.towelPink));
    cylY(x, z, 1, 11, 1.6, C.mirror ?? C.gold);
    for (let n = 0; n < 12; n++) {
      const a = (n / 12) * Math.PI * 2, px = x + Math.cos(a) * 6, pz = z + Math.sin(a) * 6;
      for (let k = 1; k < 10; k++) set(px, k, pz, C.gold);
      // a little horse on each pole, facing round the ring
      const hk = n % 2 ? 4 : 5, tx = -Math.sin(a), tz = Math.cos(a), col = n % 3 ? C.chicken : C.hayDark;
      for (let s = -1; s <= 1; s++) { set(px + tx * s, hk, pz + tz * s, col); set(px + tx * s, hk - 1, pz + tz * s, col); }
      set(px + tx * 2, hk + 1, pz + tz * 2, col); set(px + tx * 2, hk + 2, pz + tz * 2, col);
      set(px - tx * 2, hk, pz - tz * 2, C.hat);
    }
    // striped tent roof with a scalloped edge and a flag
    for (let k = 10; k < 16; k++) cylY(x, z, k, 1, 9 - (k - 10) * 1.5, (i, kk, j) => (Math.floor((Math.atan2(j - z, i - x) + Math.PI) / (Math.PI / 8)) % 2 ? C.jetRed : C.trim), 1.2);
    for (let n = 0; n < 24; n++) { const a = (n / 24) * Math.PI * 2; set(x + Math.cos(a) * 8.8, 9, z + Math.sin(a) * 8.8, n % 2 ? C.gold : C.jetRed); }
    for (let k = 16; k < 19; k++) set(x, k, z, C.gold);
    set(x + 1, 18, z, C.towelTeal); set(x + 2, 18, z, C.towelTeal); set(x + 1, 17, z, C.towelTeal);
  };

  // ---------- log flume: tower, a long chute down to the pond, and a log boat ----------
  const flume = () => {
    box(50, 0, 2, 7, 17, 7, (i, k) => (k % 3 ? C.shipWood : C.shipDark), 1);
    chunky(50, 0, 2, 56, 16, 8, 2);
    box(49, 17, 1, 9, 1, 9, C.shipDark);
    // the chute runs north along x = 53 down to the pond
    let lastGap = 0;
    for (let j = 0; j >= -24; j--) {
      const t = -j / 24, k = Math.round(16 - Math.pow(t, 1.6) * 15);
      if (-j - lastGap >= 9) { lastGap = -j; continue; } // span joints
      for (let i = 51; i <= 55; i++) set(i, k, j, i === 51 || i === 55 ? C.shipWood : C.water);
      set(51, k + 1, j, C.shipWood); set(55, k + 1, j, C.shipWood);
      if ((-j - lastGap) % 4 === 2 && k > 1) for (let kk = 0; kk < k; kk++) { set(51, kk, j, C.shipDark); set(55, kk, j, C.shipDark); }
    }
    // a log boat with riders at the top
    box(52, 17, 3, 3, 2, 5, C.trunk); set(53, 19, 4, C.skin); set(53, 19, 6, C.skin2); set(53, 20, 4, C.hat);
    // a splash hanging over the pond
    for (let n = 0; n < 14; n++) set(53 + (rnd() - 0.5) * 6, 2 + rnd() * 4, -27 + (rnd() - 0.5) * 4, n % 3 ? C.foam : C.waterLight);
  };

  // ---------- bumper cars ----------
  const bumpers = (x0, z0) => {
    box(x0, 0, z0, 18, 1, 12, C.concreteDark);
    for (const x of [x0, x0 + 8, x0 + 17]) for (const z of [z0, z0 + 11]) for (let k = 1; k < 8; k++) set(x, k, z, C.gold);
    box(x0 - 1, 8, z0 - 1, 20, 1, 14, (i) => (Math.floor((i - x0) / 2) % 2 ? C.bag2 : C.trim));
    for (let n = 0; n < 6; n++) {
      const cx = x0 + 3 + (n % 3) * 5 + (n > 2 ? 1 : 0), cz = z0 + 3 + (n > 2 ? 5 : 0);
      box(cx, 1, cz, 2, 1, 3, RIDE[n]); set(cx, 2, cz + 1, C.skin);
      for (let k = 2; k < 8; k++) set(cx + 1, k, cz + 2, C.metal); // the pole up to the ceiling
    }
  };

  // ---------- entrance, stands, decorations ----------
  const entrance = () => {
    for (const sx of [-10, 8]) { box(sx, 0, 40, 3, 15, 3, (i, k) => (k % 4 === 0 ? C.gold : C.towelTeal)); set(sx + 1, 15, 41, C.balloonRed); set(sx + 1, 16, 41, C.balloonRed); }
    box(-10, 12, 40, 21, 2, 3, C.towelTeal);
    box(-7, 14, 41, 15, 4, 1, (i, k) => ((i + k) % 2 && k > 14 && k < 17 ? C.balloonYellow : C.jetRed));
    for (let i = -7; i <= 7; i += 2) set(i, 18, 41, i % 4 ? C.towelYellow : C.trim);
    for (const sx of [-18, 14]) { box(sx, 0, 42, 4, 4, 4, C.trim); box(sx - 1, 4, 41, 6, 1, 6, C.jetRed); set(sx + 1, 2, 46, C.window); }
    for (let x = -30; x <= 30; x++) if (Math.abs(x) > 11 && Math.abs(x) % 2 === 0) { set(x, 0, 41, C.gold); set(x, 1, 41, C.gold); set(x, 2, 41, C.gold); }
  };
  const stand = (x, z, a, b, top) => {
    box(x, 0, z, 5, 4, 5, C.trim);
    set(x + 2, 1, z + 5, C.window); set(x + 1, 2, z + 5, C.window); set(x + 3, 2, z + 5, C.window);
    box(x - 1, 4, z - 1, 7, 1, 7, (i) => ((i - x) % 2 ? a : b));
    if (top === 'cone') { for (let k = 5; k < 9; k++) cylY(x + 2, z + 2, k, 1, (k - 4) * 0.5, C.bun); ellipsoid(x + 2, 10, z + 2, 2.2, 1.8, 2.2, C.iceCream); set(x + 2, 12, z + 2, C.balloonRed); }
    else if (top === 'popcorn') { box(x + 1, 5, z + 1, 3, 4, 3, (i) => (i % 2 ? C.jetRed : C.trim)); for (let n = 0; n < 9; n++) set(x + 1 + (n % 3), 9, z + 1 + Math.floor(n / 3), C.cream); set(x + 2, 10, z + 2, C.cream); }
    else if (top === 'candy') { for (let k = 5; k < 9; k++) set(x + 2, k, z + 2, C.trim); ellipsoid(x + 2, 10, z + 2, 2.2, 2, 2.2, C.towelPink); }
    else { box(x + 1, 5, z + 1, 3, 3, 3, C.bag4); set(x + 2, 8, z + 2, C.gold); }
  };
  const balloonBunch = (x, z, k, tied) => {
    const cols = [C.balloonRed, C.balloonYellow, C.balloonBlue, C.balloonGreen, C.towelPink];
    for (let n = 0; n < 5; n++) {
      const bx = x + (n % 3) * 2 - 2, bz = z + (n > 2 ? 1 : -1), bk = k + (n % 2) * 2;
      ellipsoid(bx, bk, bz, 0.9, 1.2, 0.9, cols[n]);
      line(bx, bk - 2, bz, x, k - 5, z, C.trim);
    }
    if (tied) { for (let kk = 0; kk < k - 5; kk++) set(x, kk, z, C.trim); box(x - 1, 0, z + 1, 2, 2, 1, C.shirt); set(x - 1, 2, z + 1, C.skin); }
  };
  const hotAir = (x, k, z) => {
    ellipsoid(x, k, z, 5.5, 6.5, 5.5, (i, kk, j) => (Math.floor((Math.atan2(j - z, i - x) + Math.PI) / (Math.PI / 5)) % 2 ? C.balloonRed : C.balloonYellow), 1);
    for (const [a, b] of [[-1, -1], [1, 1], [-1, 1], [1, -1]]) line(x + a * 3, k - 5, z + b * 3, x + a, k - 9, z + b, C.rope);
    box(x - 1, k - 11, z - 1, 3, 2, 3, C.basket); set(x, k - 9, z, C.skin);
  };
  const tree = (x, z) => { for (let k = 0; k < 3; k++) set(x, k, z, C.trunk); ellipsoid(x, 4.5, z, 2.2, 2.2, 2.2, (i, k, j) => (hash(i, k, j) < 0.35 ? C.leaf2 : C.leaf)); };
  const lamp = (x, z) => { for (let k = 0; k < 6; k++) set(x, k, z, C.iron); set(x, 6, z, C.towelYellow); };
  const person = (x, z) => { const c = RIDE[Math.floor(rnd() * RIDE.length)]; set(x, 0, z, C.shirt); set(x, 1, z, c); set(x, 2, z, rnd() < 0.5 ? C.skin : C.skin2); };
  const bench = (x, z) => { box(x, 1, z, 3, 1, 1, C.wood); set(x, 0, z, C.iron); set(x + 2, 0, z, C.iron); set(x, 2, z - 1, C.wood); set(x + 1, 2, z - 1, C.wood); set(x + 2, 2, z - 1, C.wood); };

  // ---------- layout (camera looks north from the gate) ----------
  entrance();
  carousel(0, 2);
  ferris(-36, -14);
  coaster();
  dropTower(20, 6);
  swings(-24, 18);
  flume();
  bumpers(6, -30);
  stand(12, 22, C.towelPink, C.trim, 'cone');
  stand(-18, 30, C.jetRed, C.trim, 'popcorn');
  stand(14, -14, C.bag2, C.trim, 'candy');
  stand(-12, -12, C.bag5, C.trim, 'prize');
  balloonBunch(-6, 30, 16, true);
  balloonBunch(36, -6, 24, false);
  balloonBunch(-42, 4, 28, false);
  balloonBunch(14, -24, 22, false);
  hotAir(-6, 36, -26);
  for (const [x, z] of [[-56, 30], [-50, 40], [-58, 18], [56, 40], [20, 44], [-30, 44], [44, -8], [-56, 2], [40, 30]]) tree(x, z);
  // lamps and benches along the round path, people out and about
  for (let n = 0; n < 12; n++) { const a = (n / 12) * Math.PI * 2; if (Math.cos(a) * 36 < 44) lamp(Math.cos(a) * 36, Math.sin(a) * 36); }
  for (const [x, z] of [[6, 30], [-14, 22], [22, -2], [-24, -2], [-4, -22]]) bench(x, z);
  for (let n = 0, made = 0; n < 200 && made < 40; n++) {
    const a = rnd() * Math.PI * 2, r = 32 + (rnd() - 0.5) * 4.5;
    const x = Math.round(Math.cos(a) * r), z = Math.round(Math.sin(a) * r);
    if (near(x, z, 5) || (x > 14 && z < 16 && z > -2)) continue;
    person(x, z); made++;
  }
  for (let n = 0; n < 8; n++) person(-3 + n % 3 * 3, 34 - Math.floor(n / 3) * 2);
  // flower beds by the gate
  for (let n = 0; n < 30; n++) { const x = Math.round((rnd() - 0.5) * 50), z = Math.round(44 + rnd() * 12); if (Math.abs(x) < 5) continue; set(x, 0, z, rnd() < 0.5 ? C.flowerPink : C.petal); }

  return B.finalize();
}
