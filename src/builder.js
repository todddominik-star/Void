// Shared voxel builder for every map.
// Grid: i = x (east), j = z (south, toward the camera), k = height (0 sits on the ground).
// Maps place 1x1x1 cells with colours, then mark "chunky" regions where solid runs of
// same-coloured cells are merged into big 2x and 4x blocks.

export const GRID_HALF = 64; // occupancy grid spans -64..63
export const GRID_K = 48;    // max height

export function hash(a, b, c) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function makeBuilder(seed = 12345) {
  const cells = new Map(); // key -> colour index
  const regions = [];      // chunky regions
  let s = seed;
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const key = (i, j, k) => ((i + GRID_HALF) * 128 + (j + GRID_HALF)) * GRID_K + k;
  const inside = (i, k, j) => k >= 0 && k < GRID_K - 2 && i > -GRID_HALF + 1 && i < GRID_HALF - 2 && j > -GRID_HALF + 1 && j < GRID_HALF - 2;
  const colOf = (col, i, k, j) => (typeof col === 'function' ? col(i, k, j) : col);

  const set = (i, k, j, col) => {
    i = Math.round(i); k = Math.round(k); j = Math.round(j);
    if (!inside(i, k, j)) return;
    const c = colOf(col, i, k, j);
    if (c === undefined || c === null) return;
    cells.set(key(i, j, k), c);
  };
  const del = (i, k, j) => cells.delete(key(Math.round(i), Math.round(j), Math.round(k)));
  const has = (i, k, j) => cells.has(key(i, j, k));

  // Solid or hollow box. hollow = wall thickness (0 = solid).
  const box = (x0, k0, z0, w, h, d, col, hollow = 0) => {
    for (let i = x0; i < x0 + w; i++)
      for (let k = k0; k < k0 + h; k++)
        for (let j = z0; j < z0 + d; j++) {
          if (hollow) {
            const t = hollow;
            const inX = i >= x0 + t && i < x0 + w - t, inZ = j >= z0 + t && j < z0 + d - t, inK = k >= k0 + 1 && k < k0 + h - 1;
            if (inX && inZ && inK) continue;
          }
          set(i, k, j, colOf(col, i, k, j));
        }
  };
  const ellipsoid = (cx, ck, cz, rx, ry, rz, col, shell = 0, minK = -99) => {
    for (let i = Math.floor(cx - rx); i <= Math.ceil(cx + rx); i++)
      for (let k = Math.max(minK, Math.floor(ck - ry)); k <= Math.ceil(ck + ry); k++)
        for (let j = Math.floor(cz - rz); j <= Math.ceil(cz + rz); j++) {
          const d = ((i - cx) / rx) ** 2 + ((k - ck) / ry) ** 2 + ((j - cz) / rz) ** 2;
          if (d > 1) continue;
          if (shell > 0 && rx > shell && ry > shell && rz > shell) {
            const d2 = ((i - cx) / (rx - shell)) ** 2 + ((k - ck) / (ry - shell)) ** 2 + ((j - cz) / (rz - shell)) ** 2;
            if (d2 < 1) continue;
          }
          set(i, k, j, colOf(col, i, k, j));
        }
  };
  const cylY = (cx, cz, k0, h, r, col, shell = 0) => {
    for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
      for (let j = Math.floor(cz - r); j <= Math.ceil(cz + r); j++) {
        const d = Math.hypot(i - cx, j - cz);
        if (d > r) continue;
        for (let k = k0; k < k0 + h; k++) {
          if (shell > 0 && d < r - shell && k > k0) continue;
          set(i, k, j, colOf(col, i, k, j));
        }
      }
  };
  const cylX = (x0, len, ck, cz, r, col) => {
    for (let i = x0; i < x0 + len; i++)
      for (let k = Math.floor(ck - r); k <= Math.ceil(ck + r); k++)
        for (let j = Math.floor(cz - r); j <= Math.ceil(cz + r); j++)
          if (Math.hypot(k - ck, j - cz) <= r) set(i, k, j, colOf(col, i, k, j));
  };
  const cylZ = (z0, len, ck, cx, r, col) => {
    for (let j = z0; j < z0 + len; j++)
      for (let k = Math.floor(ck - r); k <= Math.ceil(ck + r); k++)
        for (let i = Math.floor(cx - r); i <= Math.ceil(cx + r); i++)
          if (Math.hypot(k - ck, i - cx) <= r) set(i, k, j, colOf(col, i, k, j));
  };
  const line = (x0, k0, z0, x1, k1, z1, col) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(k1 - k0), Math.abs(z1 - z0), 1);
    for (let t = 0; t <= n; t++) set(x0 + ((x1 - x0) * t) / n, k0 + ((k1 - k0) * t) / n, z0 + ((z1 - z0) * t) / n, col);
  };
  // Inclusive bounds. max = biggest block size allowed (2 or 4).
  const chunky = (x0, k0, z0, x1, k1, z1, max = 4) => {
    const R = Math.round;
    regions.push({ x0: R(Math.min(x0, x1)), k0: R(Math.min(k0, k1)), z0: R(Math.min(z0, z1)), x1: R(Math.max(x0, x1)), k1: R(Math.max(k0, k1)), z1: R(Math.max(z0, z1)), max });
  };

  // Turn cells into pieces: [i, j, k, size, colour] where (i, j, k) is the low corner.
  const finalize = () => {
    const used = new Set();
    const pieces = [];
    const tryBlock = (i, j, k, sz) => {
      const counts = new Map();
      for (let a = 0; a < sz; a++)
        for (let b = 0; b < sz; b++)
          for (let c = 0; c < sz; c++) {
            const kk = key(i + a, j + c, k + b);
            const col = cells.get(kk);
            if (col === undefined || used.has(kk)) return false;
            counts.set(col, (counts.get(col) || 0) + 1);
          }
      let best = -1, bc = 0;
      for (const [col, n] of counts) if (n > bc) { bc = n; best = col; }
      if (bc / (sz * sz * sz) < 0.55) return false;
      for (let a = 0; a < sz; a++) for (let b = 0; b < sz; b++) for (let c = 0; c < sz; c++) used.add(key(i + a, j + c, k + b));
      pieces.push(i, j, k, sz, best);
      return true;
    };
    for (const sz of [4, 2])
      for (const r of regions) {
        if (sz > r.max) continue;
        for (let k = r.k0; k + sz - 1 <= r.k1; k++)
          for (let j = r.z0; j + sz - 1 <= r.z1; j++)
            for (let i = r.x0; i + sz - 1 <= r.x1; i++) tryBlock(i, j, k, sz);
      }
    for (const [kk, col] of cells) {
      if (used.has(kk)) continue;
      const k = kk % GRID_K, rest = (kk - k) / GRID_K;
      const j = (rest % 128) - GRID_HALF, i = Math.floor(rest / 128) - GRID_HALF;
      pieces.push(i, j, k, 1, col);
    }
    return pieces;
  };

  return { set, del, has, box, ellipsoid, cylY, cylX, cylZ, line, chunky, finalize, rnd, hash };
}
