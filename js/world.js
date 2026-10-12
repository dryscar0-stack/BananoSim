// ============================================================
// world.js — Escena, terreno, pozo, vegetación y ciclo día/noche
// ============================================================

const sc = new THREE.Scene();
sc.background = new THREE.Color(0x87a5c4);
sc.fog = new THREE.FogExp2(0x9fb8d0, 0.020);

const cam = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 120);
cam.position.set(0, 1.7, 5);

const rn = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
rn.setPixelRatio(1);
rn.setSize(innerWidth, innerHeight);
rn.outputEncoding = THREE.sRGBEncoding;
rn.shadowMap.enabled = false;
document.body.appendChild(rn.domElement);

// ---------- LUCES ----------
const dl = new THREE.DirectionalLight(0xfff8dc, 1.15);
dl.position.set(25, 50, 25);
const al = new THREE.AmbientLight(0x795548, 0.75);
sc.add(dl, al, new THREE.HemisphereLight(0x88aacc, 0x4a3525, 0.35));

// ============================================================
// CUERPOS CELESTES: SOL Y LUNA
// ============================================================
const SUN_DIST = 60;
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff8c0 })
);
sc.add(sun);

// Halo del sol (billboard básico)
const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(6, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff4a0, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
);
sc.add(sunHalo);

// Luna con fases (esfera + disco oscuro que la cubre parcialmente)
const moonGroup = new THREE.Group();
const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xddd8c8 })
);
moonGroup.add(moonSphere);

// Disco oscuro para fases (se mueve sobre la luna)
const moonShadow = new THREE.Mesh(
    new THREE.SphereGeometry(2.25, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x0a0d12 })
);
moonShadow.position.x = 0;
moonGroup.add(moonShadow);

// Halo de la luna
const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xaabbdd, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
);
moonGroup.add(moonHalo);

sc.add(moonGroup);

// Fases lunares: 8 fases en ciclo
let moonPhase = 0;         // 0-7
let moonPhaseTimer = 0;    // segundos hasta siguiente fase

function updateMoonPhase() {
    // Fase 0 = luna nueva, 4 = luna llena, 8 vuelve a nueva
    // El disco oscuro se mueve de izquierda (-x) a derecha (+x)
    const phase = moonPhase % 8;
    let offset;
    if (phase <= 4) {
        // Creciente: de -2.2 a 0
        offset = -2.2 + (phase / 4) * 2.2;
    } else {
        // Menguante: de 0 a 2.2
        offset = ((phase - 4) / 4) * 2.2;
    }
    moonShadow.position.x = offset;
    // Rotar para que el disco oscuro esté siempre orientado hacia el sol
    moonShadow.visible = (phase !== 4); // luna llena = sin sombra
}

// ============================================================
// PRESETS DE LUZ
// ============================================================
const PRE = {
    day:    { bg: 0x87a5c4, fog: 0x9fb8d0, dir: 0xfff8dc, dI: 1.15, amb: 0x795548, aI: 0.75, fD: 0.020 },
    sunset: { bg: 0x4a2e18, fog: 0x6b3a1f, dir: 0xe67e22, dI: 1.00, amb: 0xd35400, aI: 0.55, fD: 0.030 },
    night:  { bg: 0x0b0d10, fog: 0x0b0d10, dir: 0x34495e, dI: 0.35, amb: 0x1a252f, aI: 0.40, fD: 0.045 }
};
let pre = PRE.day;
const _tmpC = new THREE.Color();

