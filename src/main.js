import "./style.css";
import * as THREE from "three";
import { gsap } from "gsap";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("c");
const prevBtn = document.getElementById("prev");
const nextBtn = document.getElementById("next");
const counter = document.getElementById("counter");
const musicToggle = document.getElementById("musicToggle");
const fullscreenToggle = document.getElementById("fullscreenToggle");
let fullscreenAutoAttempted = false;

function detectQualityProfile() {
  const ua = navigator.userAgent || "";
  const isMobileUa = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
  const isSmallScreen = window.matchMedia("(max-width: 900px)").matches;
  const isMobileLike = isSmallScreen || isMobileUa;
  const memory = navigator.deviceMemory || 0;
  const cores = navigator.hardwareConcurrency || 0;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reducedMotion && isMobileLike) return "low";
  if (isMobileLike && ((memory && memory <= 3) || (cores && cores <= 4))) return "low";
  if (isMobileLike && ((memory && memory <= 6) || (cores && cores <= 6))) return "medium";
  if (!isMobileLike && ((memory && memory <= 4) || (cores && cores <= 4))) return "medium";
  return "high";
}

const QUALITY_LEVEL = detectQualityProfile();
const QUALITY = {
  high: {
    antialias: true,
    maxPixelRatio: 2,
    shadows: true,
    keyShadowMap: 2048,
    topShadowMap: 1024,
    maxAnisotropy: 8,
    turnSegmentsX: 160,
    turnSegmentsZ: 20,
    turnNormalsEvery: 1,
    twinklesEnabled: true,
    twinkleCountMin: 1,
    twinkleCountMax: 3,
    twinkleDelayMin: 900,
    twinkleDelayMax: 1800,
    twinkleStrongChance: 0.18,
  },
  medium: {
    antialias: true,
    maxPixelRatio: 1.35,
    shadows: true,
    keyShadowMap: 1024,
    topShadowMap: 512,
    maxAnisotropy: 4,
    turnSegmentsX: 96,
    turnSegmentsZ: 12,
    turnNormalsEvery: 2,
    twinklesEnabled: true,
    twinkleCountMin: 1,
    twinkleCountMax: 2,
    twinkleDelayMin: 1200,
    twinkleDelayMax: 2400,
    twinkleStrongChance: 0.1,
  },
  low: {
    antialias: false,
    maxPixelRatio: 1,
    shadows: false,
    keyShadowMap: 512,
    topShadowMap: 256,
    maxAnisotropy: 2,
    turnSegmentsX: 72,
    turnSegmentsZ: 8,
    turnNormalsEvery: 3,
    twinklesEnabled: false,
    twinkleCountMin: 0,
    twinkleCountMax: 0,
    twinkleDelayMin: 1800,
    twinkleDelayMax: 3000,
    twinkleStrongChance: 0.05,
  },
}[QUALITY_LEVEL];

document.body.classList.add(`quality-${QUALITY_LEVEL}`);

/* ---------- Pages (front/back) ---------- */
const pages = [
  { title: "Portada", frontText: "Nuestra Historia", backText: "Invitacion de Boda", accent: "#c0843b" },
  { title: "Pagina 1", frontText: "Capitulo I", backText: "Como nos conocimos", accent: "#b66a4b" },
  { title: "Pagina 2", frontText: "Capitulo II", backText: "El gran dia", accent: "#8f5a9c" },
  { title: "Contraportada", frontText: "Gracias por acompanarnos", backText: "Con amor", accent: "#7c6f64" },
  { title: "Contraportada2", frontText: "Gracias por acompanarnos"},
];

/* ---------- Audio ---------- */
const bgm = document.getElementById("bgm");
const DEFAULT_BGM_SRC = bgm?.getAttribute("src") || "assets/hallelujah.mp3";
let bgmStarted = false;
const pageSfx = document.getElementById("pageSfx");
const openBookSfx = document.getElementById("openBookSfx");
const closeBookSfx = document.getElementById("closeBookSfx");
let sfxCtx = null;
let isBgmMuted = false;
let selectedBgmTrack = null;

const BGM_TRACKS = [
  { src: "assets/shrekhalle.mp3", probability: 40, volume: 0.30 },
  { src: "assets/aurora1.mp3", probability: 20, volume: 0.20 },
  { src: "assets/shrek1.mp3", probability: 20, volume: 0.10 },
  { src: "assets/shrek2.mp3", probability: 10, volume: 0.10 },
  { src: "assets/hallelujah.mp3", probability: 7, volume: 0.30 },
  { src: "assets/your1.mp3", probability: 3, volume: 0.10 },
];

function pickWeightedTrack(tracks) {
  if (!Array.isArray(tracks) || tracks.length === 0) return null;
  const validTracks = tracks.filter((track) => Number(track?.probability) > 0);
  if (validTracks.length === 0) return tracks[0] || null;

  const total = validTracks.reduce((sum, track) => sum + Number(track.probability), 0);
  let threshold = Math.random() * total;

  for (const track of validTracks) {
    threshold -= Number(track.probability);
    if (threshold <= 0) return track;
  }

  return validTracks[validTracks.length - 1];
}

async function startBgm() {
  if (!bgm || bgmStarted) return;
  try {
    if (!selectedBgmTrack) selectedBgmTrack = pickWeightedTrack(BGM_TRACKS);
    if (selectedBgmTrack?.src) bgm.src = selectedBgmTrack.src;
    bgm.load();
    bgm.volume = Number.isFinite(selectedBgmTrack?.volume) ? selectedBgmTrack.volume : 0.35;
    bgm.muted = isBgmMuted;
    await bgm.play();
    bgmStarted = true;
  } catch (e) {
    try {
      bgm.src = DEFAULT_BGM_SRC;
      bgm.load();
      bgm.volume = 0.35;
      bgm.muted = isBgmMuted;
      await bgm.play();
      bgmStarted = true;
    } catch (e2) {}
  }
}

function updateMusicToggleUI() {
  if (!musicToggle) return;
  musicToggle.setAttribute("aria-pressed", isBgmMuted ? "true" : "false");
  musicToggle.setAttribute("aria-label", isBgmMuted ? "Activar musica" : "Silenciar musica");
}

function toggleBgmMute() {
  isBgmMuted = !isBgmMuted;
  if (bgm) bgm.muted = isBgmMuted;
  updateMusicToggleUI();
}

