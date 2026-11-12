import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const stage = document.getElementById("stage3d");
const loadingEl = document.getElementById("map-loading");
const ST_COLOR = { open: 0x34BFAC, res: 0xF2B84B, conf: 0x8C97A0 };
const ST_HEX = { open: "#34BFAC", res: "#F2B84B", conf: "#8C97A0" };
const KO = window.T.ko, ZH = window.T.zh;

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch (e) {
  loadingEl.textContent = window.T[window.App.state.lang].map_fail;
  throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0E2633);
scene.fog = new THREE.Fog(0x0E2633, 90, 220);
const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 600);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.maxPolarAngle = 1.32;
controls.minDistance = 12;
controls.maxDistance = 130;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.45;
controls.screenSpacePanning = false;

/* lights: tropical dusk */
scene.add(new THREE.HemisphereLight(0xBFD9E6, 0x3A2A22, 0.85));
const sun = new THREE.DirectionalLight(0xFFD2A6, 1.6);
sun.position.set(-40, 55, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 200 });
sun.shadow.bias = -0.0004;
scene.add(sun);
const fill = new THREE.DirectionalLight(0x6FB7D6, 0.35);
fill.position.set(40, 30, -40);
scene.add(fill);

/* ---------- helpers ---------- */
const matCache = {};
const M = (color, o = {}) => {
  const k = color + JSON.stringify(o);
  return matCache[k] || (matCache[k] = new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.05, ...o }));
};
function box(w, h, d, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (parent) parent.add(m);
  return m;
}
function cyl(rt, rb, h, mat, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
function hipRoof(halfW, halfD, h, mat) {
  const g = new THREE.ConeGeometry(Math.SQRT2, h, 4, 1);
  g.rotateY(Math.PI / 4);
  const m = new THREE.Mesh(g, mat);
  m.scale.set(halfW, 1, halfD);
  m.castShadow = true;
  return m;
}
const FONT = '"Noto Sans KR","Noto Sans SC",system-ui,sans-serif';

/* bilingual text canvas: line1 Korean (bold), line2 Chinese */
function textCanvas(l1, l2, o = {}) {
  const s = 2, pad = 22 * s;
  const f1 = (o.f1 || 40) * s, f2 = (o.f2 || 30) * s;
  const c = document.createElement("canvas"), x = c.getContext("2d");
  x.font = `800 ${f1}px ${FONT}`; const w1 = x.measureText(l1).width;
  x.font = `600 ${f2}px ${FONT}`; const w2 = l2 ? x.measureText(l2).width : 0;
  const lead = o.lead || 0;
  const W = Math.ceil(Math.max(o.minW || 0, Math.max(w1, w2) + pad * 2 + lead));
  const H = Math.ceil(pad * 1.4 + f1 + (l2 ? f2 * 1.25 : 0));
  c.width = W; c.height = H;
  x.fillStyle = o.bg || "rgba(7,24,32,.88)";
  const r = o.radius != null ? o.radius * s : H / 2;
  x.beginPath(); x.roundRect(0, 0, W, H, r); x.fill();
  if (o.border) { x.strokeStyle = o.border; x.lineWidth = 3 * s; x.beginPath(); x.roundRect(1.5 * s, 1.5 * s, W - 3 * s, H - 3 * s, r); x.stroke(); }
  x.textBaseline = "top"; x.textAlign = "center";
  const cx = lead + (W - lead) / 2;
  x.fillStyle = o.c1 || "#F4EFE6"; x.font = `800 ${f1}px ${FONT}`; x.fillText(l1, cx, pad * 0.7);
  if (l2) { x.fillStyle = o.c2 || "#F2B84B"; x.font = `600 ${f2}px ${FONT}`; x.fillText(l2, cx, pad * 0.7 + f1 * 1.12); }
  return { c, x, W, H, s };
}
function texOf(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function labelSprite(l1, l2, worldH, o) {
  const { c, W, H } = textCanvas(l1, l2, o);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texOf(c), depthTest: false, transparent: true }));
  sp.scale.set(worldH * W / H, worldH, 1);
  sp.renderOrder = 10;
  return sp;
}
function markerTexture(id, st, active) {
  const S = 128, c = document.createElement("canvas"); c.width = c.height = S;
  const x = c.getContext("2d");
  x.fillStyle = "rgba(0,0,0,.35)"; x.beginPath(); x.arc(S / 2, S / 2 + 4, 52, 0, 7); x.fill();
  x.fillStyle = ST_HEX[st]; x.beginPath(); x.arc(S / 2, S / 2, 52, 0, 7); x.fill();
  x.lineWidth = active ? 10 : 6; x.strokeStyle = active ? "#FFFFFF" : "rgba(7,24,32,.9)"; x.stroke();
  x.fillStyle = "#06201C"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `800 ${id.length > 2 ? 34 : 54}px Outfit,${FONT}`; x.fillText(id, S / 2, S / 2 + 2);
  return texOf(c);
}