// Posición del sol/luna según hora del día (0-24)
function updateCelestialBodies(hour) {
    // Ángulo: 6h = amanecer (0°), 12h = mediodía (90°), 18h = atardecer (180°), 0h = medianoche (270°)
    const sunAngle = ((hour - 6) / 12) * Math.PI; // 0 a PI de 6h a 18h

    // Sol visible de 6 a 18
    const sunVisible = hour >= 5.5 && hour <= 18.5;
    sun.visible = sunVisible;
    sunHalo.visible = sunVisible;

    if (sunVisible) {
        // Órbita del sol: arco por el cielo
        const sunX = Math.cos(sunAngle - Math.PI / 2) * SUN_DIST;
        const sunY = Math.sin(sunAngle) * SUN_DIST * 0.8;
        const sunZ = Math.sin(sunAngle - Math.PI / 2) * SUN_DIST * 0.3;
        sun.position.set(sunX, Math.max(sunY, -5), sunZ);
        sunHalo.position.copy(sun.position);
        sunHalo.lookAt(cam.position);
    }

    // Luna visible de 18 a 6
    const moonVisible = hour < 5.5 || hour > 18.5;
    moonGroup.visible = moonVisible;

    if (moonVisible) {
        // Ángulo de la luna: 18h a 6h mapea a 0-PI
        let moonHour = hour < 5.5 ? hour + 24 : hour;
        const moonAngle = ((moonHour - 18) / 12) * Math.PI;
        const moonX = Math.cos(moonAngle - Math.PI / 2) * SUN_DIST;
        const moonY = Math.sin(moonAngle) * SUN_DIST * 0.8;
        const moonZ = Math.sin(moonAngle - Math.PI / 2) * SUN_DIST * 0.3;
        moonGroup.position.set(moonX, Math.max(moonY, -5), moonZ);
        // Halo siempre mirando a la cámara
        moonHalo.lookAt(cam.position);
    }
}

// ============================================================
// ACTUALIZAR LUCES CON SOL/LUNA
// ============================================================
function tickLight(dt) {
    const k = 1 - Math.exp(-dt * 2);
    _tmpC.setHex(pre.bg);
    sc.background.lerp(_tmpC, k);
    _tmpC.setHex(pre.fog);
    sc.fog.color.lerp(_tmpC, k);
    sc.fog.density = lp(sc.fog.density, pre.fD, k);
    dl.intensity = lp(dl.intensity, pre.dI, k);
    al.intensity = lp(al.intensity, pre.aI, k);
    _tmpC.setHex(pre.dir);
    dl.color.lerp(_tmpC, k);
    _tmpC.setHex(pre.amb);
    al.color.lerp(_tmpC, k);

    // Dirección de la luz: sigue al sol de día, a la luna de noche
    const hour = cfg.mins / 60;
    const isDay = hour >= 6 && hour < 18;
    if (isDay && sun.visible) {
        dl.position.copy(sun.position).normalize().multiplyScalar(50);
    } else if (moonGroup.visible) {
        dl.position.copy(moonGroup.position).normalize().multiplyScalar(50);
    }
}

// ============================================================
// TERRENO
// ============================================================
const th = (x, z) => {
    const s = 0.15;
    return ((Math.sin(x * s) * Math.cos(z * s * 1.3)) * 0.5
         + (Math.sin(x * s * 2.1 + 1.7) * Math.cos(z * s * 1.9 + 0.5)) * 0.3
         + (Math.sin(x * s * 4.3 + 3.1) * Math.cos(z * s * 3.7 + 2.2)) * 0.2) * 0.55;
};

const floorGeo = new THREE.PlaneGeometry(180, 180, 48, 48);
floorGeo.rotateX(-Math.PI / 2);
const fPos = floorGeo.attributes.position;
for (let i = 0; i < fPos.count; i++) fPos.setY(i, th(fPos.getX(i), fPos.getZ(i)));
floorGeo.computeVertexNormals();

const floorMat = psxMat(PAL.soilDry);
const floorMesh = new THREE.Mesh(floorGeo, floorMat);
sc.add(floorMesh);

const FLOOR_DRY = new THREE.Color(PAL.soilDry);
const FLOOR_WET = new THREE.Color(PAL.soilWet);
function updateFloorColor() {
    floorMat.color.copy(FLOOR_DRY).lerp(FLOOR_WET, cl(soilMoisture, 0, 1));
}
updateFloorColor();

