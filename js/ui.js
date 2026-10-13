// ============================================================
// ui.js — Hotbar, ghost placement, panel debug
// ============================================================

window.selectedTool = 'machete';
window.setSlotActive = function(tool) {
    document.querySelectorAll('#hotbar .slot').forEach(s => {
        s.classList.toggle('active', s.dataset.tool === tool);
    });
};

let ghostOn = false;
let ghostM = null;

function buildGhostColino() {
    const g = new THREE.Group();
    const brote = cyl(0.05, 0.09, 0.35, 5, MAT.colino);
    at(brote, 0, 0.28, 0);
    g.add(brote);
    for (let i = 0; i < 3; i++) {
        const hoja = box(0.22, 0.015, 0.06, MAT.colinoLeaf);
        at(hoja, 0, 0.44, 0);
        hoja.rotation.y = (i * Math.PI * 2) / 3;
        hoja.rotation.z = 0.35;
        g.add(hoja);
    }
    g.add(at(dodec(0.14, 0, MAT.soil), 0, 0.05, 0));
    for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        const raiz = cyl(0.01, 0.004, 0.15, 4, MAT.root);
        at(raiz, Math.cos(ang) * 0.06, -0.05, Math.sin(ang) * 0.06);
        rot(raiz, Math.sin(ang) * 0.5, 0, Math.cos(ang) * 0.5);
        g.add(raiz);
    }
    return g;
}

// ---------- HOTBAR ----------
document.querySelectorAll('#hotbar .slot').forEach(slot => {
    slot.addEventListener('click', () => {
        const tool = slot.dataset.tool;
        window.selectedTool = tool;
        window.setSlotActive(tool);

        if (ghostOn) {
            if (ghostM) sc.remove(ghostM);
            ghostOn = false;
            ghostM = null;
            $('ghost').style.display = 'none';
        }

        if (wateringMode && tool !== 'wateringCan') {
            wateringMode = false;
            wateringActive = false;
        }

        if (tool === 'colino') {
            if (inv.hij <= 0) {
                window.selectedTool = 'machete';
                window.setSlotActive('machete');
                setTool('machete');
                return;
            }
            ghostOn = true;
            setTool('colino');

            const gg = new THREE.Group();
            const colModel = buildGhostColino();
            colModel.traverse(c => {
                if (c.isMesh) {
                    c.material = c.material.clone();
                    c.material.transparent = true;
                    c.material.opacity = 0.55;
                    c.material.color.setHex(0x2ecc71);
                }
            });
            gg.add(colModel);

            const halo = new THREE.Mesh(
                new THREE.RingGeometry(0.35, 0.5, 16),
                new THREE.MeshBasicMaterial({ color: 0x2ecc71, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
            );
            at(halo, 0, 0.05, 0);
            halo.rotation.x = -Math.PI / 2;
            gg.add(halo);

            ghostM = gg;
            sc.add(ghostM);
            $('ghost').style.display = 'flex';
        }
        else if (tool === 'wateringCan') {
            wateringMode = true;
            wateringActive = false;
            setTool('wateringCan');
        }
        else {
            setTool(tool);
        }
    });
});

// Confirmar siembra
$('bok').onclick = () => {
    if (!ghostM) return;
    const pos = ghostM.position.clone();
    const k = gk(pos.x, pos.z);
    if (plantGrid.has(k)) return;
    inv.hij--;
    swing(() => {
        const np = makePlant(pos.x, pos.z, STAGE.COLINO);
        PL.push(np);
        plantGrid.set(k, np);
        sc.remove(ghostM);
        ghostM = null;
        ghostOn = false;
        $('ghost').style.display = 'none';
        updHUD();
    }, 'planting');
};

$('bcn').onclick = () => {
    if (ghostM) sc.remove(ghostM);
    ghostOn = false;
    ghostM = null;
    $('ghost').style.display = 'none';
};

// ============================================================
// BOTÓN DEL SOL
// ============================================================
const sunBtn = $('sunBtn');
if (sunBtn) {
    sunBtn.addEventListener('click', () => {
        if (typeof window.triggerLookAtSun === 'function') {
            window.triggerLookAtSun();
        }
    });
}

// ============================================================
// PANEL DE DEBUG
// ============================================================
const cfgPanel = $('cfg');

function toggleCfg() {
    const isOpen = cfgPanel.style.display === 'block';
    cfgPanel.style.display = isOpen ? 'none' : 'block';
}

$('cfgBtn').onclick = toggleCfg;
$('close').onclick = () => { cfgPanel.style.display = 'none'; };

$('dtSpeed').onchange = e => { cfg.timeScale = +e.target.value; };
$('dtHour').oninput = e => {
    cfg.mins = +e.target.value;
    if (typeof updateCelestialBodies === 'function') updateCelestialBodies(cfg.mins / 60);
};
$('ctd').onchange = e => { cfg.td = e.target.value; };

$('cgs').oninput = e => { cfg.gm = +e.target.value; };
$('dbStage').onchange = e => {
    const v = e.target.value;
    if (v === '') return;
    if (typeof dbSetStage === 'function') dbSetStage(+v);
    e.target.value = '';
};
$('dbChubaAdd').onclick = () => { if (typeof dbAddChuba === 'function') dbAddChuba(); };
$('dbChubaClear').onclick = () => { if (typeof dbClearChubas === 'function') dbClearChubas(); };
$('dbMoist').oninput = e => {
    soilMoisture = (+e.target.value) / 100;
    if (typeof updateFloorColor === 'function') updateFloorColor();
};
$('dbResetPlants').onclick = () => { if (typeof dbResetPlants === 'function') dbResetPlants(); };

$('cgm').onchange = e => { cfg.gm2 = e.target.checked; };
$('bs5').onclick = () => { inv.hij += 5; updHUD(); };
$('dbPlatAdd').onclick = () => { inv.plat += 5; updHUD(); };
$('dbRefill').onclick = () => { en = 100; hy = 100; st2 = 100; updHUD(); };

$('bsv').onclick = () => { saveGame(); };
$('bld').onclick = () => { loadGame(); };
$('dbErase').onclick = () => {
    localStorage.removeItem('finca');
    if (typeof dbResetPlants === 'function') dbResetPlants();
};

// ---------- GHOST ----------
function tickGhost() {
    if (!ghostOn || !ghostM) return;
    ghostM.position.x = cam.position.x - Math.sin(yaw) * 4;
    ghostM.position.z = cam.position.z - Math.cos(yaw) * 4;
    ghostM.position.y = th(ghostM.position.x, ghostM.position.z) + 0.1 + Math.sin(performance.now() * 0.003) * 0.05;
    ghostM.rotation.y += 0.008;
}