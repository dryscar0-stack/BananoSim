// ============================================================
// player.js — Herramientas, FPV, controles y acciones
// ============================================================

// ---------- GRUPOS FPV ----------
const fpv = new THREE.Group();
const handR = new THREE.Group();
const handL = new THREE.Group();
fpv.add(handR, handL);
cam.add(fpv);
sc.add(cam);

let toolR = null, toolL = null;
let currentTool = 'machete';
let wateringMode = false;
let wateringActive = false;
const wateringTarget = new THREE.Vector3();
let floorMeshRef = null;

// ============================================================
// BUILDERS DE HERRAMIENTAS
// ============================================================
const BUILDERS = {
    machete: () => addTo(new THREE.Group(),
        box(0.22, 0.22, 0.38, MAT.hand),
        at(box(0.06, 0.18, 0.06, MAT.handle), 0, 0.22, -0.05),
        rot(at(box(0.06, 0.6, 0.02, MAT.blade), 0, 0.5, -0.02), 0.1, 0, 0)
    ),
    colino: () => {
        const g = new THREE.Group();
        g.add(at(box(0.22, 0.22, 0.3, MAT.hand), 0, 0, 0.1));
        g.add(at(cyl(0.04, 0.07, 0.28, 5, MAT.colino), 0, 0.18, -0.05));
        for (let i = 0; i < 3; i++)
            g.add(rot(at(box(0.18, 0.01, 0.05, MAT.colinoLeaf), 0, 0.32, -0.05), 0, (i * Math.PI * 2) / 3, 0.3));
        g.add(at(dodec(0.11, 0, MAT.soil), 0, 0.03, -0.05));
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            g.add(rot(at(cyl(0.008, 0.003, 0.12, 4, MAT.root),
                Math.cos(a) * 0.05, -0.04, -0.05 + Math.sin(a) * 0.05),
                Math.sin(a) * 0.5, 0, Math.cos(a) * 0.5));
        }
        return g;
    },
    banana: () => {
        const g = addTo(new THREE.Group(),
            box(0.22, 0.22, 0.38, MAT.hand),
            rot(at(cyl(0.05, 0.045, 0.35, 6, psxMat(0xfff4c2)), 0, 0.25, -0.05), 0, 0, 0.2)
        );
        for (let i = 0; i < 3; i++)
            g.add(rot(at(box(0.06, 0.18, 0.015, MAT.banana), 0, 0.1, -0.05), 0, (i * Math.PI * 2) / 3, 0.4));
        g.add(at(cone(0.045, 0.06, 6, psxMat(0xfff4c2)), 0, 0.44, -0.05));
        return g;
    },
    bottle: () => addTo(new THREE.Group(),
        box(0.22, 0.22, 0.38, MAT.hand),
        at(cyl(0.06, 0.06, 0.3, 8, MAT.bottleGlass), 0, 0.25, -0.05),
        at(cyl(0.055, 0.055, 0.2, 8, MAT.waterBottle), 0, 0.2, -0.05),
        at(cyl(0.03, 0.04, 0.06, 6, MAT.bottleGlass), 0, 0.42, -0.05),
        at(cyl(0.035, 0.035, 0.04, 6, MAT.bottleCap), 0, 0.47, -0.05)
    ),
    wateringCan: () => {
        const g = addTo(new THREE.Group(),
            box(0.22, 0.22, 0.38, MAT.hand),
            at(cyl(0.14, 0.12, 0.22, 8, MAT.can), 0, 0.22, -0.05)
        );
        const pico = cyl(0.02, 0.03, 0.38, 6, MAT.canSpout);
        at(pico, 0.08, 0.32, -0.18); rot(pico, 0.5, 0, -0.6); g.add(pico);
        const roseta = cyl(0.05, 0.04, 0.03, 8, MAT.canSpout);
        at(roseta, 0.2, 0.42, -0.32); rot(roseta, 0.5, 0, -0.6); g.add(roseta);
        const asa = torus(0.06, 0.015, 4, 8, MAT.can);
        at(asa, 0, 0.36, -0.05); asa.rotation.x = Math.PI / 2; g.add(asa);
        return g;
    },
    file: () => addTo(new THREE.Group(),
        at(box(0.22, 0.22, 0.3, MAT.hand), 0, 0, 0.1),
        at(box(0.05, 0.14, 0.05, MAT.handle), 0, 0.12, -0.05),
        at(box(0.025, 0.28, 0.025, MAT.file), 0, 0.34, -0.05)
    ),
    palin: () => {
        const g = addTo(new THREE.Group(),
            box(0.22, 0.22, 0.38, MAT.hand),
            at(cyl(0.035, 0.045, 0.55, 6, MAT.handle), 0, 0.28, -0.05)
        );
        const cabeza = box(0.24, 0.03, 0.28, psxMat(0x8d6e63));
        at(cabeza, 0, 0.58, -0.08); cabeza.rotation.x = -0.15; g.add(cabeza);
        g.add(at(box(0.08, 0.06, 0.08, psxMat(0x6b4a2f)), 0, 0.55, -0.05));
        const filo = box(0.24, 0.02, 0.03, MAT.blade);
        at(filo, 0, 0.565, -0.21); filo.rotation.x = -0.15; g.add(filo);
        return g;
    }
};

