// Airport map: a parking lot and curbside road at the front, a long glass terminal with
// jet bridges, three jets parked nose-in at the gates with luggage trains and service trucks,
// a control tower and helipad to the east, a hangar to the west, and the runway at the back
// with two jets on it. A small plane floats in to land and a helicopter hovers over its pad.
// The tarmac, runway, road and lot are painted by the ground shader (map.airport = true).
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const START = { x: 0, z: 48 };

export const AIRPORT = {
  id: 'airport', name: 'Airport', tagline: 'A busy little airport. Now boarding: the hole.',
  win: 'The airport is gone. Every flight cancelled.',
  start: START, half: HALF,
  ground: '#8fcf6c', skirt: '#70b152', sky: '#cfeaf8', bg: 'linear-gradient(#b4dcf4, #e3f2fb 60%, #cfeaf8)',
  hemiSky: 0xf0f8ff, hemiGround: 0x86b46f, sun: 0xfff2dc, caustics: false, bubbles: false, airport: true,
  fogFar: 6,
  levels: [0.008, 0.024, 0.05, 0.09, 0.16, 0.27, 0.41, 0.6],
  build: buildAirport,
};

export function buildAirport() {
  const B = makeBuilder(1903);
  const { set, box, ellipsoid, cylY, cylZ, line, chunky, rnd } = B;
  const near = (x, z, r) => Math.hypot(x - START.x, z - START.z) < r;

  // ---------- an airliner, built along a local axis ----------
  // dir: 'n' nose toward +z (parked at a gate), 'w' nose toward -x, 'e' nose toward +x
  const jet = (cx, cz, dir, L = 26, livery = C.jetBlue, tailCol = C.jetTeal) => {
    const put = (u, k, w, col) => {
      if (dir === 'n') set(cx + w, k, cz + u, col);
      else if (dir === 'w') set(cx - u, k, cz + w, col);
      else set(cx + u, k, cz - w, col);
    };
    const H = L / 2, R = 2.6, KC = 4.6;
    for (let u = -H; u <= H; u++) {
      // nose rounds off, tail narrows and lifts
      const toNose = H - u, toTail = u + H;
      const r = toNose < 4 ? R * Math.sqrt(Math.max(0.15, toNose / 4)) : toTail < 7 ? R * (0.45 + 0.55 * (toTail / 7)) : R;
      const kc = toTail < 7 ? KC + (7 - toTail) * 0.22 : KC;
      for (let w = -3; w <= 3; w++) for (let k = 1; k <= 9; k++) {
        const d = Math.hypot(w, k - kc);
        if (d > r || d < r - 1.3) continue;
        let col = C.jetWhite;
        if (k < kc - 1.2) col = livery;                                            // belly
        if (Math.abs(k - kc + 0.3) < 0.5 && Math.abs(w) >= 2 && u % 2 === 0 && toNose > 4 && toTail > 6) col = C.cockpit; // cabin windows
        if (toNose >= 1 && toNose <= 2.5 && k >= kc && k <= kc + 1.2) col = C.cockpit; // cockpit
        if (toNose < 1) col = C.jetWhite;
        put(u, k, w, col);
      }
    }
    // wings, swept back, with engines underneath and winglets
    for (let s = 2; s <= 13; s++) {
      const front = 3 - s * 0.45, back = front - (7 - s * 0.38);
      for (let u = Math.round(back); u <= Math.round(front); u++) for (const side of [-1, 1]) put(u, 3, side * s, s > 11 ? livery : C.jetWhite);
      if (s === 13) for (const side of [-1, 1]) { put(Math.round(back), 4, side * s, livery); put(Math.round(back), 5, side * s, livery); }
    }
    for (const side of [-1, 1]) {
      for (let u = -1; u <= 3; u++) for (let w = -1; w <= 1; w++) for (let k = 0; k <= 2; k++) {
        if (w !== 0 && k !== 1 && u !== 3) continue;
        put(u, k, side * 6 + w, u === 3 && w === 0 && k === 1 ? C.cockpit : C.engine);
      }
    }
    // tail fin and stabilisers
    for (let t = 0; t < 7; t++) for (let u = -H + Math.floor(t * 0.6); u <= -H + 4 + Math.floor(t * 0.4); u++) put(u, 8 + t, 0, t > 2 ? tailCol : C.jetWhite);
    for (let s = 1; s <= 6; s++) for (const side of [-1, 1]) for (let u = -H + 1; u <= -H + 3 - Math.floor(s * 0.3); u++) put(u, 7, side * s, C.jetWhite);
    // landing gear
    for (let k = 0; k < 2; k++) { put(H - 4, k, 0, C.iron); for (const side of [-1, 1]) put(-1, k, side * 2, C.iron); }
  };

  // ---------- a little propeller plane ----------
  const propPlane = (x, k0, z, dir = 'w') => {
    const put = (u, k, w, col) => (dir === 'w' ? set(x - u, k0 + k, z + w, col) : set(x + w, k0 + k, z + u, col));
    for (let u = -5; u <= 5; u++) for (let w = -1; w <= 0; w++) for (let k = 0; k <= 1; k++) put(u, k, w, (u + 10) % 4 < 2 && k === 1 ? C.trim : C.propRed);
    put(4, 2, -1, C.cockpit); put(4, 2, 0, C.cockpit); put(3, 2, -1, C.trim); put(3, 2, 0, C.trim);
    for (let s = -8; s <= 8; s++) for (const u of [2, 3]) put(u, 3, s < 0 ? s : s - 1, Math.abs(s) > 6 ? C.propRed : C.trim); // high wing
    for (let s = -3; s <= 3; s++) put(-5, 2, s < 0 ? s : s - 1, C.trim);
    for (let k = 2; k <= 4; k++) put(-5, k, 0, C.propRed);
    put(6, 0, 0, C.anchor); put(6, 1, -1, C.anchor);                                     // nose and propeller
    for (let t = -2; t <= 2; t++) put(7, 1 + t, t === 0 ? -1 : 0, C.iron);
    for (const w of [-2, 1]) put(2, -1, w, C.iron);                                      // wheels
  };
  const helicopter = (x, k0, z) => {
    ellipsoid(x, k0 + 2, z, 2.6, 2, 2, (i, k, j) => (i > x + 1 && k > k0 + 1 ? C.cockpit : C.bus));
    for (let s = 3; s < 10; s++) set(x - s, k0 + 2 + (s > 7 ? 1 : 0), z, C.bus);
    for (let k = 2; k < 5; k++) set(x - 9, k0 + k, z, C.trim);
    for (let k = 4; k < 6; k++) set(x, k0 + k, z, C.anchor);
    for (let s = -7; s <= 7; s++) { set(x + s, k0 + 5, z, C.iron); set(x, k0 + 5, z + s, C.iron); } // rotor
    for (const w of [-2, 2]) { for (let s = -3; s <= 3; s++) set(x + s, k0 - 1, z + w, C.iron); set(x - 1, k0, z + w, C.iron); set(x + 1, k0, z + w, C.iron); }
  };

  // ---------- buildings ----------
  const terminal = (x0, z0, w, d) => {
    const x1 = x0 + w - 1, z1 = z0 + d - 1;
    const roofK = (i) => 10 + Math.round(2.2 * Math.sin(((i - x0) / (w - 1)) * Math.PI));
    for (let i = x0; i <= x1; i++) for (let j = z0; j <= z1; j++) {
      const edgeX = i - x0 < 2 || x1 - i < 2, edgeZ = j - z0 < 2 || z1 - j < 2;
      const top = roofK(i);
      if (edgeX || edgeZ) for (let k = 0; k < top; k++) {
        const post = (i - x0) % 6 === 0 || edgeX;
        const glassRow = k >= 2 && k <= top - 2 && !post;
        const outer = j === z0 || j === z1 || i === x0 || i === x1;
        set(i, k, j, glassRow && outer ? (k % 4 === 0 ? C.glass2 : C.glass) : k === 0 || k === 6 ? C.roofSteel : C.terminalWall);
      }
      set(i, top, j, (i - x0) % 6 === 3 && j > z0 + 1 && j < z1 - 1 ? C.glass : C.roofSteel); set(i, top - 1, j, C.roofSteel);
    }
    for (let i = x0 - 1; i <= x1 + 1; i++) for (const j of [z0 - 1, z1 + 1]) set(i, roofK(Math.min(x1, Math.max(x0, i))), j, C.terminalWall); // eaves
    chunky(x0, 0, z0, x1, 13, z1, 2);
    // entrance canopy on the road side
    for (let i = x0 + 18; i <= x0 + 40; i++) for (let j = z1 + 1; j <= z1 + 2; j++) set(i, 6, j, C.terminalWall);
    for (const i of [x0 + 18, x0 + 29, x0 + 40]) for (let k = 0; k < 6; k++) set(i, k, z1 + 2, C.roofSteel);
    // a big blue sign board on the roof
    box(x0 + 22, 13, z1 - 1, 16, 3, 1, (i, k) => (k === 14 && i % 2 ? C.trim : C.bus));
    // jet bridges reaching out to the gates (north)
    for (const gx of [-24, 4, 32]) {
      for (let j = z0 - 10; j < z0; j++) for (let a = -1; a <= 1; a++) for (let k = 4; k <= 6; k++)
        if (a !== 0 || k !== 5) set(gx + a, k, j, k === 5 ? C.glass2 : C.roofSteel);
      box(gx - 2, 3, z0 - 12, 5, 5, 3, C.roofSteel, 1);                       // the cab at the plane door
      for (let k = 0; k < 3; k++) set(gx, k, z0 - 10, C.anchor); set(gx - 1, 0, z0 - 10, C.tire); set(gx + 1, 0, z0 - 10, C.tire);
    }
  };
  const tower = (x, z) => {
    box(x - 5, 0, z - 4, 10, 5, 8, (i, k) => (k === 2 && i % 2 ? C.glass : C.terminalWall), 1);
    chunky(x - 5, 0, z - 4, x + 4, 4, z + 3, 2);
    for (let k = 5; k < 30; k++) cylY(x, z, k, 1, 2.6, k % 6 === 0 ? C.roofSteel : C.terminalWall);
    chunky(x - 3, 5, z - 3, x + 3, 29, z + 3, 2);
    cylY(x, z, 30, 1, 5.2, C.roofSteel);
    for (let k = 31; k < 35; k++) cylY(x, z, k, 1, 5, (i, kk, j) => { const a = Math.atan2(j - z, i - x); return Math.round(a * 4) % 3 === 0 ? C.roofSteel : C.glass; }, 1);
    cylY(x, z, 35, 1, 5.8, C.roofSteel);
    cylY(x, z, 36, 1, 3, C.terminalWall);
    for (let k = 37; k < 45; k++) set(x, k, z, C.anchor);
    set(x, 45, z, C.jetRed);
    for (let a = -2; a <= 2; a++) set(x + 2, 38 + (Math.abs(a) < 2 ? 0 : 1), z + a, C.trim); // radar dish
  };
  const hangar = (x0, z0) => {
    // an arched roof along z, open to the east
    for (let j = z0; j <= z0 + 18; j++) for (let t = 0; t <= 20; t++) {
      const a = (t / 20) * Math.PI, i = x0 + 8 - Math.cos(a) * 8, k = Math.sin(a) * 11;
      set(i, k, j, j === z0 || j === z0 + 18 || t % 4 === 0 ? C.hangar : C.hangarRoof);
    }
    for (let i = x0; i <= x0 + 16; i++) for (let k = 0; k < 11; k++) if (Math.hypot(i - x0 - 8, k * 0.73) <= 8) set(i, k, z0, C.hangar); // back wall
    propPlane(x0 + 8, 1, z0 + 9, 'w');
    for (let k = 0; k < 3; k++) set(x0 + 3, k, z0 + 4, C.tug); box(x0 + 11, 0, z0 + 3, 3, 3, 2, C.bag2); // tool chests
  };

  // ---------- ground vehicles ----------
  const luggageTrain = (x, z, carts, dirX = 1) => {
    // tug
    box(x, 0, z, 4, 2, 3, C.tug); set(x + (dirX > 0 ? 3 : 0), 2, z + 1, C.cockpit); set(x + 1, 2, z, C.tug); set(x + 1, 3, z, C.tug); set(x + 1, 2, z + 2, C.tug); set(x + 1, 3, z + 2, C.tug);
    for (let i = x; i < x + 3; i++) for (let j = z; j < z + 3; j++) set(i, 4, j, C.tug);
    set(x + 2, 2, z + 1, C.shirt); set(x + 2, 3, z + 1, C.skin); // driver
    const bags = [C.bag1, C.bag2, C.bag3, C.bag4, C.bag5, C.towelPink, C.taxi];
    for (let c = 0; c < carts; c++) {
      const cxx = x - dirX * (6 + c * 6);
      set(cxx + (dirX > 0 ? 5 : -1), 1, z + 1, C.anchor); // hitch
      box(cxx, 1, z, 5, 1, 3, C.cart);
      for (const i of [cxx, cxx + 4]) { set(i, 0, z, C.tire); set(i, 0, z + 2, C.tire); }
      for (let i = cxx; i < cxx + 5; i += 2) for (let j = z; j < z + 3; j += 2) {
        const h = 1 + Math.floor(rnd() * 2), col = bags[Math.floor(rnd() * bags.length)];
        box(i, 2, j, 2, h, 1, col);
        if (rnd() < 0.4) set(i, 2 + h, j, C.iron); // a handle
      }
      for (const i of [cxx, cxx + 4]) for (const j of [z, z + 2]) set(i, 4, j, C.cart);
      for (let i = cxx; i < cxx + 5; i++) for (let j = z; j < z + 3; j++) set(i, 5, j, C.roofSteel); // canopy
    }
  };
  const fuelTruck = (x, z) => {
    // cab at the north end, the tank trailing south behind it
    box(x, 0, z, 3, 4, 4, C.taxi); set(x, 3, z, C.cockpit); set(x + 1, 3, z, C.cockpit); set(x + 2, 3, z, C.cockpit);
    cylZ(z + 4, 9, 2.8, x + 1, 1.8, C.terminalWall);
    for (const j of [z + 1, z + 6, z + 11]) { set(x - 1, 0, j, C.tire); set(x + 3, 0, j, C.tire); }
  };
  const beltLoader = (x, z) => {
    box(x, 0, z, 3, 2, 6, C.tug);
    for (let s = 0; s < 9; s++) for (let a = 0; a < 2; a++) set(x + a, 2 + s * 0.45, z - s, C.iron);
    box(x, 2, z + 3, 1, 1, 1, C.bag1); box(x + 1, 4, z - 4, 1, 1, 1, C.bag3);
  };
  const stairsTruck = (x, z) => {
    box(x, 0, z, 3, 2, 6, C.trim);
    for (let s = 0; s < 6; s++) box(x, 2 + s, z - s, 3, 1, 1, C.roofSteel);
    for (let s = 0; s < 6; s++) { set(x - 1, 3 + s, z - s, C.anchor); set(x + 3, 3 + s, z - s, C.anchor); }
  };
  const cateringTruck = (x, z) => { box(x, 0, z, 3, 3, 3, C.trim); box(x, 3, z - 6, 3, 1, 7, C.anchor); box(x - 1, 4, z - 6, 5, 4, 6, C.jetTeal); };
  const cone = (x, z) => { set(x, 0, z, C.cone); set(x, 1, z, C.trim); };
  const car = (x, z, col) => {
    box(x, 0, z, 3, 2, 5, col); box(x, 2, z + 1, 3, 1, 3, (i, k, j) => (j === z + 1 || j === z + 3 ? C.window : col));
    set(x, 0, z, C.tire); set(x + 2, 0, z, C.tire); set(x, 0, z + 4, C.tire); set(x + 2, 0, z + 4, C.tire);
  };
  const taxi = (x, z) => { box(x, 0, z, 5, 2, 3, C.taxi); box(x + 1, 2, z, 3, 1, 3, (i) => (i === x + 1 || i === x + 3 ? C.window : C.taxi)); set(x + 2, 3, z + 1, C.cowBlack); };
  const bus = (x, z) => {
    box(x, 0, z, 14, 4, 4, (i, k) => (k === 2 && i % 2 === 0 ? C.window : C.bus));
    box(x, 4, z, 14, 1, 4, C.trim);
    for (const i of [x + 2, x + 11]) { set(i, 0, z - 1, C.tire); set(i, 0, z + 4, C.tire); }
    chunky(x, 0, z, x + 13, 4, z + 3, 2);
  };
  const lamp = (x, z) => { for (let k = 0; k < 8; k++) set(x, k, z, C.roofSteel); set(x + 1, 8, z, C.roofSteel); set(x + 1, 7, z, C.runLight); };
  const windsock = (x, z) => {
    for (let k = 0; k < 8; k++) set(x, k, z, C.trim);
    for (let s = 1; s <= 5; s++) { const col = s % 2 ? C.cone : C.trim; set(x + s, 7, z, col); if (s < 4) { set(x + s, 8, z, col); set(x + s, 7, z + 1, col); } }
  };
  const tree = (x, z) => { for (let k = 0; k < 3; k++) set(x, k, z, C.trunk); ellipsoid(x, 4.5, z, 2.2, 2.2, 2.2, (i, k, j) => (hash(i, k, j) < 0.35 ? C.leaf2 : C.leaf)); };
  const bush = (x, z) => ellipsoid(x, 0.6, z, 1.5, 1.1, 1.5, (i, k, j) => (hash(i, k, j) < 0.2 ? C.flowerPink : C.leafDark), 0, 0);

  // ---------- layout (camera looks north from the parking lot) ----------
  // the parking lot: two rows of cars, lamp posts
  const carCols = [C.balloonRed, C.bag2, C.trim, C.cowBlack, C.tractor, C.taxi, C.silo, C.bag4, C.towelTeal];
  for (const row of [39, 52]) for (let x = -42; x <= 32; x += 4) {
    if (near(x + 1.5, row + 2.5, 6) || rnd() < 0.25) continue;
    car(x + 0.5, row, carCols[Math.floor(rnd() * carCols.length)]);
  }
  for (const x of [-36, -12, 14, 30]) lamp(x, 47);
  // the curbside road: a shuttle bus and a line of taxis
  bus(-44, 30); taxi(-12, 30); taxi(-4, 30); taxi(4, 30); taxi(26, 31); car(14, 30, C.bag1);
  // the terminal, with flower beds in front
  terminal(-44, 16, 73, 12);
  for (let x = -40; x <= 32; x += 8) if (!near(x, 36, 5)) bush(x, 36);
  // gates: three jets parked nose-in, with their ground crew
  jet(-24, -10, 'n', 26, C.jetBlue, C.jetTeal);
  jet(4, -10, 'n', 26, C.jetRed, C.jetRed);
  jet(32, -10, 'n', 26, C.jetTeal, C.bag5);
  luggageTrain(-6, 8, 2, 1);   // the luggage trains run along the service road under the bridges
  luggageTrain(24, 8, 3, 1);
  beltLoader(-20, 0); beltLoader(37, 0);
  fuelTruck(-10, -6); stairsTruck(9, -1); cateringTruck(24, 1);
  for (const [x, z] of [[-26, 5], [-22, 5], [2, 5], [6, 5], [30, 5], [34, 5], [14, -16], [-14, -16], [-2, 0]]) cone(x, z);
  // east: control tower and the helipad with a hovering helicopter
  tower(44, 24);
  helicopter(46, 13, 4);
  windsock(34, -30);
  // west: the hangar
  hangar(-58, -18);
  // the runway: one jet lined up at the west end, one rolling down the middle
  jet(-34, -46, 'e', 28, C.jetBlue, C.jetBlue);
  jet(18, -46, 'e', 28, C.bag5, C.jetTeal);
  // runway edge lights and a few lights at each end
  for (let x = -56; x <= 56; x += 6) { set(x, 0, -53, C.runLight); set(x, 0, -39, C.runLight); }
  for (const x of [-58, 58]) for (let z = -51; z <= -41; z += 2) set(x, 0, z, x < 0 ? C.bag3 : C.jetRed);
  // a little plane floating in to land at the east end, and one more climbing out west
  propPlane(50, 11, -46, 'w');
  propPlane(-50, 22, -30, 'w');
  // grass bits: trees by the lot, bushes along the taxiways, a few birds
  for (const [x, z] of [[-54, 40], [-54, 50], [44, 40], [44, 52], [52, 30], [-56, 24], [54, -14], [-24, -30], [10, -30]]) tree(x, z);
  for (let n = 0; n < 30; n++) {
    const x = Math.round((rnd() - 0.5) * 114), z = Math.round(-36 + rnd() * 12);
    if (Math.abs(x - 44) < 6 || Math.abs(x + 46) < 6 || Math.abs(x - 34) < 3) continue;
    set(x, 0, z, rnd() < 0.5 ? C.flowerPink : C.petal);
  }
  for (const [x, k, z] of [[-20, 20, 0], [10, 24, -20], [30, 18, 14]]) { set(x, k, z, C.gull); set(x + 1, k, z, C.gull); set(x - 1, k + 1, z, C.gullWing); set(x + 2, k + 1, z, C.gullWing); }

  return B.finalize();
}
