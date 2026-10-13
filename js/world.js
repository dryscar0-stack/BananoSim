// ============================================================
// world.js — Escena, terreno, pozo, vegetación y cielo
// ============================================================

// ---------- ESCENA / RENDERER ----------
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
// CIELO: SOL Y LUNA
// ============================================================
const SUN_DIST = 60;

const sun = new THREE.Mesh(
    new THREE.SphereGeometry(3, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xfff8c0 })
);
const sunHalo = new THREE.Mesh(
    new THREE.CircleGeometry(6, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff4a0, transparent: true, opacity: 0.25, side: THREE.DoubleSide })
);
sc.add(sun, sunHalo);

const moonGroup = new THREE.Group();
const moonSphere = new THREE.Mesh(
    new THREE.SphereGeometry(2.2, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xddd8c8 })
);
const moonShadow = new THREE.Mesh(
    new THREE.SphereGeometry(2.25, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0x0a0d12 })
);
const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(4.5, 12),
    new THREE.MeshBasicMaterial({ color: 0xaabbdd, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
);
moonGroup.add(moonSphere, moonShadow, moonHalo);
sc.add(moonGroup);

let moonPhase = 0;
let moonPhaseTimer = 0;

function updateMoonPhase() {
    const ph = moonPhase % 8;
    moonShadow.position.x = ph <= 4
        ? -2.2 + (ph / 4) * 2.2
        : ((ph - 4) / 4) * 2.2;
    moonShadow.visible = ph !== 4; // llena = sin sombra
}

// Órbita de un cuerpo: aplica posición
function orbitBody(target, hour, startH, endH) {
    let h = hour < startH ? hour + 24 : hour;
    const angle = ((h - startH) / 12) * Math.PI;
    target.position.set(
        Math.cos(angle - Math.PI / 2) * SUN_DIST,
        Math.max(Math.sin(angle) * SUN_DIST * 0.8, -5),
        Math.sin(angle - Math.PI / 2) * SUN_DIST * 0.3
    );
}

function updateCelestialBodies(hour) {
    const sunVisible = hour >= 6 && hour <= 18;
    sun.visible = sunHalo.visible = sunVisible;
    if (sunVisible) {
        orbitBody(sun, hour, 6);
        sunHalo.position.copy(sun.position);
        sunHalo.lookAt(cam.position);
    }
    const moonVisible = hour < 6 || hour > 18;
    moonGroup.visible = moonVisible;
    if (moonVisible) {
        orbitBody(moonGroup, hour, 18);
        moonHalo.lookAt(cam.position);
    }
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

function tickLight(dt) {
    const k = 1 - Math.exp(-dt * 2);
    _tmpC.setHex(pre.bg); sc.background.lerp(_tmpC, k);
    _tmpC.setHex(pre.fog); sc.fog.color.lerp(_tmpC, k);
    sc.fog.density = lp(sc.fog.density, pre.fD, k);
    dl.intensity = lp(dl.intensity, pre.dI, k);
    al.intensity = lp(al.intensity, pre.aI, k);
    _tmpC.setHex(pre.dir); dl.color.lerp(_tmpC, k);
    _tmpC.setHex(pre.amb); al.color.lerp(_tmpC, k);

    const hour = cfg.mins / 60;
    const isDay = hour >= 6 && hour < 18;
    if (isDay && sun.visible) dl.position.copy(sun.position).normalize().multiplyScalar(50);
    else if (moonGroup.visible) dl.position.copy(moonGroup.position).normalize().multiplyScalar(50);
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
const updateFloorColor = () => floorMat.color.copy(FLOOR_DRY).lerp(FLOOR_WET, cl(soilMoisture, 0, 1));
updateFloorColor();

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
        const d = Math.hypot(vx, vz);
        if (d > 0.01) {
            const ang = Math.atan2(vz, vx);
            const w = 1 + (Math.sin(ang * 3.7) * 0.08 + Math.sin(ang * 7.1) * 0.05);
            pos.setX(i, vx * w);
            pos.setZ(i, vz * w);
        }
    }
    geo.computeVertexNormals();

    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
        color: PAL.soilWet, roughness: 1, metalness: 0,
        transparent: true, opacity: 0,
        depthWrite: false, polygonOffset: true,
        polygonOffsetFactor: -2, polygonOffsetUnits: -2
    }));
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
        const s = wetSpots[i];
        s.life = Math.max(0, s.life - dt * 0.015);
        s.mesh.material.opacity = lp(s.mesh.material.opacity, s.targetLife * 0.85, 0.08);
        if (s.life <= 0 && s.mesh.material.opacity < 0.02) {
            sc.remove(s.mesh);
            s.mesh.geometry.dispose();
            s.mesh.material.dispose();
            wetSpots.splice(i, 1);
        }
    }
}