BUILDERS.sharpening = () => BUILDERS.machete();

const HIDDEN = new THREE.Vector3(-0.32, -0.55, -0.4);
const TOOL_SETUP = {
    machete:     { r: [0.32, -0.28, -0.55], l: HIDDEN, rRot: [0, 0, 0], lRot: [0, 0, 0] },
    banana:      { r: [0.32, -0.30, -0.50], l: HIDDEN, rRot: [0, 0, 0], lRot: [0, 0, 0] },
    bottle:      { r: [0.32, -0.30, -0.50], l: HIDDEN, rRot: [0, 0, 0], lRot: [0, 0, 0] },
    wateringCan: { r: [0.32, -0.28, -0.55], l: HIDDEN, rRot: [0, 0, 0], lRot: [0, 0, 0] },
    colino:      { r: HIDDEN,                l: [-0.05, -0.35, -0.45], rRot: [0, 0, 0], lRot: [0, 0, 0.3] },
    palin:       { r: [0.32, -0.28, -0.55], l: HIDDEN, rRot: [0, 0, 0], lRot: [0, 0, 0] },
    sharpening:  { r: [0.32, -0.28, -0.55], l: [-0.05, -0.28, -0.5], rRot: [0, 0.3, 0.2], lRot: [0, 0, -0.6] }
};

function setTool(tool) {
    if (toolR) handR.remove(toolR);
    if (toolL) handL.remove(toolL);
    toolR = toolL = null;

    const s = TOOL_SETUP[tool];
    if (!s) return;

    if (s.r !== HIDDEN) {
        toolR = BUILDERS[tool]();
        toolR.position.fromArray(s.r);
        handR.add(toolR);
    }
    if (s.l !== HIDDEN) {
        toolL = BUILDERS[tool === 'sharpening' ? 'file' : tool]();
        toolL.position.fromArray(s.l);
        handL.add(toolL);
    }
    handR.rotation.fromArray(s.rRot);
    handL.rotation.fromArray(s.lRot);
    currentTool = tool;
}

function restoreMachete() {
    setTool('machete');
    wateringMode = wateringActive = false;
    if (typeof window.setSlotActive === 'function') window.setSlotActive('machete');
    window.selectedTool = 'machete';
}

setTool('machete');

// ============================================================
// GOTAS DE AGUA
// ============================================================
const DROPS_MAX = 50;
const dropsPool = [];
let dropsSpawnTimer = 0;
const dropMat = new THREE.MeshBasicMaterial({ color: PAL.waterShine, transparent: true, opacity: 0.9 });
const _originVec = new THREE.Vector3();
const _fwdVec = new THREE.Vector3();

for (let i = 0; i < DROPS_MAX; i++) {
    const d = sphere(0.04, 4, 3, dropMat);
    d.visible = false;
    d.userData = { active: false, vy: 0, life: 0 };
    sc.add(d);
    dropsPool.push(d);
}

function spawnDrop(x, y, z, spread = 0.05) {
    for (const d of dropsPool) {
        if (d.userData.active) continue;
        d.position.set(x + (rrand() - 0.5) * spread, y, z + (rrand() - 0.5) * spread);
        d.userData.active = true;
        d.userData.vy = -2.5 - rrand() * 1.0;
        d.userData.life = 1.0;
        d.visible = true;
        return;
    }
}

