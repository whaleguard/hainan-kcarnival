import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

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
renderer.toneMappingExposure = 0.92;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1B2236);
scene.fog = new THREE.Fog(0x2A2C45, 120, 330);
{ const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.12; }

/* ---------- photo textures made with GPT (fallback colours until loaded) ---------- */
const texLoader = new THREE.TextureLoader();
function loadTex(url, cb) {
  texLoader.load(url, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); cb(t); }, undefined, () => {});
}
function loadImg(url, cb) { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => cb(im); im.src = url; }
const ROOF_MAT = new THREE.MeshStandardMaterial({ color: 0x2A3038, roughness: 0.7, metalness: 0.05 });
const BOOTH_FRONT_MAT = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, transparent: true, opacity: 0, emissive: 0xffffff, emissiveIntensity: 0.18 });
loadTex("tex-roof.jpg", t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); ROOF_MAT.map = t; ROOF_MAT.color.set(0xb8b8b8); ROOF_MAT.needsUpdate = true; });
loadTex("tex-booth.jpg", t => { t.offset.set(0.03, 0.03); t.repeat.set(0.94, 0.94); BOOTH_FRONT_MAT.map = t; BOOTH_FRONT_MAT.emissiveMap = t; BOOTH_FRONT_MAT.opacity = 1; BOOTH_FRONT_MAT.transparent = false; BOOTH_FRONT_MAT.needsUpdate = true; });
function backdrop(url, parent, radius, repeats) {
  loadTex(url, t => {
    t.wrapS = THREE.MirroredRepeatWrapping; t.repeat.set(repeats, 1);
    const H = (2 * Math.PI * radius) / repeats / (t.image.width / t.image.height);
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, H, 96, 1, true), new THREE.MeshBasicMaterial({ map: t, side: THREE.BackSide, fog: false }));
    m.position.y = H / 2 - H * 0.25 - 2; parent.add(m);
    if (parent.userData.onBackdrop) parent.userData.onBackdrop();
  });
}
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
const WALK_PAGE = !!window.WALK_PAGE;
if (!WALK_PAGE) { controls.enableZoom = false; renderer.domElement.style.touchAction = "pan-y"; } // overview on the long page never hijacks page scroll

/* lights: tropical dusk */
scene.add(new THREE.HemisphereLight(0xBFD9E6, 0x3A2A22, 0.85));
const sun = new THREE.DirectionalLight(0xFFC89A, 1.25);
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
  const g = new THREE.Group(); g.userData.solidR = 0.35;
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
  const g = new THREE.Group(); g.userData.solidR = 0.8 * s;
  const t = cyl(0.18 * s, 0.25 * s, 2 * s, M(0x6B4F3A), 7); t.position.y = s; g.add(t);
  const lm = M(0x2F6B45);
  [[0, 2.6, 0, 1.5], [0.8, 2.3, 0.3, 1.1], [-0.7, 2.4, -0.3, 1.15]].forEach(([x, y, z, r]) => {
    const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), lm);
    b.position.set(x * s, y * s, z * s); b.castShadow = true; g.add(b);
  });
  return g;
}
function parasolSet() {
  const g = new THREE.Group(); g.userData.solidR = 0.95;
  const top = cyl(0.55, 0.55, 0.06, M(0xE9E2D3), 16); top.position.y = 0.75; g.add(top);
  const leg = cyl(0.05, 0.05, 0.75, M(0x444A50), 6); leg.position.y = 0.37; g.add(leg);
  const pole = cyl(0.04, 0.04, 2.5, M(0xCFC8BA), 6); pole.position.y = 1.4; g.add(pole);
  const can = new THREE.Mesh(new THREE.ConeGeometry(1.55, 0.55, 8, 1, true), M(0xD9D2C4, { side: THREE.DoubleSide, roughness: 0.9 }));
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
const menuBoards = [];
function drawMenuBoard(mb) {
  const items = window.MENU ? window.MENU.items(mb.b.id) : [];
  const W = 380, H = 532, c = document.createElement("canvas"); c.width = W; c.height = H; const x = c.getContext("2d");
  x.fillStyle = "#1E1A17"; x.fillRect(0, 0, W, H); x.strokeStyle = "#C89B5A"; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8);
  x.fillStyle = "#FFF6E6"; x.textAlign = "center"; x.font = `800 30px ${FONT}`; x.fillText(mb.b.name.ko, W / 2, 46);
  x.fillStyle = "#F2B84B"; x.font = `600 22px ${FONT}`; x.fillText(mb.b.name.zh, W / 2, 76);
  const rowH = Math.min(108, (H - 100) / Math.max(1, items.length));
  const pending = [];
  items.forEach((it, i) => {
    const y = 96 + i * rowH, src = window.MENU.img[it.sheet + ":" + it.cell];
    x.fillStyle = "#2C2622"; x.fillRect(16, y, W - 32, rowH - 10);
    if (src) pending.push(new Promise(res => { const im = new Image(); im.onload = () => { x.drawImage(im, 22, y + 6, rowH - 22, rowH - 22); res(); }; im.onerror = res; im.src = src; }));
    x.textAlign = "left"; x.fillStyle = "#FFF6E6"; x.font = `700 21px ${FONT}`; x.fillText(it.name("ko").slice(0, 11), rowH + 12, y + rowH / 2 - 6);
    x.fillStyle = "#C9BBA6"; x.font = `500 17px ${FONT}`; x.fillText(it.name("zh").slice(0, 12), rowH + 12, y + rowH / 2 + 18);
    x.textAlign = "right"; x.fillStyle = "#F2B84B"; x.font = `800 26px Outfit,${FONT}`; x.fillText("¥" + it.price, W - 26, y + rowH / 2 + 8);
  });
  Promise.all(pending).then(() => { const t = texOf(c); if (mb.mat.map) mb.mat.map.dispose(); mb.mat.map = t; mb.mat.needsUpdate = true; });
}
if (window.MENU) window.MENU.onReady(() => setTimeout(() => { menuBoards.forEach(drawMenuBoard); if (walk.booth) renderBoothView(walk.booth); }, 0));
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
  const roof = hipRoof(2.55, 2.55, 1.35, ROOF_MAT); roof.position.y = 3.72; g.add(roof);
  const front = new THREE.Mesh(new THREE.PlaneGeometry(3.96, 2.92), BOOTH_FRONT_MAT); front.position.set(0, 1.5, 2.0); g.add(front);
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
  hit.position.y = 2.5; hit.userData.boothId = b.id; hit.userData.solid = true; g.add(hit); boothMeshes.push(hit);
  // marker
  const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: markerTexture(b.id, b.st, false), depthTest: false, transparent: true }));
  marker.scale.set(1.7, 1.7, 1); marker.position.set(0, 6.1, 0); marker.renderOrder = 12; g.add(marker);
  const board = new THREE.Group(); board.position.set(1.45, 0, 2.95); board.rotation.y = -0.18; g.add(board);
  const bm = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.33), bm); face.position.set(0, 0.95, 0); face.rotation.x = -0.12; board.add(face);
  [-0.44, 0.44].forEach(x => box(0.05, 1.5, 0.05, M(0x3A2A1E), x, 0.72, -0.06, board));
  menuBoards.push({ b, mat: bm });
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


