import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { COLORS, GROUPS } from './palette.js';
import { GRID_HALF, GRID_K, PLAY_EDGE, PLAY_DIAG, CORNER_DIAG } from './builder.js';
import { FARM } from './farm.js';
import { REEF } from './reef.js';
import { VALLEY } from './valley.js';
import { CASTLE } from './castle.js';
import { STADIUM } from './stadium.js';
import { BEACH } from './beach.js';
import { HAUNTED } from './haunted.js';
import { AIRPORT } from './airport.js';

const MAPS = { farm: FARM, reef: REEF, valley: VALLEY, castle: CASTLE, stadium: STADIUM, beach: BEACH, haunted: HAUNTED, airport: AIRPORT };
const MAP_ORDER = ['farm', 'reef', 'valley', 'castle', 'stadium', 'beach', 'haunted', 'airport'];

// ------------------------------------------------------------------ tuning
const RADII = [1.6, 2.1, 2.7, 3.4, 4.2, 5.2, 6.4, 7.8, 9.4]; // hole radius per size
const LEVEL_FRACTIONS = [0.012, 0.035, 0.07, 0.13, 0.21, 0.32, 0.46, 0.64]; // share of the map to reach the next size
const UNLOCK = { 1: 0, 2: 1, 4: 3 };  // block size -> level index where it can be swallowed (Size 1, 2, 4)
const VIEW_BASE = 24;                // cubes across the screen's short side before the hole is counted
const VIEW_PER_HOLE = 2.2;           // extra view per cube of hole diameter (was 4.5: zoomed out too far)
const PITCH = THREE.MathUtils.degToRad(48);
const GRAVITY = 32;
const DYN_MAX = 9000;

// ------------------------------------------------------------------ renderer
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(new THREE.Color('#cfe9f7'), 60, 160);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 400);

const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x86b46f, 1.15);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 1.75);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target);
const SUN_DIR = new THREE.Vector3(-0.55, 1, 0.45).normalize();

// ------------------------------------------------------------------ hole state
const hole = { x: 0, z: 40, r: RADII[0], rTarget: RADII[0], level: 0 };
const holeUniform = { value: new THREE.Vector3(hole.x, hole.z, hole.r) };
const timeUniform = { value: 0 };
const causticUniform = { value: 0 };
const stripeUniform = { value: 0 };
const beachUniform = { value: 0 };
const mistUniform = { value: 0 };
const airportUniform = { value: 0 };
const glowUniform = { value: 1.5 };

// ------------------------------------------------------------------ ground
const groundMat = new THREE.MeshLambertMaterial({ color: '#9fd47c' });
groundMat.onBeforeCompile = (s) => {
  s.uniforms.uHole = holeUniform;
  s.uniforms.uTime = timeUniform;
  s.uniforms.uCaustic = causticUniform;
  s.uniforms.uStripes = stripeUniform;
  s.uniforms.uBeach = beachUniform;
  s.uniforms.uMist = mistUniform;
  s.uniforms.uAirport = airportUniform;
  s.vertexShader = 'varying vec3 vWPos;\n' + s.vertexShader.replace('#include <begin_vertex>',
    '#include <begin_vertex>\n vWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  s.fragmentShader = 'uniform vec3 uHole;\nuniform float uTime;\nuniform float uCaustic;\nuniform float uStripes;\nuniform float uBeach;\nuniform float uMist;\nuniform float uAirport;\nvarying vec3 vWPos;\n' + s.fragmentShader
    .replace('void main() {', 'void main() {\n float dh = distance(vWPos.xz, uHole.xy);\n if (dh < uHole.z) discard;')
    .replace('#include <color_fragment>', `#include <color_fragment>
      vec2 t = floor(vWPos.xz / 2.0 + 0.25);
      float ch = mod(t.x + t.y, 2.0);
      diffuseColor.rgb *= mix(0.965, 1.03, ch);
      vec2 f = fract(vWPos.xz / 2.0 + 0.25);
      float g = min(min(f.x, 1.0 - f.x), min(f.y, 1.0 - f.y));
      diffuseColor.rgb *= mix(0.9 + uCaustic * 0.05, 1.0, smoothstep(0.0, 0.035, g));
      if (uStripes > 0.5) {
        // mowed lawn: wide diagonal bands, two shades of green
        float band = mod(floor((vWPos.x - vWPos.z) / 7.0), 2.0);
        diffuseColor.rgb *= mix(0.88, 1.07, band);
      }
      if (uBeach > 0.5) {
        // the sea at the back of the board, with a wobbling shoreline and lapping foam
        float shore = -16.0 + sin(vWPos.x * 0.07) * 3.0 + sin(vWPos.x * 0.19 + 1.0) * 1.5;
        float lap = shore + sin(uTime * 1.1 + vWPos.x * 0.13) * 0.6;
        float into = lap - vWPos.z;
        if (into > 0.0) {
          vec3 sea = mix(vec3(0.56, 0.87, 0.93), vec3(0.24, 0.6, 0.85), smoothstep(0.0, 26.0, into));
          float ripple = sin(vWPos.x * 0.5 + uTime * 0.8) * sin(vWPos.z * 0.6 - uTime * 0.6);
          sea += vec3(0.06) * smoothstep(0.6, 1.0, ripple);
          sea = mix(vec3(0.97, 0.99, 1.0), sea, smoothstep(0.0, 1.3, into));
          diffuseColor.rgb = sea;
        } else {
          diffuseColor.rgb *= mix(0.82, 1.0, smoothstep(0.0, 3.5, -into)); // wet sand by the water
        }
      }
      if (uAirport > 0.5) {
        // runway across the back, two taxiways down to a deep apron in front of the terminal,
        // a curbside road and a parking lot at the front
        vec3 tar = vec3(0.47, 0.49, 0.53);
        vec2 w = vWPos.xz;
        float rw = step(-52.5, w.y) * step(w.y, -39.5);
        float tx = step(abs(w.x - 44.0), 3.5) * step(-39.5, w.y) * step(w.y, -22.0);
        float tx2 = step(abs(w.x + 46.0), 3.5) * step(-39.5, w.y) * step(w.y, -22.0);
        float ap = step(abs(w.x + 2.0), 56.0) * step(-22.0, w.y) * step(w.y, 13.0);
        if (rw + tx + ap + tx2 > 0.5) {
          diffuseColor.rgb = tar * (0.97 + 0.03 * ch);
          if (rw > 0.5) {
            float cl = step(abs(w.y + 46.0), 0.35) * step(0.5, fract(w.x / 8.0)) * step(abs(w.x), 50.0);
            float edge = step(abs(abs(w.y + 46.0) - 5.6), 0.3);
            float keys = step(53.0, abs(w.x)) * step(abs(w.y + 46.0), 4.6) * step(0.5, fract(w.y / 1.6));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97), max(max(cl, edge), keys));
          } else if (tx + tx2 > 0.5) {
            float yl = step(abs(w.x - 44.0), 0.25) + step(abs(w.x + 46.0), 0.25);
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.82, 0.25), yl);
          } else {
            // yellow lead-in lines to each gate, and a service road line
            float lead = (step(abs(w.x + 24.0), 0.25) + step(abs(w.x - 4.0), 0.25) + step(abs(w.x - 32.0), 0.25)) * step(w.y, 4.0);
            float svc = step(abs(w.y - 9.0), 0.25) * step(0.5, fract(w.x / 4.0));
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.98, 0.82, 0.25), clamp(lead + svc, 0.0, 1.0));
          }
        }
        // curbside road
        if (step(abs(w.x + 2.0), 52.0) * step(29.0, w.y) * step(w.y, 35.0) > 0.5) {
          diffuseColor.rgb = vec3(0.42, 0.44, 0.48) * (0.97 + 0.03 * ch);
          float dash = step(abs(w.y - 32.0), 0.2) * step(0.5, fract(w.x / 5.0));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97), dash);
        }
        // parking lot
        if (step(abs(w.x + 4.0), 40.0) * step(37.0, w.y) * step(w.y, 59.0) > 0.5) {
          diffuseColor.rgb = vec3(0.55, 0.56, 0.6) * (0.97 + 0.03 * ch);
          float bay = step(abs(fract(w.x / 4.0) - 0.5), 0.04) * step(abs(abs(w.y - 48.0) - 6.0), 2.8);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95), bay);
        }
        // helipad
        float hp = distance(w, vec2(46.0, 4.0));
        if (hp < 6.0) {
          diffuseColor.rgb = mix(vec3(0.42, 0.44, 0.48), vec3(0.97), step(abs(hp - 5.0), 0.35));
          vec2 hq = abs(w - vec2(46.0, 4.0));
          float H = step(hq.x, 2.0) * step(hq.y, 2.4) * (step(1.4, hq.x) + step(hq.y, 0.3));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.97), clamp(H, 0.0, 1.0));
        }
      }
      if (uMist > 0.5) {
        // slow, drifting ground mist
        vec2 q = vWPos.xz * 0.06;
        float m = sin(q.x * 1.3 + uTime * 0.12 + sin(q.y * 1.7 + uTime * 0.09) * 1.5) * sin(q.y * 1.1 - uTime * 0.1 + sin(q.x * 0.9) * 1.2);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.62, 0.6, 0.78), smoothstep(0.15, 0.9, m) * 0.35);
      }
      if (uCaustic > 0.5) {
        vec2 p = vWPos.xz * 0.35;
        float c1 = sin(p.x * 1.7 + uTime * 0.9 + sin(p.y * 1.3 + uTime * 0.6) * 1.6);
        float c2 = sin(p.y * 1.9 - uTime * 0.7 + sin(p.x * 1.1 - uTime * 0.5) * 1.6);
        float c = pow(max(0.0, 1.0 - abs(c1 + c2) * 0.9), 3.0);
        diffuseColor.rgb += vec3(0.16, 0.2, 0.18) * c;
      }
      diffuseColor.rgb *= mix(0.55, 1.0, smoothstep(uHole.z, uHole.z + 0.45 + uHole.z * 0.12, dh));`);
};
const BOARD = 124;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(BOARD, BOARD, 1, 1), groundMat);
ground.rotation.x = -Math.PI / 2;
ground.position.set(-0.5, 0, -0.5);
ground.receiveShadow = true;
scene.add(ground);
const skirtMat = new THREE.MeshLambertMaterial({ color: '#7fbc63' });
{
  const h = 40; // much deeper than the hole (12), so its tube is always hidden
  const mk = (w, d, x, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skirtMat); b.position.set(x - 0.5, -h / 2 - 0.01, z - 0.5); scene.add(b); };
  mk(BOARD, 1, 0, BOARD / 2 - 0.5); mk(BOARD, 1, 0, -BOARD / 2 + 0.5);
  mk(1, BOARD, BOARD / 2 - 0.5, 0); mk(1, BOARD, -BOARD / 2 + 0.5, 0);
}