function addWetSpot(x, z, radius) {
    for (const s of wetSpots) {
        if (Math.hypot(s.x - x, s.z - z) < radius * 0.7) {
            s.life = Math.min(1.2, s.life + 0.08);
            s.targetLife = Math.min(1, s.targetLife + 0.15);
            return s;
        }
    }
    const ns = createWetSpot(x, z, radius);
    ns.life = 1.0;
    ns.targetLife = 0.6;
    return ns;
}

function clearWetSpots() {
    for (const s of wetSpots) {
        sc.remove(s.mesh);
        s.mesh.geometry.dispose();
        s.mesh.material.dispose();
    }
    wetSpots.length = 0;
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
        if (p.sx) _dm.scale.set(p.sx, p.sy, p.sz);
        else _dm.scale.setScalar(p.s || 1);
        _dm.rotation.set(p.rx || 0, p.ry || 0, p.rz || 0);
        _dm.updateMatrix();
        mesh.setMatrixAt(idx, _dm.matrix);
        if (p.color) mesh.setColorAt(idx, p.color);
        idx++;
    }
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    sc.add(mesh);
    return mesh;
}

// Helper para posicionar vegetación con offset del terreno
const onGround = (x, z, yOffset = 0) => ({ x, z, y: th(x, z) + yOffset });

instanced(new THREE.DodecahedronGeometry(0.55, 0), MAT.bush, 80, () => {
    const x = (rnd() - 0.5) * 140, z = (rnd() - 0.5) * 140;
    if (Math.abs(x) < 8 && Math.abs(z) < 8) return null;
    const s = 0.6 + rnd() * 0.7;
    return { ...onGround(x, z, 0.3 * s), sx: s, sy: s * 0.85, sz: s, ry: rnd() * Math.PI * 2 };
});

instanced(new THREE.ConeGeometry(0.08, 0.7, 4), MAT.grass, 200, () => {
    const x = (rnd() - 0.5) * 150, z = (rnd() - 0.5) * 150;
    if (Math.abs(x) < 6 && Math.abs(z) < 6) return null;
    const s = 0.7 + rnd() * 0.6;
    return { ...onGround(x, z, 0.35 * s), s, ry: rnd() * Math.PI * 2, rz: (rnd() - 0.5) * 0.3 };
});

const flowerColors = [0xffeb3b, 0xff7043, 0xe91e63, 0xfff176, 0xba68c8];
instanced(new THREE.DodecahedronGeometry(0.08, 0), psxMat(0xffffff, { vertexColors: true }), 60, () => {
    const x = (rnd() - 0.5) * 130, z = (rnd() - 0.5) * 130;
    if (Math.abs(x) < 5 && Math.abs(z) < 5) return null;
    return {
        ...onGround(x, z, 0.15),
        s: 0.8 + rnd() * 0.5,
        color: new THREE.Color(flowerColors[Math.floor(rnd() * flowerColors.length)])
    };
});

instanced(new THREE.DodecahedronGeometry(0.35, 0), MAT.rock, 40, () => {
    const x = (rnd() - 0.5) * 150, z = (rnd() - 0.5) * 150;
    if (Math.abs(x) < 6 && Math.abs(z) < 6) return null;
    const s = 0.5 + rnd() * 0.8;
    return { ...onGround(x, z, 0.15), sx: s, sy: s * 0.7, sz: s,
             rx: rnd() * Math.PI, ry: rnd() * Math.PI, rz: rnd() * Math.PI };
});