/* 夏南洋 front elevation photo (GPT T1): white sky keyed out, black LED rectangle detected and filled with the festival film */
let ledVideo = null;
function festivalVideoTexture() {
  if (!ledVideo) {
    ledVideo = document.createElement("video");
    Object.assign(ledVideo, { src: "hero.mp4", muted: true, loop: true, playsInline: true, crossOrigin: "anonymous" });
    ledVideo.setAttribute("playsinline", ""); ledVideo.play().catch(() => {});
  }
  const t = new THREE.VideoTexture(ledVideo); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function photoFacade(g, hall) {
  loadImg("tex-facade.jpg", im => {
    const W = im.naturalWidth, H = im.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, W, H), p = d.data;
    let minX = W, minY = H, maxX = 0, maxY = 0, top = H;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) {
      const k = (y * W + i) * 4, r = p[k], gg = p[k + 1], b = p[k + 2];
      if (r > 232 && gg > 232 && b > 232) { p[k + 3] = 0; continue; }
      if (y < top) top = y;
      if (r < 14 && gg < 14 && b < 14 && i > W * 0.12 && i < W * 0.88 && y > H * 0.1 && y < H * 0.8) {
        if (i < minX) minX = i; if (i > maxX) maxX = i; if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    x.putImageData(d, 0, 0);
    const tex = texOf(c);
    const PW = 46, PH = PW * H / W;
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: 0.5, roughness: 0.85, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.35 });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(PW, PH), mat);
    const fg = new THREE.Group(); fg.position.set(0, 0, -24); g.add(fg); fg.userData.solid = true; window.Map3D && window.Map3D._dirty && window.Map3D._dirty();
    face.position.set(0, PH / 2, 4.65); fg.add(face);
    // massing behind the photo so the building has depth from oblique views
    const bodyTop = PH * (1 - (top / H)) * 0.68;
    box(PW - 0.2, bodyTop, 10, M(0xCFC6B4), 0, bodyTop / 2, -0.4, fg);
    const gable = new THREE.Shape(); gable.moveTo(-PW / 2, 0); gable.lineTo(0, PH * (1 - top / H) - bodyTop); gable.lineTo(PW / 2, 0); gable.lineTo(-PW / 2, 0);
    const gGeo = new THREE.ExtrudeGeometry(gable, { depth: 10, bevelEnabled: false }); gGeo.translate(0, 0, -5.4);
    const gm = new THREE.Mesh(gGeo, M(0x3B3F44, { roughness: 0.6 })); gm.position.y = bodyTop; gm.castShadow = true; fg.add(gm);
    if (maxX > minX && maxY > minY) {
      const lw = (maxX - minX) / W * PW, lh = (maxY - minY) / H * PH;
      const lx = ((minX + maxX) / 2 / W - 0.5) * PW, ly = PH - (minY + maxY) / 2 / H * PH;
      const led = new THREE.Mesh(new THREE.PlaneGeometry(lw, lh), new THREE.MeshBasicMaterial({ map: festivalVideoTexture(), toneMapped: false }));
      led.position.set(lx, ly, 4.7); fg.add(led);
    }
    hall.visible = false;
  });
}

/* tourists from the GPT chroma-key sheet (T8): keyed to alpha, cut into 10 figures, scattered as billboards */
function loadPeople(cb) {
  loadImg("people.png", im => {
    const W = im.naturalWidth, H = im.naturalHeight;
    const c = document.createElement("canvas"); c.width = W; c.height = H;
    const x = c.getContext("2d"); x.drawImage(im, 0, 0);
    const d = x.getImageData(0, 0, W, H), p = d.data;
    for (let k = 0; k < p.length; k += 4) {
      const r = p[k], gg = p[k + 1], b = p[k + 2];
      if (gg > 120 && gg > r * 1.35 && gg > b * 1.35) p[k + 3] = 0;
      else if (gg > r && gg > b) p[k + 1] = Math.max(r, b);   // de-spill green fringe
    }
    x.putImageData(d, 0, 0);
    const figs = [];
    for (let row = 0; row < 2; row++) for (let col = 0; col < 5; col++) {
      const cx = Math.round(col * W / 5), cy = Math.round(row * H / 2), cw = Math.round(W / 5), ch = Math.round(H / 2);
      const cd = x.getImageData(cx, cy, cw, ch).data;
      let x0 = cw, y0 = ch, x1 = 0, y1 = 0;
      for (let yy = 0; yy < ch; yy++) for (let xx = 0; xx < cw; xx++) if (cd[(yy * cw + xx) * 4 + 3] > 40) { if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; }
      if (x1 - x0 < 10 || y1 - y0 < 30) continue;
      const fc = document.createElement("canvas"); fc.width = x1 - x0 + 1; fc.height = y1 - y0 + 1;
      fc.getContext("2d").drawImage(c, cx + x0, cy + y0, fc.width, fc.height, 0, 0, fc.width, fc.height);
      figs.push({ tex: texOf(fc), aspect: fc.width / fc.height });
    }
    if (figs.length) cb(figs);
  });
}
/* crowd agents: every visitor sprite strolls between free spots, pauses, looks around; the stage audience cheers in place */
const crowd = [];
function scatterPeople(parent, figs, n, area, avoid, seed, mode = "roam") {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
  const mats = figs.map(f => new THREE.SpriteMaterial({ map: f.tex, alphaTest: 0.5 }));
  let placed = 0, tries = 0;
  while (placed < n && tries < n * 20) {
    tries++;
    const px = area[0] + rnd() * (area[1] - area[0]), pz = area[2] + rnd() * (area[3] - area[2]);
    if (avoid.some(a => px > a[0] && px < a[1] && pz > a[2] && pz < a[3])) continue;
    const i = Math.floor(rnd() * figs.length), h = 1.55 + rnd() * 0.3;
    const sp = new THREE.Sprite(mats[i]); sp.center.set(0.5, 0); sp.scale.set(h * figs[i].aspect, h, 1); sp.position.set(px, 0.02, pz);
    parent.add(sp); placed++;
    crowd.push({ sp, key: parent.userData.key, area, mode, w: h * figs[i].aspect, speed: 0.75 + rnd() * 0.65, tx: px, tz: pz,
      wait: rnd() * 5, phase: rnd() * 6.28, hop: mode === "audience" && rnd() < 0.55, seed: rnd() });
  }
}
const crowdCols = {};
function collidersFor(key) {
  const now = performance.now(), c = crowdCols[key];
  if (c && now - c.t < 12000) return c.list;
  const v = venues[key]; v.updateMatrixWorld(true);
  const list = [], box3 = new THREE.Box3(), wp = new THREE.Vector3();
  v.traverse(o => {
    if (o.userData.solid) { box3.setFromObject(o, true); if (isFinite(box3.min.x)) list.push({ t: "b", x0: box3.min.x, x1: box3.max.x, z0: box3.min.z, z1: box3.max.z }); }
    else if (o.userData.solidR) { o.getWorldPosition(wp); list.push({ t: "c", x: wp.x, z: wp.z, r: o.userData.solidR }); }
  });
  crowdCols[key] = { t: now, list };
  return list;
}
function crowdFree(key, area, x, z) {
  if (x < area[0] || x > area[1] || z < area[2] || z > area[3]) return false;
  for (const c of collidersFor(key)) {
    if (c.t === "b") { if (x > c.x0 - 0.3 && x < c.x1 + 0.3 && z > c.z0 - 0.3 && z < c.z1 + 0.3) return false; }
    else if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + 0.3) ** 2) return false;
  }
  return true;
}
function crowdPath(a, tx, tz) {
  const x0 = a.sp.position.x, z0 = a.sp.position.z, d = Math.hypot(tx - x0, tz - z0), n = Math.ceil(d / 0.5);
  for (let k = 1; k <= n; k++) if (!crowdFree(a.key, a.area, x0 + (tx - x0) * k / n, z0 + (tz - z0) * k / n)) return false;
  return true;
}
const _camR = new THREE.Vector3();
function updateCrowd(dt, t) {
  if (!dt || !crowd.length) return;
  _camR.setFromMatrixColumn(camera.matrixWorld, 0);
  for (const a of crowd) {
    if (a.key !== current) continue;
    const p = a.sp.position;
    if (a.mode === "audience") { p.y = 0.02 + (a.hop ? Math.max(0, Math.sin(t * 5.5 + a.seed * 20)) * 0.12 : 0); continue; }
    if (a.wait > 0) { a.wait -= dt; p.y = 0.02; continue; }
    const dx = a.tx - p.x, dz = a.tz - p.z, d = Math.hypot(dx, dz);
    if (d < 0.1) {
      a.wait = 1 + Math.random() * 5;
      for (let k = 0; k < 6; k++) {
        const nx = p.x + (Math.random() - 0.5) * 14, nz = p.z + (Math.random() - 0.5) * 14;
        if (crowdFree(a.key, a.area, nx, nz) && crowdPath(a, nx, nz)) { a.tx = nx; a.tz = nz; break; }
      }
      continue;
    }
    const step = Math.min(d, a.speed * dt);
    p.x += dx / d * step; p.z += dz / d * step;
    a.phase += dt * a.speed * 7;
    p.y = 0.02 + Math.abs(Math.sin(a.phase)) * 0.05;
    const side = (dx * _camR.x + dz * _camR.z) / d;
    if (Math.abs(side) > 0.25) a.sp.scale.x = (side < 0 ? -1 : 1) * a.w;
  }
}