function tickDrops(dt) {
    for (const d of dropsPool) {
        if (!d.userData.active) continue;
        d.userData.life -= dt;
        d.position.y += d.userData.vy * dt;
        if (d.userData.life <= 0 || d.position.y < -0.5) {
            d.userData.active = false;
            d.visible = false;
        }
    }

    if (wateringActive && wateringMode && currentTool === 'wateringCan') {
        dropsSpawnTimer -= dt;
        if (dropsSpawnTimer <= 0) {
            dropsSpawnTimer = 0.015;
            sc.updateMatrixWorld();

            if (toolR) toolR.getWorldPosition(_originVec);
            else _originVec.set(0.2, -0.2, -1.5).applyMatrix4(cam.matrixWorld);

            _fwdVec.set(0, 0, -1).applyQuaternion(cam.quaternion);
            _originVec.addScaledVector(_fwdVec, 0.6);
            _originVec.y += 0.15;

            spawnDrop(_originVec.x, _originVec.y, _originVec.z, 0.1);
            spawnDrop(_originVec.x, _originVec.y, _originVec.z, 0.1);
            spawnDrop(_originVec.x, _originVec.y, _originVec.z, 0.1);
        }
        addLocalMoisture(wateringTarget.x, wateringTarget.z, 0.15 * dt * 60, 2.8);
        soilMoisture = cl(soilMoisture + 0.002 * dt * 60, 0, 1);
        if (typeof addWetSpot === 'function') addWetSpot(wateringTarget.x, wateringTarget.z, 2.2);
    }
}

// ============================================================
// SWING
// ============================================================
const sw = { on: false, p: 0, cb: null, type: 'machete' };
function swing(cb, type = 'machete') {
    if (sw.on) return;
    sw.on = true; sw.p = 0; sw.cb = cb; sw.type = type;
}

const SWING_ANIMS = {
    machete:    s => { handR.rotation.z = s * 0.5; fpv.position.y = s * 0.15; handR.rotation.x = s * 0.18; },
    eating:     s => { handR.rotation.x = -s * 1.4; handR.position.y = s * 0.12; },
    drinking:   s => { handR.rotation.x = -s * 1.6; handR.position.y = s * 0.15; },
    planting:   s => { handL.position.y = -s * 0.35; handL.rotation.x = s * 0.5; },
    digging:    s => { handR.rotation.x = -s * 0.9; handR.position.y = -s * 0.2; },
    sharpening: s => { handL.position.z = -0.5 - s * 0.12; handL.rotation.z = -0.6 + s * 0.35; handR.rotation.z = s * 0.08; }
};

function tickSw(dt) {
    if (wateringActive && wateringMode && currentTool === 'wateringCan') {
        const t = performance.now() * 0.004;
        handR.rotation.z = Math.sin(t) * 0.08 - 0.35;
        handR.rotation.x = 0.2 + Math.sin(t * 1.3) * 0.05;
        handR.position.y = Math.sin(t * 1.7) * 0.03;
        return;
    }
    if (!sw.on) return;
    sw.p += dt * 3.2;
    const s = Math.sin(sw.p * Math.PI);
    const anim = SWING_ANIMS[sw.type];
    if (anim) anim(s);
    if (sw.p >= 1) {
        sw.on = false;
        handR.rotation.set(0, 0, 0); handR.position.set(0, 0, 0);
        handL.rotation.set(0, 0, 0); handL.position.set(0, 0, 0);
        const setup = TOOL_SETUP[currentTool];
        if (setup) {
            if (toolR) toolR.position.fromArray(setup.r);
            if (toolL) toolL.position.fromArray(setup.l);
            handR.rotation.fromArray(setup.rRot);
            handL.rotation.fromArray(setup.lRot);
        }
        if (sw.cb) sw.cb();
    }
}

// ============================================================
// CONTROLES
// ============================================================
let yaw = 0, pitch = 0, mf = 0, ms = 0;
let lookId = null, lx = 0, ly = 0, joyId = null;
const jz = $('jz'), js = $('js');

const joyEnd = () => {
    joyId = null;
    js.style.transform = 'translate(0,0)';
    mf = ms = 0;
};

jz.addEventListener('touchstart', e => {
    if (joyId !== null) return;
    joyId = e.changedTouches[0].identifier;
    joyMove(e.changedTouches[0]);
}, { passive: false });
jz.addEventListener('touchmove', e => {
    for (const t of e.changedTouches) if (t.identifier === joyId) joyMove(t);
}, { passive: false });
jz.addEventListener('touchend', joyEnd);
jz.addEventListener('touchcancel', joyEnd);