/* ---------- reusable props ---------- */
function palm(h = 7, lean = 0.25) {
  const g = new THREE.Group();
  const trunkM = M(0x7A5C43), leafM = M(0x2E7D4F, { side: THREE.DoubleSide });
  let px = 0, py = 0;
  for (let i = 0; i < 6; i++) {
    const seg = cyl(0.17 - i * 0.012, 0.2 - i * 0.012, h / 6 + 0.05, trunkM, 7);
    const nx = Math.sin(i / 6 * lean * 3) * lean * 3;
    seg.position.set((px + nx) / 2, py + h / 12, 0);
    seg.rotation.z = -(nx - px) / (h / 6);
    g.add(seg); px = nx; py += h / 6;
  }
  for (let i = 0; i < 8; i++) {
    const lg = new THREE.ConeGeometry(0.55, 3.4, 3, 1);
    lg.translate(0, 1.7, 0);
    const leaf = new THREE.Mesh(lg, leafM);
    leaf.scale.set(1, 1, 0.18);
    leaf.position.set(px, py, 0);
    leaf.rotation.set(0, i / 8 * Math.PI * 2, 1.15 + (i % 2) * 0.25, "YXZ");
    leaf.castShadow = true; g.add(leaf);
  }
  return g;
}
function roundTree(s = 1) {
  const g = new THREE.Group();
  const t = cyl(0.18 * s, 0.25 * s, 2 * s, M(0x6B4F3A), 7); t.position.y = s; g.add(t);
  const lm = M(0x2F6B45);
  [[0, 2.6, 0, 1.5], [0.8, 2.3, 0.3, 1.1], [-0.7, 2.4, -0.3, 1.15]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), lm);
    b.position.set(x * s, y * s, z * s); b.castShadow = true; g.add(b);
  });
  return g;
}
function parasolSet() {
  const g = new THREE.Group();
  const top = cyl(0.55, 0.55, 0.06, M(0xE9E2D3), 16); top.position.y = 0.75; g.add(top);
  const leg = cyl(0.05, 0.05, 0.75, M(0x444A50), 6); leg.position.y = 0.37; g.add(leg);
  const pole = cyl(0.04, 0.04, 2.5, M(0xCFC8BA), 6); pole.position.y = 1.4; g.add(pole);
  const can = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.55, 8, 1, true), M(0xF4EFE6, { side: THREE.DoubleSide, roughness: 0.9 }));
  can.position.y = 2.55; can.castShadow = true; g.add(can);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    const ch = box(0.42, 0.45, 0.42, M(0x9C6B45), Math.cos(a) * 0.95, 0.23, Math.sin(a) * 0.95, g);
    box(0.42, 0.5, 0.06, M(0x9C6B45), Math.cos(a) * 1.15, 0.6, Math.sin(a) * 1.15, g).lookAt(0, 0.6, 0);
    ch.castShadow = true;
  }
  return g;
}
const lanternMeshes = [];
function lanternString(points, parent, n = 9) {
  const colors = [0xE2483D, 0x2E64A8, 0xF2B84B];
  for (let s = 0; s < points.length - 1; s++) {
    const a = points[s], b = points[s + 1];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const p = new THREE.Vector3().lerpVectors(a, b, t);
      p.y -= Math.sin(t * Math.PI) * 0.9;
      pts.push(p);
      if (i > 0 && i < n) {
        const l = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.42, 8), new THREE.MeshStandardMaterial({ color: colors[i % 3], emissive: colors[i % 3], emissiveIntensity: 1.2 }));
        l.position.copy(p).add(new THREE.Vector3(0, -0.25, 0));
        parent.add(l); lanternMeshes.push(l);
      }
    }
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1C1C1C }));
    parent.add(line);
  }
}
function pole(x, z, h, parent) {
  const p = cyl(0.08, 0.1, h, M(0x2A2F33), 6); p.position.set(x, h / 2, z); parent.add(p);
  return new THREE.Vector3(x, h, z);
}

/* ---------- booth ---------- */
const boothMeshes = [];   // for raycast
const boothIndex = {};    // id -> {group, marker, sign, booth}
const signRefs = [];      // regenerate on language change

