// ============================================================
// plant.js — Banano con chubas dinámicas
// ============================================================

const PL = [];
const plantGrid = new Map();
const gk = (x, z) => Math.round(x * 2) + ',' + Math.round(z * 2);

const CHUBA_INTERVAL_BASE = SECONDS_PER_STAGE / 3;
const CHUBA_MAX = 6;

const CHUBA_COLORS = [0x5a4033, 0x6b4f40, 0x7a5f52, 0x8d6e63, 0xa08858, 0xb59a76];
const CHUBA_MATS = CHUBA_COLORS.map(c => psxMat(c, { side: THREE.DoubleSide }));
const SPOT_MAT = psxMat(0x3a2818);

// ============================================================
// TRONCO
// ============================================================
function buildTrunk() {
    const g = new THREE.Group();
    g.add(at(cyl(0.42, 0.5, 0.35, 8, MAT.trunkBase), 0, 0.17, 0));

    const NUM = 7;
    let y = 0.35;
    for (let l = 0; l < NUM; l++) {
        const t = l / (NUM - 1);
        const radius = 0.35 - t * 0.15;
        const h = 0.45 - t * 0.05;
        const layer = cyl(radius - 0.02, radius, h, 8, l % 2 === 0 ? MAT.trunkLayer : MAT.trunk);
        at(layer, 0, y + h / 2, 0);
        layer.rotation.y = l * 0.4;
        layer.rotation.z = l % 2 === 0 ? 0.02 : -0.02;
        g.add(layer);
        if (l > 0) g.add(at(cyl(radius + 0.015, radius + 0.015, 0.03, 8, psxMat(0x3e5020)), 0, y, 0));
        y += h;
    }
    return g;
}

// ============================================================
// CHUBAS
// ============================================================
function buildChubas(p) {
    const g = new THREE.Group();
    p.dryMeshes = [];
    p.dryGroups = [];
    p.chubaCount = 0;
    p.chubaTimer = 0;
    return g;
}

function spawnChuba(p) {
    if (p.dryGroups.length >= CHUBA_MAX) return null;

    const d = p.chubaCount;
    const t = Math.min(d / (CHUBA_MAX - 1), 1);
    const mat = CHUBA_MATS[Math.min(d, CHUBA_MATS.length - 1)];

    const chuba = new THREE.Group();
    const visual = new THREE.Group();
    const radius = lp(0.32, 0.42, t * 0.5);

    visual.add(new THREE.Mesh(
        new THREE.CylinderGeometry(radius, radius + 0.02, 0.35, 8, 1, true),
        mat
    ));

    const bladeH = lp(0.4, 0.6, t);
    visual.add(at(box(0.03, bladeH, 0.18, mat), radius + 0.02, bladeH / 2, 0));

    const foldH = lp(0.6, 1.0, t);
    const fold = box(0.025, foldH, 0.15, mat);
    at(fold, radius + 0.05, -foldH / 2 + 0.05, 0);
    fold.rotation.z = 0.25;
    visual.add(fold);

    const tip = box(0.02, foldH * 0.5, 0.08, mat);
    at(tip, radius + 0.05 + Math.sin(0.25) * foldH * 0.5, -foldH * 1.1, 0);
    tip.rotation.z = 0.25;
    visual.add(tip);

    for (let m = 0; m < 3; m++)
        visual.add(at(box(0.03, 0.08, 0.08, SPOT_MAT),
            radius + 0.04,
            (rrand() - 0.5) * foldH * 0.6,
            (rrand() - 0.5) * 0.08));

    chuba.add(visual);

    const hitHeight = 0.5 + bladeH + foldH;
    const hitbox = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.35, hitHeight, 6),
        MAT.invisible
    );
    at(hitbox, radius * 0.5, (bladeH - foldH) / 2, 0);
    tag(hitbox, 'dryLeaf', p, { rem: false, isHitbox: true });
    chuba.add(hitbox);

    at(chuba, 0, lp(0.8, 2.4, t), 0);
    chuba.rotation.y = (d * Math.PI * 2) / CHUBA_MAX;
    chuba.userData = { type: 'chubaGroup', p, rem: false };
    chuba.scale.set(0.1, 0.1, 0.1);

    p.dryG.add(chuba);
    p.dryGroups.push(chuba);
    p.dryMeshes.push(hitbox);
    p.chubaCount++;
    p.hasDry = true;
    return chuba;
}