function joyMove(t) {
    const r = jz.getBoundingClientRect();
    let dx = t.clientX - (r.left + r.width / 2);
    let dy = t.clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy), max = 35;
    if (d > max) { dx = dx / d * max; dy = dy / d * max; }
    js.style.transform = `translate(${dx}px,${dy}px)`;
    ms = dx / max;
    mf = -dy / max;
}

const isUIElement = t => jz.contains(t) || $('cfgBtn').contains(t) || $('act').contains(t)
                    || $('hotbar').contains(t) || $('ghost').contains(t)
                    || $('sunBtn').contains(t);

addEventListener('touchstart', e => {
    for (const t of e.changedTouches) {
        if (!isUIElement(t.target) && lookId === null) {
            lookId = t.identifier;
            lx = t.clientX; ly = t.clientY;
        }
    }
}, { passive: false });

addEventListener('touchmove', e => {
    for (const t of e.changedTouches) {
        if (t.identifier !== lookId) continue;
        if (sunAnim.active) continue; // bloquear durante animación
        yaw -= (t.clientX - lx) * 0.0035;
        pitch = cl(pitch - (t.clientY - ly) * 0.0035, -1.4, 1.4);
        lx = t.clientX; ly = t.clientY;
    }
}, { passive: false });

addEventListener('touchend', e => {
    for (const t of e.changedTouches) if (t.identifier === lookId) lookId = null;
});

// ============================================================
// ANIMACIÓN MIRAR AL SOL
// ============================================================
const SUN_PHRASES = [
    "Que pepa de Sol",
    "Que solazo",
    "Uff, el sol pega duro hoy",
    "Como quema el condenado sol",
    "Ni una nube, qué calor",
    "Este sol no perdona",
    "Se siente el sol en la espalda"
];

// Duración total 6 s: 1.2 subida + 3.6 mantener + 1.2 bajada
const SUN_TOTAL = 6;
const SUN_UP = 1.2;
const SUN_DOWN = 1.2;
const SUN_HOLD = SUN_TOTAL - SUN_UP - SUN_DOWN; // 3.6 s

const sunAnim = {
    active: false,
    phase: 'idle',
    t: 0,
    startYaw: 0,
    startPitch: 0,
    targetYaw: 0,
    targetPitch: 0
};

// Calcula yaw/pitch para que la cámara mire un objeto del mundo
function computeLookAt(targetX, targetY, targetZ) {
    const dx = targetX - cam.position.x;
    const dy = targetY - cam.position.y;
    const dz = targetZ - cam.position.z;

    // Con rotation.order = 'YXZ' y forward = -Z:
    // yaw = atan2(-dx, -dz)
    // pitch = atan2(dy, sqrt(dx² + dz²))
    const hDist = Math.hypot(dx, dz);
    return {
        yaw: Math.atan2(-dx, -dz),
        pitch: Math.atan2(dy, hDist)
    };
}

function triggerLookAtSun() {
    if (sunAnim.active) return;

    sunAnim.active = true;
    sunAnim.phase = 'up';
    sunAnim.t = 0;
    sunAnim.startYaw = yaw;
    sunAnim.startPitch = pitch;

    // Determinar objetivo: el sol de día, la luna de noche
    let lookTarget = null;
    if (typeof sun !== 'undefined' && sun.visible) {
        lookTarget = sun.position;
    } else if (typeof moonGroup !== 'undefined' && moonGroup.visible) {
        lookTarget = moonGroup.position;
    }

    if (lookTarget) {
        const look = computeLookAt(lookTarget.x, lookTarget.y, lookTarget.z);
        sunAnim.targetYaw = look.yaw;
        sunAnim.targetPitch = look.pitch;
    } else {
        // Sin sol ni luna visibles (raro): mirar arriba
        sunAnim.targetYaw = yaw;
        sunAnim.targetPitch = 1.2;
    }

    // Mostrar el texto con frase aleatoria
    const frase = SUN_PHRASES[Math.floor(Math.random() * SUN_PHRASES.length)];
    const textEl = $('sunText');
    if (textEl) {
        textEl.innerText = frase;
        textEl.classList.add('show');
    }
}