function boothSignCanvas(b) {
  const W = 512, H = 132, c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#2B1F17"; x.fillRect(0, 0, W, H);
  x.strokeStyle = "#C89B5A"; x.lineWidth = 6; x.strokeRect(5, 5, W - 10, H - 10);
  x.fillStyle = ST_HEX[b.st]; x.beginPath(); x.arc(64, H / 2, 40, 0, 7); x.fill();
  x.fillStyle = "#06201C"; x.textAlign = "center"; x.textBaseline = "middle";
  x.font = `800 ${b.id.length > 2 ? 26 : 42}px Outfit,${FONT}`; x.fillText(b.id, 64, H / 2 + 1);
  x.textAlign = "left";
  const fit = (txt, size, weight, maxW) => { let s = size; do { x.font = `${weight} ${s}px ${FONT}`; s -= 2; } while (x.measureText(txt).width > maxW && s > 14); };
  x.fillStyle = "#FFF6E6"; fit(b.name.ko, 42, 800, W - 140); x.fillText(b.name.ko, 120, 48);
  x.fillStyle = "#F2B84B"; fit(b.name.zh, 32, 600, W - 140); x.fillText(b.name.zh, 120, 96);
  return c;
}
function makeBooth(b, parent, x, z, rotY) {
  const g = new THREE.Group();
  g.position.set(x, 0, z); g.rotation.y = rotY;
  const wall = M(0xEFE6D6), wood = M(0xB98A5A), red = M(0xB8322A), tile = M(0x26303A, { roughness: 0.6 }), dark = M(0x1C242C);
  box(4, 0.15, 4, M(0x3B4248), 0, 0.075, 0, g);
  box(4, 2.6, 0.12, wall, 0, 1.45, -1.94, g);
  box(0.12, 2.6, 4, wall, -1.94, 1.45, 0, g);
  box(0.12, 2.6, 4, wall, 1.94, 1.45, 0, g);
  box(3.8, 0.95, 0.6, wood, 0, 0.47, 1.55, g);
  box(3.6, 0.05, 0.7, M(0xE9DCC6), 0, 0.97, 1.55, g);
  [-1.94, 1.94].forEach(px => box(0.2, 2.9, 0.2, red, px, 1.45, 1.94, g));
  box(4.0, 0.22, 0.22, red, 0, 2.86, 1.94, g);
  // goods on counter
  for (let i = 0; i < 5; i++) box(0.35, 0.3 + (i % 2) * 0.15, 0.35, M([0xE2483D, 0xF2B84B, 0x34BFAC, 0xF4EFE6, 0x2E64A8][i]), -1.3 + i * 0.65, 1.15, 1.5, g);
  // eave + roof
  box(4.9, 0.12, 4.9, dark, 0, 3.0, 0, g);
  const roof = hipRoof(2.55, 2.55, 1.35, tile); roof.position.y = 3.72; g.add(roof);
  box(1.6, 0.14, 0.18, dark, 0, 4.42, 0, g);
  // status strip on eave front
  const strip = new THREE.Mesh(new THREE.BoxGeometry(4.9, 0.14, 0.06), new THREE.MeshStandardMaterial({ color: ST_COLOR[b.st], emissive: ST_COLOR[b.st], emissiveIntensity: 0.9 }));
  strip.position.set(0, 3.0, 2.48); g.add(strip);
  // bilingual sign board
  const sc = boothSignCanvas(b);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.93), new THREE.MeshBasicMaterial({ map: texOf(sc) }));
  sign.position.set(0, 2.42, 2.06); g.add(sign);
  // warm interior light glow
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.2), new THREE.MeshBasicMaterial({ color: 0xFFC983, transparent: true, opacity: 0.18 }));
  glow.position.set(0, 1.8, -1.86); g.add(glow);
  // hit volume
  const hit = new THREE.Mesh(new THREE.BoxGeometry(4.6, 5, 4.6), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.y = 2.5; hit.userData.boothId = b.id; g.add(hit); boothMeshes.push(hit);
  // marker
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(b.id, b.st, false), depthTest: false, transparent: true }));
  marker.scale.set(1.7, 1.7, 1); marker.position.set(0, 6.1, 0); marker.renderOrder = 12; g.add(marker);
  parent.add(g);
  boothIndex[b.id] = { group: g, marker, booth: b, baseY: 6.1 };
  signRefs.push({ mesh: sign, b });
  return g;
}

/* ---------- landmark labels (always KO + ZH) ---------- */
const labelRefs = [];
function landmark(key, parent, x, y, z, h = 1.3) {
  const sp = labelSprite(KO.lm[key], ZH.lm[key], h, { f1: 34, f2: 26 });
  sp.position.set(x, y, z); parent.add(sp);
  labelRefs.push(sp);
  return sp;
}

/* ---------- venue A: Haikou Qilou Old Street ---------- */
function qilouRow(parent, x0, x1, z) {
  const tones = [0xEDE3CF, 0xE6CDB5, 0xEAD2CB, 0xD4DDCF, 0xE8D7A8, 0xF2EEE6, 0xD9C3A6];
  const unit = 6.5; let i = 0;
  for (let x = x0; x < x1 - 0.1; x += unit, i++) {
    const g = new THREE.Group(); g.position.set(x + unit / 2, 0, z); parent.add(g);
    const tone = M(tones[i % tones.length]); const trim = M(0xFBF7EF);
    const floors = 2 + (i % 3 === 1 ? 1 : 0) + (i % 4 === 3 ? 1 : 0);
    const top = 4 + floors * 3.3;
    box(unit, top - 4, 8, tone, 0, 4 + (top - 4) / 2, -1.5, g);           // upper floors over the arcade
    box(unit, 4, 5, M(0x3A2E26), 0, 2, -3, g);                             // shop interior block
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(unit - 1.2, 2.8), new THREE.MeshBasicMaterial({ color: 0xFFC67A, transparent: true, opacity: 0.55 }));
    shop.position.set(0, 1.6, -0.48); g.add(shop);
    box(unit, 0.5, 4.2, trim, 0, 4.05, 0.4, g);                            // arcade ceiling band
    for (let k = 0; k < 3; k++) {                                          // arcade pillars
      const px = -unit / 2 + 0.3 + k * (unit - 0.6) / 2;
      box(0.55, 4, 0.55, trim, px, 2, 2.3, g);
    }
    // arches between pillars
    for (let k = 0; k < 2; k++) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.16, 6, 16, Math.PI), trim);
      arch.position.set(-unit / 4 + k * unit / 2, 2.6, 2.32); g.add(arch);
    }
    // windows (shutters) on facade
    for (let f = 0; f < floors; f++) for (let k = 0; k < 3; k++) {
      const lit = (i + f + k) % 3 === 0;
      const w = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.9), new THREE.MeshStandardMaterial({ color: lit ? 0xFFD493 : 0x3F6A6B, emissive: lit ? 0xFFB255 : 0x000000, emissiveIntensity: lit ? 0.8 : 0 }));
      w.position.set(-2 + k * 2, 5.6 + f * 3.3, 2.52); g.add(w);
      box(1.4, 0.16, 0.25, trim, -2 + k * 2, 6.65 + f * 3.3, 2.58, g);
    }
    box(unit + 0.1, 0.3, 0.5, trim, 0, top + 0.05, 2.35, g);               // cornice
    // ornate parapet / pediment
    box(unit - 0.6, 1.0, 0.3, trim, 0, top + 0.7, 2.3, g);
    box(1.6, 0.8, 0.3, trim, 0, top + 1.5, 2.3, g);
    // vertical red signboard
    if (i % 2 === 0) box(0.5, 2.4, 0.12, M(0xA8281F, { emissive: 0x5A0E0A, emissiveIntensity: 0.5 }), unit / 2 - 0.6, 6.5, 2.7, g);
  }
}