if (musicToggle) {
  musicToggle.addEventListener("click", toggleBgmMute);
}
updateMusicToggleUI();

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function canUseFullscreen() {
  const el = document.documentElement;
  return Boolean(el.requestFullscreen || el.webkitRequestFullscreen);
}

function updateFullscreenToggleUI() {
  if (!fullscreenToggle) return;
  const active = Boolean(getFullscreenElement());
  fullscreenToggle.setAttribute("aria-pressed", active ? "true" : "false");
  fullscreenToggle.setAttribute("aria-label", active ? "Salir de pantalla completa" : "Pantalla completa");
  fullscreenToggle.disabled = !canUseFullscreen();
}

async function enterFullscreen() {
  const el = document.documentElement;
  const request = el.requestFullscreen?.bind(el) || el.webkitRequestFullscreen?.bind(el);
  if (!request) return false;

  try {
    await request({ navigationUI: "hide" });
    return true;
  } catch (e) {
    try {
      await request();
      return true;
    } catch (e2) {
      return false;
    }
  }
}

async function exitFullscreen() {
  const exit = document.exitFullscreen?.bind(document) || document.webkitExitFullscreen?.bind(document);
  if (!exit) return false;
  try {
    await exit();
    return true;
  } catch (e) {
    return false;
  }
}

async function toggleFullscreen() {
  if (getFullscreenElement()) {
    await exitFullscreen();
  } else {
    await enterFullscreen();
  }
  updateFullscreenToggleUI();
}

if (fullscreenToggle) {
  fullscreenToggle.addEventListener("click", () => {
    toggleFullscreen();
  });
}
updateFullscreenToggleUI();

async function playPageSfx() {
  if (pageSfx) {
    try {
      pageSfx.volume = 0.55;
      pageSfx.currentTime = 0;
      await pageSfx.play();
      return;
    } catch (e) {}
  }

  // fallback sintetico si no existe/funciona el mp3
  try {
    if (!sfxCtx) sfxCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = sfxCtx.currentTime;

    const noiseBuffer = sfxCtx.createBuffer(1, sfxCtx.sampleRate * 0.09, sfxCtx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const k = 1 - i / data.length;
      data[i] = (Math.random() * 2 - 1) * k * 0.24;
    }

    const noise = sfxCtx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = sfxCtx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 0.8;

    const gain = sfxCtx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(sfxCtx.destination);
    noise.start(now);
    noise.stop(now + 0.1);
  } catch (e) {}
}

async function playMediaSfx(mediaEl, volume = 0.55) {
  if (!mediaEl) return;
  try {
    mediaEl.volume = volume;
    mediaEl.currentTime = 0;
    await mediaEl.play();
  } catch (e) {}
}

function playOpenBookSfx() {
  playMediaSfx(openBookSfx, 0.5);
}

function playCloseBookSfx() {
  playMediaSfx(closeBookSfx, 0.52);
}


/* ---------- State ---------- */
let pageIndex = 0;
let isFlipping = false;

// estado de apertura
let isOpen = false;
let isOpening = false;
let isClosing = false;
let isAutoReturning = false;
let spreadEnabled = false;
const SPREAD_SHOW_DURING_OPEN_AT = 0.34; // fraccion de PI
const SPREAD_HIDE_DURING_CLOSE_AT = 0.24; // fraccion de PI

function updateUI() {
  counter.textContent = `${pageIndex + 1} / ${pages.length}`;
  const disabledByState = isFlipping || !isOpen || isOpening || isClosing || isAutoReturning;
  prevBtn.disabled = disabledByState;
  nextBtn.disabled = disabledByState;
  controls.enabled = isOpen && !isFlipping && !isOpening && !isClosing && !isAutoReturning;
}

function getViewportHeight() {
  return Math.round(window.visualViewport?.height || window.innerHeight || 0);
}

function getViewportWidth() {
  return Math.round(window.visualViewport?.width || window.innerWidth || 0);
}

function syncViewportHeightVar() {
  const vh = getViewportHeight();
  if (!vh) return;
  document.documentElement.style.setProperty("--app-vh", `${vh}px`);
}

async function requestFullscreenOnMobile() {
  if (fullscreenAutoAttempted) return;
  if (!window.matchMedia("(max-width: 900px)").matches) return;
  fullscreenAutoAttempted = true;
  if (getFullscreenElement()) return;
  await enterFullscreen();
  updateFullscreenToggleUI();
}

/* ---------- Renderer / Scene / Camera ---------- */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: QUALITY.antialias });
renderer.setPixelRatio(Math.min(devicePixelRatio, QUALITY.maxPixelRatio));
syncViewportHeightVar();
renderer.setSize(getViewportWidth(), getViewportHeight());
renderer.shadowMap.enabled = QUALITY.shadows;
renderer.shadowMap.type = QUALITY_LEVEL === "high" ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
const textureLoader = new THREE.TextureLoader();
const textureAnisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), QUALITY.maxAnisotropy);

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(32, getViewportWidth() / getViewportHeight(), 0.1, 100);

// Target para encuadre
const lookTarget = new THREE.Object3D();
scene.add(lookTarget);

// âœ… CERRADO
const CAM_CLOSED_POS = new THREE.Vector3(0, 1.35, 3.7);
const TARGET_CLOSED_POS = new THREE.Vector3(0, 0.15, 0);

// âœ… ABIERTO (sin mover X)
const CAM_OPEN_POS = new THREE.Vector3(0, 1.45, 4.2);
const TARGET_OPEN_POS = new THREE.Vector3(0, 0.18, 0);

camera.position.copy(CAM_CLOSED_POS);
lookTarget.position.copy(TARGET_CLOSED_POS);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.enablePan = false;
controls.enableZoom = false;
controls.rotateSpeed = 0.55;
controls.target.copy(lookTarget.position);
controls.minAzimuthAngle = -0.48;
controls.maxAzimuthAngle = 0.48;
controls.minPolarAngle = 1.06;
controls.maxPolarAngle = 1.58;
controls.enabled = false;

updateUI();

/* ---------- Optional custom textures ---------- */
const TEXTURE_PATHS = {
  coverColor: "/assets/textures/book-cover-color.jpg",
  coverNormal: "/assets/textures/book-cover-normal.jpg",
  coverRoughness: "/assets/textures/book-cover-roughness.jpg",
  pageFiber: "/assets/textures/paper-fiber.jpg",
  pageRoughness: "/assets/textures/paper-roughness.jpg",
  pageEdge: "/assets/textures/paper-edge.jpg",
};