function tickSunAnim(dt) {
    if (!sunAnim.active) return;

    sunAnim.t += dt;

    if (sunAnim.phase === 'up') {
        const k = Math.min(sunAnim.t / SUN_UP, 1);
        const e = 1 - Math.pow(1 - k, 3); // ease out
        yaw = lp(sunAnim.startYaw, sunAnim.targetYaw, e);
        pitch = lp(sunAnim.startPitch, sunAnim.targetPitch, e);
        if (k >= 1) { sunAnim.phase = 'hold'; sunAnim.t = 0; }
    }
    else if (sunAnim.phase === 'hold') {
        yaw = sunAnim.targetYaw;
        pitch = sunAnim.targetPitch;
        if (sunAnim.t >= SUN_HOLD) { sunAnim.phase = 'down'; sunAnim.t = 0; }
    }
    else if (sunAnim.phase === 'down') {
        const k = Math.min(sunAnim.t / SUN_DOWN, 1);
        const e = k * k; // ease in
        yaw = lp(sunAnim.targetYaw, sunAnim.startYaw, e);
        pitch = lp(sunAnim.targetPitch, sunAnim.startPitch, e);
        if (k >= 1) {
            sunAnim.active = false;
            sunAnim.phase = 'idle';
            // Ocultar el texto justo al terminar la animación
            const textEl = $('sunText');
            if (textEl) textEl.classList.remove('show');
        }
    }
}

window.triggerLookAtSun = triggerLookAtSun;

// ============================================================
// ACCIÓN
// ============================================================
const rc = new THREE.Raycaster();
const cen = new THREE.Vector2(0, 0);
const act = $('act'), ch = $('ch');
let tgtM = null, curP = null, actDown = false;

const TOOL_ACTIONS = {
    banana: () => {
        if (inv.plat <= 0) return;
        swing(() => {
            inv.plat--;
            en = cl(en + 25, 0, 100);
            hy = cl(hy + 15, 0, 100);
            updHUD();
        }, 'eating');
    },
    bottle: () => {
        if (Math.hypot(cam.position.x - 8, cam.position.z - 6) >= 2.5) return;
        swing(() => { hy = cl(hy + 30, 0, 100); updHUD(); }, 'drinking');
    },
    wateringCan: () => { wateringActive = true; wateringMode = true; },
    palin: () => {
        if (!tgtM || !curP) return;
        const t = tgtM.userData.type;
        if (!(t === 'baseCormo' || t === 'sucker' || curP.stage === STAGE.CORTADA)) return;
        if (!curP.sucker) return;
        swing(() => {
            inv.hij++;
            updHUD();
            if (curP.sucker) {
                curP.group.remove(curP.sucker);
                curP.sucker.traverse(c => { if (c.isMesh && c.geometry) c.geometry.dispose(); });
                curP.sucker = null;
            }
            if (curP.baseCormo) curP.baseCormo.visible = false;
            curP.stage = STAGE.MUERTA;
            curP.group.visible = false;
            plantGrid.delete(gk(curP.x, curP.z));
            tgtM = curP = null;
            act.style.display = 'none';
        }, 'digging');
    }
};

function onActDown(e) {
    e.preventDefault();
    e.stopPropagation();
    if (actDown) return;
    actDown = true;

    // Bloquear acción durante la animación del sol
    if (sunAnim.active) return;

    const tool = window.selectedTool || currentTool;
    const action = TOOL_ACTIONS[tool] || TOOL_ACTIONS[currentTool];
    if (action) { action(); return; }

    if (!tgtM || (en <= 5 && !cfg.gm2)) return;
    swing(() => {
        if (!cfg.gm2) {
            en = cl(en - 4, 0, 100);
            mdur = cl(mdur - 0.5, 0, 100);
            updHUD();
        }
        handleChop(tgtM);
    }, 'machete');
}

function onActUp() {
    actDown = false;
    if (wateringActive) wateringActive = false;
}

if ('ontouchstart' in window) {
    act.addEventListener('touchstart', onActDown, { passive: false });
    act.addEventListener('touchend', onActUp);
    act.addEventListener('touchcancel', onActUp);
} else {
    act.addEventListener('mousedown', onActDown);
    act.addEventListener('mouseup', onActUp);
    act.addEventListener('mouseleave', onActUp);
}

// ============================================================
// CORTE
// ============================================================
function findParentByType(mesh, type) {
    let n = mesh;
    while (n && n.userData.type !== type) n = n.parent;
    return n;
}

function hideGroup(group) {
    if (!group) return;
    group.visible = false;
    group.userData.rem = true;
    group.traverse(c => { if (c.isMesh) c.userData.rem = true; });
}

