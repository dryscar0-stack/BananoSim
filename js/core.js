// ============================================================
// core.js — Utilidades, config, materiales PSX y helpers
// ============================================================

// ---------- DOM ----------
const $ = id => document.getElementById(id);
const _dc = {};
const $$ = id => (_dc[id] || (_dc[id] = $(id)));

// ---------- MATEMÁTICAS ----------
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const lp = (a, b, t) => a + (b - a) * t;
const rrand = Math.random;

const rnd = (s => () => {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
})(1337);

// ---------- CONFIG ----------
const DAY_REAL_SECONDS = 14 * 60;
const SECONDS_PER_STAGE = (30 * DAY_REAL_SECONDS) / 4;

const cfg = {
    gm: 1, gm2: false, td: 'auto',
    mins: 360, dayCount: 1, timeScale: 1
};

const CFG_DEFAULTS = {
    gm: 1, gm2: false, td: 'auto',
    mins: 360, dayCount: 1, timeScale: 1
};

function resetCfgToDefaults() {
    Object.assign(cfg, CFG_DEFAULTS);
    const set = (id, v, prop = 'value') => { const el = $(id); if (el) el[prop] = v; };
    set('cgs', 1); set('cgm', false, 'checked'); set('ctd', 'auto');
    set('dtSpeed', '1'); set('dtHour', 360); set('dbMoist', 50);
}

// ---------- ESTADO GLOBAL ----------
const inv = { plat: 3, hij: 1 };
let en = 100, hy = 100, st2 = 100, mdur = 100, soilMoisture = 0.5;

// ---------- ESTADOS DE PLANTA ----------
const STAGE = {
    MUERTA: -1,
    COLINO: 0, VEGETATIVO: 1, PREFLORACION: 2,
    MADURO: 3, COSECHADA: 4, CORTADA: 5
};

// ============================================================
// MATERIALES PSX
// ============================================================
const psxMat = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color, roughness: 1, metalness: 0, flatShading: true, ...opts
});

const PAL = {
    soil: 0x4a3525, soilWet: 0x2a1e14, soilDry: 0x8b6b4a,
    trunk: 0x556b2f, trunkBase: 0x3e5020, trunkLayer: 0x6b8e23,
    dryLeaf: 0x8d6e63, frond: 0x2e8b57, frondDark: 0x1e5c3a, spear: 0x52be80,
    banana: 0xf5d020, bananaMed: 0xd4b830, bananaPoor: 0x8a7a40, bananaBad: 0x5a4a2a,
    stalk: 0x4a7c59, colino: 0x6b8e23, colinoLeaf: 0x7cb342,
    bush: 0x2d5016, grass: 0x4d7c2b, rock: 0x6b6b6b,
    water: 0x1e6091, waterShine: 0x87ceeb,
    cane: 0x6b8e23, caneTop: 0x8b6f1e, lily: 0x2e8b57,
    hand: 0xd2b48c, blade: 0xbdc3c7, handle: 0x4a2f1a,
    bottleGlass: 0x8ecae6, bottleCap: 0x2c3e50,
    file: 0x8e8e8e, can: 0x5d6d7e, canSpout: 0x85929e,
    root: 0xc8a97a, baseCorm: 0x6b4a2f, waterBottle: 0x2980b9,
    highlight: 0xffd700
};

const MAT = {
    soil: psxMat(PAL.soil),
    root: psxMat(PAL.root),
    baseCorm: psxMat(PAL.baseCorm),
    trunk: psxMat(PAL.trunk),
    trunkBase: psxMat(PAL.trunkBase),
    trunkLayer: psxMat(PAL.trunkLayer),
    dryLeaf: psxMat(PAL.dryLeaf),
    spear: psxMat(PAL.spear),
    stalk: psxMat(PAL.stalk),
    colino: psxMat(PAL.colino),
    frond: psxMat(PAL.frond, { side: THREE.DoubleSide }),
    frondDark: psxMat(PAL.frondDark, { side: THREE.DoubleSide }),
    colinoLeaf: psxMat(PAL.colinoLeaf, { side: THREE.DoubleSide }),
    grass: psxMat(PAL.grass, { side: THREE.DoubleSide }),
    lily: psxMat(PAL.lily, { side: THREE.DoubleSide }),
    banana: psxMat(PAL.banana),
    bananaMed: psxMat(PAL.bananaMed),
    bananaPoor: psxMat(PAL.bananaPoor),
    bananaBad: psxMat(PAL.bananaBad),
    bush: psxMat(PAL.bush),
    rock: psxMat(PAL.rock),
    water: psxMat(PAL.water, { roughness: 0.3 }),
    cane: psxMat(PAL.cane),
    caneTop: psxMat(PAL.caneTop),
    hand: psxMat(PAL.hand),
    blade: psxMat(PAL.blade),
    handle: psxMat(PAL.handle),
    bottleGlass: psxMat(PAL.bottleGlass, { transparent: true, opacity: 0.75 }),
    bottleCap: psxMat(PAL.bottleCap),
    waterBottle: psxMat(PAL.waterBottle),
    file: psxMat(PAL.file),
    can: psxMat(PAL.can),
    canSpout: psxMat(PAL.canSpout),
    invisible: new THREE.MeshBasicMaterial({ visible: false }),
    highlight: new THREE.MeshBasicMaterial({ color: PAL.highlight, transparent: true, opacity: 0.4 })
};

