// ============================================================
// core.js — Utilidades, config, materiales PSX y helpers
// ============================================================

const $ = id => document.getElementById(id);
const domCache = {};
const $$ = id => (domCache[id] || (domCache[id] = $(id)));

const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const lp = (a, b, t) => a + (b - a) * t;
const rrand = Math.random;

const rnd = (s => () => {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
})(1337);

// ============================================================
// CONFIG GLOBAL
// ============================================================
// Día 8 min + noche 6 min = 14 min reales = 1 día de juego
const DAY_REAL_SECONDS = 14 * 60;

const cfg = {
    gm: 1,                 // multiplicador de crecimiento (1 = real)
    gm2: false,            // modo dios
    td: 'auto',            // preset de luz
    mins: 360,             // minutos del día actual (06:00)
    dayCount: 1,           // contador de días
    timeScale: 1           // velocidad del tiempo (1× = real)
};

// ============================================================
// ESTADO GLOBAL
// ============================================================
const inv = { plat: 3, hij: 1 };
let en = 100, hy = 100, st2 = 100, mdur = 100, soilMoisture = 0.5;

// ============================================================
// ESTADOS DE PLANTA
// ============================================================
const STAGE = {
    COLINO: 0,
    VEGETATIVO: 1,
    PREFLORACION: 2,
    MADURO: 3,
    COSECHADA: 4,
    CORTADA: 5,
    MUERTA: -1
};

// ============================================================
// TIEMPO DE CRECIMIENTO POR ETAPA
// ============================================================
// Un ciclo completo (COLINO → MADURO) = 30 días de juego
// 4 etapas → 7.5 días por etapa
// 7.5 días × 14 min/día = 105 min reales por etapa = 6300 segundos
const SECONDS_PER_STAGE = (30 * DAY_REAL_SECONDS) / 4; // = 6300 s

// ============================================================
// MATERIALES PSX
// ============================================================
function psxMat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({
        color, roughness: 1, metalness: 0, flatShading: true, ...opts
    });
}

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
    highlight: 0xffd700
};

const MAT = {
    trunk: psxMat(PAL.trunk),
    trunkBase: psxMat(PAL.trunkBase),
    trunkLayer: psxMat(PAL.trunkLayer),
    dryLeaf: psxMat(PAL.dryLeaf),
    frond: psxMat(PAL.frond, { side: THREE.DoubleSide }),
    frondDark: psxMat(PAL.frondDark, { side: THREE.DoubleSide }),
    spear: psxMat(PAL.spear),
    stalk: psxMat(PAL.stalk),
    colino: psxMat(PAL.colino),
    colinoLeaf: psxMat(PAL.colinoLeaf, { side: THREE.DoubleSide }),
    soil: psxMat(PAL.soil),
    root: psxMat(0xc8a97a),
    baseCorm: psxMat(0x6b4a2f),
    banana: psxMat(PAL.banana),
    bananaMed: psxMat(PAL.bananaMed),
    bananaPoor: psxMat(PAL.bananaPoor),
    bananaBad: psxMat(PAL.bananaBad),
    bush: psxMat(PAL.bush),
    grass: psxMat(PAL.grass, { side: THREE.DoubleSide }),
    rock: psxMat(PAL.rock),
    water: psxMat(PAL.water, { roughness: 0.3 }),
    cane: psxMat(PAL.cane),
    caneTop: psxMat(PAL.caneTop),
    lily: psxMat(PAL.lily, { side: THREE.DoubleSide }),
    hand: psxMat(PAL.hand),
    blade: psxMat(PAL.blade),
    handle: psxMat(PAL.handle),
    bottleGlass: psxMat(PAL.bottleGlass, { transparent: true, opacity: 0.75 }),
    bottleCap: psxMat(PAL.bottleCap),
    waterBottle: psxMat(0x2980b9),
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

function at(mesh, x = 0, y = 0, z = 0) { mesh.position.set(x, y, z); return mesh; }
function rot(mesh, x = 0, y = 0, z = 0) { mesh.rotation.set(x, y, z); return mesh; }
function scale(mesh, x, y = x, z = x) { mesh.scale.set(x, y, z); return mesh; }

function tag(mesh, type, p, extra = {}) {
    mesh.userData = { type, p, ...extra };
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
    const distW = Math.hypot(x - 8, z - 6);
    const nearWater = cl(1 - distW / 20, 0, 1);
    let local = 0;
    for (const patch of moisturePatches) {
        const d = Math.hypot(x - patch.x, z - patch.z);
        if (d < patch.radius) {
            local += patch.amount * (1 - d / patch.radius) * patch.life;
        }
    }
    local = cl(local, 0, 1);
    return cl(soilMoisture * 0.5 + nearWater * 0.25 + local * 0.4, 0, 1);
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
    const dayEl = $$('day');
    if (dayEl) dayEl.innerText = cfg.dayCount;
}

// ============================================================
// SAVE / LOAD
// ============================================================
function saveGame() {
    const data = {
        inv, en, hy, st2, mdur, soilMoisture,
        cfg: { gm: cfg.gm, gm2: cfg.gm2, mins: cfg.mins, dayCount: cfg.dayCount },
        plants: PL.map(p => ({
            x: p.x, z: p.z, stage: p.stage,
            score: p.score, hasDry: p.hasDry,
            clusterHands: p.clusterHands,
            chubaCount: p.chubaCount
        }))
    };
    localStorage.setItem('finca', JSON.stringify(data));
}

function loadGame() {
    const raw = localStorage.getItem('finca');
    if (!raw) return false;
    const d = JSON.parse(raw);
    Object.assign(inv, d.inv);
    en = d.en; hy = d.hy; st2 = d.st2;
    mdur = d.mdur || 100;
    soilMoisture = d.soilMoisture || 0.5;
    if (d.cfg) {
        cfg.gm = d.cfg.gm || 1;
        cfg.gm2 = d.cfg.gm2 || false;
        cfg.mins = d.cfg.mins || 360;
        cfg.dayCount = d.cfg.dayCount || 1;
    }
    PL.forEach(p => sc.remove(p.group));
    PL.length = 0;
    plantGrid.clear();
    moisturePatches.length = 0;
    d.plants.forEach(pd => {
        const p = makePlant(pd.x, pd.z, pd.stage);
        p.score = pd.score;
        p.hasDry = pd.hasDry;
        p.clusterHands = pd.clusterHands || 0;
        // Recrear chubas según el contador guardado
        const savedCount = pd.chubaCount || 0;
        for (let i = 0; i < savedCount; i++) spawnChuba(p);
        PL.push(p);
        plantGrid.set(gk(p.x, p.z), p);
        upd(p);
    });
    updHUD();
    return true;
}