function handleChop(mesh) {
    const t = mesh.userData.type;
    const p = mesh.userData.p;

    if (t === 'dryLeaf') {
        const root = findParentByType(mesh, 'chubaGroup');
        hideGroup(root);
        p.score++;
        const idx = p.dryGroups.indexOf(root);
        if (idx > -1) p.dryGroups.splice(idx, 1);
        p.hasDry = p.dryGroups.length > 0;
        if (!p.hasDry && p.stage === STAGE.MADURO) upd(p);
        return;
    }

    if (t === 'colino') {
        const target = findParentByType(mesh, 'colinoGroup');
        hideGroup(target);
        inv.hij++;
        updHUD();
        return;
    }

    if (t === 'bananaCluster' && !p.hasDry && p.stage === STAGE.MADURO && p.clusterHands > 0) {
        inv.plat += p.clusterHands;
        p.handsMeshes.forEach(m => {
            m.traverse(c => {
                if (c.isMesh) {
                    if (c.geometry) c.geometry.dispose();
                    const shared = [MAT.banana, MAT.bananaMed, MAT.bananaPoor, MAT.bananaBad, MAT.stalk];
                    if (c.material && !shared.includes(c.material) && c.material.dispose) c.material.dispose();
                }
            });
            p.clusterG.remove(m);
        });
        p.handsMeshes = [];
        p.clusterHands = 0;
        p.emitCooldown = 0;
        if (p.clusterHit) p.clusterHit.visible = false;
        p.stage = STAGE.COSECHADA;
        updHUD();
        return;
    }

    if (p.stage === STAGE.COSECHADA) {
        cutHarvestedPlant(p);
        act.style.display = 'none';
    }
}

// ============================================================
// RAYCAST / TARGET
// ============================================================
function updateWateringTarget() {
    if (!floorMeshRef && typeof floorMesh !== 'undefined') floorMeshRef = floorMesh;
    const dir = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const origin = cam.position.clone();
    if (floorMeshRef) {
        const hit = new THREE.Raycaster(origin, dir).intersectObject(floorMeshRef, false);
        if (hit.length) { wateringTarget.copy(hit[0].point); return; }
    }
    if (dir.y < -0.05) {
        const t = -origin.y / dir.y;
        if (t > 0 && t < 30) wateringTarget.set(origin.x + dir.x * t, 0, origin.z + dir.z * t);
    }
}

function labelFor(type, p) {
    if (type === 'colinoSeed' && p.stage === STAGE.COLINO) return 'Brote';
    if (type === 'dryLeaf' && p.stage >= STAGE.PREFLORACION) return 'Cortar\nHoja';
    if (type === 'colino') return 'Cortar\nHijo';
    if (type === 'bananaCluster' && p.stage === STAGE.MADURO && !p.hasDry && p.clusterHands > 0) return 'Cortar\nRacimo';
    if (p.stage === STAGE.COSECHADA) return 'Tumbar\nPlanta';
    if (type === 'baseCormo' || p.stage === STAGE.CORTADA) return 'Palín\nHijuelo';
    if (type === 'trunkCollider') {
        if (p.stage < STAGE.MADURO) return 'Creciendo';
        if (p.hasDry) return 'Limpia\nhojas';
        if (p.clusterHands > 0) return 'Corta\nracimo';
        return 'Tumbar\nTallo';
    }
    return 'Acción';
}

function collectTargets(filter) {
    const objs = [];
    for (const p of PL) {
        if (p.stage === STAGE.MUERTA) continue;
        p.group.traverse(c => {
            if (!c.isMesh || c.userData.rem || !c.visible) return;
            if (!filter(c)) return;
            let par = c.parent;
            while (par && par !== p.group) {
                if (!par.visible) return;
                par = par.parent;
            }
            objs.push(c);
        });
    }
    return objs;
}