/* 夏南洋·骑楼烟火食集 (骑楼北广场) — reference: organizer's site render + plan */
function buildXiaNanyang(g) {
  const cream = M(0xE9DFCC), stone = M(0xCFC4B0), dark = M(0x2A2420), roofM = M(0x3B3F44, { roughness: 0.6 }), glassM = M(0x4F7486, { roughness: 0.15, metalness: 0.5 });
  // main hall along the north edge
  const hall = new THREE.Group(); hall.position.set(0, 0, -24); g.add(hall); hall.userData.solid = true;
  photoFacade(g, hall);
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
  box(14, 18, 12, glassM, -33, 9, -28, g).userData.solid = true;
  for (let f = 1; f < 6; f++) box(14.1, 0.3, 12.1, M(0xD8DEE2), -33, f * 3.2, -28, g);
  // north-east angled building (plan top-right)
  const ne = new THREE.Group(); ne.position.set(29, 0, -18); ne.rotation.y = -Math.PI / 4; g.add(ne); ne.userData.solid = true;
  box(12, 9, 6, stone, 0, 4.5, 0, ne);
  for (let i = 0; i < 4; i++) { const w = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), new THREE.MeshBasicMaterial({ color: 0xFFC67A, transparent: true, opacity: 0.5 })); w.position.set(-4.5 + i * 3, 2, 3.02); ne.add(w); }
  // residential towers far in the background (west / north-west) — replaced by the photo skyline once it loads
  const towers = new THREE.Group(); g.add(towers); g.userData.onBackdrop = () => { towers.visible = false; };
  [[-70, -70, 9, 62], [-56, -82, 9, 74], [-40, -92, 9, 68], [-84, -54, 9, 56], [-24, -96, 8, 58]].forEach(([x, z, w, h], i) => {
    box(w, h, w, M(i % 2 ? 0xB9C0C6 : 0xA9B2BA), x, h / 2, z, towers);
    for (let f = 4; f < h; f += 3) { if ((f + i) % 2) continue; const win = new THREE.Mesh(new THREE.PlaneGeometry(w - 1.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xFFD493, emissive: 0xFFB255, emissiveIntensity: 0.6 })); win.position.set(x, f, z + w / 2 + 0.02); towers.add(win); }
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
  const groundMat = new THREE.MeshStandardMaterial({ map: gt, roughness: 0.9 });
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(64, 48), groundMat);
  loadTex("tex-paving.jpg", t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(16, 12); groundMat.map = t; groundMat.color.set(0x7d7d7d); groundMat.needsUpdate = true; });
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
  const st = new THREE.Group(); st.position.set(14, 0, -2); st.rotation.y = -Math.PI / 2; g.add(st); st.userData.solid = true;
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

  backdrop("bg-haikou.jpg", g, 170, 3);
  loadPeople(figs => {
    scatterPeople(g, figs, 120, [-16, 11, -10, 20], [[-21.5, -16.5, -10, 13], [-11.5, 7.5, -15.5, -10.5], [9, 19, -7, 3], [-7, 3, 16, 19]], 7);
    scatterPeople(g, figs, 34, [6, 9.5, -6, 3], [], 11, "audience");  // audience in front of the stage
  });
  Object.assign(g.userData, { key: "A", cam: new THREE.Vector3(26, 34, 46), target: new THREE.Vector3(-2, 0, 1) });
  return g;
}
function buildGate(parent, x, z, rotY, ko, zh) {
  const gt = new THREE.Group(); gt.position.set(x, 0, z); gt.rotation.y = rotY; parent.add(gt);
  const red = M(0xA82A22), green = M(0x2F6B5A), tile = M(0x24303A, { roughness: 0.55 });
  [-4.1, -3.3, 3.3, 4.1].forEach(px => { const p = cyl(0.3, 0.3, 5, red, 14); p.position.set(px, 2.5, 0); gt.add(p); p.userData.solid = true; const b = cyl(0.42, 0.42, 0.35, M(0x8E8A82), 14); b.position.set(px, 0.17, 0); gt.add(b); });
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
  const sandMat = new THREE.MeshStandardMaterial({ color: 0xC7B08A, roughness: 1 });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(96, 64), sandMat);
  loadTex("tex-sand.jpg", t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 10); sandMat.map = t; sandMat.color.set(0xa89a82); sandMat.needsUpdate = true; });
  sand.rotation.x = -Math.PI / 2; sand.position.z = -4; sand.receiveShadow = true; g.add(sand);
  // event deck (plaza)
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x7A756E, roughness: 0.9 });
  const deck = new THREE.Mesh(new THREE.PlaneGeometry(72, 40), deckMat);
  loadTex("tex-paving.jpg", t => { const tt = t.clone(); tt.wrapS = tt.wrapT = THREE.RepeatWrapping; tt.repeat.set(18, 10); tt.needsUpdate = true; deckMat.map = tt; deckMat.color.set(0x7d7d7d); deckMat.needsUpdate = true; });
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
  // distant resort hotels (north) + hills — hotels give way to the photo backdrop once it loads
  const hotels = new THREE.Group(); g.add(hotels); g.userData.onBackdrop = () => { hotels.visible = false; };
  [[-40, -46, 18, 22], [-14, -50, 26, 30], [16, -48, 20, 26], [42, -44, 16, 18]].forEach(([hx, hz, w, h], i) => {
    box(w, h, 10, M(i % 2 ? 0xE9E4DA : 0xDCD5C8), hx, h / 2, hz, hotels);
    for (let f = 2; f < h - 1; f += 2.4) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, 0.7), new THREE.MeshStandardMaterial({ color: 0xFFD493, emissive: 0xFFB255, emissiveIntensity: (f + i) % 3 < 1 ? 0.9 : 0.2 }));
      win.position.set(hx, f, hz + 5.02); hotels.add(win);
    }
  });
  [[-70, -70, 28], [-20, -80, 34], [40, -78, 30], [80, -66, 24]].forEach(([hx, hz, r]) => {
    const hill = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x2C5A44));
    hill.position.set(hx, -2, hz); hill.scale.y = 0.5; hotels.add(hill);
  });

  const Bb = window.BOOTHS.B;
  Bb.slice(0, 10).forEach((b, i) => makeBooth(b, g, -22.5 + i * 5, -17, 0));
  Bb.slice(10, 17).forEach((b, i) => makeBooth(b, g, -33, -10 + i * 4.6, Math.PI / 2));
  Bb.slice(17, 24).forEach((b, i) => makeBooth(b, g, 33, -10 + i * 4.6, -Math.PI / 2));

  // same principle as the organizer's Haikou plan: one stage on the right, parasol dining in the middle
  // main stage (K-POP dance battle + performances) on the east side, facing west
  const st = new THREE.Group(); st.position.set(21, 0, 2); st.rotation.y = -Math.PI / 2; g.add(st); st.userData.solid = true;
  box(14, 1.1, 8, M(0x1F2429), 0, 0.55, 0, st);
  for (let k = 0; k < 3; k++) box(8, 0.35 * (3 - k), 0.4, M(0x2A3036), 0, 0.17 * (3 - k), 4.2 + k * 0.4, st);
  const truss = M(0xB8BEC4, { metalness: 0.6, roughness: 0.4 });
  [-7.2, 7.2].forEach(px => box(0.6, 8.5, 0.6, truss, px, 4.25, -3.6, st));
  box(15, 0.6, 0.6, truss, 0, 8.5, -3.6, st);
  box(15, 0.4, 0.4, truss, 0, 8.5, 1.5, st);
  [-7.2, 7.2].forEach(px => box(0.4, 0.4, 5.1, truss, px, 8.5, -1.05, st));
  const ledC = textCanvas("K-POP MAIN STAGE", "海南中韩文化美食嘉年华", { f1: 52, f2: 36, bg: "#160F33", radius: 0, minW: 1100, c1: "#FFFFFF", c2: "#7FE8D8" });
  const led = new THREE.Mesh(new THREE.PlaneGeometry(13, 5.4), new THREE.MeshBasicMaterial({ map: texOf(ledC.c) }));
  led.position.set(0, 4.4, -3.4); st.add(led); stageLeds.push(led);
  [-6, 6].forEach(px => box(1.1, 2.6, 1.1, M(0x16191C), px, 2.4, 2.8, st));
  landmark("main", g, 21, 11.2, 2, 1.4);

  // parasol dining area in the middle (5 x 4)
  for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) {
    const p = parasolSet(); p.position.set(-20 + c * 5, 0, -8 + r * 5); p.rotation.y = (r + c) * 0.4; g.add(p);
  }
  landmark("parasol", g, -10, 4.6, -0.5);

  // beach photo zone: giant frame
  const pz = new THREE.Group(); pz.position.set(-26, 0, 17); pz.rotation.y = 0.5; g.add(pz);
  const fr = M(0xF4EFE6);
  box(0.4, 4.2, 0.4, fr, -2.2, 2.1, 0, pz); box(0.4, 4.2, 0.4, fr, 2.2, 2.1, 0, pz); box(4.8, 0.4, 0.4, fr, 0, 4.2, 0, pz);
  const heart = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.12, 8, 24), new THREE.MeshStandardMaterial({ color: 0xE2483D, emissive: 0xE2483D, emissiveIntensity: 1 }));
  heart.position.set(0, 4.9, 0); pz.add(heart);
  landmark("photo", g, -26, 7.4, 17, 1.1);

  buildGate(g, -2, 21, 0, "한국문화제", "韩国文化节");
  landmark("gate", g, -2, 9.4, 21, 1.2);

  // lantern strings over the plaza
  const q = [pole(-28, -21, 6, g), pole(-28, 16, 6, g), pole(28, -21, 6, g), pole(28, 16, 6, g)];
  lanternString([q[0], q[2]], g, 18); lanternString([q[1], q[3]], g, 18); lanternString([q[0], q[1]], g, 14); lanternString([q[2], q[3]], g, 14);

  // palms
  for (let i = 0; i < 26; i++) {
    const side = i % 2 ? 1 : -1;
    const px = i < 14 ? -44 + i * 6.8 : side * (40 + (i % 3) * 3);
    const pzz = i < 14 ? 25 + (i % 3) * 1.6 : -20 + (i - 14) * 3.5;
    if (i < 14 && Math.abs(px + 2) < 5) continue;
    const p = palm(6.5 + (i % 4), 0.2 + (i % 3) * 0.12); p.position.set(px, 0, pzz); p.rotation.y = i * 1.3; g.add(p);
  }
  landmark("sea", g, 0, 2.5, 46, 1.8);
  backdrop("bg-beach.jpg", g, 190, 3);
  loadPeople(figs => {
    scatterPeople(g, figs, 190, [-30, 30, -14, 19], [[-35.5, -30.5, -13, 19], [-25, 25, -19.5, -14.5], [30.5, 35.5, -13, 19], [13, 28, -6, 10], [-7, 3, 19, 23]], 3);
    scatterPeople(g, figs, 40, [9, 13, -5, 9], [], 5, "audience");
  });
  Object.assign(g.userData, { key: "B", cam: new THREE.Vector3(40, 46, 66), target: new THREE.Vector3(0, 0, 0) });
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
  if (walk.on && WALK_PAGE) { walk.on = false; walk.booth = null; walk.dest = null; hud.view.hidden = true; }
  else if (walk.on) exitWalk();
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
  if (walk.on && (id.startsWith("B") ? "B" : "A") === current) { walkToBooth(id); return; }
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
  if (walk.on) { walkTap(e); return; }
  const id = pick(e);
  if (id) { focus(id); window.App.select(id); }
});
renderer.domElement.addEventListener("pointermove", e => {
  if (downXY) return;
  const id = pick(e);
  if (id !== hoverId) { hoverId = id; renderer.domElement.classList.toggle("pointer", !!id); }
});
controls.addEventListener("start", () => { tween = null; });
/* ---------- walk mode: enter the venue as a visitor (like 용마미식거리 3D) ---------- */
const walk = { on: false, booth: null, keys: {}, joy: null, dest: null, onArrive: null, colliders: [], dirty: true, near: null, phase: 0 };
const SPAWN = { A: [-2, 21], B: [-2, 23.2] };
const BOUNDS = { A: [-29, 30, -18.5, 23.5], B: [-37, 37, -21, 27] };
const RADIUS = 0.38, SPEED = 4.2;