// Imagenes opcionales por tapa (mantiene marcos dorados y resto del diseno).
// Si no quieres usar una distinta por tapa, deja ambas apuntando al mismo archivo.
const COVER_IMAGE_TEXTURES = {
  front: "/assets/pages/01.jpeg",
  frontInner: null, // ejemplo: "/assets/covers/front-inner.jpg"
  back: "/assets/pages/01.jpeg",
};

function configureTexture(tex, { srgb = false, repeat = [1, 1] } = {}) {
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.center.set(0.5, 0.5);
  tex.rotation = 0;
  tex.anisotropy = textureAnisotropy;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function assignTextureToMany(materials, slot, path, options = {}) {
  textureLoader.load(
    path,
    (tex) => {
      const configured = configureTexture(tex, options);
      for (const mat of materials) {
        mat[slot] = configured;
        mat.needsUpdate = true;
      }
    },
    undefined,
    () => {}
  );
}

function assignTexture(path, onLoad, options = {}) {
  if (!path) return;
  textureLoader.load(
    path,
    (tex) => {
      const configured = configureTexture(tex, options);
      onLoad(configured);
    },
    undefined,
    () => {}
  );
}

/* ---------- Page textures ---------- */
const pageTexCache = new Map();
// Imagenes full-page opcionales por indice/side.
// Indice 2 corresponde a "Pagina 2" en el arreglo `pages`.
const PAGE_IMAGE_TEXTURES = {
  0: { front: "/assets/pages/001.jpeg", back: "/assets/pages/02.jpeg" },
  1: { front: "/assets/pages/03.jpeg", back: "/assets/pages/04.jpeg" },
  2: { front: "/assets/pages/05.jpeg", back: "/assets/pages/06.jpeg" },
  3: { front: "/assets/pages/007.jpeg", back: "/assets/pages/08.jpeg" },
  4: { front: "/assets/pages/09.jpeg"},
};

function createImagePageTexture(path) {
  const tex = textureLoader.load(
    path,
    () => {},
    undefined,
    () => {}
  );
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = textureAnisotropy;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.center.set(0.5, 0.5);
  tex.rotation = 0;
  return tex;
}

function createPageTexture(page, side, pageNumber) {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 768;
  const ctx = canvas.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  g.addColorStop(0, "#f6eddc");
  g.addColorStop(1, "#e9ddc8");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = `${page.accent}22`;
  ctx.fillRect(0, 0, canvas.width, 90);
  ctx.fillRect(0, canvas.height - 90, canvas.width, 90);
  ctx.fillStyle = page.accent;
  ctx.font = "700 56px Georgia, serif";
  ctx.textAlign = "center";
  ctx.fillText(page.title, canvas.width / 2, 210);
  ctx.fillStyle = "#3f2e1f";
  ctx.font = "600 72px Georgia, serif";
  ctx.fillText(side === "front" ? page.frontText : page.backText, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#7a6650";
  ctx.font = "500 34px Georgia, serif";
  ctx.fillText(`Pagina ${pageNumber + 1} - ${side === "front" ? "Frente" : "Reverso"}`, canvas.width / 2, canvas.height - 130);
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.magFilter = THREE.LinearFilter;
  return t;
}
function getPageTexture(index, side) {
  const key = `${index}-${side}`;
  if (!pageTexCache.has(key)) {
    const imagePath = PAGE_IMAGE_TEXTURES[index]?.[side];
    pageTexCache.set(
      key,
      imagePath ? createImagePageTexture(imagePath) : createPageTexture(pages[index], side, index)
    );
  }
  return pageTexCache.get(key);
}

function warmPageTextures() {
  for (let i = 0; i < pages.length; i++) {
    getPageTexture(i, "front");
    getPageTexture(i, "back");
  }
}
warmPageTextures();

function normalizePageTextures() {
  for (const tex of pageTexCache.values()) {
    tex.center.set(0.5, 0.5);
    tex.rotation = 0;
    tex.needsUpdate = true;
  }
}
normalizePageTextures();

function createLeatherTexture({
  base = "#4b2f23",
  grain = "rgba(0,0,0,0.10)",
  warm = "rgba(255,180,120,0.05)",
  line = "rgba(245,210,150,0.18)",
} = {}) {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d");

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, c.width, c.height);

  const g = ctx.createLinearGradient(0, 0, c.width, c.height);
  g.addColorStop(0, "rgba(255,255,255,0.04)");
  g.addColorStop(0.5, "rgba(0,0,0,0.02)");
  g.addColorStop(1, "rgba(0,0,0,0.10)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);

  // Grano de cuero
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const s = Math.random() * 1.8 + 0.5;
    ctx.fillStyle = grain;
    ctx.fillRect(x, y, s, s);
  }

  // Poro/arruga suave
  for (let i = 0; i < 220; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const w = 16 + Math.random() * 50;
    const h = 1 + Math.random() * 2;
    ctx.fillStyle = warm;
    ctx.fillRect(x, y, w, h);
  }

  // Marco dorado sutil
  ctx.strokeStyle = line;
  ctx.lineWidth = 8;
  ctx.strokeRect(40, 40, c.width - 80, c.height - 80);
  ctx.lineWidth = 2;
  ctx.strokeRect(58, 58, c.width - 116, c.height - 116);

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1.2, 1.2);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function createPaperEdgeTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 256;
  const ctx = c.getContext("2d");

  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0, "#efe2cc");
  g.addColorStop(0.5, "#d8c6a8");
  g.addColorStop(1, "#c7b496");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < 1400; i++) {
    const y = Math.random() * c.height;
    const x = Math.random() * c.width;
    const w = 8 + Math.random() * 26;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(80,45,20,0.08)";
    ctx.fillRect(x, y, w, 1);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}