function tickRaycast() {
    sc.updateMatrixWorld();
    if (!floorMeshRef && typeof floorMesh !== 'undefined') floorMeshRef = floorMesh;

    // Durante la animación del sol, no buscar targets
    if (sunAnim.active) {
        if (tgtM && tgtM.material?.color && tgtM.userData.origCol !== undefined && !tgtM.userData.isHitBox) {
            tgtM.material.color.setHex(tgtM.userData.origCol);
        }
        tgtM = null;
        curP = null;
        ch.classList.remove('t');
        act.style.display = 'none';
        return;
    }

    const tool = window.selectedTool || currentTool;

    if (tool === 'wateringCan' || currentTool === 'wateringCan') {
        updateWateringTarget();
        ch.classList.add('t');
        ch.style.borderColor = '#3498db';
        ch.style.background = 'rgba(52,152,219,0.35)';
        act.style.display = 'flex';
        act.innerText = wateringActive ? 'Regando...' : 'Regar\n(mantén)';
        return;
    }

    ch.style.borderColor = '';
    ch.style.background = '';

    if (tool === 'banana') {
        ch.classList.remove('t');
        act.style.display = 'flex';
        act.innerText = 'Comer';
        return;
    }
    if (tool === 'bottle') {
        ch.classList.remove('t');
        act.style.display = 'flex';
        act.innerText = 'Beber';
        return;
    }

    if (tool === 'palin') {
        rc.setFromCamera(cen, cam);
        const objs = collectTargets(c => {
            const p = c.userData.p || (findParentByType(c, 'colinoGroup')?.userData.p);
            return p && p.stage === STAGE.CORTADA;
        });
        const hits = rc.intersectObjects(objs, false);
        curP = null;
        if (hits.length && hits[0].distance < 4) {
            const ho = hits[0].object;
            let n = ho;
            while (n && !n.userData.p) n = n.parent;
            curP = n?.userData.p;
            if (curP) {
                tgtM = ho;
                ch.classList.add('t');
                act.style.display = 'flex';
                act.innerText = curP.sucker ? 'Extraer\nColino' : 'Aún sin\nhijuelo';
                return;
            }
        }
        ch.classList.remove('t');
        act.style.display = 'none';
        tgtM = null;
        return;
    }

    rc.setFromCamera(cen, cam);
    const objs = collectTargets(c => c.userData.type);
    const hits = rc.intersectObjects(objs, false);

    if (tgtM && (!hits.length || hits[0].object !== tgtM)) {
        if (tgtM.material?.color && tgtM.userData.origCol !== undefined && !tgtM.userData.isHitBox) {
            tgtM.material.color.setHex(tgtM.userData.origCol);
        }
        tgtM = null;
    }

    curP = null;
    if (hits.length && !ghostOn && hits[0].distance < 4) {
        const ho = hits[0].object;
        curP = ho.userData.p;
        if (curP) {
            tgtM = ho;
            if (ho.material?.color && !ho.userData.isHitBox && ho.userData.type !== 'baseCormo') {
                if (ho.userData.origCol === undefined) ho.userData.origCol = ho.material.color.getHex();
                ho.material.color.setHex(PAL.highlight);
            }
            ch.classList.add('t');
            act.style.display = 'flex';
            act.innerText = labelFor(ho.userData.type, curP);
        }
    } else {
        ch.classList.remove('t');
        act.style.display = 'none';
    }
}

function tickMove(dt) {
    // Durante la animación del sol no dejar moverse
    if (sunAnim.active) {
        cam.position.y = 1.7 + th(cam.position.x, cam.position.z);
        cam.rotation.order = 'YXZ';
        cam.rotation.y = yaw;
        cam.rotation.x = pitch;
        return;
    }

    let nx = cam.position.x, nz = cam.position.z;
    const fs = dt * 60;

    if (mf || ms) {
        const spd = (en > 10 ? 0.06 : 0.02) * fs;
        nx += (Math.sin(yaw) * -mf + Math.cos(yaw) * ms) * spd;
        nz += (Math.cos(yaw) * -mf - Math.sin(yaw) * ms) * spd;
        if (!cfg.gm2) { st2 = cl(st2 - 0.2 * fs, 0, 100); updHUD(); }
    } else if (st2 < 100) {
        st2 = cl(st2 + 0.1 * fs, 0, 100);
        updHUD();
    }

    let hit = false;
    for (const p of PL) {
        if (p.stage === STAGE.CORTADA || p.stage === STAGE.COLINO || p.stage === STAGE.MUERTA) continue;
        if (Math.hypot(nx - p.x, nz - p.z) < 0.85) { hit = true; break; }
    }
    if (!hit) { cam.position.x = nx; cam.position.z = nz; }

    cam.position.y = 1.7 + th(cam.position.x, cam.position.z);
    cam.rotation.order = 'YXZ';
    cam.rotation.y = yaw;
    cam.rotation.x = pitch;
}