// corner triangles: a raised border the hole can't reach, so nothing is ever stranded there
const cornerMat = new THREE.MeshLambertMaterial({ color: '#7fbc63' });
for (const [ex, ez] of [[61.5, 61.5], [-62.5, 61.5], [61.5, -62.5], [-62.5, -62.5]]) {
  const L = Math.abs(ex) + Math.abs(ez) - CORNER_DIAG;
  const sx = Math.sign(ex), sz = Math.sign(ez);
  const shape = new THREE.Shape([new THREE.Vector2(ex, -ez), new THREE.Vector2(ex - sx * L, -ez), new THREE.Vector2(ex, -(ez - sz * L))]);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 1.2, bevelEnabled: false });
  const m = new THREE.Mesh(geo, cornerMat);
  m.rotation.x = -Math.PI / 2; m.receiveShadow = true; m.castShadow = true;
  scene.add(m);
}
const outsidePlay = (x, z) => Math.abs(x) > PLAY_EDGE + 0.4 || Math.abs(z) > PLAY_EDGE + 0.4 || Math.abs(x) + Math.abs(z) > PLAY_DIAG + 0.5;

// hole interior: open cylinder seen from inside + dark floor
const holeGroup = new THREE.Group();
scene.add(holeGroup);
{
  const depth = 12;
  const geo = new THREE.CylinderGeometry(1, 1, depth, 64, 6, true);
  const cols = [];
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i) / depth + 0.5;
    const v = 0.004 + 0.03 * Math.pow(y, 2.0);
    cols.push(v * 0.9, v * 0.92, v * 1.1);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  const wall = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false }));
  wall.position.y = -depth / 2;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: '#05060a', fog: false }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = -depth + 0.01;
  holeGroup.add(wall, floor);
}
// rim (scales with the hole)
const ringGroup = new THREE.Group();
holeGroup.add(ringGroup);
const rimMat = new THREE.MeshBasicMaterial({ color: '#fbf6ea', transparent: true, opacity: 0.9, depthWrite: false, fog: false });
const rim = new THREE.Mesh(new THREE.RingGeometry(1.0, 1.035, 96), rimMat);
rim.rotation.x = -Math.PI / 2; rim.position.y = 0.015;
ringGroup.add(rim);

// progress ring: drawn a fixed number of screen pixels wide just outside the hole, at every size
const progGroup = new THREE.Group();
scene.add(progGroup);
const ringMat = (color, opacity, order) => {
  const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, depthTest: false, fog: false });
  return m;
};
const outlineMat = ringMat('#2a2f45', 0.28), trackMat = ringMat('#ffffff', 0.55), fillMat = ringMat('#ffc83d', 1);
const outline = new THREE.Mesh(new THREE.BufferGeometry(), outlineMat);
const track = new THREE.Mesh(new THREE.BufferGeometry(), trackMat);
const fill = new THREE.Mesh(new THREE.BufferGeometry(), fillMat);
[outline, track, fill].forEach((m, i) => { m.rotation.x = -Math.PI / 2; m.position.y = 0.03; m.renderOrder = 10 + i; progGroup.add(m); });
const RING_PX = 3, GAP_PX = 5, EDGE_PX = 1.2;
let shownProgress = 0, builtProgress = -1, ringKey = '';
function updateRing(p) {
  // world units per screen pixel around the hole
  const px = viewShort / Math.min(window.innerWidth, window.innerHeight);
  const inner = hole.r * (1 + gulp * 0.05) + GAP_PX * px, outer = inner + RING_PX * px;
  const key = `${inner.toFixed(3)}|${outer.toFixed(3)}`;
  if (key !== ringKey) {
    ringKey = key; builtProgress = -1;
    outline.geometry.dispose(); outline.geometry = new THREE.RingGeometry(inner - EDGE_PX * px, outer + EDGE_PX * px, 160);
    track.geometry.dispose(); track.geometry = new THREE.RingGeometry(inner, outer, 160);
    progGroup.userData.inner = inner; progGroup.userData.outer = outer;
  }
  if (Math.abs(p - builtProgress) < 0.002) return;
  builtProgress = p;
  const len = Math.max(0.001, p * Math.PI * 2);
  fill.geometry.dispose();
  fill.geometry = new THREE.RingGeometry(progGroup.userData.inner, progGroup.userData.outer, 160, 1, Math.PI / 2 - len, len);
}

// ------------------------------------------------------------------ bubbles (reef only)
const BUBBLES = 70;
const bubbleMesh = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.16, 8, 6),
  new THREE.MeshBasicMaterial({ color: '#eafaff', transparent: true, opacity: 0.55, depthWrite: false }),
  BUBBLES);
bubbleMesh.frustumCulled = false;
scene.add(bubbleMesh);
const bub = Array.from({ length: BUBBLES }, () => ({ x: 0, y: 0, z: 0, s: 1, v: 1, ph: Math.random() * 6 }));
function resetBubble(b, anywhere) {
  const spread = Math.max(12, camDist * 0.9);
  b.x = camTarget.x + (Math.random() - 0.5) * spread * 1.6;
  b.z = camTarget.z + (Math.random() - 0.5) * spread * 1.4;
  b.y = anywhere ? Math.random() * 18 : 0;
  b.s = 0.5 + Math.random() * 1.1; b.v = 1.2 + Math.random() * 1.6;
}

// ------------------------------------------------------------------ beacons over the last few pieces
const BEACONS = 80;
const beaconMesh = new THREE.InstancedMesh(
  new THREE.OctahedronGeometry(0.42, 0),
  new THREE.MeshBasicMaterial({ color: '#ff9b3d', fog: false }), BEACONS);