// ============================================================
// HELPERS GEOMÉTRICOS
// ============================================================
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cyl = (rt, rb, h, seg, mat) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
const cone = (r, h, seg, mat) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), mat);
const sphere = (r, wSeg, hSeg, mat) => new THREE.Mesh(new THREE.SphereGeometry(r, wSeg, hSeg), mat);
const dodec = (r, detail, mat) => new THREE.Mesh(new THREE.DodecahedronGeometry(r, detail), mat);
const torus = (r, tube, rSeg, tSeg, mat) => new THREE.Mesh(new THREE.TorusGeometry(r, tube, rSeg, tSeg), mat);

function at(m, x = 0, y = 0, z = 0) { m.position.set(x, y, z); return m; }
function rot(m, x = 0, y = 0, z = 0) { m.rotation.set(x, y, z); return m; }

// Helper GLOBAL: añadir varios hijos a un padre en una línea
function addTo(parent, ...kids) {
    kids.forEach(k => parent.add(k));
    return parent;
}

// Etiqueta un mesh con tipo/planta para el raycast
function tag(mesh, type, p, extra = {}) {
    mesh.userData = { type, p, ...extra };
    return mesh;
}

// Añade un mesh a un padre y lo posiciona en una sola línea
function addAt(parent, mesh, x = 0, y = 0, z = 0) {
    at(mesh, x, y, z);
    parent.add(mesh);
    return mesh;
}

// ============================================================
// HUMEDAD DEL SUELO
// ============================================================
const moisturePatches = [];

function addLocalMoisture(x, z, amount, radius) {
    moisturePatches.push({ x, z, amount, radius, life: 1 });
    if (moisturePatches.length > 30) moisturePatches.shift();
}

function tickMoisturePatches(dt) {
    for (let i = moisturePatches.length - 1; i >= 0; i--) {
        moisturePatches[i].life -= dt * 0.05;
        if (moisturePatches[i].life <= 0) moisturePatches.splice(i, 1);
    }
}

function moistureAt(x, z) {
    const nearWater = cl(1 - Math.hypot(x - 8, z - 6) / 20, 0, 1);
    let local = 0;
    for (const patch of moisturePatches) {
        const d = Math.hypot(x - patch.x, z - patch.z);
        if (d < patch.radius) local += patch.amount * (1 - d / patch.radius) * patch.life;
    }
    return cl(soilMoisture * 0.5 + nearWater * 0.25 + cl(local, 0, 1) * 0.4, 0, 1);
}

function qualityFactor(p) {
    const hum = moistureAt(p.x, p.z);
    const san = cl(p.score / 6, 0, 1);
    const noise = (rrand() - 0.5) * 0.15;
    return cl(hum * 0.5 + san * 0.5 + noise, 0, 1);
}

// ============================================================
// HUD
// ============================================================
function updHUD() {
    $$('tp').innerText = inv.plat;
    $$('th').innerText = inv.hij;
    $$('be').style.width = en + '%';
    $$('bh').style.width = hy + '%';
    $$('bs').style.width = st2 + '%';
    $$('md').innerText = Math.round(mdur) + '%';
    const d = $$('day');
    if (d) d.innerText = cfg.dayCount;
}

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame() {
    localStorage.setItem('finca', JSON.stringify({
        inv: { plat: inv.plat, hij: inv.hij },
        en, hy, st2, mdur, soilMoisture,
        plants: PL.map(p => ({
            x: p.x, z: p.z, stage: p.stage, score: p.score,
            hasDry: p.hasDry, clusterHands: p.clusterHands,
            chubaCount: p.chubaCount, timer: p.timer,
            chubaTimer: p.chubaTimer, suckerAge: p.suckerAge
        }))
    }));
}

function loadGame() {
    const raw = localStorage.getItem('finca');
    if (!raw) return false;

    let d;
    try { d = JSON.parse(raw); } catch { return false; }

    resetCfgToDefaults();

    if (d.inv) { inv.plat = d.inv.plat || 0; inv.hij = d.inv.hij || 0; }
    en = d.en ?? 100; hy = d.hy ?? 100; st2 = d.st2 ?? 100;
    mdur = d.mdur ?? 100; soilMoisture = d.soilMoisture ?? 0.5;

    PL.forEach(p => sc.remove(p.group));
    PL.length = 0;
    plantGrid.clear();
    moisturePatches.length = 0;
    if (typeof clearWetSpots === 'function') clearWetSpots();

    if (d.plants) {
        d.plants.forEach(pd => {
            const p = makePlant(pd.x, pd.z, pd.stage);
            p.score = pd.score || 0;
            p.clusterHands = pd.clusterHands || 0;
            p.timer = pd.timer || 0;
            p.chubaTimer = pd.chubaTimer || 0;
            p.suckerAge = pd.suckerAge || 0;
            const savedCount = pd.chubaCount || 0;
            for (let i = 0; i < savedCount; i++) spawnChuba(p);
            p.hasDry = p.dryGroups.length > 0;
            PL.push(p);
            plantGrid.set(gk(p.x, p.z), p);
            upd(p);
        });
    }

    updHUD();
    return true;
}