// ============================================================
// FRONDAS
// ============================================================
function buildFronds() {
    const g = new THREE.Group();
    const APEX_Y = 3.15;

    for (let i = 0; i < 7; i++) {
        const frond = new THREE.Group();
        const mat = i % 2 === 0 ? MAT.frond : MAT.frondDark;

        const petiole = cyl(0.04, 0.06, 0.55, 5, MAT.stalk);
        at(petiole, 0.28, 0, 0);
        petiole.rotation.z = Math.PI / 2;
        frond.add(petiole);

        const numSegs = 5;
        for (let s = 0; s < numSegs; s++) {
            const segT = s / (numSegs - 1);
            const segW = lp(0.55, 0.15, segT);
            const segX = 0.55 + s * 0.55;
            const segY = -Math.pow(segT, 2) * 0.25;

            const seg = box(0.55, 0.03, segW, mat);
            at(seg, segX, segY, 0);
            seg.rotation.z = -segT * 0.15;
            frond.add(seg);

            const vein = box(0.55, 0.02, 0.04, MAT.frondDark);
            at(vein, segX, segY + 0.02, 0);
            vein.rotation.z = -segT * 0.15;
            frond.add(vein);
        }

        frond.rotation.y = (i * Math.PI * 2) / 7;
        frond.rotation.z = -0.3 - (i % 2 === 0 ? 0.05 : -0.05);
        at(frond, 0, APEX_Y, 0);
        g.add(frond);
    }
    return g;
}

// ============================================================
// COLINOS LATERALES
// ============================================================
function buildColinos(p) {
    const g = new THREE.Group();
    p.colinos = [];
    for (let c = 0; c < 2; c++) {
        const col = new THREE.Group();
        col.add(at(cone(0.24, 1.0, 5, MAT.colino), 0, 0.5, 0));
        col.add(at(dodec(0.18, 0, MAT.soil), 0, 0.08, 0));

        for (let h = 0; h < 3; h++) {
            const hoja = box(0.42, 0.03, 0.14, MAT.colinoLeaf);
            at(hoja, 0, 0.75, 0);
            hoja.rotation.y = (h * Math.PI * 2) / 3;
            hoja.rotation.z = 0.35;
            col.add(hoja);
        }
        for (let r = 0; r < 4; r++) {
            const a = (r / 4) * Math.PI * 2;
            const raiz = cyl(0.01, 0.004, 0.12, 4, MAT.root);
            at(raiz, Math.cos(a) * 0.12, 0.04, Math.sin(a) * 0.12);
            rot(raiz, Math.sin(a) * 0.8, 0, Math.cos(a) * 0.8);
            col.add(raiz);
        }

        const hitbox = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 5), MAT.invisible);
        at(hitbox, 0, 0.5, 0);
        tag(hitbox, 'colino', p, { rem: false, isHitbox: true });
        col.add(hitbox);

        at(col, c === 0 ? 0.45 : -0.45, 0, c === 0 ? 0.2 : -0.2);
        col.rotation.z = c === 0 ? -0.25 : 0.25;
        col.userData = { type: 'colinoGroup', p, rem: false };
        g.add(col);
        p.colinos.push(col);
    }
    return g;
}

function buildSpear(p) {
    const g = new THREE.Group();
    const brote = cone(0.3, 1.4, 5, MAT.spear);
    at(brote, 0, 0.7, 0);
    tag(brote, 'colinoSeed', p);
    g.add(brote);
    g.add(at(dodec(0.25, 0, MAT.soil), 0, 0.1, 0));
    for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const raiz = cyl(0.015, 0.006, 0.2, 4, MAT.root);
        at(raiz, Math.cos(a) * 0.18, 0.02, Math.sin(a) * 0.18);
        rot(raiz, Math.sin(a) * 0.7, 0, Math.cos(a) * 0.7);
        g.add(raiz);
    }
    return g;
}

