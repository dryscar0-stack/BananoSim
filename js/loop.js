// ============================================================
// loop.js — Ciclo principal
// ============================================================

let last = performance.now();
let elapsed = 0;
let clkNode = null;

const DAY_DURATION = 8 * 60;
const NIGHT_DURATION = 6 * 60;
const TOTAL_DURATION = DAY_DURATION + NIGHT_DURATION;
const MINUTES_PER_SECOND = 1440 / TOTAL_DURATION;

function loop(now) {
  requestAnimationFrame(loop);
  const realDt = Math.min((now - last) / 1000, 0.05);
  last = now;
  
  const dt = realDt * (cfg.timeScale || 1);
  elapsed += realDt;
  
  if (!floorMeshRef && typeof floorMesh !== 'undefined') floorMeshRef = floorMesh;
  if (!clkNode) clkNode = $('clk');
  
  if (cfg.td === 'auto') {
    const prevMins = cfg.mins;
    cfg.mins = (cfg.mins + dt * MINUTES_PER_SECOND) % 1440;
    if (cfg.mins < prevMins) cfg.dayCount++;
    
    const h = cfg.mins / 60;
    if (h >= 6 && h < 17) pre = PRE.day;
    else if (h >= 17 && h < 20) pre = PRE.sunset;
    else pre = PRE.night;
    if (typeof updateCelestialBodies === 'function') updateCelestialBodies(h);
  } else {
    pre = PRE[cfg.td];
    if (typeof updateCelestialBodies === 'function') updateCelestialBodies(cfg.mins / 60);
  }
  
  const hh = Math.floor(cfg.mins / 60);
  const mm = Math.floor(cfg.mins % 60);
  const txt = String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0');
  if (clkNode.innerText !== txt) clkNode.innerText = txt;
  const dayEl = $('day');
  if (dayEl && dayEl.innerText != cfg.dayCount) dayEl.innerText = cfg.dayCount;
  
  const hour = cfg.mins / 60;
  const isNight = (hour >= 20 || hour < 6);
  const isDay = !isNight && hour >= 6;
  
  moonPhaseTimer += dt;
  if (moonPhaseTimer > 12 * 60) {
    moonPhaseTimer = 0;
    moonPhase = (moonPhase + 1) % 8;
    if (typeof updateMoonPhase === 'function') updateMoonPhase();
  }
  
  // Ticks de mundo
  tickLight(dt);
  if (typeof tickFireflies === 'function') tickFireflies(elapsed, isNight);
  tickMoisturePatches(dt);
  if (typeof tickWetSpots === 'function') tickWetSpots(dt);
  
  // Ticks del jugador (siempre tiempo real)
  tickSw(realDt);
  tickDrops(realDt);
  tickMove(realDt);
  if (typeof tickSunAnim === 'function') tickSunAnim(realDt);
  
  // Plantas
  const sunX = (typeof sun !== 'undefined' && sun.visible) ? sun.position.x : 0;
  const sunZ = (typeof sun !== 'undefined' && sun.visible) ? sun.position.z : 0;
  
  for (let i = 0; i < PL.length; i++) {
    const p = PL[i];
    if (p.stage === STAGE.MUERTA) continue;
    
    tickSunLean(p, sunX, sunZ, isDay && sunX !== 0);
    
    if (p.stage < STAGE.MADURO) {
      const effectiveSeconds = SECONDS_PER_STAGE / cfg.gm;
      p.timer += dt;
      if (p.timer > effectiveSeconds) {
        p.timer = 0;
        p.stage++;
        upd(p);
      }
    }
    
    if (p.stage >= STAGE.VEGETATIVO && p.stage < STAGE.COSECHADA) {
      if (p.chubaCount < CHUBA_MAX) {
        const chubaInterval = CHUBA_INTERVAL_BASE / cfg.gm;
        p.chubaTimer += dt;
        if (p.chubaTimer > chubaInterval) {
          p.chubaTimer = 0;
          spawnChuba(p);
        }
      }
    }
    
    for (const chuba of p.dryGroups) {
      if (!chuba.userData.rem && chuba.scale.x < 1) {
        const s = lp(chuba.scale.x, 1, 0.15);
        chuba.scale.set(s, s, s);
      }
    }
    
    if (p.stage === STAGE.MADURO) tryEmitCluster(p, dt);
    
    if (p.stage === STAGE.CORTADA) {
      p.suckerAge += dt * cfg.gm;
      if (!p.sucker && p.suckerAge > 8) growSuckerFromBase(p);
      if (p.sucker && p.suckerAge > 20) {
        p.sucker.visible = false;
        p.sucker = null;
        if (p.baseCormo) p.baseCormo.visible = false;
        p.stage = STAGE.COLINO;
        p.timer = 0;
        p.hasDry = false;
        p.score = 0;
        p.clusterHands = 0;
        p.chubaCount = 0;
        p.chubaTimer = 0;
        p.handsMeshes.forEach(m => p.clusterG.remove(m));
        p.handsMeshes = [];
        p.suckerAge = 0;
        upd(p);
      }
    }
  }
  
  if (isDay) {
    soilMoisture = cl(soilMoisture - dt * 0.008, 0, 1);
    updateFloorColor();
  }
  
  tickGhost();
  
  if (!cfg.gm2) {
    if (mf || ms) en = cl(en - realDt * 0.003, 0, 100);
    hy = cl(hy - realDt * 0.002 * (isDay ? 1.5 : 1), 0, 100);
    updHUD();
  }
  
  tickRaycast();
  rn.render(sc, cam);
}

requestAnimationFrame(loop);

addEventListener('resize', () => {
  cam.aspect = innerWidth / innerHeight;
  cam.updateProjectionMatrix();
  rn.setSize(innerWidth, innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden) last = performance.now();
});