beaconMesh.frustumCulled = false; beaconMesh.count = 0;
scene.add(beaconMesh);
function updateBeacons(t) {
  if (!playing || remainingPieces > BEACONS) { beaconMesh.count = 0; return; }
  let c = 0;
  const s = Math.max(0.7, camDist / 48);
  for (let n = 0; n < N && c < BEACONS; n++) {
    if (state[n] === 3 || state[n] === 1) continue; // only pieces still waiting on the board
    if (Math.hypot(cx[n] - hole.x, cz[n] - hole.z) < hole.r) continue;
    const top = cy[n] + sz[n] / 2;
    mtx.makeRotationY(t * 2 + n);
    mtx.scale(scl.set(s, s * 1.4, s));
    mtx.setPosition(cx[n], top + 1.2 * s + Math.sin(t * 3 + n) * 0.35 * s, cz[n]);
    beaconMesh.setMatrixAt(c++, mtx);
  }
  beaconMesh.count = c;
  beaconMesh.instanceMatrix.needsUpdate = true;
}

// ------------------------------------------------------------------ cubes
function chamferedCube(c = 0.1) {
  const a = 0.5 - c, b = 0.5, pts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
    pts.push(new THREE.Vector3(sx * a, sy * a, sz * b), new THREE.Vector3(sx * a, sy * b, sz * a), new THREE.Vector3(sx * b, sy * a, sz * a));
  }
  return new ConvexGeometry(pts);
}
const cubeGeo = chamferedCube(0.1);
const cubeMat = new THREE.MeshLambertMaterial();
cubeMat.onBeforeCompile = (s) => {
  s.uniforms.uGlow = glowUniform;
  s.fragmentShader = 'uniform float uGlow;\n' + s.fragmentShader.replace('#include <opaque_fragment>', '#include <opaque_fragment>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n if (vColor.r > 1.5) gl_FragColor.rgb = pow(vColor.rgb - 2.0, vec3(1.6)) * uGlow;\n#endif');
};
const dynMat = new THREE.MeshLambertMaterial();
dynMat.onBeforeCompile = (s) => {
  s.uniforms.uGlow = glowUniform;
  s.vertexShader = 'varying float vWY;\n' + s.vertexShader.replace('#include <project_vertex>',
    '#include <project_vertex>\n vWY = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;');
  s.fragmentShader = 'uniform float uGlow;\nvarying float vWY;\n' + s.fragmentShader.replace('#include <opaque_fragment>',
    '#include <opaque_fragment>\n#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )\n if (vColor.r > 1.5) gl_FragColor.rgb = pow(vColor.rgb - 2.0, vec3(1.6)) * uGlow;\n#endif\n gl_FragColor.rgb *= clamp(1.0 + vWY * 0.28, 0.0, 1.0);');
};
const dynMesh = new THREE.InstancedMesh(cubeGeo, dynMat, DYN_MAX);
dynMesh.castShadow = true; dynMesh.receiveShadow = true; dynMesh.frustumCulled = false;
dynMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
dynMesh.setColorAt(0, new THREE.Color('#fff'));
dynMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
dynMesh.count = 0;
scene.add(dynMesh);

// occupancy grid for static pieces (stores piece id + 1 in every cell a piece covers)
const GW = GRID_HALF * 2, GO = GRID_HALF, GK = GRID_K;
const occ = new Int32Array(GW * GW * GK);
const oIdx = (i, j, k) => ((i + GO) * GW + (j + GO)) * GK + k;
const inGrid = (i, j, k) => i >= -GO && i < GO && j >= -GO && j < GO && k >= 0 && k < GK;

// per-world state
let world = FARM, N = 0;
let captured, restKey, spillCount, cx, cy, cz, vx, vy, vz, rx, ry, rz, wx, wy, wz, gi, gj, gk, sz, colR, colG, colB, colIdx, state, visitStamp, scanStamp, baseMatrixDirty;
let staticMesh = null;
let totalVol = 0, eatenVol = 0, remainingPieces = 0, thresholds = [];
const groupRemaining = {};
const active = [];
const wobble = new Map(); // piece id -> seconds left
let staticDirtyMin = Infinity, staticDirtyMax = -1;
let stamp = 1, scanTick = 1;
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const tmpC = new THREE.Color();
const mtx = new THREE.Matrix4(), quat = new THREE.Quaternion(), eul = new THREE.Euler(), pos = new THREE.Vector3(), scl = new THREE.Vector3();

function loadWorld(id) {
  world = MAPS[id] || FARM;
  try { localStorage.setItem('void-map', world.id); } catch (e) {}
  // look and light
  groundMat.color.set(world.ground);
  skirtMat.color.set(world.skirt);
  cornerMat.color.set(world.skirt).multiplyScalar(0.92);
  scene.fog.color.set(world.sky);
  hemi.color.setHex(world.hemiSky); hemi.groundColor.setHex(world.hemiGround);
  sun.color.setHex(world.sun);
  hemi.intensity = world.hemiI ?? 1.15; sun.intensity = world.sunI ?? 1.75;
  mistUniform.value = world.mist ? 1 : 0;
  airportUniform.value = world.airport ? 1 : 0;
  glowUniform.value = world.glow ?? 1.5;
  causticUniform.value = world.caustics ? 1 : 0;
  stripeUniform.value = world.stripes ? 1 : 0;
  beachUniform.value = world.beach ? 1 : 0;
  bubbleMesh.visible = !!world.bubbles;
  document.body.style.background = world.bg;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', world.sky);

  // pieces, smallest first so big blocks sit together at the end of the instance list
  const raw = world.build();
  const order = [];
  for (let p = 0; p < raw.length; p += 5) order.push(p);
  order.sort((a, b) => raw[a + 3] - raw[b + 3]);
  N = order.length;
  const F = () => new Float32Array(N);
  cx = F(); cy = F(); cz = F(); vx = F(); vy = F(); vz = F(); rx = F(); ry = F(); rz = F(); wx = F(); wy = F(); wz = F();
  colR = F(); colG = F(); colB = F();
  gi = new Int16Array(N); gj = new Int16Array(N); gk = new Int16Array(N);
  captured = new Uint8Array(N);
  spillCount = new Uint8Array(N);
  restKey = new Int32Array(N).fill(-1);
  pileH.clear(); pileList.clear();
  sz = new Uint8Array(N); colIdx = new Uint8Array(N); state = new Uint8Array(N);
  visitStamp = new Int32Array(N); scanStamp = new Int32Array(N);
  occ.fill(0);
  active.length = 0; wobble.clear();
  Object.keys(GROUPS).forEach((g) => (groupRemaining[g] = 0));
  totalVol = 0;
  const availVol = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let n = 0; n < N; n++) {
    const p = order[n];
    const i = raw[p], j = raw[p + 1], k = raw[p + 2], s = raw[p + 3], c = raw[p + 4];
    gi[n] = i; gj[n] = j; gk[n] = k; sz[n] = s; colIdx[n] = c;
    cx[n] = i + (s - 1) / 2; cy[n] = k + s / 2; cz[n] = j + (s - 1) / 2;
    for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) for (let d = 0; d < s; d++)
      if (inGrid(i + a, j + d, k + b)) occ[oIdx(i + a, j + d, k + b)] = n + 1;
    tmpC.set(COLORS[c].hex);
    const h = Math.sin(n * 12.9898 + k * 78.233) * 43758.5453;
    const jitter = (s > 1 ? 0.97 : 0.94) + (h - Math.floor(h)) * (s > 1 ? 0.06 : 0.1);
    colR[n] = tmpC.r * jitter; colG[n] = tmpC.g * jitter; colB[n] = tmpC.b * jitter;
    if (COLORS[c].glow) { colR[n] = tmpC.r + 2; colG[n] = tmpC.g + 2; colB[n] = tmpC.b + 2; } // self-lit
    const v = s * s * s;
    groupRemaining[COLORS[c].group] += v;
    totalVol += v;
    for (let L = UNLOCK[s]; L < availVol.length; L++) availVol[L] += v;
  }
  eatenVol = 0; remainingPieces = N;
  // size-up targets: a share of the whole map, but never more than what can be eaten at that size
  thresholds = (world.levels || LEVEL_FRACTIONS).map((f, L) => Math.round(Math.min(f * totalVol, availVol[L] * 0.7)));
  for (let L = 1; L < thresholds.length; L++) thresholds[L] = Math.max(thresholds[L], thresholds[L - 1] + 1);

  if (staticMesh) { scene.remove(staticMesh); staticMesh.dispose(); }
  staticMesh = new THREE.InstancedMesh(cubeGeo, cubeMat, N);
  staticMesh.castShadow = true; staticMesh.receiveShadow = true; staticMesh.frustumCulled = false;
  for (let n = 0; n < N; n++) {
    setBaseMatrix(n);
    staticMesh.setColorAt(n, tmpC.setRGB(colR[n], colG[n], colB[n]));
  }
  staticMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(staticMesh);
  staticDirtyMin = Infinity; staticDirtyMax = -1;

  // reset the hole
  hole.x = world.start.x; hole.z = world.start.z; prevHX = hole.x; prevHZ = hole.z;
  hole.level = 0; hole.r = hole.rTarget = RADII[0];
  shownProgress = 0; builtProgress = -1; ringKey = ''; flashT = 0;
  won = false; playing = false; nextUnlockToast = 0;
  updateCamera(0, true);
  bub.forEach((b) => resetBubble(b, true));
  updateHUD();
}
function setBaseMatrix(n) {
  const s = sz[n];
  mtx.makeScale(s, s, s);
  mtx.setPosition(cx[n], cy[n], cz[n]);
  staticMesh.setMatrixAt(n, mtx);
}
function markDirty(n) {
  if (n < staticDirtyMin) staticDirtyMin = n;
  if (n > staticDirtyMax) staticDirtyMax = n;
}
function hideStatic(n) { staticMesh.setMatrixAt(n, ZERO); markDirty(n); }
function clearCells(n) {
  const s = sz[n];
  for (let a = 0; a < s; a++) for (let b = 0; b < s; b++) for (let d = 0; d < s; d++)
    if (inGrid(gi[n] + a, gj[n] + d, gk[n] + b)) occ[oIdx(gi[n] + a, gj[n] + d, gk[n] + b)] = 0;
}