// Grid visual
const groundGrid = new THREE.GridHelper(180, 90, 0x6b4a2f, 0x3a2818);
groundGrid.position.y = 0.06;
groundGrid.material.opacity = 0.35;
groundGrid.material.transparent = true;
sc.add(groundGrid);

// ============================================================
// MANCHAS DE HUMEDAD
// ============================================================
const wetSpots = [];

function createWetSpot(x, z, radius) {
    const geo = new THREE.CircleGeometry(radius, 12);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const vx = pos.getX(i), vz = pos.getZ(i);
        const d = Math.sqrt(vx * vx + vz * vz);
        if (d > 0.01) {
            const ang = Math.atan2(vz, vx);
            const wobble = 1 + (Math.sin(ang * 3.7) * 0.08 + Math.sin(ang * 7.1) * 0.05);
            pos.setX(i, vx * wobble);
            pos.setZ(i, vz * wobble);
        }
    }
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
        color: PAL.soilWet, roughness: 1, metalness: 0,
        transparent: true, opacity: 0,
        depthWrite: false, polygonOffset: true,
        polygonOffsetFactor: -2, polygonOffsetUnits: -2
    });
    const mesh = new THREE.Mesh(geo, mat);
    at(mesh, x, th(x, z) + 0.02, z);
    sc.add(mesh);
    const spot = { mesh, x, z, radius, life: 0, targetLife: 1 };
    wetSpots.push(spot);
    if (wetSpots.length > 40) {
        const old = wetSpots.shift();
        sc.remove(old.mesh);
        old.mesh.geometry.dispose();
        old.mesh.material.dispose();
    }
    return spot;
}

function tickWetSpots(dt) {
    for (let i = wetSpots.length - 1; i >= 0; i--) {
        const spot = wetSpots[i];
        spot.life = Math.max(0, spot.life - dt * 0.015);
        const targetOpacity = spot.targetLife * 0.85;
        spot.mesh.material.opacity = lp(spot.mesh.material.opacity, targetOpacity, 0.08);
        if (spot.life <= 0 && spot.mesh.material.opacity < 0.02) {
            sc.remove(spot.mesh);
            spot.mesh.geometry.dispose();
            spot.mesh.material.dispose();
            wetSpots.splice(i, 1);
        }
    }
}

function addWetSpot(x, z, radius) {
    for (const spot of wetSpots) {
        const d = Math.hypot(spot.x - x, spot.z - z);
        if (d < radius * 0.7) {
            spot.life = Math.min(1.2, spot.life + 0.08);
            spot.targetLife = Math.min(1, spot.targetLife + 0.15);
            return spot;
        }
    }
    const newSpot = createWetSpot(x, z, radius);
    newSpot.life = 1.0;
    newSpot.targetLife = 0.6;
    return newSpot;
}

// ============================================================
// VEGETACIÓN INSTANCIADA
// ============================================================
const _dm = new THREE.Object3D();

function instanced(geo, mat, count, place) {
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    let idx = 0;
    for (let i = 0; i < count; i++) {
        const p = place(i);
        if (!p) continue;
        _dm.position.set(p.x, p.y, p.z);
        _dm.scale.setScalar(p.s || 1);
        if (p.sx) _dm.scale.set(p.sx, p.sy, p.sz);
        _dm.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
        _dm.updateMatrix();
        mesh.setMatrixAt(idx++, _dm.matrix);
        if (p.color) mesh.setColorAt(idx - 1, p.color);
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    sc.add(mesh);
    return mesh;
}

instanced(new THREE.DodecahedronGeometry(0.55, 0), MAT.bush, 80, () => {
    const x = (rnd() - 0.5) * 140, z = (rnd() - 0.5) * 140;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) return null;
    const s = 0.6 + rnd() * 0.7;
    return { x, y: th(x, z) + 0.3 * s, z, sx: s, sy: s * 0.85, sz: s, ry: rnd() * Math.PI * 2 };
});