/* 夏南洋·骑楼烟火食集 (骑楼北广场) — reference: organizer's site render + plan */
function buildXiaNanyang(g) {
  const cream = M(0xE9DFCC), stone = M(0xCFC4B0), dark = M(0x2A2420), roofM = M(0x3B3F44, { roughness: 0.6 }), glassM = M(0x4F7486, { roughness: 0.15, metalness: 0.5 });
  // main hall along the north edge
  const hall = new THREE.Group(); hall.position.set(0, 0, -24); g.add(hall);
  box(46, 12, 9, cream, 0, 6, 0, hall);                         // 3-storey body
  // gable roof
  const gable = new THREE.Shape(); gable.moveTo(-23.5, 0); gable.lineTo(0, 6.5); gable.lineTo(23.5, 0); gable.lineTo(-23.5, 0);
  const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 10, bevelEnabled: false }); gGeo.translate(0, 0, -5);
  const gm = new THREE.Mesh(gGeo, roofM); gm.position.y = 12; gm.castShadow = true; hall.add(gm);
  // ground floor shopfronts (arcade) with warm light
  for (let i = 0; i < 9; i++) {
    const x = -20 + i * 5;
    box(0.6, 4.2, 0.6, stone, x - 2.5, 2.1, 4.8, hall);
    const shop = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 3.2), new THREE.MeshBasicMaterial({ color: i % 3 ? 0xFFC67A : 0xFFDFA8, transparent: true, opacity: 0.6 }));
    shop.position.set(x, 1.8, 4.52); hall.add(shop);
    const aw = box(4.4, 0.12, 1.4, M([0xA8281F, 0x2E6B5A, 0xC9893A][i % 3]), x, 3.6, 5.2, hall); aw.rotation.x = 0.25;
  }
  box(46.4, 0.5, 1.2, stone, 0, 4.4, 4.9, hall);                   // arcade band
  // upper-floor windows
  for (let f = 0; f < 2; f++) for (let i = 0; i < 14; i++) {
    const x = -21 + i * 3.25; if (x > 2 && x < 18) continue;      // leave room for the LED
    const lit = (i + f) % 3 === 0;
    const w = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2), new THREE.MeshStandardMaterial({ color: lit ? 0xFFD493 : 0x35505A, emissive: lit ? 0xFFB255 : 0, emissiveIntensity: lit ? 0.8 : 0 }));
    w.position.set(x, 6.6 + f * 3.4, 4.53); hall.add(w);
  }
  // big LED screen (KO + ZH)
  const ledC = textCanvas("한국 팝업 문화축제", "海南 海口 骑楼老街 · 韩国文化节", { f1: 64, f2: 38, bg: "#13235A", radius: 0, minW: 1200, c1: "#FFFFFF", c2: "#9FD3FF" });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(15, 7), new THREE.MeshBasicMaterial({ map: texOf(ledC.c) }));
  led.position.set(10, 8.4, 4.6); hall.add(led); stageLeds.push(led);
  box(15.6, 7.6, 0.3, dark, 10, 8.4, 4.4, hall);
  // name sign 夏南洋 · 骑楼烟火食集 (ZH) + Korean
  const nm = textCanvas("夏南洋 · 骑楼烟火食集", "샤난양 · 기루 먹거리 마켓", { f1: 54, f2: 32, bg: "#2B1F17", border: "#C89B5A", radius: 8, c1: "#F6E2B8", c2: "#F2B84B" });
  const ns = new THREE.Mesh(new THREE.PlaneGeometry(12, 12 * nm.H / nm.W), new THREE.MeshBasicMaterial({ map: texOf(nm.c) }));
  ns.position.set(-11, 11.2, 4.6); hall.add(ns);
  // vertical red signboards (老爸茶 etc.)
  [["老爸茶", -19.5], ["海南粉", -15.5], ["非遗老爸茶", 21.4]].forEach(([tx, x]) => {
    const c = document.createElement("canvas"); c.width = 96; c.height = 64 + tx.length * 80;
    const k = c.getContext("2d"); k.fillStyle = "#9E2318"; k.fillRect(0, 0, c.width, c.height);
    k.strokeStyle = "#F2B84B"; k.lineWidth = 6; k.strokeRect(5, 5, c.width - 10, c.height - 10);
    k.fillStyle = "#FFE7A8"; k.font = `800 64px ${FONT}`; k.textAlign = "center"; k.textBaseline = "middle";
    [...tx].forEach((ch, j) => k.fillText(ch, 48, 72 + j * 80));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.2 * c.height / c.width), new THREE.MeshBasicMaterial({ map: texOf(c) }));
    m.position.set(x, 8.4, 4.75); hall.add(m);
  });
  // glass block to the west (behind-left in the render)
  box(14, 18, 12, glassM, -33, 9, -28, g);
  for (let f = 1; f < 6; f++) box(14.1, 0.3, 12.1, M(0xD8DEE2), -33, f * 3.2, -28, g);
  // north-east angled building (plan top-right)
  const ne = new THREE.Group(); ne.position.set(29, 0, -18); ne.rotation.y = -Math.PI / 4; g.add(ne);
  box(12, 9, 6, stone, 0, 4.5, 0, ne);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({ color: 0xFFC67A, transparent: true, opacity: 0.5 })); w.position.set(-4.5 + i * 3, 2, 3.02); ne.add(w); }
  // residential towers far in the background (west / north-west)
  [[-70, -70, 9, 62], [-56, -82, 9, 74], [-40, -92, 9, 68], [-84, -54, 9, 56], [-24, -96, 8, 58]].forEach(([x, z, w, h], i) => {
    box(w, h, w, M(i % 2 ? 0xB9C0C6 : 0xA9B2BA), x, h / 2, z, g);
    for (let f = 4; f < h; f += 3) { if ((f + i) % 2) continue; const win = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xFFD493, emissive: 0xFFB255, emissiveIntensity: 0.6 })); win.position.set(x, f, z + w / 2 + 0.02); g.add(win); }
  });
}
function buildVenueA() {
  const g = new THREE.Group();
  // stone plaza with tile grid
  const c = document.createElement("canvas"); c.width = c.height = 256;
  const x = c.getContext("2d"); x.fillStyle = "#5B6166"; x.fillRect(0, 0, 256, 256);
  x.strokeStyle = "rgba(255,255,255,.09)"; x.lineWidth = 2;
  for (let i = 0; i <= 256; i += 32) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 256); x.stroke(); x.beginPath(); x.moveTo(0, i); x.lineTo(256, i); x.stroke(); }
  const gt = texOf(c); gt.wrapS = gt.wrapT = THREE.RepeatWrapping; gt.repeat.set(16, 12);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 48), new THREE.MeshStandardMaterial({ map: gt, roughness: 0.95 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; g.add(ground);
  // walkway (Qilou street) at south
  const walk = new THREE.Mesh(new THREE.PlaneGeometry(64, 5), M(0x6E655A));
  walk.rotation.x = -Math.PI / 2; walk.position.set(0, 0.01, 21.5); walk.receiveShadow = true; g.add(walk);
  buildXiaNanyang(g);

  const A = window.BOOTHS.A, byId = Object.fromEntries(A.map(b => [b.id, b]));
  // top row: 4,3,2,1 (west→east), facing south
  [["4", -9], ["3", -4.4], ["2", 0.2], ["1", 4.8]].forEach(([id, bx]) => makeBooth(byId[id], g, bx, -13, 0));
  // west column 5..9 facing east
  ["5", "6", "7", "8", "9"].forEach((id, i) => makeBooth(byId[id], g, -19, -7.6 + i * 4.6, Math.PI / 2));

  // parasol dining area 4x4
  for (let r = 0; r < 4; r++) for (let cc = 0; cc < 4; cc++) {
    const p = parasolSet(); p.position.set(-10 + cc * 4.2, 0, -5.5 + r * 4.2); p.rotation.y = (r + cc) * 0.4; g.add(p);
  }
  landmark("parasol", g, -3.7, 4.6, 1);

  // culture stage (faces west)
  const st = new THREE.Group(); st.position.set(14, 0, -2); st.rotation.y = -Math.PI / 2; g.add(st);
  box(8.5, 0.6, 7, M(0x1F2429), 0, 0.3, 0, st);
  box(8.5, 0.04, 7, M(0x3A2A4E, { roughness: 0.4 }), 0, 0.62, 0, st);
  for (let k = 0; k < 3; k++) box(7, 0.2 * (3 - k), 0.3, M(0x2A3036), 0, 0.1 * (3 - k), 3.65 + k * 0.3, st);
  const truss = M(0xB8BEC4, { metalness: 0.6, roughness: 0.4 });
  [-4.3, 4.3].forEach(px => box(0.45, 5.8, 0.45, truss, px, 2.9, -3.3, st));
  box(9.1, 0.45, 0.45, truss, 0, 5.8, -3.3, st);
  box(9.1, 0.3, 0.3, truss, 0, 5.8, 0.4, st);
  [-4.3, 4.3].forEach(px => box(0.3, 0.3, 3.8, truss, px, 5.8, -1.45, st));
  for (let k = 0; k < 6; k++) {
    const sp = cyl(0.14, 0.2, 0.4, new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xFFE7B0, emissiveIntensity: 0.7 }), 8);
    sp.position.set(-3.2 + k * 1.3, 5.45, 0.4); st.add(sp);
  }
  const ledC = textCanvas("K-CULTURE STAGE", "韩国文化演出", { f1: 46, f2: 34, bg: "#1B1236", radius: 0, minW: 900, c1: "#FFFFFF", c2: "#FF8ED0" });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.4), new THREE.MeshBasicMaterial({ map: texOf(ledC.c) }));
  led.position.set(0, 2.9, -3.15); st.add(led); stageLeds.push(led);
  [-3.6, 3.6].forEach(px => box(0.8, 1.6, 0.8, M(0x16191C), px, 1.4, 2.6, st));
  landmark("stage", g, 14, 7.8, -2);

  // festival gate (hanok style) at south entry
  buildGate(g, -2, 17.5, 0, "한국문화제", "韩国文化节");
  landmark("gate", g, -2, 9.4, 17.5, 1.25);

  // lantern strings
  const p1 = pole(-22, -16, 5, g), p2 = pole(-22, 16, 5, g), p3 = pole(9, -16, 5, g), p4 = pole(9, 12, 5, g), p5 = pole(-12, 12, 5, g);
  lanternString([p1, p3], g, 12); lanternString([p5, p4], g, 12); lanternString([p1, p2], g, 12);
  lanternString([new THREE.Vector3(-12, 5, -14), p5], g, 10);

  // greenery: palms + round trees along edges
  [[-28, -12], [-28, -2], [-28, 8], [-27, 16], [24, 12], [26, 17], [20, 18], [-12, 20], [8, 20]].forEach(([px, pz], i) => { const p = palm(6 + (i % 3), 0.2 + (i % 2) * 0.1); p.position.set(px, 0, pz); p.rotation.y = i; g.add(p); });
  [[-25, 18], [17, 19], [27, 6]].forEach(([px, pz]) => { const t = roundTree(1); t.position.set(px, 0, pz); g.add(t); });
  landmark("qilou", g, -6, 21.5, -25, 1.5);
  landmark("entry", g, -2, 3.2, 21.5, 1.0);

  g.userData = { cam: new THREE.Vector3(26, 34, 46), target: new THREE.Vector3(-2, 0, 1) };
  return g;
}
function buildGate(parent, x, z, rotY, ko, zh) {
  const gt = new THREE.Group(); gt.position.set(x, 0, z); gt.rotation.y = rotY; parent.add(gt);
  const red = M(0xA82A22), green = M(0x2F6B5A), tile = M(0x24303A, { roughness: 0.55 });
  [-4.1, -3.3, 3.3, 4.1].forEach(px => { const p = cyl(0.3, 0.3, 5, red, 14); p.position.set(px, 2.5, 0); gt.add(p); const b = cyl(0.42, 0.42, 0.35, M(0x8E8A82), 14); b.position.set(px, 0.17, 0); gt.add(b); });
  box(9.4, 0.5, 0.6, red, 0, 4.75, 0, gt);
  box(9.0, 0.55, 1.0, green, 0, 5.25, 0, gt);
  box(9.6, 0.15, 3.4, M(0x1C242C), 0, 5.6, 0, gt);
  const roof = hipRoof(5.1, 2.0, 1.6, tile); roof.position.y = 6.4; gt.add(roof);
  box(5.4, 0.35, 0.4, M(0x1C242C), 0, 7.15, 0, gt);
  [-2.7, 2.7].forEach(px => { const o = new THREE.Mesh(new THREE.ConeGeometry(0.25, 0.8, 6), M(0x1C242C)); o.position.set(px, 7.4, 0); o.rotation.z = px > 0 ? -0.5 : 0.5; gt.add(o); });
  const sc = textCanvas(ko, zh + " · K-Culture Festival", { f1: 48, f2: 28, bg: "#0E2A52", border: "#F2B84B", radius: 10, minW: 640 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8 * sc.H / sc.W), new THREE.MeshBasicMaterial({ map: texOf(sc.c) }));
  sign.position.set(0, 4.05, 0.32); gt.add(sign);
  const back = sign.clone(); back.rotation.y = Math.PI; back.position.z = -0.32; gt.add(back);
  return gt;
}
const stageLeds = [];

