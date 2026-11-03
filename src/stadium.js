// Stadium map: a ballpark seen from behind home plate. The diamond is laid out diagonally on
// the square board, so home plate sits near the bottom of the screen and second base toward
// the back, with mowed stripes in the outfield, packed stands down both lines, outfield
// bleachers, a scoreboard, light towers, players in position, and a few ballpark treats.
import { C } from './palette.js';
import { makeBuilder, hash } from './builder.js';

const HALF = 60;
const HOME = { x: 0, z: 44 };
const START = { x: 0, z: 50 };
const R2 = Math.SQRT1_2;
const BASE = 22;    // distance between bases
const WALL = 74;    // outfield wall distance from home
const INFIELD = 33; // edge of the infield dirt

export const STADIUM = {
  id: 'stadium', name: 'Stadium', tagline: 'Opening day. Sold out. Play ball!',
  win: 'The ballpark is gone. Rain delay, permanently.',
  start: START, half: HALF,
  ground: '#5fb85a', skirt: '#3f8a4f', sky: '#d2eaf8', bg: 'linear-gradient(#b8ddf4, #e4f2fa 60%, #d2eaf8)',
  hemiSky: 0xf0f8ff, hemiGround: 0x6aa85e, sun: 0xfff2dc, caustics: false, bubbles: false, stripes: true,
  fogFar: 6,
  build: buildStadium,
};

// ballpark coordinates: uF = along the first-base line, uT = along the third-base line
function park(x, z) {
  const rx = x - HOME.x, rz = z - HOME.z;
  return { uF: (rx - rz) * R2, uT: (-rx - rz) * R2, d: Math.hypot(rx, rz) };
}
// a point given distance along a base line and distance out from it (side = +1 first, -1 third)
function fromLine(side, u, v) {
  const dx = side * R2, dz = -R2, nx = side * R2, nz = R2;
  return [Math.round(HOME.x + u * dx + v * nx), Math.round(HOME.z + u * dz + v * nz)];
}