const releasedThisFrame = [];
function release(n, inward) {
  if (state[n] !== 0) return;
  clearCells(n);
  wobble.delete(n);
  hideStatic(n);
  state[n] = 1;
  captured[n] = inward ? 1 : 0;
  const dx = hole.x - cx[n], dz = hole.z - cz[n], d = Math.hypot(dx, dz) || 1;
  // cubes sitting on the ground get a gentle roll toward the middle; cubes higher up a stack
  // just drop straight down, so towers fall as a stack instead of bursting apart
  const low = gk[n] < 1;
  const s = inward && low ? 0.5 + Math.random() * 0.6 : 0;
  const jig = low ? 0.3 : 0.04;
  vx[n] = (dx / d) * s + (Math.random() - 0.5) * jig;
  vz[n] = (dz / d) * s + (Math.random() - 0.5) * jig;
  vy[n] = low ? Math.random() * 0.3 : 0;
  const spin = (sz[n] > 1 ? 0.45 : 1) * (low ? 0.6 : 0.12);
  wx[n] = (Math.random() - 0.5) * 7 * spin; wy[n] = (Math.random() - 0.5) * 4 * spin; wz[n] = (Math.random() - 0.5) * 7 * spin;
  rx[n] = ry[n] = rz[n] = 0;
  if (active.length < DYN_MAX) active.push(n);
  else consume(n);
  releasedThisFrame.push(n);
}
function consume(n) {
  if (state[n] === 0) { clearCells(n); hideStatic(n); }
  pileUnregister(n);
  state[n] = 3;
  const v = sz[n] * sz[n] * sz[n];
  eatenVol += v; remainingPieces--;
  groupRemaining[COLORS[colIdx[n]].group] -= v;
  onEat(v, sz[n]);
}

// --- support check: pieces no longer connected to the ground fall
const N18 = [];
for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
  const m = Math.abs(a) + Math.abs(b) + Math.abs(c);
  if (m > 0 && m <= 2) N18.push([a, b, c]);
}
function staticAt(i, j, k) { return inGrid(i, j, k) ? occ[oIdx(i, j, k)] - 1 : -1; }
function forNeighbours(n, fn) {
  const s = sz[n];
  if (s === 1) { for (const [a, b, c] of N18) fn(staticAt(gi[n] + a, gj[n] + c, gk[n] + b)); return; }
  // big block: every cell on its outside surface
  for (let a = -1; a <= s; a++) for (let b = -1; b <= s; b++) for (let c = -1; c <= s; c++) {
    const inA = a >= 0 && a < s, inB = b >= 0 && b < s, inC = c >= 0 && c < s;
    if (inA && inB && inC) continue;
    fn(staticAt(gi[n] + a, gj[n] + c, gk[n] + b));
  }
}
function supportCheck() {
  if (!releasedThisFrame.length) return;
  const seeds = [];
  for (const n of releasedThisFrame) forNeighbours(n, (m) => { if (m >= 0) seeds.push(m); });
  releasedThisFrame.length = 0;
  stamp++;
  const BUDGET = 2500;
  const queue = [];
  for (const s0 of seeds) {
    if (state[s0] !== 0 || visitStamp[s0] === stamp || visitStamp[s0] === -stamp) continue;
    queue.length = 0; queue.push(s0); visitStamp[s0] = stamp;
    let grounded = false, qi = 0;
    while (qi < queue.length) {
      const n = queue[qi++];
      if (gk[n] === 0 || queue.length > BUDGET) { grounded = true; break; }
      forNeighbours(n, (m) => {
        if (m >= 0 && visitStamp[m] !== stamp && visitStamp[m] !== -stamp) { visitStamp[m] = stamp; queue.push(m); }
      });
    }
    if (grounded) {
      for (const n of queue) visitStamp[n] = -stamp;
    } else {
      // nothing holds it up any more: the whole piece drops straight down, no kick, no spin
      for (const n of queue) {
        release(n, false);
        vx[n] = vz[n] = vy[n] = 0;
        wx[n] = wy[n] = wz[n] = 0;
      }
    }
  }
}

// fallen cubes stack into neat piles instead of overlapping (overlaps flicker)
const pileH = new Map(), pileList = new Map();
const keyAt = (x, z) => (Math.round(x) + GO) * GW + (Math.round(z) + GO);
function pileRegister(n) {
  const key = keyAt(cx[n], cz[n]);
  restKey[n] = key;
  pileH.set(key, (pileH.get(key) || 0) + sz[n]);
  const arr = pileList.get(key);
  if (arr) arr.push(n); else pileList.set(key, [n]);
}
function pileUnregister(n) {
  const key = restKey[n];
  if (key < 0) return;
  restKey[n] = -1;
  pileH.set(key, Math.max(0, (pileH.get(key) || 0) - sz[n]));
  const arr = pileList.get(key);
  if (!arr) return;
  const i = arr.indexOf(n);
  if (i >= 0) arr.splice(i, 1);
  // anything stacked above this piece drops
  for (const m of arr.slice()) if (cy[m] > cy[n]) { pileUnregister(m); if (state[m] === 2) { state[m] = 1; vx[m] = vy[m] = vz[m] = 0; } }
}

// a lower neighbouring spot to pour into (at least one cube lower), or null
const SPILL = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
function spillDir(x, z, f, s) {
  let best = null, bf = f - 0.99;
  const start = (Math.random() * 8) | 0;
  for (let q = 0; q < 8; q++) {
    const [a, b] = SPILL[(start + q) % 8];
    const nx = x + a * s, nz = z + b * s;
    if (outsidePlay(nx, nz)) continue;
    const fn = floorAt(nx, nz, f + 0.5);
    if (fn !== -999 && fn < bf) { bf = fn; best = SPILL[(start + q) % 8]; }
  }
  return best;
}

// highest surface under a point (for landing): static cubes, corner triangles, then any pile of fallen cubes
function floorAt(x, z, bottom) {
  const i = Math.round(x), j = Math.round(z);
  if (i < -GO || i >= GO || j < -GO || j >= GO || Math.abs(i) > world.half + 1 || Math.abs(j) > world.half + 1) return -999;
  let k = Math.min(GK - 1, Math.floor(bottom)), f = 0;
  for (; k >= 0; k--) if (occ[oIdx(i, j, k)]) { f = k + 1; break; }
  if (Math.abs(x) + Math.abs(z) > CORNER_DIAG) f = Math.max(f, 1.2);
  return f + (pileH.get(keyAt(x, z)) || 0);
}