// ============================================================
// CREAR PLANTA
// ============================================================
function makePlant(x, z, st = 0) {
    const g = new THREE.Group();
    const p = {
        x, z, group: g, stage: st, timer: 0,
        hasDry: false, score: 0,
        clusterHands: 0, lastEmit: 0, emitCooldown: 0,
        hasBase: false, baseCormo: null,
        sucker: null, suckerAge: 0,
        spear: null, trunk: null,
        dryMeshes: [], dryGroups: [],
        chubaCount: 0, chubaTimer: 0,
        colinos: [],
        frondsG: null, dryG: null, colinosG: null, clusterG: null,
        collider: null, clusterHit: null, handsMeshes: [],
        sunLean: { x: 0, z: 0 }, sunLeanTarget: { x: 0, z: 0 }
    };

    const collider = cyl(0.45, 0.55, 3.2, 6, MAT.invisible);
    at(collider, 0, 1.6, 0);
    tag(collider, 'trunkCollider', p);
    g.add(collider);
    p.collider = collider;

    p.spear = buildSpear(p); g.add(p.spear);
    p.trunk = buildTrunk(); g.add(p.trunk);
    p.dryG = buildChubas(p); g.add(p.dryG);
    p.frondsG = buildFronds(); g.add(p.frondsG);

    p.clusterG = new THREE.Group();
    at(p.clusterG, 0, 3.0, 0.3);
    g.add(p.clusterG);

    const hitBox = box(0.9, 1.4, 0.9, MAT.invisible);
    at(hitBox, 0, -0.7, 0);
    tag(hitBox, 'bananaCluster', p, { isHitBox: true });
    p.clusterG.add(hitBox);
    p.clusterHit = hitBox;

    p.colinosG = buildColinos(p); g.add(p.colinosG);

    at(g, x, th(x, z), z);
    sc.add(g);
    upd(p);
    return p;
}

function upd(p) {
    const s = p.stage;
    if (s === STAGE.CORTADA || s === STAGE.MUERTA) {
        [p.spear, p.trunk, p.dryG, p.frondsG, p.colinosG, p.clusterG, p.collider]
            .forEach(o => o.visible = false);
        if (p.baseCormo) p.baseCormo.visible = s === STAGE.CORTADA;
        return;
    }

    p.spear.visible = s === STAGE.COLINO;
    p.trunk.visible = s >= STAGE.VEGETATIVO;
    p.dryG.visible = s >= STAGE.VEGETATIVO;
    p.frondsG.visible = s >= STAGE.VEGETATIVO;
    p.colinosG.visible = s >= STAGE.VEGETATIVO && s < STAGE.COSECHADA;
    p.clusterG.visible = s === STAGE.MADURO && p.clusterHands > 0;
    p.collider.visible = s >= STAGE.VEGETATIVO && s <= STAGE.COSECHADA;
    p.group.scale.setScalar(s === STAGE.VEGETATIVO ? 0.8 : 1);
    if (p.baseCormo) p.baseCormo.visible = false;
}

function tickSunLean(p, sunX, sunZ, isDay) {
    if (!isDay) {
        p.sunLeanTarget.x = p.sunLeanTarget.z = 0;
    } else {
        const dx = sunX - p.x, dz = sunZ - p.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.1) {
            p.sunLeanTarget.x = (dx / dist) * 0.05;
            p.sunLeanTarget.z = (dz / dist) * 0.05;
        }
    }
    p.sunLean.x = lp(p.sunLean.x, p.sunLeanTarget.x, 0.02);
    p.sunLean.z = lp(p.sunLean.z, p.sunLeanTarget.z, 0.02);
    if (p.trunk) {
        p.group.rotation.z = p.sunLean.x;
        p.group.rotation.x = p.sunLean.z;
    }
}