function buildVisitor(opt = {}) {
  const g = new THREE.Group();
  const shirt = opt.shirt ?? 0xD7261E;
  const skin = M(0xF1C7A5), hair = M(opt.hair ?? 0x1E1A18), top = M(shirt), pants = M(opt.pants ?? 0x22303C), shoe = M(0xF2F2F2);
  const legGeo = new THREE.CapsuleGeometry(0.085, 0.62, 4, 10);
  const armGeo = new THREE.CapsuleGeometry(0.065, 0.5, 4, 10);
  const legL = new THREE.Group(), legR = new THREE.Group(), armL = new THREE.Group(), armR = new THREE.Group();
  [[legL, -0.11], [legR, 0.11]].forEach(([lg, x]) => { lg.position.set(x, 0.86, 0); const m = new THREE.Mesh(legGeo, pants); m.position.y = -0.4; m.castShadow = true; lg.add(m); const sh = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.26), shoe); sh.position.set(0, -0.82, 0.04); lg.add(sh); g.add(lg); });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.42, 6, 14), top); body.position.y = 1.18; body.scale.z = 0.72; body.castShadow = true; g.add(body);
  [[armL, -0.27], [armR, 0.27]].forEach(([ag, x]) => { ag.position.set(x, 1.42, 0); const m = new THREE.Mesh(armGeo, top); m.position.y = -0.3; m.castShadow = true; ag.add(m); const hd = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skin); hd.position.y = -0.62; ag.add(hd); g.add(ag); });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), skin); head.position.y = 1.67; head.castShadow = true; g.add(head);
  const hr = new THREE.Mesh(new THREE.SphereGeometry(0.178, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), hair); hr.position.y = 1.69; hr.rotation.x = -0.25; g.add(hr);
  [-0.06, 0.06].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), M(0x111111)); e.position.set(x, 1.68, 0.155); g.add(e); });
  // ring under the visitor so they are easy to find in the crowd
  if (!opt.remote) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 40), new THREE.MeshBasicMaterial({ color: 0xD7261E, transparent: true, opacity: 0.85, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
  }
  const tag = opt.remote
    ? labelSprite(opt.l1, opt.l2, 0.42, { f1: 30, f2: 24, bg: "rgba(12,22,32,.88)", c2: "#9FD3FF" })
    : labelSprite("나", "我", 0.55, { f1: 34, f2: 28, bg: "rgba(215,38,30,.95)", c2: "#FFFFFF" });
  tag.position.y = 2.25; g.add(tag);
  g.userData.limbs = { legL, legR, armL, armR };
  g.visible = false;
  scene.add(g);
  return g;
}
const visitor = buildVisitor();