/* ---------- venue B: Wanning Shenzhou Peninsula ---------- */
let seaMat, ringMat;
function buildVenueB() {
  const g = new THREE.Group();
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(96, 64), new THREE.MeshStandardMaterial({ color: 0xC7B08A, roughness: 1 }));
  sand.rotation.x = -Math.PI / 2; sand.position.z = -4; sand.receiveShadow = true; g.add(sand);
  // event deck (plaza)
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(72, 40), M(0x6F6A63));
  deck.rotation.x = -Math.PI / 2; deck.position.set(0, 0.02, -1); deck.receiveShadow = true; g.add(deck);
  // boardwalk
  box(80, 0.12, 3, M(0x8A6A4A), 0, 0.06, 21, g);
  // sea
  seaMat = new THREE.MeshStandardMaterial({ color: 0x1D5D78, roughness: 0.25, metalness: 0.2, emissive: 0x082C3A, emissiveIntensity: 0.4 });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(260, 120), seaMat);
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.15, 88); g.add(sea);
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(260, 1.4), new THREE.MeshBasicMaterial({ color: 0xE8F4F2, transparent: true, opacity: 0.6 }));
  foam.rotation.x = -Math.PI / 2; foam.position.set(0, -0.1, 28.6); g.add(foam);
  const shore = new THREE.Mesh(new THREE.PlaneGeometry(260, 12), new THREE.MeshStandardMaterial({ color: 0xD8C39C, roughness: 1 }));
  shore.rotation.x = -Math.PI / 2; shore.position.set(0, -0.05, 28); g.add(shore);
  // distant resort hotels (north) + hills
  [[-40, -46, 18, 22], [-14, -50, 26, 30], [16, -48, 20, 26], [42, -44, 16, 18]].forEach(([hx, hz, w, h], i) => {
    box(w, h, 10, M(i % 2 ? 0xE9E4DA : 0xDCD5C8), hx, h / 2, hz, g);
    for (let f = 2; f < h - 1; f += 2.4) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, 0.7), new THREE.MeshStandardMaterial({ color: 0xFFD493, emissive: 0xFFB255, emissiveIntensity: (f + i) % 3 < 1 ? 0.9 : 0.2 }));
      win.position.set(hx, f, hz + 5.02); g.add(win);
    }
  });
  [[-70, -70, 28], [-20, -80, 34], [40, -78, 30], [80, -66, 24]].forEach(([hx, hz, r]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2C5A44));
    hill.position.set(hx, -2, hz); hill.scale.y = 0.5; g.add(hill);
  });

  const Bb = window.BOOTHS.B;
  Bb.slice(0, 10).forEach((b, i) => makeBooth(b, g, -22.5 + i * 5, -17, 0));
  Bb.slice(10, 17).forEach((b, i) => makeBooth(b, g, -33, -10 + i * 4.6, Math.PI / 2));
  Bb.slice(17, 24).forEach((b, i) => makeBooth(b, g, 33, -10 + i * 4.6, -Math.PI / 2));

  // K-POP dance battle arena
  const arena = cyl(7, 7.3, 0.35, M(0x1A1F26, { roughness: 0.35 }), 48); arena.position.set(0, 0.17, -4); g.add(arena);
  ringMat = new THREE.MeshStandardMaterial({ color: 0xFF4FA3, emissive: 0xFF4FA3, emissiveIntensity: 1.6 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(7.05, 0.12, 8, 64), ringMat); ring.rotation.x = Math.PI / 2; ring.position.set(0, 0.36, -4); g.add(ring);
  const inner = new THREE.Mesh(new THREE.TorusGeometry(4.2, 0.07, 8, 64), new THREE.MeshStandardMaterial({ color: 0x34BFAC, emissive: 0x34BFAC, emissiveIntensity: 1.4 }));
  inner.rotation.x = Math.PI / 2; inner.position.set(0, 0.37, -4); g.add(inner);
  // little crowd ring around arena
  const crowdM = [M(0xE2483D), M(0xF4EFE6), M(0x2E64A8), M(0xF2B84B), M(0x34BFAC)];
  for (let i = 0; i < 46; i++) {
    const a = i / 46 * Math.PI * 2, r = 8.6 + (i % 3) * 0.7;
    const body = cyl(0.22, 0.26, 1.1, crowdM[i % 5], 6); body.position.set(Math.cos(a) * r, 0.55, -4 + Math.sin(a) * r); g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), M(0x2B2018)); head.position.set(Math.cos(a) * r, 1.3, -4 + Math.sin(a) * r); g.add(head);
  }
  landmark("arena", g, 0, 4.2, -4, 1.4);

  // main stage at south, facing north
  const st = new THREE.Group(); st.position.set(0, 0, 12.5); st.rotation.y = Math.PI; g.add(st);
  box(14, 1.1, 8, M(0x1F2429), 0, 0.55, 0, st);
  for (let k = 0; k < 3; k++) box(8, 0.35 * (3 - k), 0.4, M(0x2A3036), 0, 0.17 * (3 - k), 4.2 + k * 0.4, st);
  const truss = M(0xB8BEC4, { metalness: 0.6, roughness: 0.4 });
  [-7.2, 7.2].forEach(px => box(0.6, 8.5, 0.6, truss, px, 4.25, -3.6, st));
  box(15, 0.6, 0.6, truss, 0, 8.5, -3.6, st);
  box(15, 0.4, 0.4, truss, 0, 8.5, 1.5, st);
  const ledC = textCanvas("K-POP MAIN STAGE", "海南中韩文化美食嘉年华", { f1: 52, f2: 36, bg: "#160F33", radius: 0, minW: 1100, c1: "#FFFFFF", c2: "#7FE8D8" });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.4), new THREE.MeshBasicMaterial({ map: texOf(ledC.c) }));
  led.position.set(0, 4.4, -3.4); st.add(led); stageLeds.push(led);
  [-6, 6].forEach(px => box(1.1, 2.6, 1.1, M(0x16191C), px, 2.4, 2.8, st));
  landmark("main", g, 0, 11.2, 12.5, 1.4);

  // parasols along the sides of the arena
  [[-18, -6], [-18, 0], [-18, 6], [18, -6], [18, 0], [18, 6], [-12, 8], [12, 8]].forEach(([px, pz], i) => { const p = parasolSet(); p.position.set(px, 0, pz); p.rotation.y = i; g.add(p); });

  // beach photo zone: giant frame
  const pz = new THREE.Group(); pz.position.set(-26, 0, 17); pz.rotation.y = 0.5; g.add(pz);
  const fr = M(0xF4EFE6);
  box(0.4, 4.2, 0.4, fr, -2.2, 2.1, 0, pz); box(0.4, 4.2, 0.4, fr, 2.2, 2.1, 0, pz); box(4.8, 0.4, 0.4, fr, 0, 4.2, 0, pz);
  const heart = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xE2483D, emissive: 0xE2483D, emissiveIntensity: 1 }));
  heart.position.set(0, 4.9, 0); pz.add(heart);
  landmark("photo", g, -26, 7.4, 17, 1.1);

  buildGate(g, 24, 21, 0, "한국문화제", "韩国文化节");
  landmark("gate", g, 24, 9.4, 21, 1.2);

  // lantern strings over the plaza
  const q = [pole(-28, -21, 6, g), pole(-28, 16, 6, g), pole(28, -21, 6, g), pole(28, 16, 6, g)];
  lanternString([q[0], q[2]], g, 18); lanternString([q[1], q[3]], g, 18); lanternString([q[0], q[1]], g, 14); lanternString([q[2], q[3]], g, 14);

  // palms
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const px = i < 14 ? -44 + i * 6.8 : side * (40 + (i % 3) * 3);
    const pzz = i < 14 ? 25 + (i % 3) * 1.6 : -20 + (i - 14) * 3.5;
    const p = palm(6.5 + (i % 4), 0.2 + (i % 3) * 0.12); p.position.set(px, 0, pzz); p.rotation.y = i * 1.3; g.add(p);
  }
  landmark("sea", g, 0, 2.5, 46, 1.8);
  g.userData = { cam: new THREE.Vector3(40, 46, 66), target: new THREE.Vector3(0, 0, 0) };
  return g;
}