instanced(new THREE.ConeGeometry(0.08, 0.7, 4), MAT.grass, 200, () => {
    const x = (rnd() - 0.5) * 150, z = (rnd() - 0.5) * 150;
    if (Math.abs(x) < 6 && Math.abs(z) < 6) return null;
    const s = 0.7 + rnd() * 0.6;
    return { x, y: th(x, z) + 0.35 * s, z, s, ry: rnd() * Math.PI * 2, rz: (rnd() - 0.5) * 0.3 };
});

const flowerColors = [0xffeb3b, 0xff7043, 0xe91e63, 0xfff176, 0xba68c8];
instanced(new THREE.DodecahedronGeometry(0.08, 0), psxMat(0xffffff), 60, () => {
    const x = (rnd() - 0.5) * 130, z = (rnd() - 0.5) * 130;
    if (Math.abs(x) < 5 && Math.abs(z) < 5) return null;
    return { x, y: th(x, z) + 0.15, z, s: 0.8 + rnd() * 0.5, color: new THREE.Color(flowerColors[Math.floor(rnd() * flowerColors.length)]) };
});

instanced(new THREE.DodecahedronGeometry(0.35, 0), MAT.rock, 40, () => {
    const x = (rnd() - 0.5) * 150, z = (rnd() - 0.5) * 150;
    if (Math.abs(x) < 6 && Math.abs(z) < 6) return null;
    const s = 0.5 + rnd() * 0.8;
    return { x, y: th(x, z) + 0.15, z, sx: s, sy: s * 0.7, sz: s, rx: rnd() * Math.PI, ry: rnd() * Math.PI, rz: rnd() * Math.PI };
});

for (let l = 0; l < 4; l++) {
    const x = (rnd() - 0.5) * 80, z = (rnd() - 0.5) * 80;
    if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
    const log = cyl(0.2, 0.25, 1.8, 6, psxMat(0x5d4037));
    at(log, x, th(x, z) + 0.2, z);
    rot(log, 0, rnd() * Math.PI, Math.PI / 2);
    sc.add(log);
    const moss = box(1.6, 0.05, 0.3, psxMat(0x4a7c2b));
    at(moss, x, th(x, z) + 0.42, z);
    moss.rotation.y = log.rotation.y;
    sc.add(moss);
}

// ============================================================
// POZO
// ============================================================
const wellX = 8, wellZ = 6;
at(sc.add(cyl(1.5, 1.6, 0.55, 10, psxMat(0x7f8c8d))), wellX, 0.27, wellZ);
const rim = torus(1.45, 0.12, 5, 12, psxMat(0x5d4037));
at(rim, wellX, 0.55, wellZ);
rim.rotation.x = Math.PI / 2;
sc.add(rim);
at(sc.add(cyl(1.35, 1.35, 0.05, 10, MAT.water)), wellX, 0.5, wellZ);

const shine = new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 12),
    new THREE.MeshBasicMaterial({ color: PAL.waterShine, transparent: true, opacity: 0.25 })
);
at(shine, wellX, 0.53, wellZ);
shine.rotation.x = -Math.PI / 2;
sc.add(shine);

for (let i = 0; i < 10; i++) {
    const ang = (i / 10) * Math.PI * 2 + rrand() * 0.3;
    const r = 2.0 + rrand() * 0.5;
    const cx = wellX + Math.cos(ang) * r;
    const cz = wellZ + Math.sin(ang) * r;
    const h = 1.2 + rrand() * 0.8;
    const tallo = cyl(0.03, 0.04, h, 4, MAT.cane);
    at(tallo, cx, h / 2, cz);
    tallo.rotation.z = (rrand() - 0.5) * 0.3;
    sc.add(tallo);
    at(sc.add(cone(0.045, 0.25, 4, MAT.caneTop)), cx, h + 0.12, cz);
}