function computeColliders() {
  const v = venues[current]; v.updateMatrixWorld(true);
  const list = [], box3 = new THREE.Box3(), wp = new THREE.Vector3();
  v.traverse(o => {
    if (o.userData.solid) { box3.setFromObject(o, true); if (isFinite(box3.min.x)) list.push({ t: "b", x0: box3.min.x, x1: box3.max.x, z0: box3.min.z, z1: box3.max.z }); }
    else if (o.userData.solidR) { o.getWorldPosition(wp); list.push({ t: "c", x: wp.x, z: wp.z, r: o.userData.solidR }); }
  });
  walk.colliders = list; walk.dirty = false;
}
function blocked(x, z) {
  const b = BOUNDS[current];
  if (x < b[0] || x > b[1] || z < b[2] || z > b[3]) return true;
  for (const c of walk.colliders) {
    if (c.t === "b") { if (x > c.x0 - RADIUS && x < c.x1 + RADIUS && z > c.z0 - RADIUS && z < c.z1 + RADIUS) return true; }
    else if ((x - c.x) ** 2 + (z - c.z) ** 2 < (c.r + RADIUS) ** 2) return true;
  }
  return false;
}
function boothFront(id) {
  const o = boothIndex[id]; const wp = new THREE.Vector3(); o.group.getWorldPosition(wp);
  const f = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), o.group.rotation.y);
  return { pos: wp, fwd: f, stand: wp.clone().add(f.clone().multiplyScalar(3.4)) };
}

const hud = {
  el: document.getElementById("walk-hud"), prompt: document.getElementById("walk-prompt"), joy: document.getElementById("joy"),
  view: document.getElementById("booth-view"), cta: document.getElementById("walk-cta")
};
const LT = () => window.T[window.App.state.lang];
const ALT = () => window.T[window.App.state.lang === "zh" ? "ko" : "zh"];