/* ---------- build ---------- */
const venues = { A: buildVenueA(), B: buildVenueB() };
scene.add(venues.A, venues.B);
let current = "A";
venues.B.visible = false;

function camTo(pos, target, instant) {
  tween = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: target.clone(), k: instant ? 1 : 0 };
  if (instant) { camera.position.copy(pos); controls.target.copy(target); tween = null; }
}
let tween = null;
function setVenue(v) {
  current = v;
  venues.A.visible = v === "A"; venues.B.visible = v === "B";
  setActive(null);
  camTo(venues[v].userData.cam, venues[v].userData.target, false);
}
let active = null;
function setActive(id) {
  if (active && boothIndex[active]) {
    const o = boothIndex[active];
    o.marker.material.map = markerTexture(o.booth.id, o.booth.st, false); o.marker.scale.set(1.7, 1.7, 1);
  }
  active = id;
  if (id && boothIndex[id]) {
    const o = boothIndex[id];
    o.marker.material.map = markerTexture(o.booth.id, o.booth.st, true); o.marker.scale.set(2.3, 2.3, 1);
  }
}
function focus(id) {
  const o = boothIndex[id]; if (!o) return;
  const v = id.startsWith("B") ? "B" : "A";
  if (v !== current) { current = v; venues.A.visible = v === "A"; venues.B.visible = v === "B"; }
  setActive(id);
  const wp = new THREE.Vector3(); o.group.getWorldPosition(wp);
  const fwd = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.group.rotation.y);
  const pos = wp.clone().add(fwd.multiplyScalar(13)).add(new THREE.Vector3(0, 9, 0));
  camTo(pos, wp.clone().add(new THREE.Vector3(0, 2, 0)), false);
  controls.autoRotate = false;
  document.getElementById("btn-rotate").setAttribute("aria-pressed", "false");
}