// ------------------------------------------------------------------ swallowing
const canSwallow = (s) => hole.level >= UNLOCK[s];
let lockedToastT = 0;
function swallowScan() {
  const r = hole.r - 0.22;
  if (r <= 0) return;
  scanTick++;
  const i0 = Math.floor(hole.x - r), i1 = Math.ceil(hole.x + r);
  const j0 = Math.floor(hole.z - r), j1 = Math.ceil(hole.z + r);
  for (let i = i0; i <= i1; i++)
    for (let j = j0; j <= j1; j++) {
      if (Math.hypot(i - hole.x, j - hole.z) > r) continue;
      if (i < -GO || i >= GO || j < -GO || j >= GO) continue;
      const base = oIdx(i, j, 0);
      for (let k = 0; k < GK; k++) {
        const id = occ[base + k];
        if (!id) continue;
        const n = id - 1;
        if (scanStamp[n] === scanTick) continue;
        scanStamp[n] = scanTick;
        const s = sz[n];
        if (s === 1) { release(n, true); continue; }
        const d = Math.hypot(cx[n] - hole.x, cz[n] - hole.z);
        if (canSwallow(s)) {
          if (d <= hole.r - s * 0.32) release(n, true);
          else wobble.set(n, Math.max(wobble.get(n) || 0, 0.25));
        } else {
          wobble.set(n, 0.35);
          if (lockedToastT <= 0) { showToast(`Big blocks need Size ${UNLOCK[s] + 1}`); lockedToastT = 6; }
        }
      }
    }
}
function updateWobble(dt, t) {
  for (const [n, left] of wobble) {
    if (state[n] !== 0) { wobble.delete(n); continue; }
    const s = sz[n];
    if (left - dt <= 0) { wobble.delete(n); setBaseMatrix(n); markDirty(n); continue; }
    wobble.set(n, left - dt);
    const amp = Math.min(1, left * 4) * 0.07;
    const dx = hole.x - cx[n], dz = hole.z - cz[n], d = Math.hypot(dx, dz) || 1;
    eul.set(Math.sin(t * 31 + n) * amp + (dz / d) * 0.05, Math.sin(t * 23 + n * 3) * amp * 0.6, -Math.sin(t * 27 + n * 2) * amp - (dx / d) * 0.05);
    quat.setFromEuler(eul);
    pos.set(cx[n] + (dx / d) * 0.06, cy[n] + Math.abs(Math.sin(t * 40 + n)) * 0.05, cz[n] + (dz / d) * 0.06);
    scl.set(s, s, s);
    mtx.compose(pos, quat, scl);
    staticMesh.setMatrixAt(n, mtx);
    markDirty(n);
  }
}

// ------------------------------------------------------------------ physics
function physics(dt) {
  const r = hole.r;
  let sd = null;
  let w = 0;
  for (let a = 0; a < active.length; a++) {
    const n = active[a];
    if (state[n] === 3) continue;
    const s = sz[n], h = s / 2;
    let x = cx[n], y = cy[n], z = cz[n];
    const dx = hole.x - x, dz = hole.z - z, d = Math.hypot(dx, dz) || 0.0001;
    const ux = dx / d, uz = dz / d;
    if (state[n] === 2) {
      // resting debris drifts into the hole when near the rim (if the hole is big enough for it)
      if (d < r - 0.15 - (s - 1) * 0.3 && canSwallow(s)) { pileUnregister(n); state[n] = 1; vx[n] = ux; vz[n] = uz; vy[n] = 0; }
      else {
        let moved = false;
        if (d < r + 1.3 && canSwallow(s)) { const sp = (1 - (d - r) / 1.3) * 2.2 * dt / s; x += ux * sp; z += uz * sp; moved = true; }
        // anything that ends up where the hole can't reach slides back onto the playable area
        if (outsidePlay(x, z)) {
          const L = Math.hypot(x, z) || 1;
          x -= (x / L) * 2.5 * dt; z -= (z / L) * 2.5 * dt; moved = true;
          y = Math.max(y, (Math.abs(x) + Math.abs(z) > CORNER_DIAG ? 1.2 : 0) + h);
        }
        if (moved && restKey[n] >= 0 && keyAt(x, z) !== restKey[n]) pileUnregister(n);
        if (restKey[n] < 0) {
          const f = floorAt(x, z, y - h);
          if (f === -999 || y - h > f + 0.05) { state[n] = 1; vy[n] = 0; vx[n] = 0; vz[n] = 0; }
        }
      }
    }
    if (state[n] === 1) {
      vy[n] -= GRAVITY * dt;
      if (captured[n]) { x += holeDX; z += holeDZ; } // swallowed pieces follow a moving hole
      const bottom = y - h;
      if (bottom < -0.2 && d < r + 0.2) {
        vx[n] += ux * 8 * dt; vz[n] += uz * 8 * dt;
      } else if (d < r + 1.6 && bottom < 1.2) {
        // only pull toward the middle once a cube is down near the ground
        const sp = (1 - Math.max(0, d - r) / 1.6) * 7 * dt;
        vx[n] += ux * sp; vz[n] += uz * sp;
      }
      x += vx[n] * dt; y += vy[n] * dt; z += vz[n] * dt;
      rx[n] += wx[n] * dt; ry[n] += wy[n] * dt; rz[n] += wz[n] * dt;
      const d2 = Math.hypot(hole.x - x, hole.z - z);
      const b2 = y - h;
      if (b2 < -0.05) {
        if (d2 < r - 0.3 || b2 < -0.7) {
          const lim = Math.max(0.1, r - h * 0.9);
          if (d2 > lim) { const k = lim / d2; x = hole.x + (x - hole.x) * k; z = hole.z + (z - hole.z) * k; vx[n] *= 0.4; vz[n] *= 0.4; }
          if (y < -4.5 - s) { consume(n); continue; }
        } else if (d2 < r + 0.45) {
          y = Math.max(y, h - 0.2); vy[n] = Math.min(vy[n], -1);
          vx[n] += (hole.x - x) / (d2 || 1) * 14 * dt; vz[n] += (hole.z - z) / (d2 || 1) * 14 * dt;
          wx[n] += (Math.random() - 0.5) * 20 * dt / s; wz[n] += (Math.random() - 0.5) * 20 * dt / s;
        }
      }
      if (state[n] === 1 && d2 >= r - 0.3 && y - h >= -0.7) {
        const f = floorAt(x, z, y - h);
        if (f === -999) { if (y < -12) { consume(n); continue; } }
        else if (y - h <= f && !(f === 0 && d2 < r + 0.45)) {
          y = f + h;
          if (vy[n] < -5) {
            if (s > 1 && vy[n] < -9) shake = Math.min(1, shake + 0.12 * s);
            vy[n] *= -0.22; vx[n] *= 0.6; vz[n] *= 0.6; wx[n] *= 0.5; wz[n] *= 0.5;
          } else if (spillCount[n] < 16 && (pileH.get(keyAt(x, z)) || 0) > 0 && (sd = spillDir(x, z, f, s))) {
            // landed on a pile of fallen cubes and the spot next door is lower: slide gently off it.
            // (cubes that land on a ledge of something still standing just rest there)
            spillCount[n]++;
            const L = Math.hypot(sd[0], sd[1]);
            vx[n] = (sd[0] / L) * 1.8; vz[n] = (sd[1] / L) * 1.8; vy[n] = 0;
            y = f + h + 0.02;
          } else {
            state[n] = 2; captured[n] = 0; vx[n] = vy[n] = vz[n] = 0;
            // settle square on the grid so piles stack neatly
            rx[n] = Math.round(rx[n] / (Math.PI / 2)) * (Math.PI / 2);
            ry[n] = Math.round(ry[n] / (Math.PI / 2)) * (Math.PI / 2);
            rz[n] = Math.round(rz[n] / (Math.PI / 2)) * (Math.PI / 2);
            x = Math.round(x - (s - 1) / 2) + (s - 1) / 2; z = Math.round(z - (s - 1) / 2) + (s - 1) / 2;
            cx[n] = x; cz[n] = z;
            y = floorAt(x, z, y - h + 0.5) + h; cy[n] = y;
            pileRegister(n);
          }
        }
      }
    }
    cx[n] = x; cy[n] = y; cz[n] = z;
    active[w++] = n;
  }
  active.length = w;
  for (let a = 0; a < active.length; a++) {
    const n = active[a], s = sz[n];
    eul.set(rx[n], ry[n], rz[n]); quat.setFromEuler(eul); pos.set(cx[n], cy[n], cz[n]); scl.set(s, s, s);
    mtx.compose(pos, quat, scl);
    dynMesh.setMatrixAt(a, mtx);
    dynMesh.instanceColor.setXYZ(a, colR[n], colG[n], colB[n]);
  }
  dynMesh.count = active.length;
  dynMesh.instanceMatrix.needsUpdate = true;
  dynMesh.instanceColor.needsUpdate = true;
}
function uploadStatic() {
  if (staticDirtyMax >= 0) {
    const attr = staticMesh.instanceMatrix;
    attr.clearUpdateRanges();
    attr.addUpdateRange(staticDirtyMin * 16, (staticDirtyMax - staticDirtyMin + 1) * 16);
    attr.needsUpdate = true;
    staticDirtyMin = Infinity; staticDirtyMax = -1;
  }
}