function enterWalk(instant) {
  if (walk.on) return;
  walk.on = true; walk.booth = null; walk.dest = null;
  computeColliders(); buildGrid();
  const s0 = SPAWN[current], s = [s0[0] + (Math.random() - 0.5) * 3.2, s0[1] + (Math.random() - 0.5) * 1.2];  // spread arrivals so visitors don't stack
  visitor.position.set(s[0], 0, s[1]); visitor.rotation.y = Math.PI; visitor.visible = true;
  controls.autoRotate = false; document.getElementById("btn-rotate").setAttribute("aria-pressed", "false");
  Object.assign(controls, { minDistance: 3, maxDistance: 18, maxPolarAngle: 1.45, enablePan: false });
  for (const id in boothIndex) boothIndex[id].marker.scale.setScalar(1.1);
  const tgt = new THREE.Vector3(s[0], 1.5, s[1]);
  camTo(new THREE.Vector3(s[0] + 2.4, 6.8, s[1] + 9.5), tgt, !!instant);
  setActive(null);
  hud.el.hidden = false; if (hud.cta) hud.cta.hidden = true; hud.view.hidden = true;
  stage.classList.add("walking");
}
function exitWalk() {
  if (!walk.on) return;
  walk.on = false; walk.booth = null; walk.dest = null;
  visitor.visible = false;
  Object.assign(controls, { minDistance: 12, maxDistance: 130, maxPolarAngle: 1.32, enablePan: true });
  for (const id in boothIndex) boothIndex[id].marker.scale.setScalar(1.7);
  hud.el.hidden = true; hud.view.hidden = true; if (hud.cta) hud.cta.hidden = false; hud.prompt.hidden = true;
  stage.classList.remove("walking");
  camTo(venues[current].userData.cam, venues[current].userData.target, false);
}
/* grid A* so tapping anywhere routes around booths, tables, trees and the stage */
const CELL = 0.5;
function buildGrid() {
  const b = BOUNDS[current], W = Math.ceil((b[1] - b[0]) / CELL), H = Math.ceil((b[3] - b[2]) / CELL);
  const g = new Uint8Array(W * H);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) g[j * W + i] = blocked(b[0] + (i + 0.5) * CELL, b[2] + (j + 0.5) * CELL) ? 1 : 0;
  walk.grid = { g, W, H, x0: b[0], z0: b[2] };
}
function clearLine(ax, az, bx, bz) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.2);
  for (let k = 1; k <= n; k++) { const t = k / n; if (blocked(ax + (bx - ax) * t, az + (bz - az) * t)) return false; }
  return true;
}
function findPath(sx, sz, tx, tz) {
  if (clearLine(sx, sz, tx, tz)) return [[tx, tz]];
  const G = walk.grid; if (!G) return [[tx, tz]];
  const { g, W, H, x0, z0 } = G;
  const ci = x => Math.max(0, Math.min(W - 1, Math.floor((x - x0) / CELL))), cj = z => Math.max(0, Math.min(H - 1, Math.floor((z - z0) / CELL)));
  let s0 = cj(sz) * W + ci(sx), t0 = cj(tz) * W + ci(tx);
  if (g[t0]) { // nearest free cell to the target
    let best = -1, bd = 1e9; const ti = t0 % W, tj = (t0 / W) | 0;
    for (let r = 1; r < 12 && best < 0; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      const i = ti + di, j = tj + dj; if (i < 0 || j < 0 || i >= W || j >= H || g[j * W + i]) continue;
      const d = di * di + dj * dj; if (d < bd) { bd = d; best = j * W + i; }
    }
    if (best < 0) return []; t0 = best; tx = x0 + (t0 % W + 0.5) * CELL; tz = z0 + (((t0 / W) | 0) + 0.5) * CELL;
  }
  const gs = new Float32Array(W * H).fill(Infinity), from = new Int32Array(W * H).fill(-1), closed = new Uint8Array(W * H);
  const open = [s0]; gs[s0] = 0;
  const h = c => { const dx = Math.abs(c % W - t0 % W), dz = Math.abs(((c / W) | 0) - ((t0 / W) | 0)); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz); };
  const fs = new Float32Array(W * H).fill(Infinity); fs[s0] = h(s0);
  let found = false, guard = 0;
  while (open.length && guard++ < 40000) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (fs[open[k]] < fs[open[bi]]) bi = k;
    const c = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (c === t0) { found = true; break; }
    closed[c] = 1; const ci0 = c % W, cj0 = (c / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const i = ci0 + di, j = cj0 + dj; if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const n = j * W + i; if (g[n] || closed[n]) continue;
      if (di && dj && (g[cj0 * W + i] || g[j * W + ci0])) continue;
      const ng = gs[c] + (di && dj ? 1.414 : 1);
      if (ng < gs[n]) { gs[n] = ng; fs[n] = ng + h(n); from[n] = c; if (!open.includes(n)) open.push(n); }
    }
  }
  if (!found) return [];
  const cells = []; for (let c = t0; c !== -1 && c !== s0; c = from[c]) cells.push([x0 + (c % W + 0.5) * CELL, z0 + (((c / W) | 0) + 0.5) * CELL]);
  cells.reverse(); cells[cells.length - 1] = [tx, tz];
  // string-pull: keep only the turns we actually need
  const out = []; let ax = sx, az = sz, k = 0;
  while (k < cells.length) { let far = k; for (let m = cells.length - 1; m > k; m--) if (clearLine(ax, az, cells[m][0], cells[m][1])) { far = m; break; } out.push(cells[far]); ax = cells[far][0]; az = cells[far][1]; k = far + 1; }
  return out;
}
function walkTo(x, z, onArrive) {
  walk.path = findPath(visitor.position.x, visitor.position.z, x, z);
  walk.dest = walk.path.length ? new THREE.Vector2(...walk.path.shift()) : null;
  walk.onArrive = walk.dest ? (onArrive || null) : null;
}
function walkToBooth(id) {
  if (walk.booth) leaveBooth();
  const bf = boothFront(id);
  walkTo(bf.stand.x, bf.stand.z, () => enterBooth(id));
}
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function walkTap(e) {
  if (walk.booth) return;
  const id = pick(e);
  if (id) { walkToBooth(id); window.App.select(id); return; }
  const hit = new THREE.Vector3();
  if (ray.ray.intersectPlane(groundPlane, hit)) walkTo(hit.x, hit.z);
}

function enterBooth(id) {
  const bf = boothFront(id); walk.booth = id; walk.dest = null;
  // visitor steps up to the counter, camera takes the customer's eye view
  const st = bf.pos.clone().add(bf.fwd.clone().multiplyScalar(2.9));
  visitor.position.set(st.x, 0, st.z); visitor.rotation.y = Math.atan2(-bf.fwd.x, -bf.fwd.z);
  const eye = bf.pos.clone().add(bf.fwd.clone().multiplyScalar(4.4)).add(new THREE.Vector3(0, 2.0, 0));
  camTo(eye, bf.pos.clone().add(new THREE.Vector3(0, 1.45, 0)), false);
  setActive(id); window.App.select(id);
  visitor.visible = false;
  renderBoothView(id);
  hud.view.hidden = false; hud.prompt.hidden = true;
}
function leaveBooth() {
  if (!walk.booth) return;
  const bf = boothFront(walk.booth);
  walk.booth = null; hud.view.hidden = true; setActive(null); visitor.visible = true;
  visitor.position.set(bf.stand.x, 0, bf.stand.z);
  const back = bf.stand.clone().add(bf.fwd.clone().multiplyScalar(6)).add(new THREE.Vector3(0, 4, 0));
  camTo(back, bf.stand.clone().add(new THREE.Vector3(0, 1.5, 0)), false);
}
function menuBlock(id) {
  if (!window.MENU) return "";
  const items = window.MENU.items(id); if (!items.length) return "";
  const lg = window.App.state.lang, al = lg === "zh" ? "ko" : "zh";
  return `<div class="bv-menu"><p class="menu-h">${esc(window.MENU.title[lg])}<span>${esc(window.MENU.title[al])}</span></p>
    <ul>${items.map(it => { const src = window.MENU.img[it.sheet + ":" + it.cell];
      return `<li>${src ? `<img src="${src}" alt="">` : `<i class="ph"></i>`}<span class="mn">${esc(it.name(lg))}<small>${esc(it.name(al))}</small></span><b>¥${it.price}</b></li>`; }).join("")}</ul>
    <p class="menu-note">${esc(window.MENU.note[lg])}</p></div>`;
}
function esc(t) { return String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function renderBoothView(id) {
  const o = boothIndex[id], b = o.booth, L = LT(), A = ALT(), lang = window.App.state.lang, alt = lang === "zh" ? "ko" : "zh";
  const p = L.pk[b.pkg], price = window.PKG[b.pkg].price.toLocaleString("en-US");
  hud.view.innerHTML = `
    <div class="bv-head"><span class="bv-no" style="background:${ST_HEX[b.st]}">${b.id}</span>
      <div><p class="bv-kicker">${esc(L.walk_inbooth)} · ${esc(A.walk_inbooth)}</p><h3>${esc(b.name[lang])}<span>${esc(b.name[alt])}</span></h3></div></div>
    ${menuBlock(b.id)}
    <details class="bv-more"><summary>${esc(L.walk_exhibitor || "입점 안내")} · ${esc(A.walk_exhibitor || "")}</summary>
    <p class="bv-status ${b.st}">${esc(L.st[b.st])}${b.st === "open" ? " — " + esc(L.walk_vacant) : ""}</p>
    <dl><dt>${esc(L.card.zone)}</dt><dd>${esc(window.ZONES[b.zone][lang])}</dd><dt>${esc(L.card.size)}</dt><dd>${L.size_booth}</dd><dt>${esc(L.card.pkg)}</dt><dd>${esc(p.name)} · ${esc(p.for)}</dd><dt>${esc(L.card.price)}</dt><dd><b>${price}</b> ${esc(p.unit)}</dd></dl></details>
    <div class="bv-btns">${b.st !== "conf" ? `<a class="btn btn-light" href="#apply" data-apply-booth="${b.id}">${esc(L.card.apply)}</a>` : ""}<button type="button" class="btn btn-line-light" id="bv-leave">${esc(L.walk_leave)}</button></div>`;
  document.getElementById("bv-leave").onclick = leaveBooth;
}

/* input: keyboard, virtual joystick */
addEventListener("keydown", e => {
  if (!walk.on || /INPUT|TEXTAREA|SELECT/.test((e.target.tagName || ""))) return;
  const k = e.key.toLowerCase();
  if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k)) { walk.keys[k] = true; walk.dest = null; if (walk.booth) leaveBooth(); e.preventDefault(); }
  if ((k === "e" || k === "enter") && walk.near && !walk.booth) enterBooth(walk.near);
  if (k === "escape") { walk.booth ? leaveBooth() : exitWalk(); }
});
addEventListener("keyup", e => { walk.keys[e.key.toLowerCase()] = false; });
WALK_PAGE && (function joystick() {
  const j = hud.joy, knob = j.querySelector("i"); let id = null, c = null;
  j.addEventListener("pointerdown", e => { id = e.pointerId; j.setPointerCapture(id); const r = j.getBoundingClientRect(); c = [r.left + r.width / 2, r.top + r.height / 2]; move(e); e.stopPropagation(); });
  j.addEventListener("pointermove", e => { if (e.pointerId === id) move(e); });
  const end = e => { if (e.pointerId !== id) return; id = null; walk.joy = null; knob.style.transform = ""; };
  j.addEventListener("pointerup", end); j.addEventListener("pointercancel", end);
  function move(e) {
    let dx = e.clientX - c[0], dy = e.clientY - c[1]; const m = Math.hypot(dx, dy), R = 44;
    if (m > R) { dx *= R / m; dy *= R / m; }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    walk.joy = [dx / R, dy / R]; walk.dest = null; if (walk.booth) leaveBooth();
  }
})();
function openWalk() {
  const u = `walk.html?venue=${current}&lang=${window.App.state.lang}`;
  const w = window.open(u, "hk-walk");
  if (!w) location.href = u;
}
if (WALK_PAGE) {
  hud.prompt.addEventListener("click", () => { if (walk.near) enterBooth(walk.near); });
  document.getElementById("walk-exit").addEventListener("click", () => { window.close(); setTimeout(() => { location.href = "index.html#map"; }, 200); });
} else {
  hud.cta && hud.cta.addEventListener("click", openWalk);
  const bw = document.getElementById("btn-walk"); bw && bw.addEventListener("click", openWalk);
}