// ============================================================
// EMISIÓN DEL RACIMO
// ============================================================
function tryEmitCluster(p, dt) {
    if (p.stage !== STAGE.MADURO || p.hasDry || p.clusterHands > 0) return;
    const qf = qualityFactor(p);
    p.emitCooldown += dt;
    const prob = Math.min((0.02 + qf * 0.05) * cfg.gm * (p.emitCooldown > 15 ? 1.5 : 1) * dt, 1);
    if (rrand() < prob) {
        emitCluster(p, qf);
        p.emitCooldown = 0;
    }
}

function emitCluster(p, qf) {
    const hands = qf < 0.35 ? 1 + Math.floor(rrand() * 2)
                : qf < 0.65 ? 2 + Math.floor(rrand() * 2)
                : 4 + Math.floor(rrand() * 2);
    const total = cl(hands, 1, 5);
    const mat = qf >= 0.7 ? MAT.banana : qf >= 0.4 ? MAT.bananaMed
              : qf >= 0.2 ? MAT.bananaPoor : MAT.bananaBad;

    for (let seg = 0; seg < 3; seg++) {
        const stalk = cyl(0.04, 0.045, 0.35, 5, MAT.stalk);
        at(stalk, 0, -0.3 - seg * 0.3, 0);
        stalk.rotation.x = seg * 0.08;
        tag(stalk, 'bananaCluster', p, { isHitBox: false });
        p.clusterG.add(stalk);
        p.handsMeshes.push(stalk);
    }

    for (let h = 0; h < total; h++) {
        const handGroup = new THREE.Group();
        const numBan = 5 + Math.floor(rrand() * 3);
        for (let b = 0; b < numBan; b++) {
            const banMat = mat.clone();
            const wrap = new THREE.Group();
            const body = box(0.09, 0.2, 0.09, banMat);
            const tip = cone(0.045, 0.12, 5, banMat);
            at(tip, 0, -0.15, 0);
            tip.rotation.x = Math.PI;
            wrap.add(body, tip);

            const a = (b / numBan) * Math.PI * 2;
            at(wrap, Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1);
            wrap.rotation.z = 0.2 + Math.cos(a) * 0.2;
            wrap.rotation.x = Math.sin(a) * 0.2;
            tag(wrap, 'bananaCluster', p, { isHitBox: false });
            tag(body, 'bananaCluster', p, { isHitBox: false });
            handGroup.add(wrap);
        }
        at(handGroup, 0, -0.45 - h * 0.18, 0);
        handGroup.rotation.y = rrand() * Math.PI * 2;
        p.clusterG.add(handGroup);
        p.handsMeshes.push(handGroup);
    }
    p.clusterHands = total;
    p.clusterG.visible = true;
    if (p.clusterHit) p.clusterHit.visible = true;
}

// ============================================================
// CORMO Y SUCKER
// ============================================================
function buildCormo(p) {
    const g = new THREE.Group();
    const cormo = cyl(0.42, 0.5, 0.3, 8, MAT.baseCorm);
    at(cormo, 0, 0.15, 0);
    tag(cormo, 'baseCormo', p);
    g.add(cormo);

    const muñon = cyl(0.22, 0.32, 0.22, 8, MAT.trunkBase);
    at(muñon, 0, 0.4, 0);
    tag(muñon, 'baseCormo', p);
    g.add(muñon);

    const ring = cyl(0.22, 0.22, 0.04, 8, psxMat(0xa4b86a));
    at(ring, 0, 0.51, 0);
    tag(ring, 'baseCormo', p);
    g.add(ring);

    for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const raiz = cyl(0.025, 0.01, 0.35, 4, MAT.root);
        at(raiz, Math.cos(a) * 0.35, 0.06, Math.sin(a) * 0.35);
        rot(raiz, Math.sin(a) * 1.2, 0, Math.cos(a) * 1.2);
        tag(raiz, 'baseCormo', p);
        g.add(raiz);
    }

    const tierra = dodec(0.4, 0, MAT.soil);
    at(tierra, 0, 0.02, 0);
    tierra.scale.set(1.3, 0.35, 1.3);
    g.add(tierra);
    return g;
}