// ------------------------------------------------------------------ progression
function levelProgress() {
  if (hole.level >= thresholds.length) return 1;
  const lo = hole.level === 0 ? 0 : thresholds[hole.level - 1];
  return Math.min(1, (eatenVol - lo) / (thresholds[hole.level] - lo));
}
let holeDX = 0, holeDZ = 0, prevHX = 0, prevHZ = 0;
let popBudget = 0, gulp = 0, shake = 0, flashT = 0, nextUnlockToast = 0;
function onEat(v, s) {
  gulp = Math.min(1, gulp + (s > 1 ? 0.35 * s / 2 : 0.05));
  if (s > 1) { sfx.thump(s); if (s === 4) shake = Math.min(1, shake + 0.35); }
  else if (popBudget > 0) { popBudget--; sfx.pop(); }
  while (hole.level < thresholds.length && eatenVol >= thresholds[hole.level]) {
    hole.level++;
    hole.rTarget = RADII[hole.level];
    sfx.chime();
    if (navigator.vibrate) try { navigator.vibrate(25); } catch (e) {}
    flashT = 1;
    sizeEl.classList.remove('bump'); void sizeEl.offsetWidth; sizeEl.classList.add('bump');
    for (const bs of [2, 4]) if (UNLOCK[bs] === hole.level) showToast(`${bs}× blocks unlocked`, true);
  }
}

// ------------------------------------------------------------------ audio (soft)
const sfx = (() => {
  let ctx = null, muted = false;
  try { muted = localStorage.getItem('void-muted') === '1'; } catch (e) {}
  const tone = (f, t0, dur, g, type = 'sine', drop = 0.7) => {
    const o = ctx.createOscillator(), gn = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, ctx.currentTime + t0);
    o.frequency.exponentialRampToValueAtTime(f * drop, ctx.currentTime + t0 + dur);
    gn.gain.setValueAtTime(0.0001, ctx.currentTime + t0);
    gn.gain.exponentialRampToValueAtTime(g, ctx.currentTime + t0 + 0.01);
    gn.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t0 + dur);
    o.connect(gn).connect(ctx.destination); o.start(ctx.currentTime + t0); o.stop(ctx.currentTime + t0 + dur + 0.05);
  };
  let lastThump = 0;
  return {
    init() { if (!ctx) try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} if (ctx && ctx.state === 'suspended') ctx.resume(); },
    pop() { if (ctx && !muted) tone(world.id === 'reef' ? 620 + Math.random() * 500 : 420 + Math.random() * 380, 0, 0.09, 0.03); },
    thump(s) {
      if (!ctx || muted || ctx.currentTime - lastThump < 0.08) return;
      lastThump = ctx.currentTime;
      tone(s === 4 ? 110 : 170, 0, s === 4 ? 0.45 : 0.25, s === 4 ? 0.11 : 0.07, 'sine', 0.5);
      tone(s === 4 ? 220 : 340, 0.01, 0.12, 0.025, 'triangle', 0.6);
    },
    chime() { if (ctx && !muted) { tone(523, 0, 0.6, 0.06); tone(659, 0.09, 0.6, 0.05); tone(784, 0.18, 0.8, 0.05); } },
    fanfare() { if (ctx && !muted) [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.7, 0.05, 'sine', 0.98)); },
    toggle() { muted = !muted; try { localStorage.setItem('void-muted', muted ? '1' : '0'); } catch (e) {} return muted; },
    get muted() { return muted; },
  };
})();

// ------------------------------------------------------------------ input (joystick: press anywhere, pull the way you want to go)
let drag = null;
const stickEl = document.getElementById('stick');
canvas.addEventListener('pointerdown', (e) => {
  if (!playing || drag) return;
  try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
  drag = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY };
  hintEl.classList.add('gone');
  stickEl.style.setProperty('--r', stickRadius() + 'px'); stickEl.style.left = e.clientX + 'px'; stickEl.style.top = e.clientY + 'px';
  stickEl.classList.remove('gone');
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.cx = e.clientX; drag.cy = e.clientY;
});
const endDrag = (e) => { if (drag && e.pointerId === drag.id) { drag = null; stickEl.classList.add('gone'); } };
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('lostpointercapture', endDrag);
function stickRadius() { return Math.max(40, Math.min(window.innerWidth, window.innerHeight) * 0.11); }
function applyStick(dt) {
  if (!drag) return;
  const dx = drag.cx - drag.sx, dy = drag.cy - drag.sy;
  const len = Math.hypot(dx, dy), R = stickRadius();
  const knob = stickEl.firstElementChild;
  const kl = Math.min(len, R);
  knob.style.transform = len > 0 ? `translate(${(dx / len) * kl}px, ${(dy / len) * kl}px)` : '';
  if (len < 4) return;
  const f = Math.min(1, (len - 4) / (R - 4));
  const speed = (viewShort * 0.3 + 2.5) * f * f * (3 - 2 * f) * dt;
  hole.x += (dx / len) * speed;
  hole.z += (dy / len) * speed;
  clampHole();
}
function clampHole() {
  // the whole hole stays on the board (board edge is at about ±62)
  const lim = Math.min(world.half + 1, 61.5 - hole.r - 0.4);
  hole.x = Math.max(-lim, Math.min(lim, hole.x));
  hole.z = Math.max(-lim, Math.min(lim, hole.z));
  const dmax = CORNER_DIAG - 1.42 * hole.r - 0.3, ds = Math.abs(hole.x) + Math.abs(hole.z);
  if (ds > dmax) { const d = (ds - dmax) / 2; hole.x -= Math.sign(hole.x) * d; hole.z -= Math.sign(hole.z) * d; }
}
const keys = {};
addEventListener('keydown', (e) => (keys[e.key] = true));
addEventListener('keyup', (e) => (keys[e.key] = false));

// ------------------------------------------------------------------ camera
let viewWidth = 10, viewShort = 10, camDist = 20;
const camTarget = new THREE.Vector3(hole.x, 0, hole.z);
let peekCam = null; // test hook: look at (x, z) as if the hole were radius r
function updateCamera(dt, snap = false) {
  const H = peekCam || hole;
  const aspect = window.innerWidth / window.innerHeight;
  const vfov = THREE.MathUtils.degToRad(camera.fov);
  const hfov = 2 * Math.atan(Math.tan(vfov / 2) * aspect);
  const shortFov = Math.min(hfov, vfov);
  const wantShort = VIEW_BASE + 2 * H.r * VIEW_PER_HOLE;
  const wantDist = wantShort / (2 * Math.tan(shortFov / 2));
  const k = snap ? 1 : 1 - Math.exp(-dt * 2.2);
  camDist += (wantDist - camDist) * k;
  viewWidth = 2 * camDist * Math.tan(hfov / 2);
  viewShort = 2 * camDist * Math.tan(shortFov / 2);
  const ahead = H.r * 0.9;
  const tk = snap ? 1 : 1 - Math.exp(-dt * 8);
  camTarget.x += (H.x - camTarget.x) * tk;
  camTarget.z += (H.z - ahead - camTarget.z) * tk;
  const sh = snap ? 0 : shake * shake * 0.35;
  camera.position.set(camTarget.x + (Math.random() - 0.5) * sh, Math.sin(PITCH) * camDist + (Math.random() - 0.5) * sh, camTarget.z + Math.cos(PITCH) * camDist);
  camera.lookAt(camTarget);
  scene.fog.near = camDist * (world.id === 'reef' ? 1.2 : 1.6);
  scene.fog.far = camDist * (world.id === 'reef' ? 3.6 : world.fogFar || 4.5) + 40;
  camera.far = camDist * 6 + 80; camera.updateProjectionMatrix();
  const ext = Math.max(18, camDist * 1.1);
  const sc = sun.shadow.camera;
  sc.left = -ext; sc.right = ext; sc.top = ext; sc.bottom = -ext; sc.near = 1; sc.far = ext * 5; sc.updateProjectionMatrix();
  sun.target.position.copy(camTarget);
  sun.position.copy(camTarget).addScaledVector(SUN_DIR, ext * 2);
}