function createPaperFiberTexture() {
  const c = document.createElement("canvas");
  c.width = 1024;
  c.height = 1024;
  const ctx = c.getContext("2d");

  ctx.fillStyle = "#b7a88d";
  ctx.fillRect(0, 0, c.width, c.height);

  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const size = 0.6 + Math.random() * 1.6;
    const alpha = 0.08 + Math.random() * 0.22;
    const tone = 165 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgba(${tone},${tone},${tone},${alpha})`;
    ctx.fillRect(x, y, size, size);
  }

  for (let i = 0; i < 1300; i++) {
    const x = Math.random() * c.width;
    const y = Math.random() * c.height;
    const w = 8 + Math.random() * 40;
    ctx.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(60,40,20,0.05)";
    ctx.fillRect(x, y, w, 1);
  }

  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping;
  t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2.2, 2.2);
  t.anisotropy = textureAnisotropy;
  return t;
}

function createGoldCornerGroup(width, height) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd8b56a,
    metalness: 0.88,
    roughness: 0.22,
    emissive: 0x2a1a06,
    emissiveIntensity: 0.15,
  });

  const inset = 0.06;
  const leg = 0.26;
  const band = 0.038;
  const t = 0.008;

  const barXGeo = new THREE.BoxGeometry(leg, band, t);
  const barYGeo = new THREE.BoxGeometry(band, leg, t);
  const capGeo = new THREE.BoxGeometry(band, band, t);

  const placeCorner = (sx, sy) => {
    const cx = sx * (width / 2 - inset);
    const cy = sy * (height / 2 - inset);

    const barX = new THREE.Mesh(barXGeo, mat);
    barX.position.set(cx - sx * leg / 2, cy, 0.0035);
    g.add(barX);

    const barY = new THREE.Mesh(barYGeo, mat);
    barY.position.set(cx, cy - sy * leg / 2, 0.0035);
    g.add(barY);

    const cap = new THREE.Mesh(capGeo, mat);
    cap.position.set(cx, cy, 0.0036);
    g.add(cap);
  };

  placeCorner(1, 1);
  placeCorner(-1, 1);
  placeCorner(1, -1);
  placeCorner(-1, -1);
  return g;
}

/* ---------- Lights ---------- */
scene.add(new THREE.AmbientLight(0xffffff, 0.78));

const key = new THREE.DirectionalLight(0xfff1d6, 1.15);
key.position.set(2.5, 3.5, 3);
key.castShadow = QUALITY.shadows;
key.shadow.mapSize.set(QUALITY.keyShadowMap, QUALITY.keyShadowMap);
key.shadow.bias = -0.00002;
key.shadow.normalBias = 0.02;
key.shadow.radius = 2;
key.shadow.camera.near = 0.5;
key.shadow.camera.far = 12;
key.shadow.camera.left = -4;
key.shadow.camera.right = 4;
key.shadow.camera.top = 4;
key.shadow.camera.bottom = -4;
scene.add(key);

const rim = new THREE.DirectionalLight(0xb7d8ff, 0.35);
rim.position.set(-3, 2, -2);
scene.add(rim);

// Luz de escenario: foco principal desde arriba + relleno lateral suave
const topSpotTarget = new THREE.Object3D();
topSpotTarget.position.set(0, 0.2, 0);
scene.add(topSpotTarget);

const topSpot = new THREE.SpotLight(0xffd1a0, 2.25, 16, Math.PI / 7.2, 0.6, 1.2);
topSpot.position.set(0, 4.0, 1.0);
topSpot.castShadow = QUALITY.shadows;
topSpot.shadow.mapSize.set(QUALITY.topShadowMap, QUALITY.topShadowMap);
topSpot.shadow.bias = -0.00005;
topSpot.shadow.normalBias = 0.02;
topSpot.shadow.camera.near = 0.5;
topSpot.shadow.camera.far = 18;
topSpot.target = topSpotTarget;
scene.add(topSpot);

const sideSpotTarget = new THREE.Object3D();
sideSpotTarget.position.set(0.15, 0.15, 0);
scene.add(sideSpotTarget);

const sideSpot = new THREE.SpotLight(0xffb777, 0.85, 12, Math.PI / 6.5, 0.72, 1.1);
sideSpot.position.set(-2.6, 1.7, 1.35);
sideSpot.castShadow = false;
sideSpot.target = sideSpotTarget;
scene.add(sideSpot);

/* ---------- Book constants ---------- */
const BOOK_W = 1.75;
const BOOK_D = 2.05;
const BODY_H = 0.12;

const PAGE_W = BOOK_W * 0.96;
const PAGE_D = BOOK_D * 0.92;
const PAGE_THICK = 0.006;
const SPINE_X = -BOOK_W / 2;
const DEBUG_TRANSPARENT_COVERS = false;

const yBodyTop = BODY_H / 2;
const yPages = yBodyTop + 0.01;
const PAGE_BASE_Y = yPages + 0.022;
const PAGE_STACK_STEP = 0.0008;
const TURN_BASE_Y = PAGE_BASE_Y + 0.0012;

/* ---------- Book group ---------- */
const book = new THREE.Group();
scene.add(book);
const pageEdgeMap = createPaperEdgeTexture();
const pageFiberMap = createPaperFiberTexture();

// inclinaciÃ³n tipo â€œleerâ€
book.rotation.set(0.62, 0, 0);

// âœ… posiciÃ³n cerrada (centrado)
const BOOK_CLOSED_POS = new THREE.Vector3(0, 0.15, 0);

// âœ… posiciÃ³n abierta: centramos el lomo moviendo el libro
const BOOK_OPEN_POS = new THREE.Vector3(BOOK_W / 2, 0.15, 0);

book.position.copy(BOOK_CLOSED_POS);

/* ---------- Body ---------- */
const bodyGeo = new THREE.BoxGeometry(BOOK_W, BODY_H, BOOK_D);
const bodyMat = new THREE.MeshStandardMaterial({
  map: pageEdgeMap,
  color: 0xcdb896,
  roughness: 0.92,
  metalness: 0.0,
});
const body = new THREE.Mesh(bodyGeo, bodyMat);
body.receiveShadow = true;
book.add(body);

/* ---------- Back cover (fixed) ---------- */
const coverGeo = new THREE.PlaneGeometry(BOOK_W, BOOK_D);
const backLeatherMap = createLeatherTexture({
  base: "#3e241b",
  grain: "rgba(0,0,0,0.12)",
  warm: "rgba(255,170,100,0.05)",
  line: "rgba(235,200,145,0.16)",
});
const coverMatBack = new THREE.MeshStandardMaterial({
  map: backLeatherMap,
  color: 0xffffff,
  roughness: 0.84,
  metalness: 0.03,
  side: THREE.DoubleSide,
  transparent: DEBUG_TRANSPARENT_COVERS,
  opacity: DEBUG_TRANSPARENT_COVERS ? 0.2 : 1,
  depthWrite: !DEBUG_TRANSPARENT_COVERS,
});
const backCover = new THREE.Mesh(coverGeo, coverMatBack);
backCover.rotation.x = -Math.PI / 2;
backCover.position.y = yPages - 0.002;
backCover.receiveShadow = true;
backCover.add(createGoldCornerGroup(BOOK_W, BOOK_D));
book.add(backCover);

/* ---------- Front cover (hinge LEFT) ---------- */
const coverMatFront = new THREE.MeshStandardMaterial({
  map: createLeatherTexture({
    base: "#4a2a1e",
    grain: "rgba(0,0,0,0.12)",
    warm: "rgba(255,170,100,0.06)",
    line: "rgba(245,210,155,0.20)",
  }),
  color: 0xffffff,
  roughness: 0.82,
  metalness: 0.04,
  side: THREE.DoubleSide,
  transparent: DEBUG_TRANSPARENT_COVERS,
  opacity: DEBUG_TRANSPARENT_COVERS ? 0.2 : 1,
  depthWrite: !DEBUG_TRANSPARENT_COVERS,
});
coverMatFront.side = THREE.FrontSide;
const frontCover = new THREE.Mesh(coverGeo, coverMatFront);
frontCover.rotation.x = -Math.PI / 2;
frontCover.receiveShadow = true;
frontCover.add(createGoldCornerGroup(BOOK_W, BOOK_D));

const coverMatFrontInner = coverMatFront.clone();
coverMatFrontInner.side = THREE.BackSide;
const frontCoverInner = new THREE.Mesh(coverGeo, coverMatFrontInner);
frontCoverInner.rotation.x = -Math.PI / 2;
frontCoverInner.receiveShadow = true;

const frontCoverPivot = new THREE.Group();
const FRONT_COVER_OPEN_Y_OFFSET = -0.0040;
frontCoverPivot.position.set(-BOOK_W / 2, yPages + 0.002, 0);
frontCover.position.set(BOOK_W / 2, 0, 0);
// Misma tapa, cara interna separada (ligero offset sobre la normal para evitar z-fighting).
frontCoverInner.position.set(BOOK_W / 2, -0.00035, 0);
frontCoverPivot.add(frontCover);
frontCoverPivot.add(frontCoverInner);
book.add(frontCoverPivot);

frontCoverPivot.rotation.z = 0;

/* ---------- Spread (left/right fixed pages, precreated) ---------- */
const pageGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_D);
pageGeo.rotateX(-Math.PI / 2);

const fixedPages = pages.map((_, i) => {
const matLeft = new THREE.MeshStandardMaterial({
    map: getPageTexture(i, "back"),
    roughness: 0.96,
    roughnessMap: pageFiberMap,
    bumpMap: pageFiberMap,
    bumpScale: 0.0022,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1,
  });
  const matRight = matLeft.clone();
  matRight.map = getPageTexture(i, "front");
  matRight.needsUpdate = true;

  const left = new THREE.Mesh(pageGeo, matLeft);
  left.position.set(SPINE_X - PAGE_W / 2, PAGE_BASE_Y, 0);
  left.visible = false;
  left.renderOrder = 1;
  left.receiveShadow = true;
  book.add(left);

  const right = new THREE.Mesh(pageGeo, matRight);
  right.position.set(SPINE_X + PAGE_W / 2, PAGE_BASE_Y, 0);
  right.visible = false;
  right.renderOrder = 1;
  right.receiveShadow = true;
  book.add(right);

  return { left, right };
});

function updateSpread() {
  for (let i = 0; i < fixedPages.length; i++) {
    fixedPages[i].left.visible = false;
    fixedPages[i].right.visible = false;
  }

  if (!spreadEnabled) return;

  // izquierda: hojas ya pasadas (muestran reverso)
  for (let i = 0; i < pageIndex; i++) {
    // la ultima hoja pasada (i = pageIndex - 1) queda arriba
    const layer = i;
    fixedPages[i].left.visible = true;
    fixedPages[i].left.position.y = PAGE_BASE_Y + layer * PAGE_STACK_STEP;
    fixedPages[i].left.renderOrder = 2 + layer;
  }

  // derecha: hoja actual + siguientes (muestran frente)
  for (let i = pageIndex; i < fixedPages.length; i++) {
    // la hoja actual (i = pageIndex) debe quedar arriba
    const layer = i - pageIndex;
    const topBias = (fixedPages.length - pageIndex - 1) - layer;
    fixedPages[i].right.visible = true;
    fixedPages[i].right.position.y = PAGE_BASE_Y + topBias * PAGE_STACK_STEP;
    fixedPages[i].right.renderOrder = 20 + topBias;
  }
}

/* ---------- Turning page (single thin 3D sheet) ---------- */
const turnGeo = new THREE.BoxGeometry(
  PAGE_W,
  PAGE_THICK,
  PAGE_D,
  QUALITY.turnSegmentsX,
  1,
  QUALITY.turnSegmentsZ
);

const edgeMat = new THREE.MeshStandardMaterial({
  color: 0xefe4d0,
  map: pageEdgeMap,
  roughness: 0.95,
});

const turnTopMat = new THREE.MeshStandardMaterial({
  map: getPageTexture(pageIndex, "front"),
  roughness: 0.96,
  roughnessMap: pageFiberMap,
  bumpMap: pageFiberMap,
  bumpScale: 0.0022,
});

const turnBottomMat = new THREE.MeshStandardMaterial({
  map: getPageTexture(pageIndex, "back"),
  roughness: 0.96,
  roughnessMap: pageFiberMap,
  bumpMap: pageFiberMap,
  bumpScale: 0.0022,
});

const turnMaterials = [edgeMat, edgeMat, turnTopMat, turnBottomMat, edgeMat, edgeMat];
const turnPage = new THREE.Mesh(turnGeo, turnMaterials);
turnPage.castShadow = true;
turnPage.receiveShadow = true;
let turnBottomDynamicTex = null;
let currentTurnDirection = 1;
let turnNormalsFrame = 0;
const turnPosAttr = turnGeo.attributes.position;
const turnBasePos = Float32Array.from(turnPosAttr.array);

function setTurnSheetMaps(topIndex, topSide, bottomIndex, bottomSide) {
  turnMaterials[2].map = getPageTexture(topIndex, topSide);

  if (turnBottomDynamicTex) {
    turnBottomDynamicTex.dispose();
    turnBottomDynamicTex = null;
  }

  // Clonamos la textura inferior para no mutar el cache global
  turnBottomDynamicTex = getPageTexture(bottomIndex, bottomSide).clone();
  turnBottomDynamicTex.center.set(0.5, 0.5);
  turnBottomDynamicTex.rotation = Math.PI;
  turnBottomDynamicTex.needsUpdate = true;

  turnMaterials[3].map = turnBottomDynamicTex;
  turnMaterials[2].needsUpdate = true;
  turnMaterials[3].needsUpdate = true;
}

const turnPivot = new THREE.Group();
turnPivot.position.set(SPINE_X, TURN_BASE_Y, 0);
turnPage.position.set(PAGE_W / 2, 0, 0);
turnPivot.add(turnPage);
book.add(turnPivot);

turnPage.visible = false;
turnPivot.renderOrder = 120;
turnPage.renderOrder = 120;

const pageSurfaceMaterials = fixedPages.flatMap(({ left, right }) => [left.material, right.material]);
pageSurfaceMaterials.push(turnTopMat, turnBottomMat);

function applyCustomTextures() {
  assignTextureToMany([coverMatBack], "map", COVER_IMAGE_TEXTURES.back || TEXTURE_PATHS.coverColor, {
    srgb: true,
    repeat: [1.15, 1.15],
  });
  assignTextureToMany([coverMatFront], "map", COVER_IMAGE_TEXTURES.front || TEXTURE_PATHS.coverColor, {
    srgb: true,
    repeat: [1.15, 1.15],
  });
  assignTexture(COVER_IMAGE_TEXTURES.frontInner || COVER_IMAGE_TEXTURES.front || TEXTURE_PATHS.coverColor, (tex) => {
    // La cara interna usa BackSide, por eso se invierte en X para que el texto no se vea espejado.
    tex.repeat.x *= -1;
    tex.center.set(0.5, 0.5);
    tex.needsUpdate = true;
    coverMatFrontInner.map = tex;
    coverMatFrontInner.needsUpdate = true;
  }, {
    srgb: true,
    repeat: [1.15, 1.15],
  });
  assignTextureToMany([coverMatBack, coverMatFront, coverMatFrontInner], "normalMap", TEXTURE_PATHS.coverNormal, {
    repeat: [1.15, 1.15],
  });
  assignTextureToMany([coverMatBack, coverMatFront, coverMatFrontInner], "roughnessMap", TEXTURE_PATHS.coverRoughness, {
    repeat: [1.15, 1.15],
  });

  assignTextureToMany(pageSurfaceMaterials, "bumpMap", TEXTURE_PATHS.pageFiber, { repeat: [2.2, 2.2] });
  assignTextureToMany(pageSurfaceMaterials, "roughnessMap", TEXTURE_PATHS.pageRoughness, { repeat: [2.2, 2.2] });

  assignTextureToMany([bodyMat, edgeMat], "map", TEXTURE_PATHS.pageEdge, { srgb: true, repeat: [2, 2] });
}
applyCustomTextures();

function smoothstep(min, max, v) {
  const x = Math.min(1, Math.max(0, (v - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function applyTurnFx(progress, direction) {
  const bend = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
  const inertia = smoothstep(0.08, 0.56, progress) * (1 - smoothstep(0.72, 1, progress));
  const amount = 0.102 * bend + 0.032 * inertia;

  for (let i = 0; i < turnPosAttr.count; i++) {
    const i3 = i * 3;
    const bx = turnBasePos[i3];
    const by = turnBasePos[i3 + 1];
    const bz = turnBasePos[i3 + 2];

    const t = Math.min(1, Math.max(0, (bx + PAGE_W / 2) / PAGE_W));
    // En geometria local: 0 = lomo (bisagra), 1 = borde libre.
    // Mantenerlo fijo evita invertir/romper la pagina al ir "anterior".
    const u = t;
    const zUnit = bz / (PAGE_D / 2); // -1..1
    const zAbs = Math.abs(zUnit);
    const span = 1 - zAbs * 0.5;
    const edgeBias = Math.pow(u, 2.1); // deforma principalmente el extremo
    const hingeLock = smoothstep(0.24, 0.62, u); // ancla cerca del eje del libro
    const cornerCoord = (zUnit + 1) * 0.5; // esquina local; el pivote resuelve next/prev
    const cornerBias = smoothstep(0.2, 0.98, cornerCoord);

    const arc = Math.pow(Math.sin(u * Math.PI), 1.12) * amount * span;
    const cornerLift = edgeBias * cornerBias * (0.105 * bend + 0.054 * inertia);
    const cornerPullX = edgeBias * cornerBias * (0.085 * bend + 0.045 * inertia);
    const cornerTwistZ = edgeBias * cornerBias * zUnit * (0.06 * bend + 0.028 * inertia);
    const ribbon = Math.sin((u * 3.2 + zUnit * 1.25 + progress * 4.2) * Math.PI) * 0.0035 * edgeBias * cornerBias;

    // Reducimos el desplazamiento lateral para mantener el giro pegado al lomo.
    const xShift = ((u - 0.5) * amount * 0.07 - cornerPullX * 0.35) * hingeLock;
    const yShift = (arc + cornerLift + ribbon) * hingeLock;
    const zShift = ((u - 0.5) * amount * 0.24 + cornerTwistZ) * hingeLock;

    turnPosAttr.array[i3] = bx + xShift;
    turnPosAttr.array[i3 + 1] = by + yShift;
    turnPosAttr.array[i3 + 2] = bz + zShift;
  }

  turnPosAttr.needsUpdate = true;
  turnNormalsFrame += 1;
  if (
    QUALITY.turnNormalsEvery <= 1 ||
    (turnNormalsFrame % QUALITY.turnNormalsEvery) === 0 ||
    progress < 0.04 ||
    progress > 0.96
  ) {
    turnGeo.computeVertexNormals();
  }

  const settle = 1 - progress;
  const earlyDip = (1 - smoothstep(0.06, 0.22, progress)) * 0.0024;
  turnPage.position.y = -0.0052 * settle - bend * 0.0017 + inertia * 0.0018 - earlyDip;
  turnPage.position.z = 0.0038 * inertia;
  // Escalar en X mueve visualmente la bisagra porque el mesh escala desde su centro.
  // Lo mantenemos fijo para que la hoja no "se corra" del eje.
  turnPage.scale.x = 1;
  turnPage.scale.z = 1 - bend * 0.03;
}

function resetTurnFx() {
  turnNormalsFrame = 0;
  turnPage.position.y = 0;
  turnPage.position.z = 0;
  turnPage.scale.set(1, 1, 1);
  for (let i = 0; i < turnPosAttr.array.length; i++) {
    turnPosAttr.array[i] = turnBasePos[i];
  }
  turnPosAttr.needsUpdate = true;
  turnGeo.computeVertexNormals();
}

/* ---------- Open book ---------- */
function openBook() {
  if (isOpen || isOpening || isClosing) return;

  isOpening = true;
  spreadEnabled = false;
  updateUI();
  playOpenBookSfx();

  // muestra el spread
  updateSpread();

  // cÃ¡mara
  gsap.to(camera.position, {
    x: CAM_OPEN_POS.x,
    y: CAM_OPEN_POS.y,
    z: CAM_OPEN_POS.z,
    duration: 1.1,
    ease: "power3.inOut",
  });

  gsap.to(lookTarget.position, {
    x: TARGET_OPEN_POS.x,
    y: TARGET_OPEN_POS.y,
    z: TARGET_OPEN_POS.z,
    duration: 1.1,
    ease: "power3.inOut",
    onUpdate: () => {
      controls.target.copy(lookTarget.position);
      controls.update();
    },
  });

  // centramos lomo moviendo el libro
  gsap.to(book.position, {
    x: BOOK_OPEN_POS.x,
    y: BOOK_OPEN_POS.y,
    z: BOOK_OPEN_POS.z,
    duration: 1.1,
    ease: "power3.inOut",
  });

  // abrir tapa
  gsap.to(frontCoverPivot.position, {
    y: yPages + 0.002 + FRONT_COVER_OPEN_Y_OFFSET,
    duration: 1.05,
    ease: "power3.inOut",
  });

  gsap.to(frontCoverPivot.rotation, {
    z: Math.PI,
    duration: 1.05,
    ease: "power3.inOut",
    onUpdate: () => {
      // Muestra paginas cuando la tapa ya no las tapa visualmente
      if (!spreadEnabled && frontCoverPivot.rotation.z > Math.PI * SPREAD_SHOW_DURING_OPEN_AT) {
        spreadEnabled = true;
        updateSpread();
      }
    },
    onComplete: () => {
      isOpen = true;
      isOpening = false;
      spreadEnabled = true;
      updateSpread();
      controls.target.copy(lookTarget.position);
      controls.update();
      updateUI();
    },
  });
}

function closeBook(options = {}) {
  const { fast = false } = options;
  if (!isOpen || isOpening || isClosing || isFlipping) return;

  const moveDuration = fast ? 0.42 : 0.95;
  const coverDuration = fast ? 2 : 0.9;

  isClosing = true;
  updateUI();
  playCloseBookSfx();

  gsap.to(camera.position, {
    x: CAM_CLOSED_POS.x,
    y: CAM_CLOSED_POS.y,
    z: CAM_CLOSED_POS.z,
    duration: moveDuration,
    ease: "power3.inOut",
  });

  gsap.to(lookTarget.position, {
    x: TARGET_CLOSED_POS.x,
    y: TARGET_CLOSED_POS.y,
    z: TARGET_CLOSED_POS.z,
    duration: moveDuration,
    ease: "power3.inOut",
    onUpdate: () => {
      controls.target.copy(lookTarget.position);
      controls.update();
    },
  });

  gsap.to(book.position, {
    x: BOOK_CLOSED_POS.x,
    y: BOOK_CLOSED_POS.y,
    z: BOOK_CLOSED_POS.z,
    duration: moveDuration,
    ease: "power3.inOut",
  });

  gsap.to(frontCoverPivot.rotation, {
    z: 0,
    duration: coverDuration,
    ease: "power3.inOut",
    onUpdate: () => {
      // Oculta paginas antes del cierre total para evitar sobreposicion visible.
      if (spreadEnabled && frontCoverPivot.rotation.z < Math.PI * SPREAD_HIDE_DURING_CLOSE_AT) {
        spreadEnabled = false;
        updateSpread();
      }
    },
    onComplete: () => {
      spreadEnabled = false;
      updateSpread();
      isOpen = false;
      isClosing = false;
      controls.target.copy(lookTarget.position);
      controls.update();
      updateUI();
    },
  });

  gsap.to(frontCoverPivot.position, {
    y: yPages + 0.002,
    duration: coverDuration,
    ease: "power3.inOut",
  });
}

window.addEventListener("pointerdown", () => {
  requestFullscreenOnMobile();
  startBgm();
  openBook();
});

/* ---------- Flip pages ---------- */
function flip(direction, options = {}) {
  const { duration = 1.72, playSfx = true, onComplete = null } = options;
  if (isFlipping || !isOpen || isOpening || isClosing) return;

  const nextIndex = pageIndex + direction;
  if (nextIndex < 0 || nextIndex >= pages.length) return;

  isFlipping = true;
  updateUI();

  // cuÃ¡l hoja se ve girando
  const movingIdx = direction > 0 ? pageIndex : nextIndex;
  currentTurnDirection = direction;

  // activar hoja giratoria
  turnPage.visible = true;
  resetTurnFx();
  if (playSfx) playPageSfx();

  if (direction > 0) {
    // siguiente: gira la hoja del lado derecho hacia la izquierda (frente -> reverso)
    setTurnSheetMaps(movingIdx, "front", movingIdx, "back");
  } else {
    // anterior: evita arranque en reverso, inicia viendo el frente
    setTurnSheetMaps(movingIdx, "front", movingIdx, "back");
  }

  // reset rotaciones / pivote segun direccion
  turnPivot.rotation.set(0, 0, 0);
  if (direction > 0) {
    turnPivot.position.set(SPINE_X, TURN_BASE_Y, 0);
    turnPage.position.set(PAGE_W / 2, 0, 0);
    turnPivot.rotation.z = 0;
  } else {
    turnPivot.position.set(SPINE_X, TURN_BASE_Y, 0);
    turnPage.position.set(PAGE_W / 2, 0, 0);
    turnPivot.rotation.z = Math.PI;
  }

  turnPivot.position.y = TURN_BASE_Y;

  // ocultamos la pagina base un poco despues de empezar el giro
  // para evitar el "flash" de la siguiente pagina al inicio.
  let basePageHidden = false;

  const tl = gsap.timeline({
    onComplete: () => {
      pageIndex = nextIndex;
      updateSpread();
      turnPage.visible = false;
      resetTurnFx();
      turnPivot.rotation.set(0, 0, 0);
      turnPivot.position.set(SPINE_X, TURN_BASE_Y, 0);
      turnPage.position.set(PAGE_W / 2, 0, 0);

      isFlipping = false;
      updateUI();
      if (typeof onComplete === "function") onComplete();
    },
  });

  tl.to(turnPivot.rotation, {
    z: direction > 0 ? Math.PI : 0,
    duration,
    ease: "sine.inOut",
    onUpdate: () => {
      const p =
        direction > 0
          ? turnPivot.rotation.z / Math.PI
          : 1 - turnPivot.rotation.z / Math.PI;

      // Esperamos un poco mas antes de ocultar la hoja fija para evitar que
      // se vea la pagina siguiente por el lomo al inicio del giro.
      if (!basePageHidden && p > 0.06) {
        basePageHidden = true;
        if (direction > 0) fixedPages[movingIdx].right.visible = false;
        else fixedPages[movingIdx].left.visible = false;
      }
      applyTurnFx(p, currentTurnDirection);
    },
  }, 0);
}

function returnToStartFast() {
  if (!isOpen || isOpening || isClosing || isFlipping || isAutoReturning) return;

  isAutoReturning = true;
  updateUI();

  const rewindStep = () => {
    if (pageIndex > 0) {
      flip(-1, {
        duration: 0.45,
        onComplete: rewindStep,
      });
      return;
    }

    isAutoReturning = false;
    closeBook({ fast: true });
  };

  rewindStep();
}

prevBtn.addEventListener("click", () => {
  if (!isOpen || isOpening || isClosing || isFlipping || isAutoReturning) return;
  if (pageIndex === 0) {
    closeBook();
    return;
  }
  flip(-1);
});
nextBtn.addEventListener("click", () => {
  if (!isOpen || isOpening || isClosing || isFlipping || isAutoReturning) return;
  if (pageIndex >= pages.length - 1) {
    returnToStartFast();
    return;
  }
  flip(1);
});

/* ---------- Resize ---------- */
addEventListener("resize", () => {
  syncViewportHeightVar();
  camera.aspect = getViewportWidth() / getViewportHeight();
  camera.updateProjectionMatrix();
  renderer.setSize(getViewportWidth(), getViewportHeight());
  controls.update();
});

window.addEventListener("orientationchange", () => {
  setTimeout(syncViewportHeightVar, 120);
});

window.visualViewport?.addEventListener("resize", syncViewportHeightVar);
window.visualViewport?.addEventListener("scroll", syncViewportHeightVar);
document.addEventListener("fullscreenchange", syncViewportHeightVar);
document.addEventListener("fullscreenchange", updateFullscreenToggleUI);
document.addEventListener("webkitfullscreenchange", syncViewportHeightVar);
document.addEventListener("webkitfullscreenchange", updateFullscreenToggleUI);

/* ---------- Loop ---------- */
const clock = new THREE.Clock();
let breathPaused = false;
let breathPauseStartedAt = 0;
let breathPausedTotal = 0;
const tmpBookWorld = new THREE.Vector3();
const topSpotAim = new THREE.Vector3();
const sideSpotAim = new THREE.Vector3();
const topSpotOffset = new THREE.Vector3(0, 0.02, 0);
const sideSpotOffset = new THREE.Vector3(0.12, 0.01, 0);
const topSpotBaseIntensity = 2.25;
const sideSpotBaseIntensity = 0.85;

function tick() {
  const t = clock.getElapsedTime();

  const breathingBlocked = isOpening || isFlipping || isClosing;

  if (breathingBlocked) {
    if (!breathPaused) {
      breathPaused = true;
      breathPauseStartedAt = t;
    }
  } else {
    if (breathPaused) {
      breathPaused = false;
      breathPausedTotal += t - breathPauseStartedAt;
    }

    const breathTime = t - breathPausedTotal;
    book.position.y = BOOK_OPEN_POS.y + Math.sin(breathTime * 1.05) * 0.011;
  }

  if (controls.enabled) {
    controls.target.copy(lookTarget.position);
    controls.update();
  } else {
    camera.lookAt(lookTarget.position);
  }

  // El foco sigue el libro y respira muy levemente para un look cinematografico.
  book.getWorldPosition(tmpBookWorld);
  topSpotAim.copy(tmpBookWorld).add(topSpotOffset);
  sideSpotAim.copy(tmpBookWorld).add(sideSpotOffset);

  topSpotTarget.position.lerp(topSpotAim, 0.08);
  sideSpotTarget.position.lerp(sideSpotAim, 0.08);

  topSpot.intensity = topSpotBaseIntensity + Math.sin(t * 1.6) * 0.06;
  sideSpot.intensity = sideSpotBaseIntensity + Math.sin(t * 1.25 + 1.2) * 0.04;

  renderer.render(scene, camera);
  requestAnimationFrame(tick);
}
tick();

/* ---------- Twinkles ---------- */
const twinklesLayer = document.getElementById("twinkles");

function spawnTwinkle() {
  if (!twinklesLayer || !QUALITY.twinklesEnabled) return;

  const el = document.createElement("div");
  el.className = "twinkle";
  el.innerHTML = "<span></span><span></span><span></span><span></span>";

  const pad = 6;
  const x = pad + Math.random() * (100 - pad * 2);
  const y = pad + Math.random() * (100 - pad * 2);

  const size = 10 + Math.random() * 18;
  const dur = 900 + Math.random() * 1100;
  const rot = Math.floor(Math.random() * 360);

  const strong = Math.random() < QUALITY.twinkleStrongChance;

  el.style.setProperty("--x", `${x}%`);
  el.style.setProperty("--y", `${y}%`);
  el.style.setProperty("--size", `${size}px`);
  el.style.setProperty("--dur", `${dur}ms`);
  el.style.setProperty("--rot", `${rot}deg`);

  el.style.opacity = "0";
  el.style.filter = strong
    ? "drop-shadow(0 0 12px rgba(255, 220, 140, .75)) drop-shadow(0 0 24px rgba(255, 250, 230, .55))"
    : "drop-shadow(0 0 10px rgba(255, 220, 140, .55)) drop-shadow(0 0 18px rgba(255, 250, 230, .35))";

  twinklesLayer.appendChild(el);
  setTimeout(() => el.remove(), dur + 50);
}

function startTwinkles() {
  if (!QUALITY.twinklesEnabled) return;
  const loop = () => {
    const count =
      QUALITY.twinkleCountMin +
      Math.floor(Math.random() * (QUALITY.twinkleCountMax - QUALITY.twinkleCountMin + 1));
    for (let i = 0; i < count; i++) spawnTwinkle();
    const next =
      QUALITY.twinkleDelayMin +
      Math.random() * (QUALITY.twinkleDelayMax - QUALITY.twinkleDelayMin);
    setTimeout(loop, next);
  };
  loop();
}
startTwinkles();