// Troncos caídos
const logMat = psxMat(0x5d4037);
const mossMat = psxMat(0x4a7c2b);
for (let l = 0; l < 4; l++) {
    const x = (rnd() - 0.5) * 80, z = (rnd() - 0.5) * 80;
    if (Math.abs(x) < 10 && Math.abs(z) < 10) continue;
    const log = cyl(0.2, 0.25, 1.8, 6, logMat);
    at(log, x, th(x, z) + 0.2, z);
    rot(log, 0, rnd() * Math.PI, Math.PI / 2);
    sc.add(log);
    const moss = box(1.6, 0.05, 0.3, mossMat);
    at(moss, x, th(x, z) + 0.42, z);
    moss.rotation.y = log.rotation.y;
    sc.add(moss);
}

// ============================================================
// POZO Y ENTORNO
// ============================================================
const wellX = 8, wellZ = 6;

// Estructura del pozo
const wellBaseMat = psxMat(0x7f8c8d);
const wellRimMat = psxMat(0x5d4037);
sc.add(at(cyl(1.5, 1.6, 0.55, 10, wellBaseMat), wellX, 0.27, wellZ));
sc.add(at(rot(torus(1.45, 0.12, 5, 12, wellRimMat), Math.PI / 2, 0, 0), wellX, 0.55, wellZ));
sc.add(at(cyl(1.35, 1.35, 0.05, 10, MAT.water), wellX, 0.5, wellZ));

// Brillo del agua
sc.add(at(rot(new THREE.Mesh(
    new THREE.CircleGeometry(1.2, 12),
    new THREE.MeshBasicMaterial({ color: PAL.waterShine, transparent: true, opacity: 0.25 })
), -Math.PI / 2, 0, 0), wellX, 0.53, wellZ));

// Juncos
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
    sc.add(at(cone(0.045, 0.25, 4, MAT.caneTop), cx, h + 0.12, cz));
}

// Nenúfares
for (let i = 0; i < 4; i++) {
    const lily = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), MAT.lily);
    at(lily, wellX + (rrand() - 0.5) * 1.7, 0.55, wellZ + (rrand() - 0.5) * 1.7);
    lily.rotation.x = -Math.PI / 2;
    sc.add(lily);
}

// Piedras decorativas
for (let i = 0; i < 8; i++) {
    const ang = rrand() * Math.PI * 2, r = 1.9 + rrand() * 0.7;
    const rock = dodec(0.15 + rrand() * 0.1, 0, MAT.rock);
    at(rock, wellX + Math.cos(ang) * r, 0.1, wellZ + Math.sin(ang) * r);
    rot(rock, rrand() * Math.PI, rrand() * Math.PI, rrand() * Math.PI);
    sc.add(rock);
}

// Tierra húmeda alrededor
sc.add(at(rot(new THREE.Mesh(
    new THREE.CircleGeometry(2.5, 16),
    psxMat(PAL.soilWet, { transparent: true, opacity: 0.6 })
), -Math.PI / 2, 0, 0), wellX, 0.04, wellZ));

// Pato
const duck = new THREE.Group();
const duckMat = psxMat(0xf5f5dc);
duck.add(dodec(0.18, 0, duckMat));
duck.add(at(sphere(0.09, 6, 5, duckMat), 0.1, 0.1, -0.05));
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
    fireflyPos.set([x, y, z], i * 3);
    fireflyBase.push({ x, y, z, phase: rnd() * Math.PI * 2 });
}

const fireflyGeo = new THREE.BufferGeometry();
fireflyGeo.setAttribute('position', new THREE.BufferAttribute(fireflyPos, 3));
const fireflyMat = new THREE.PointsMaterial({
    color: 0xffeb3b, size: 0.15, transparent: true, opacity: 0, sizeAttenuation: true
});
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
// PIEDRA DE AFILAR Y PARCHE CENTRAL
// ============================================================
sc.add(at(box(0.7, 0.25, 0.5, psxMat(0x7f8c8d)), -7, 0.15, 6));
sc.add(at(cyl(0.5, 0.6, 0.1, 8, psxMat(0x4a4a4a)), -7, 0.05, 6));

const patchGeo = new THREE.CircleGeometry(10, 24);
patchGeo.rotateX(-Math.PI / 2);
sc.add(at(new THREE.Mesh(patchGeo, psxMat(0x5a3f28, { transparent: true, opacity: 0.9 })), 0, 0.08, -7));