// ------------------------------------------------------------------ HUD
const hud = document.getElementById('hud');
const sizeEl = document.getElementById('size');
const hintEl = document.getElementById('hint');
const arrowEl = document.getElementById('arrow');
const toastEl = document.getElementById('toast');
const tiles = [0, 1, 2].map(() => {
  const el = document.createElement('div'); el.className = 'tile';
  el.innerHTML = '<div class="cube"><i class="t"></i><i class="l"></i><i class="r"></i></div><b>0</b>';
  hud.appendChild(el); return el;
});
const totalEl = document.createElement('div'); totalEl.className = 'total'; hud.appendChild(totalEl);
function shade(hex, f) { const c = new THREE.Color(hex); c.multiplyScalar(f); return '#' + c.getHexString(); }
let hudT = 0;
function updateHUD() {
  const top = Object.entries(groupRemaining).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3);
  tiles.forEach((el, i) => {
    const e = top[i];
    if (!e) { el.style.display = 'none'; return; }
    el.style.display = '';
    const sw = GROUPS[e[0]].swatch;
    const cube = el.firstChild;
    cube.children[0].style.background = shade(sw, 1.08);
    cube.children[1].style.background = shade(sw, 0.86);
    cube.children[2].style.background = shade(sw, 0.7);
    el.lastChild.textContent = e[1].toLocaleString();
    el.lastChild.classList.toggle('long', e[1] >= 10000);
  });
  const pct = totalVol ? Math.floor((eatenVol / totalVol) * 100) : 0;
  let next = '';
  for (const bs of [2, 4]) if (hole.level < UNLOCK[bs]) { next = ` · ${bs}× blocks at Size ${UNLOCK[bs] + 1}`; break; }
  totalEl.textContent = `${pct}% cleared${next}`;
}
let toastTimer = 0;
function showToast(text, good = false) {
  toastEl.textContent = text;
  toastEl.classList.toggle('good', good);
  toastEl.classList.remove('gone');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.add('gone'), 2200);
}
const v3 = new THREE.Vector3();
function updateOverlay() {
  v3.set(hole.x, 0, hole.z + hole.r * 1.32).project(camera);
  sizeEl.style.transform = `translate(${(v3.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v3.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, 0)`;
  sizeEl.firstChild.textContent = `Size ${hole.level + 1}`;
  if (playing && remainingPieces > 0 && remainingPieces <= BEACONS) {
    let best = -1, bd = Infinity;
    for (let n = 0; n < N; n++) {
      if (state[n] === 3) continue;
      const d = (cx[n] - hole.x) ** 2 + (cz[n] - hole.z) ** 2;
      if (d < bd) { bd = d; best = n; }
    }
    if (best >= 0) {
      v3.set(cx[best], cy[best], cz[best]).project(camera);
      const on = Math.abs(v3.x) < 0.85 && Math.abs(v3.y) < 0.85 && v3.z < 1;
      if (on) arrowEl.classList.add('gone');
      else {
        arrowEl.classList.remove('gone');
        const a = Math.atan2(-v3.y, v3.x);
        const ax = Math.cos(a), ay = Math.sin(a);
        const m = Math.max(Math.abs(ax) / 0.42, Math.abs(ay) / 0.42);
        arrowEl.style.transform = `translate(${(0.5 + ax / m) * window.innerWidth}px, ${(0.5 + ay / m) * window.innerHeight}px) translate(-50%,-50%) rotate(${a}rad)`;
      }
    }
  } else arrowEl.classList.add('gone');
}

// ------------------------------------------------------------------ screens, map picker, fullscreen
const startEl = document.getElementById('start');
const winEl = document.getElementById('win');
const cardsEl = document.getElementById('cards');
let playing = false, won = false, elapsed = 0, saveT = 0;
const bestTimes = () => { try { return JSON.parse(localStorage.getItem('void-best') || '{}'); } catch (e) { return {}; } };
const fmtTime = (secs) => `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s`;
const cleared = () => { try { return JSON.parse(localStorage.getItem('void-cleared') || '{}'); } catch (e) { return {}; } };
// ---- saving a map in progress (per map, in this browser only)
const saveKey = (id) => 'void-save-' + id;
function readSave(id) {
  try {
    const d = JSON.parse(localStorage.getItem(saveKey(id)) || 'null');
    return d && d.v === 1 ? d : null;
  } catch (e) { return null; }
}
function clearSave(id) { try { localStorage.removeItem(saveKey(id)); } catch (e) {} }
function saveGame() {
  if (won || eatenVol === 0 || !staticMesh) return;
  const bits = new Uint8Array(Math.ceil(N / 8));
  const loose = [];
  for (let n = 0; n < N; n++) {
    const gone = state[n] === 3 || (state[n] === 1 && captured[n]);
    if (gone) bits[n >> 3] |= 1 << (n & 7);
    else if (state[n] !== 0) loose.push(n, Math.round(cx[n] * 100) / 100, Math.round(Math.max(cy[n], sz[n] / 2) * 100) / 100, Math.round(cz[n] * 100) / 100);
  }
  let bin = '';
  for (let i = 0; i < bits.length; i++) bin += String.fromCharCode(bits[i]);
  const data = { v: 1, N, level: hole.level, x: hole.x, z: hole.z, t: elapsed, pct: Math.floor((eatenVol / totalVol) * 100), bits: btoa(bin), loose };
  try { localStorage.setItem(saveKey(world.id), JSON.stringify(data)); } catch (e) {}
}
function restoreSave(d) {
  if (!d || d.N !== N) return false; // the map changed in an update: start fresh
  const bin = atob(d.bits);
  for (let n = 0; n < N; n++) {
    if (!(bin.charCodeAt(n >> 3) & (1 << (n & 7)))) continue;
    clearCells(n); hideStatic(n); state[n] = 3;
    const v = sz[n] * sz[n] * sz[n];
    eatenVol += v; remainingPieces--;
    groupRemaining[COLORS[colIdx[n]].group] -= v;
  }
  for (let i = 0; i < d.loose.length; i += 4) {
    const n = d.loose[i];
    if (n >= N || state[n] !== 0) continue;
    clearCells(n); hideStatic(n);
    state[n] = 2; cx[n] = d.loose[i + 1]; cy[n] = d.loose[i + 2]; cz[n] = d.loose[i + 3];
    restKey[n] = -1;
    active.push(n);
  }
  hole.level = Math.min(d.level, RADII.length - 1);
  hole.r = hole.rTarget = RADII[hole.level];
  hole.x = d.x; hole.z = d.z; prevHX = hole.x; prevHZ = hole.z;
  elapsed = d.t || 0;
  clampHole(); updateCamera(0, true); updateHUD();
  return true;
}
addEventListener('visibilitychange', () => { if (document.hidden && playing) saveGame(); });
addEventListener('pagehide', () => { if (playing) saveGame(); });

