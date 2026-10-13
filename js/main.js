// ============================================================
// main.js — Arranque
// ============================================================

updHUD();
pre = PRE.day;
tickLight(0.016);
updateFloorColor();
if (typeof updateCelestialBodies === 'function') updateCelestialBodies(cfg.mins / 60);

const hh0 = Math.floor(cfg.mins / 60);
const mm0 = Math.floor(cfg.mins % 60);
$('clk').innerText = String(hh0).padStart(2, '0') + ':' + String(mm0).padStart(2, '0');