/* ---------- live visitors: everyone in the walk-in page sees each other (public MQTT relay, no server needed — same approach as 용마) ---------- */
const NET = { client: null, sid: null, peers: new Map(), venue: null, last: 0, lastSent: "", name: null, color: 0 };
const NS = "hainankcarnival/v1";
const BROKERS = ["wss://broker.emqx.io:8084/mqtt", "wss://broker.hivemq.com:8884/mqtt", "wss://test.mosquitto.org:8081"];
const SHIRTS = [0x2E64A8, 0x2FA57C, 0xE3A02F, 0x8E44AD, 0x16A3B8, 0xE67E22, 0x34495E, 0xC0392B, 0x27AE60, 0xF1C40F];
function netIdentity() {
  let id = null;
  try { id = JSON.parse(sessionStorage.getItem("hk-visitor") || "null"); } catch (e) {}
  if (!id) {
    const a = new Uint8Array(6); crypto.getRandomValues(a);
    id = { sid: [...a].map(b => b.toString(16).padStart(2, "0")).join(""), no: String(1000 + (a[0] * 256 + a[1]) % 9000), c: a[2] % SHIRTS.length };
    try { sessionStorage.setItem("hk-visitor", JSON.stringify(id)); } catch (e) {}
  }
  NET.sid = id.sid; NET.no = id.no; NET.color = id.c;
}
const onlineEl = document.getElementById("walk-online");
function renderOnline() {
  if (!onlineEl) return;
  const n = [...NET.peers.values()].filter(p => p.venue === current).length + 1;
  const L = LT(), A = ALT();
  onlineEl.innerHTML = `<i></i>${(L.walk_online || "접속 {n}명").replace("{n}", n)}<span>${(A.walk_online || "").replace("{n}", n)}</span>`;
  onlineEl.hidden = false;
}
async function netStart() {
  if (!WALK_PAGE || NET.client) return;
  netIdentity();
  let mqtt;
  if (/[?&]nettest=1/.test(location.search)) {   // offline self-test: a fake relay that echoes a second visitor
    mqtt = { connect() { const h = {}; const c = { connected: true, on(e, f) { (h[e] ||= []).push(f); }, once(e, f) { if (e === "connect") setTimeout(f, 10); }, subscribe() {}, end() {},
      publish(t, msg) { const m = JSON.parse(msg); const echo = { ...m, sid: "test01", no: "7777", c: 3, x: m.x + 2, z: m.z - 1 }; (h.message || []).forEach(f => f(`${NS}/p/test01`, JSON.stringify(echo))); } }; return c; } };
  } else {
    try { const m = await import("https://cdn.jsdelivr.net/npm/mqtt@5.10.1/dist/mqtt.esm.js"); mqtt = m.default || m; } catch (e) { return; }
  }
  for (const url of BROKERS) {
    try {
      NET.client = await new Promise((res, rej) => {
        const c = mqtt.connect(url, { clientId: "hk_" + NET.sid + "_" + Math.random().toString(16).slice(2, 6), clean: true, keepalive: 20, connectTimeout: 7000, reconnectPeriod: 4000,
          will: { topic: `${NS}/bye`, payload: JSON.stringify({ sid: NET.sid }), qos: 0, retain: false } });
        const t = setTimeout(() => { c.end(true); rej(new Error("timeout")); }, 8000);
        c.once("connect", () => { clearTimeout(t); res(c); });
        c.once("error", err => { clearTimeout(t); c.end(true); rej(err); });
      });
      break;
    } catch (e) { NET.client = null; }
  }
  if (!NET.client) return;
  NET.client.subscribe([`${NS}/p/+`, `${NS}/bye`]);
  NET.client.on("message", (topic, buf) => {
    let m; try { m = JSON.parse(buf.toString()); } catch (e) { return; }
    if (!m || m.sid === NET.sid) return;
    if (topic.endsWith("/bye")) { dropPeer(m.sid); return; }
    if (typeof m.x !== "number" || typeof m.z !== "number" || !/^[AB]$/.test(m.v)) return;
    let p = NET.peers.get(m.sid);
    if (!p) {
      const no = String(m.no || "").replace(/\D/g, "").slice(0, 4) || "0000";
      const av = buildVisitor({ remote: true, shirt: SHIRTS[(m.c | 0) % SHIRTS.length], l1: "방문객 " + no, l2: "游客 " + no });
      av.visible = true; p = { av, x: m.x, z: m.z, ry: m.ry || 0, venue: m.v, seen: 0, phase: 0 };
      av.position.set(m.x, 0, m.z); NET.peers.set(m.sid, p);
    }
    p.tx = m.x; p.tz = m.z; p.try = m.ry || 0; p.venue = m.v; p.seen = performance.now(); p.booth = m.b || null;
    renderOnline();
  });
  NET.client.on("close", () => {});
  addEventListener("pagehide", () => { try { NET.client.publish(`${NS}/bye`, JSON.stringify({ sid: NET.sid })); NET.client.end(true); } catch (e) {} });
  renderOnline();
}
function dropPeer(sid) {
  const p = NET.peers.get(sid); if (!p) return;
  scene.remove(p.av); NET.peers.delete(sid); renderOnline();
}
function netTick(dt) {
  const now = performance.now();
  // publish my position: fast while moving, heartbeat while still
  if (NET.client && NET.client.connected && walk.on) {
    const v = visitor.position, msg = { sid: NET.sid, no: NET.no, c: NET.color, v: current, x: +v.x.toFixed(2), z: +v.z.toFixed(2), ry: +visitor.rotation.y.toFixed(2), b: walk.booth };
    const key = msg.x + "," + msg.z + "," + msg.v + "," + msg.b;
    if ((key !== NET.lastSent && now - NET.last > 150) || now - NET.last > 4000) {
      NET.client.publish(`${NS}/p/${NET.sid}`, JSON.stringify(msg)); NET.last = now; NET.lastSent = key;
    }
  }
  for (const [sid, p] of NET.peers) {
    if (now - p.seen > 15000) { dropPeer(sid); continue; }
    p.av.visible = p.venue === current;
    if (!p.av.visible) continue;
    const dx = p.tx - p.av.position.x, dz = p.tz - p.av.position.z, d = Math.hypot(dx, dz);
    const k = Math.min(1, dt * 8);
    p.av.position.x += dx * k; p.av.position.z += dz * k;
    let dr = p.try - p.av.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); p.av.rotation.y += dr * k;
    const moving = d > 0.05; p.phase = moving ? p.phase + dt * 9 : p.phase * 0.85;
    const sw = Math.sin(p.phase) * (moving ? 0.6 : 0), L = p.av.userData.limbs;
    L.legL.rotation.x = sw; L.legR.rotation.x = -sw; L.armL.rotation.x = -sw * 0.8; L.armR.rotation.x = sw * 0.8;
  }
}
if (WALK_PAGE) setTimeout(netStart, 800);