/* ---------- interaction ---------- */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
let downXY = null, hoverId = null;
function pick(ev) {
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(boothMeshes.filter(m => (m.userData.boothId.startsWith("B") ? "B" : "A") === current), false);
  return hits.length ? hits[0].object.userData.boothId : null;
}
renderer.domElement.addEventListener("pointerdown", e => { downXY = [e.clientX, e.clientY]; renderer.domElement.classList.add("grabbing"); });
window.addEventListener("pointerup", e => {
  renderer.domElement.classList.remove("grabbing");
  if (!downXY) return;
  const moved = Math.hypot(e.clientX - downXY[0], e.clientY - downXY[1]);
  downXY = null;
  if (moved > 6 || e.target !== renderer.domElement) return;
  const id = pick(e);
  if (id) { focus(id); window.App.select(id); }
});
renderer.domElement.addEventListener("pointermove", e => {
  if (downXY) return;
  const id = pick(e);
  if (id !== hoverId) { hoverId = id; renderer.domElement.classList.toggle("pointer", !!id); }
});
controls.addEventListener("start", () => { tween = null; });

/* ---------- resize + loop ---------- */
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();
camTo(venues.A.userData.cam, venues.A.userData.target, true);

const clock = new THREE.Clock();
let visible = true;
new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: "100px" }).observe(stage);
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduce) controls.autoRotate = false;
function loop() {
  requestAnimationFrame(loop);
  if (!visible) return;
  const t = clock.getElapsedTime();
  if (tween) {
    tween.k = Math.min(1, tween.k + 0.035);
    const e = 1 - Math.pow(1 - tween.k, 3);
    camera.position.lerpVectors(tween.p0, tween.p1, e);
    controls.target.lerpVectors(tween.t0, tween.t1, e);
    if (tween.k >= 1) tween = null;
  }
  if (!reduce) {
    for (const id in boothIndex) { const o = boothIndex[id]; o.marker.position.y = o.baseY + Math.sin(t * 2 + id.length + id.charCodeAt(id.length - 1)) * 0.15; }
    if (ringMat) ringMat.emissive.setHSL((t * 0.08) % 1, 0.85, 0.55);
    if (seaMat) seaMat.emissiveIntensity = 0.35 + Math.sin(t * 0.8) * 0.08;
    lanternMeshes.forEach((l, i) => { l.material.emissiveIntensity = 1 + Math.sin(t * 2 + i) * 0.25; });
  }
  controls.update();
  renderer.render(scene, camera);
}
loadingEl.remove();
loop();

window.Map3D = {
  setVenue,
  focus,
  reset() { setActive(null); controls.autoRotate = document.getElementById("btn-rotate").getAttribute("aria-pressed") === "true"; camTo(venues[current].userData.cam, venues[current].userData.target, false); },
  setRotate(on) { controls.autoRotate = on && !reduce; },
  setLang() { /* signs are always bilingual KO + ZH */ }
};
// sync with any state chosen before the module loaded
if (window.App.state.venue !== "A") setVenue(window.App.state.venue);
if (window.App.state.sel) focus(window.App.state.sel);