function renderCards() {
  const done = cleared();
  cardsEl.innerHTML = '';
  for (const id of MAP_ORDER) {
    const m = MAPS[id];
    const sv = readSave(id);
    const wrap = document.createElement('div');
    wrap.className = 'card-wrap';
    const b = document.createElement('button');
    b.className = 'card card-' + id;
    const best = bestTimes()[id];
    const tag = sv ? `Resume · ${sv.pct}% cleared` : m.tagline;
    const badge = done[id] ? '<span class="badge" aria-label="Cleared">✓</span>' : '';
    const bestLine = done[id] ? `<span class="best">Cleared${best ? ' · best ' + fmtTime(best) : ''}</span>` : '';
    b.innerHTML = `<span class="art">${badge}</span><span class="name">${m.name}</span><span class="tag${sv ? ' resume' : ''}">${tag}</span>${bestLine}`;
    b.addEventListener('click', () => play(id));
    wrap.appendChild(b);
    if (sv) {
      const r = document.createElement('button');
      r.className = 'restart';
      r.textContent = 'Start over';
      r.addEventListener('click', () => play(id, true));
      wrap.appendChild(r);
    }
    cardsEl.appendChild(wrap);
  }
}
function goFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (req && !document.fullscreenElement) {
    try {
      const p = req.call(el, { navigationUI: 'hide' });
      if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('portrait').catch(() => {})).catch(() => {});
    } catch (e) {}
  }
}
function play(id, fresh = false) {
  sfx.init(); goFullscreen();
  if (fresh) clearSave(id);
  const sv = readSave(id);
  if (id !== world.id || eatenVol > 0 || sv) loadWorld(id);
  elapsed = 0;
  if (sv && !restoreSave(sv)) clearSave(id);
  startEl.classList.add('gone'); winEl.classList.add('gone'); pauseEl.classList.add('gone');
  let hinted = false;
  try { hinted = localStorage.getItem('void-hinted') === '1'; localStorage.setItem('void-hinted', '1'); } catch (e) {}
  hintEl.classList.toggle('gone', hinted);
  playing = true; saveT = 0;
}
function showStart() {
  renderCards();
  playing = false;
  winEl.classList.add('gone'); pauseEl.classList.add('gone');
  startEl.classList.remove('gone');
}
function win() {
  won = true; playing = false;
  clearSave(world.id);
  try { const c = cleared(); c[world.id] = true; localStorage.setItem('void-cleared', JSON.stringify(c)); } catch (e) {}
  const secs = Math.round(elapsed);
  const bests = bestTimes(), prev = bests[world.id];
  const newBest = !prev || secs < prev;
  if (newBest) { bests[world.id] = secs; try { localStorage.setItem('void-best', JSON.stringify(bests)); } catch (e) {} }
  document.getElementById('win-title').textContent = newBest && prev ? 'New best!' : 'All clear';
  document.getElementById('win-text').textContent = world.win;
  document.getElementById('win-stats').textContent = `${totalVol.toLocaleString()} cubes · ${fmtTime(secs)}${prev && !newBest ? ' · best ' + fmtTime(prev) : ''}`;
  const other = MAP_ORDER[(MAP_ORDER.indexOf(world.id) + 1) % MAP_ORDER.length];
  const nextBtn = document.getElementById('next');
  nextBtn.textContent = `Try the ${MAPS[other].name}`;
  nextBtn.onclick = () => play(other);
  sfx.fanfare();
  winEl.classList.remove('gone');
}
document.getElementById('again').addEventListener('click', () => { clearSave(world.id); loadWorld(world.id); showStart(); });
// pause / quit
const pauseEl = document.getElementById('pause');
document.getElementById('menu').addEventListener('click', () => {
  if (!playing) return;
  playing = false; drag = null; stickEl.classList.add('gone');
  saveGame();
  document.getElementById('pause-stats').textContent = `${Math.floor((eatenVol / totalVol) * 100)}% cleared · Size ${hole.level + 1}`;
  pauseEl.classList.remove('gone');
});
document.getElementById('resume').addEventListener('click', () => { pauseEl.classList.add('gone'); playing = true; });
document.getElementById('tomaps').addEventListener('click', () => { saveGame(); showStart(); });
document.getElementById('fs').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else goFullscreen(); });
const muteBtn = document.getElementById('mute');
const setMuteIcon = () => muteBtn.classList.toggle('off', sfx.muted);
setMuteIcon();
muteBtn.addEventListener('click', () => { sfx.init(); sfx.toggle(); setMuteIcon(); });

// ------------------------------------------------------------------ resize + loop
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

let saved = 'farm';
try { saved = localStorage.getItem('void-map') || 'farm'; } catch (e) {}
loadWorld(MAPS[saved] ? saved : 'farm');
renderCards();

let last = performance.now(), slowTime = 0, frames = 0, fpsAcc = 0;
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  timeUniform.value = t;
  popBudget = Math.min(popBudget + dt * 14, 3);
  lockedToastT -= dt;
  if (playing) {
    elapsed += dt;
    saveT += dt;
    if (saveT > 5) { saveT = 0; saveGame(); }
    applyStick(dt);
    const sp = (viewShort * 0.3 + 2.5) * dt;
    if (keys.ArrowLeft || keys.a) hole.x -= sp; if (keys.ArrowRight || keys.d) hole.x += sp;
    if (keys.ArrowUp || keys.w) hole.z -= sp; if (keys.ArrowDown || keys.s) hole.z += sp;
    clampHole();
  }
  holeDX = hole.x - prevHX; holeDZ = hole.z - prevHZ; prevHX = hole.x; prevHZ = hole.z;
  if (Math.abs(holeDX) > 3 || Math.abs(holeDZ) > 3) holeDX = holeDZ = 0; // map change
  hole.r += (hole.rTarget - hole.r) * (1 - Math.exp(-dt * 3));
  holeUniform.value.set(hole.x, hole.z, hole.r);
  holeGroup.position.set(hole.x, 0, hole.z);
  holeGroup.scale.set(hole.r, 1, hole.r);
  gulp = Math.max(0, gulp - dt * 2.5);
  shake = Math.max(0, shake - dt * 2.2);
  const g = 1 + gulp * 0.05;
  ringGroup.scale.set(g, 1, g);
  progGroup.position.set(hole.x, 0, hole.z);
  if (playing) swallowScan();
  supportCheck();
  physics(dt);
  updateWobble(dt, t);
  updateBeacons(t);
  shownProgress += (levelProgress() - shownProgress) * (1 - Math.exp(-dt * 6));
  if (flashT > 0) { flashT = Math.max(0, flashT - dt * 1.4); shownProgress = flashT > 0.5 ? 1 : shownProgress * (flashT > 0 ? 0.5 : 1); }
  fillMat.color.set(flashT > 0 ? '#fff6d8' : '#ffc83d');
  rimMat.opacity = 0.75 + Math.max(flashT, gulp) * 0.25;
  if (bubbleMesh.visible) {
    for (let i = 0; i < BUBBLES; i++) {
      const b = bub[i];
      b.y += b.v * dt;
      if (b.y > 20 || Math.abs(b.x - camTarget.x) > camDist * 1.4 || Math.abs(b.z - camTarget.z) > camDist * 1.4) resetBubble(b, false);
      mtx.makeScale(b.s, b.s, b.s);
      mtx.setPosition(b.x + Math.sin(t * 2 + b.ph) * 0.2, b.y, b.z);
      bubbleMesh.setMatrixAt(i, mtx);
    }
    bubbleMesh.instanceMatrix.needsUpdate = true;
  }
  updateCamera(dt);
  updateRing(flashT > 0.5 ? 1 : shownProgress);
  uploadStatic();
  renderer.render(scene, camera);
  updateOverlay();
  hudT -= dt;
  if (hudT <= 0) { updateHUD(); hudT = 0.25; }
  if (playing && !won && remainingPieces <= 0) setTimeout(win, 900), (won = true);
  frames++; fpsAcc += dt;
  if (fpsAcc > 2) {
    const fps = frames / fpsAcc;
    if (fps < 38 && renderer.shadowMap.enabled && playing) { slowTime++; if (slowTime >= 2) { renderer.shadowMap.enabled = false; scene.traverse((o) => o.material && (o.material.needsUpdate = true)); } }
    else slowTime = 0;
    frames = 0; fpsAcc = 0;
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// test hooks for automated playtesting
function stepSim(n) { for (let i = 0; i < n; i++) { hole.r += (hole.rTarget - hole.r) * 0.1; holeUniform.value.set(hole.x, hole.z, hole.r); swallowScan(); supportCheck(); physics(1 / 30); updateWobble(1 / 30, performance.now() / 1000); } holeGroup.position.set(hole.x, 0, hole.z); holeGroup.scale.set(hole.r, 1, hole.r); }
function nearestRemaining() {
  // nearest piece the hole can currently eat; falls back to any piece
  let best = -1, bd = Infinity, any = -1, ad = Infinity;
  for (let n = 0; n < N; n++) {
    if (state[n] === 3) continue;
    const d = (cx[n] - hole.x) ** 2 + (cz[n] - hole.z) ** 2;
    if (d < ad) { ad = d; any = n; }
    if (canSwallow(sz[n]) && d < bd) { bd = d; best = n; }
  }
  const n = best >= 0 ? best : any;
  return n < 0 ? null : [cx[n], cz[n]];
}
window.__void = {
  snap: () => updateCamera(0, true), stepSim, peek: (x, z, r) => { peekCam = x == null ? null : { x, z, r }; updateCamera(0, true); }, nearestRemaining, hole,
  get level() { return hole.level; }, get remaining() { return remainingPieces; }, get eaten() { return eatenVol; },
  get total() { return totalVol; }, get N() { return N; }, get active() { return active.length; }, get map() { return world.id; },
  start: (id = 'farm') => play(id), thresholds: () => thresholds.slice(),
  maxPile: () => { let m = 0; for (const v of pileH.values()) m = Math.max(m, v); return m; }, resting: () => { let c = 0; for (let n = 0; n < N; n++) if (state[n] === 2) c++; return c; },
};

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