function cutHarvestedPlant(p) {
    p.stage = STAGE.CORTADA;
    if (!p.baseCormo) {
        p.baseCormo = buildCormo(p);
        p.group.add(p.baseCormo);
    }
    upd(p);
    p.group.rotation.set(0, 0, 0);
    p.group.position.y = th(p.x, p.z);
    p.group.scale.setScalar(1);
    p.sucker = null;
    p.suckerAge = 0;
}

function growSuckerFromBase(p) {
    if (p.sucker) return;
    const g = new THREE.Group();
    g.add(at(cone(0.15, 0.7, 5, MAT.spear), 0, 0.35, 0));
    for (let i = 0; i < 3; i++) {
        const hoja = box(0.28, 0.02, 0.09, MAT.colinoLeaf);
        at(hoja, 0, 0.58, 0);
        hoja.rotation.y = (i * Math.PI * 2) / 3;
        hoja.rotation.z = 0.35;
        g.add(hoja);
    }
    g.add(at(dodec(0.12, 0, MAT.soil), 0, 0.05, 0));
    at(g, 0.4, 0.1, 0.2);

    const brote = g.children[0];
    tag(brote, 'sucker', p, { rem: false });
    for (let i = 1; i < 4; i++) tag(g.children[i], 'sucker', p, { rem: false });

    p.group.add(g);
    p.sucker = g;
}

// ============================================================
// DEBUG
// ============================================================
function clearPlantChubas(p) {
    while (p.dryG.children.length) {
        const child = p.dryG.children[0];
        child.traverse(c => {
            if (c.isMesh && c.geometry && c.geometry !== MAT.invisible) {
                // No dispose de geometrías compartidas
            }
        });
        p.dryG.remove(child);
    }
    p.dryGroups = [];
    p.dryMeshes = [];
    p.chubaCount = 0;
    p.chubaTimer = 0;
    p.hasDry = false;
}

function dbSetStage(target) {
    for (const p of PL) {
        if (p.stage === STAGE.MUERTA) continue;
        p.stage = target;
        p.timer = 0;

        if (target === STAGE.MADURO || target === STAGE.COSECHADA || target === STAGE.CORTADA) {
            clearPlantChubas(p);
        }

        if (target === STAGE.CORTADA && !p.baseCormo) {
            p.baseCormo = buildCormo(p);
            p.group.add(p.baseCormo);
        }
        upd(p);
    }
}

function dbAddChuba() {
    for (const p of PL) {
        if (p.stage === STAGE.MUERTA || p.stage < STAGE.VEGETATIVO) continue;
        spawnChuba(p);
    }
}

function dbClearChubas() {
    for (const p of PL) {
        if (p.stage === STAGE.MUERTA) continue;
        clearPlantChubas(p);
    }
}

function dbResetPlants() {
    PL.forEach(p => sc.remove(p.group));
    PL.length = 0;
    plantGrid.clear();
    PL.push(makePlant(0, -6, STAGE.MADURO));
    PL.push(makePlant(5, -6, STAGE.VEGETATIVO));
    PL.push(makePlant(-5, -8, STAGE.COLINO));
    for (let i = 0; i < 4; i++) spawnChuba(PL[0]);
    PL.forEach(p => {
        plantGrid.set(gk(p.x, p.z), p);
        upd(p);
    });
}

// ============================================================
// INICIALIZACIÓN
// ============================================================
PL.push(makePlant(0, -6, STAGE.MADURO));
PL.push(makePlant(5, -6, STAGE.VEGETATIVO));
PL.push(makePlant(-5, -8, STAGE.COLINO));
for (let i = 0; i < 4; i++) spawnChuba(PL[0]);
PL.forEach(p => {
    plantGrid.set(gk(p.x, p.z), p);
    upd(p);
});