const _v = new THREE.Vector3(), _f = new THREE.Vector3(), _r = new THREE.Vector3();
function walkStep(dt) {
  if (!dt) return;
  const L = visitor.userData.limbs;
  let mx = 0, mz = 0;
  if (!walk.booth) {
    const k = walk.keys;
    let ix = (k.d || k.arrowright ? 1 : 0) - (k.a || k.arrowleft ? 1 : 0);
    let iz = (k.s || k.arrowdown ? 1 : 0) - (k.w || k.arrowup ? 1 : 0);
    if (walk.joy) { ix = walk.joy[0]; iz = walk.joy[1]; }
    if (ix || iz) {
      camera.getWorldDirection(_f); _f.y = 0; _f.normalize(); _r.crossVectors(_f, camera.up).normalize();
      _v.copy(_r).multiplyScalar(ix).addScaledVector(_f, -iz);
      if (_v.lengthSq() > 1) _v.normalize();
      mx = _v.x; mz = _v.z;
    } else if (walk.dest) {
      const dx = walk.dest.x - visitor.position.x, dz = walk.dest.y - visitor.position.z, d = Math.hypot(dx, dz);
      if (d < 0.2) {
        if (walk.path && walk.path.length) walk.dest = new THREE.Vector2(...walk.path.shift());
        else { walk.dest = null; const cb = walk.onArrive; walk.onArrive = null; if (cb) cb(); }
      }
      else { const k = Math.min(1, d / (SPEED * dt)); mx = dx / d * k; mz = dz / d * k; }
    }
  }
  const moving = Math.hypot(mx, mz) > 0.01;
  if (moving) {
    const p = visitor.position, before = p.clone();
    const steps = Math.max(1, Math.ceil(SPEED * dt / 0.2)), sx = mx * SPEED * dt / steps, sz = mz * SPEED * dt / steps;
    for (let i = 0; i < steps; i++) { if (!blocked(p.x + sx, p.z)) p.x += sx; if (!blocked(p.x, p.z + sz)) p.z += sz; }
    const movedD = before.distanceTo(p);
    if (walk.dest && movedD < SPEED * dt * 0.1 * Math.hypot(mx, mz)) { walk.stuck = (walk.stuck || 0) + dt; if (walk.stuck > 0.6) { walk.dest = null; walk.path = []; walk.onArrive = null; walk.stuck = 0; } } else walk.stuck = 0;
    const want = Math.atan2(mx, mz); let dr = want - visitor.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr));
    visitor.rotation.y += dr * Math.min(1, dt * 12);
    // camera follows the visitor; the user can still orbit/zoom around them
    const dlt = p.clone().sub(before); if (!tween) { camera.position.add(dlt); controls.target.add(dlt); }
    walk.phase += dt * 9;
  } else walk.phase *= 0.85;
  const sw = Math.sin(walk.phase) * (moving ? 0.6 : 0);
  L.legL.rotation.x = sw; L.legR.rotation.x = -sw; L.armL.rotation.x = -sw * 0.8; L.armR.rotation.x = sw * 0.8;
  // nearest booth front → prompt
  let best = null, bd = 3.6;
  if (!walk.booth) for (const id in boothIndex) {
    if ((id.startsWith("B") ? "B" : "A") !== current) continue;
    const bf = boothFront(id), d = Math.hypot(bf.stand.x - visitor.position.x, bf.stand.z - visitor.position.z);
    if (d < bd) { bd = d; best = id; }
  }
  if (best !== walk.near) {
    walk.near = best;
    if (best) {
      const b = boothIndex[best].booth, lang = window.App.state.lang, alt = lang === "zh" ? "ko" : "zh";
      hud.prompt.innerHTML = `<b>${esc(LT().walk_enterbooth.replace("{id}", b.id).replace("{name}", b.name[lang]))}</b><span>${esc(ALT().walk_enterbooth.replace("{id}", b.id).replace("{name}", b.name[alt]))}</span><kbd>E</kbd>`;
    }
    hud.prompt.hidden = !best;
  }
}


/* ---------- resize + loop ---------- */
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.38, 0.5, 0.93);
composer.addPass(bloom);
composer.addPass(new OutputPass());
function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  composer.setSize(w, h);
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
  const dt = Math.min(0.12, t - (loop.lt ?? t)); loop.lt = t;
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
  if (!reduce) updateCrowd(dt, t);
  if (walk.on) walkStep(dt);
  if (WALK_PAGE) { netTick(dt); if (NET.client && Math.random() < 0.01) renderOnline(); }
  controls.update();
  composer.render();
}
loadingEl.remove();
loop();

window.Map3D = {
  setVenue,
  focus,
  reset() { setActive(null); controls.autoRotate = document.getElementById("btn-rotate").getAttribute("aria-pressed") === "true"; camTo(venues[current].userData.cam, venues[current].userData.target, false); },
  setRotate(on) { controls.autoRotate = on && !reduce; },
  setLang() { if (walk.booth) renderBoothView(walk.booth); walk.near = null; },
  enterWalk, exitWalk, _dirty() { walk.dirty = true; }, _enter: id => enterBooth(id), goBooth: id => walkToBooth(id)
};
// sync with any state chosen before the module loaded
if (WALK_PAGE) {
  current = window.App.state.venue === "B" ? "B" : "A";
  venues.A.visible = current === "A"; venues.B.visible = current === "B";
  enterWalk(true);
  const qb = new URLSearchParams(location.search).get("booth");
  if (qb && boothIndex[qb]) setTimeout(() => walkToBooth(qb), 600);
} else {
  if (window.App.state.venue !== "A") setVenue(window.App.state.venue);
  if (window.App.state.sel) focus(window.App.state.sel);
}