export function buildStadium() {
  const B = makeBuilder(1908);
  const { set, box, ellipsoid, cylY, line, chunky, rnd } = B;
  const crowd = [C.shirt, C.teamRed, C.teamNavy, C.awningYellow, C.trim, C.foamFinger, C.banner, C.leaf, C.flowerPurple];

  // ---------- the field ----------
  for (let x = -59; x <= 59; x++)
    for (let z = -59; z <= 59; z++) {
      const { uF, uT, d } = park(x, z);
      const fair = uF >= -0.5 && uT >= -0.5;
      const innerGrass = uF > 3 && uF < BASE - 3 && uT > 3 && uT < BASE - 3;
      const basePath = (Math.abs(uT) <= 1.5 && uF >= 0 && uF <= BASE + 2) || (Math.abs(uF) <= 1.5 && uT >= 0 && uT <= BASE + 2) ||
        (Math.abs(uT - BASE) <= 1.5 && uF >= 0 && uF <= BASE + 2) || (Math.abs(uF - BASE) <= 1.5 && uT >= 0 && uT <= BASE + 2);
      const dirt = (fair && d <= INFIELD && !innerGrass) || d <= 6 || basePath;
      if (dirt) set(x, 0, z, hash(x, z, 1) < 0.25 ? C.dirtDark : C.dirt);
      // chalk foul lines all the way to the wall
      if (d <= WALL && ((Math.abs(uT) < 0.5 && uF >= 0) || (Math.abs(uF) < 0.5 && uT >= 0))) set(x, 0, z, C.chalk);
      // outfield wall: green padding with a yellow top
      if (fair && d >= WALL && d < WALL + 2) for (let k = 0; k <= 6; k++) set(x, k, z, k === 6 ? C.mustard : C.padGreen);
      // stands down both lines: tiers rise away from the field, crowd on top
      const side = uT < -0.5 && uF > 0 ? 1 : uF < -0.5 && uT > 0 ? -1 : 0;
      if (side) {
        const u = side === 1 ? uF : uT, v = side === 1 ? -uT : -uF;
        if (v >= 6 && v < 7 && u > 2 && u < 70) { set(x, 0, z, C.concreteDark); set(x, 1, z, C.concreteDark); set(x, 2, z, C.teamNavy); }
        if (v >= 8 && v < 21 && u > 4 && u < 70) {
          const tier = 1 + Math.floor((v - 8) / 1.4);
          const aisle = Math.abs(((u + 2) % 12) - 6) < 0.8;
          for (let k = 0; k < tier; k++) {
            const top = k === tier - 1;
            set(x, k, z, !top || aisle ? C.concrete : hash(x, z, 7) < 0.3 ? C.seatBlue : crowd[Math.floor(hash(z, x, 9) * crowd.length)]);
          }
        }
      }
      // seats behind home plate, behind a padded backstop
      if (uF < -0.5 && uT < -0.5) {
        if (d >= 9 && d < 10) for (let k = 0; k < 4; k++) set(x, k, z, k === 3 ? C.mustard : C.padGreen);
        if (d >= 11 && d < 18) {
          const tier = 1 + Math.floor((d - 11) / 1.4);
          for (let k = 0; k < tier; k++) set(x, k, z, k < tier - 1 ? C.concrete : hash(x, z, 7) < 0.3 ? C.seatBlue : crowd[Math.floor(hash(z, x, 9) * crowd.length)]);
        }
      }
      // outfield bleachers beyond the wall (the middle is kept for the scoreboard)
      if (fair && d >= WALL + 4 && d < WALL + 18 && Math.abs(x) > 16) {
        const tier = 1 + Math.floor((d - WALL - 4) / 1.6);
        for (let k = 0; k < tier; k++) set(x, k, z, k < tier - 1 ? C.concrete : hash(x, z, 7) < 0.35 ? C.seatBlue : crowd[Math.floor(hash(z, x, 9) * crowd.length)]);
      }
    }
  chunky(-59, 0, -59, 59, 14, 59, 2);

  // pitcher's mound, rubber, bases, home plate, batter's boxes
  cylY(0, 30, 0, 1, 3.4, C.dirt); cylY(0, 30, 1, 1, 2, C.dirtDark);
  set(0, 2, 30, C.chalk); set(-1, 2, 30, C.chalk);
  const baseAt = (u1, u2) => {
    const x = HOME.x + (u1 - u2) * R2, z = HOME.z - (u1 + u2) * R2;
    box(Math.round(x) - 1, 1, Math.round(z) - 1, 2, 1, 2, C.chalk);
  };
  baseAt(BASE, 0); baseAt(BASE, BASE); baseAt(0, BASE);
  set(0, 1, 44, C.chalk); set(-1, 1, 44, C.chalk); set(0, 1, 43, C.chalk); set(-1, 1, 43, C.chalk); set(0, 1, 45, C.chalk);
  for (const bx of [-5, 2]) for (let a = 0; a < 3; a++) for (let b = 0; b < 5; b++) if (a === 0 || a === 2 || b === 0 || b === 4) set(bx + a, 1, 42 + b, C.chalk);

  // foul poles
  for (const side of [1, -1]) {
    const [px, pz] = fromLine(side, WALL + 1, 0);
    for (let k = 0; k < 20; k++) set(px, k, pz, C.mustard);
    for (let k = 12; k < 19; k++) set(px + side, k, pz, C.mustard);
  }
  // pennants along the top of the outfield wall
  for (let a = 0; a <= 8; a++) {
    const t = Math.PI * 0.25 + (a / 8) * Math.PI * 0.5;
    const px = Math.round(HOME.x + Math.cos(t) * (WALL + 1)), pz = Math.round(HOME.z - Math.sin(t) * (WALL + 1));
    for (let k = 7; k < 11; k++) set(px, k, pz, C.anchor);
    for (let b = 1; b <= 3; b++) set(px + b, 10 - Math.floor(b / 2), pz, a % 2 ? C.teamRed : C.teamNavy);
  }

  // ---------- dugouts ----------
  for (const side of [1, -1]) {
    for (let u = 8; u <= 20; u++)
      for (let v = 2; v <= 4.6; v += 0.5) {
        const [x, z] = fromLine(side, u, v);
        const back = v >= 4;
        if (back) for (let k = 0; k < 3; k++) set(x, k, z, C.concreteDark);
        set(x, 3, z, side === 1 ? C.teamNavy : C.teamRed);
      }
  }

  // ---------- players ----------
  const player = (x, z, shirt, pants, cap, opts = {}) => {
    const b = opts.base || 0, crouch = opts.crouch ? 1 : 0;
    if (!crouch) { set(x, b, z, pants); set(x + 1, b, z, pants); }
    set(x, b + 1 - crouch, z, pants); set(x + 1, b + 1 - crouch, z, pants);
    box(x, b + 2 - crouch, z, 2, 2, 1, shirt);
    set(x - 1, b + 3 - crouch, z, shirt); set(x + 2, b + 3 - crouch, z, shirt);
    box(x, b + 4 - crouch, z, 2, 1, 1, opts.skin || C.skin);
    box(x, b + 5 - crouch, z, 2, 1, 1, cap);
    set(x, b + 5 - crouch, z + (opts.facing || 1), cap); set(x + 1, b + 5 - crouch, z + (opts.facing || 1), cap); // cap brim
    if (opts.glove) set(x + 2, b + 2 - crouch, z, C.barrel);
    if (opts.bat) line(x + 2, b + 4, z, x + 4, b + 8, z - 1, C.wood);
  };
  const home = [C.trim, C.trim, C.teamNavy], away = [C.awningWhite, C.teamRed, C.teamRed];
  player(-1, 30, ...home, { base: 2, glove: true });                         // pitcher
  player(-1, 47, C.teamNavy, C.teamNavy, C.teamNavy, { crouch: true, glove: true, skin: C.skin2 }); // catcher
  player(-5, 44, ...away, { bat: true, facing: -1 });                         // batter
  player(-1, 50, C.board, C.concreteDark, C.board, { skin: C.skin2 });       // umpire
  for (const [x, z, sk] of [[17, 24, C.skin], [6, 12, C.skin2], [-8, 12, C.skin], [-18, 24, C.skin2], [-30, -4, C.skin], [-1, -16, C.skin2], [29, -4, C.skin]])
    player(x, z, ...home, { glove: true, skin: sk });
  // the visiting team sitting in their dugout
  for (const u of [11, 14, 17]) { const [x, z] = fromLine(-1, u, 3); player(x, z, ...away, { crouch: true }); }

  // ---------- scoreboard ----------
  box(-12, 0, -52, 2, 9, 2, C.concrete); box(10, 0, -52, 2, 9, 2, C.concrete);
  box(-16, 9, -53, 32, 13, 3, C.board);
  chunky(-16, 9, -53, 15, 21, -51, 4);
  const FONT = {
    V: ['10001', '10001', '10001', '10001', '01010', '01010', '00100'],
    O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
    I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
    D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  };
  'VOID'.split('').forEach((ch, c) => FONT[ch].forEach((row, r) => [...row].forEach((bit, a) => { if (bit === '1') set(-13 + c * 7 + a, 19 - r, -50, C.lit); })));
  for (let x = -15; x <= 14; x += 2) { set(x, 21, -50, C.lit); set(x, 10, -50, C.awningRed); }

  // ---------- light towers ----------
  const tower = (x, z, faceX, faceZ) => {
    box(x, 0, z, 2, 30, 2, C.concrete);
    for (let a = -3; a <= 3; a++) for (let k = 30; k < 34; k++) set(x + (faceZ ? a : 0) + (faceX ? faceX : 0), k, z + (faceX ? a : 0) + (faceZ ? faceZ : 0), (a + k) % 2 ? C.lit : C.trim);
  };
  { const [x, z] = fromLine(1, 40, 23); tower(x, z, -1, 0); }
  { const [x, z] = fromLine(-1, 40, 23); tower(x, z, 1, 0); }
  tower(30, -46, 0, 1); tower(-32, -46, 0, 1);

  // ---------- ballpark treats ----------
  // hot dog cart on the third-base concourse
  {
    const [x, z] = fromLine(-1, 30, 24);
    box(x, 1, z, 6, 3, 3, C.trim); for (const a of [0, 5]) set(x + a, 0, z + 1, C.tire);
    for (let a = -1; a <= 6; a++) for (let b = -1; b <= 3; b++) set(x + a, 7, z + b, (a + 9) % 2 ? C.teamRed : C.awningYellow);
    for (const [a, b] of [[0, 0], [5, 0], [0, 2], [5, 2]]) for (let k = 4; k < 7; k++) set(x + a, k, z + b, C.anchor);
    // the giant hot dog on top
    for (let a = -1; a <= 7; a++) { set(x + a, 8, z + 1, C.bun); set(x + a, 9, z, C.bun); set(x + a, 9, z + 2, C.bun); }
    for (let a = -2; a <= 8; a++) set(x + a, 9, z + 1, C.teamRed);
    for (let a = -1; a <= 7; a++) set(x + a, 10, z + 1, a % 2 ? C.mustard : C.teamRed);
  }
  // a giant baseball on a plinth on the first-base concourse
  {
    const [x, z] = fromLine(1, 52, 25);
    box(x - 3, 0, z - 3, 7, 2, 7, C.concreteDark);
    ellipsoid(x, 7, z, 4.6, 4.6, 4.6, (i, k, j) => {
      const a = Math.atan2(j - z, i - x), seam = Math.sin(a * 2) * 2.2;
      return Math.abs(k - 7 - seam) < 0.6 && (Math.abs(i - x) + Math.abs(j - z)) % 2 < 1 ? C.teamRed : C.chalk;
    });
    chunky(x - 5, 2, z - 5, x + 5, 12, z + 5, 2);
  }
  // a giant foam finger behind the seats on the third-base side
  {
    const [x, z] = fromLine(-1, 8, 26);
    box(x, 0, z, 5, 2, 2, C.teamNavy);              // wristband
    box(x, 2, z, 5, 5, 2, C.foamFinger);            // hand
    box(x + 1, 7, z, 2, 6, 2, C.foamFinger);        // index finger pointing up: we're number one
    box(x + 3, 5, z - 1, 2, 2, 1, C.foamFinger);    // thumb
    set(x + 1, 4, z + 2, C.chalk); set(x + 2, 4, z + 2, C.chalk); set(x + 2, 5, z + 2, C.chalk); set(x + 2, 3, z + 2, C.chalk); // "1"
  }
  // trees and a few flower beds round the outside
  for (let n = 0; n < 24; n++) {
    const x = Math.round((rnd() - 0.5) * 112), z = Math.round(30 + rnd() * 28);
    const { uF, uT, d } = park(x, z);
    if (d < 20 || (uT < -0.5 && uF > 0 && -uT < 30) || (uF < -0.5 && uT > 0 && -uF < 30)) continue;
    box(x, 0, z, 1, 3, 1, C.trunk);
    ellipsoid(x, 4, z, 2, 1.8, 2, (i, k, j) => (hash(i, k, j) < 0.5 ? C.leaf : C.leaf2));
  }

  return B.finalize();
}