for (let i = 0; i < 4; i++) {
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), MAT.lily);
    at(lily, wellX + (rrand() - 0.5) * 1.7, 0.55, wellZ + (rrand() - 0.5) * 1.7);
    lily.rotation.x = -Math.PI / 2;
    sc.add(lily);
}

for (let i = 0; i < 8; i++) {
    const ang = rrand() * Math.PI * 2, r = 1.9 + rrand() * 0.7;
    const rock = dodec(0.15 + rrand() * 0.1, 0, MAT.rock);
    at(rock, wellX + Math.cos(ang) * r, 0.1, wellZ + Math.sin(ang) * r);
    rot(rock, rrand() * Math.PI, rrand() * Math.PI, rrand() * Math.PI);
    sc.add(rock);
}

const wetPatch = new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 16),
    psxMat(PAL.soilWet, { transparent: true, opacity: 0.6 })
);
at(wetPatch, wellX, 0.04, wellZ);
wetPatch.rotation.x = -Math.PI / 2;
sc.add(wetPatch);

const duck = new THREE.Group();
const duckMat = psxMat(0xf5f5dc);
duck.add(dodec(0.18, 0, duckMat));
const head = sphere(0.09, 6, 5, duckMat);
at(head, 0.1, 0.1, -0.05);
duck.add(head);
const beak = cone(0.03, 0.08, 4, psxMat(0xffa500));
at(beak, 0.18, 0.1, -0.1);
beak.rotation.z = -Math.PI / 2;
duck.add(beak);
at(duck, wellX + 0.4, 0.58, wellZ - 0.2);
sc.add(duck);

// ============================================================
// LUCIÉRNAGAS
// ============================================================
const FIREFLY_N = 40;
const fireflyPos = new Float32Array(FIREFLY_N * 3);
const fireflyBase = [];
for (let i = 0; i < FIREFLY_N; i++) {
    const x = (rnd() - 0.5) * 100, z = (rnd() - 0.5) * 100;
    const y = th(x, z) + 0.8 + rnd() * 1.5;
    fireflyPos[i * 3] = x;
    fireflyPos[i * 3 + 1] = y;
    fireflyPos[i * 3 + 2] = z;
    fireflyBase.push({ x, y, z, phase: rnd() * Math.PI * 2 });
}
const fireflyGeo = new THREE.BufferGeometry();
fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
const fireflyMat = new THREE.PointsMaterial({ color: 0xffeb3b, size: 0.15, transparent: true, opacity: 0, sizeAttenuation: true });
const fireflies = new THREE.Points(fireflyGeo, fireflyMat);
sc.add(fireflies);

function tickFireflies(t, isNight) {
    fireflyMat.opacity = isNight ? 0.9 : 0;
    if (!isNight) return;
    const arr = fireflies.geometry.attributes.position.array;
    for (let i = 0; i < FIREFLY_N; i++) {
        const b = fireflyBase[i];
        arr[i * 3]     = b.x + Math.sin(t * 0.5 + b.phase) * 0.8;
        arr[i * 3 + 1] = b.y + Math.cos(t * 0.7 + b.phase * 1.3) * 0.3;
        arr[i * 3 + 2] = b.z + Math.cos(t * 0.4 + b.phase * 0.8) * 0.8;
    }
    fireflies.geometry.attributes.position.needsUpdate = true;
}

// ============================================================
// PIEDRA DE AFILAR
// ============================================================
at(sc.add(box(0.7, 0.25, 0.5, psxMat(0x7f8c8d))), -7, 0.15, 6);
at(sc.add(cyl(0.5, 0.6, 0.1, 8, psxMat(0x4a4a4a))), -7, 0.05, 6);

// ============================================================
// PARCHE CENTRAL
// ============================================================
const patchGeo = new THREE.CircleGeometry(10, 24);
patchGeo.rotateX(-Math.PI / 2);
const patch = new THREE.Mesh(patchGeo, psxMat(0x5a3f28, { transparent: true, opacity: 0.9 }));
at(patch, 0, 0.08, -7);
sc.add(patch);