import { BoroughGame, VEHICLES } from './borough-engine.js?v=2';
import { BoroughRenderer, drawGarageVehicle, drawBoroughPreview } from './borough-renderer.js?v=2';
const $ = id => document.getElementById(id);
const formatTime = seconds => { const n = Math.max(0, Math.ceil(seconds)); return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`; };
const setText = (id, value) => { const el = $(id); if (el.textContent !== String(value)) el.textContent = value; };
const RECORD_KEY = 'georg-arcade-borough-v1';
const controls = '<span><kbd>W</kbd> accelerate</span><span><kbd>S</kbd> brake / reverse</span><span><kbd>A</kbd><kbd>D</kbd> steer</span><span><kbd>SPACE</kbd> handbrake</span><span><kbd>E</kbd> action</span><span><kbd>M</kbd> map</span><span><kbd>P</kbd> pause</span>';
export class BoroughController {
  constructor({ sound = () => {}, unlockAudio = () => {} } = {}) {
    this.sound = sound; this.unlockAudio = unlockAudio; this.active = false; this.game = null; this.selected = 'taxi'; this.free = false;
    this.sources = new Map(); this.lastTime = 0; this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.records = {}; this.storageOK = true;
    try { const data = JSON.parse(localStorage.getItem(RECORD_KEY) || '{}'); if (data && typeof data === 'object') for (const mode of Object.keys(VEHICLES)) if (Number.isFinite(data[mode]?.score)) this.records[mode] = { score: Math.max(0, data[mode].score), rating: ['GOLD', 'SILVER', 'BRONZE', 'ROOKIE'].includes(data[mode].rating) ? data[mode].rating : 'ROOKIE' }; }
    catch { this.storageOK = false; }
    $('borough-screen').innerHTML = `
      <div class="game-heading"><button id="borough-back" class="text-button">← All games</button><span class="eyebrow">NO. 004 / THE CITY IS YOUR PLAYGROUND</span></div>
      <div id="borough-garage">
        <div class="br-hero"><div class="br-hero-copy"><span class="br-kicker">CROWN CITY / EST. 1997</span><h1 id="borough-title">BOROUGH<br><em>RUSH.</em></h1><p>Six sets of keys.<br>One city that never slows down.</p><div class="br-edition"><span>↗</span><div>TAKE THE LONG WAY HOME<small>A TOP-DOWN DRIVING ARCADE</small></div></div></div><div class="br-city-card"><div class="br-map-heading"><span>CROWN CITY TRANSIT AUTHORITY</span><span>MAP / 01</span></div><canvas id="borough-garage-map" width="800" height="600" aria-label="Fixed Crown City street map: central Crown Island, West Docks and East Boroughs connected by six bridges."></canvas><div class="br-map-caption"><span>3 DISTRICTS · 6 BRIDGES · YOUR SHORTCUTS</span><span>N ↑</span></div></div></div>
        <div class="br-selection-heading"><div><span class="br-kicker">01 / PICK YOUR KEYS</span><h2>What's your hurry?</h2></div><div class="br-duty" role="group" aria-label="Game mode"><button id="borough-duty" aria-pressed="true">On duty</button><button id="borough-free" aria-pressed="false">Free Drive</button></div></div>
        <div class="br-vehicles" role="group" aria-label="Choose a vehicle">${Object.entries(VEHICLES).map(([mode, v]) => `<button class="br-vehicle" data-br-vehicle="${mode}" aria-pressed="${mode === this.selected}" style="--vehicle-color:${v.color}"><div class="br-vehicle-top"><span>${v.icon} / ${v.vehicle.toUpperCase()}</span><span class="br-selected-mark" aria-hidden="true">↗</span></div><canvas data-br-preview="${mode}" width="280" height="106" aria-hidden="true"></canvas><h3>${v.name}</h3><p>${v.tag}</p><span class="br-record" data-br-record="${mode}">NO SHIFTS LOGGED</span></button>`).join('')}</div>
        <div class="br-launch"><div><span id="borough-selected-tag" class="br-kicker"></span><h3 id="borough-selected-name"></h3><p id="borough-selected-goal"></p></div><button id="borough-start" class="br-primary">Take the wheel <span>↗</span></button></div>
        <div class="br-garage-foot"><span>WASD + MOUSE / TOUCH CONTROLS INCLUDED</span><span id="borough-save-note">Personal records saved in this browser.</span></div>
      </div>
      <div id="borough-play" hidden>
        <div class="br-play-heading"><div><span class="br-kicker">BOROUGH RUSH / CROWN CITY</span><h2 id="borough-role"></h2></div><div class="br-tools"><button id="borough-map-button" class="br-tool">Map <kbd>M</kbd></button><button id="borough-help-button" class="br-tool" aria-label="How to play">?</button><button id="borough-pause-button" class="br-tool">Pause <kbd>P</kbd></button><button class="icon-button" id="borough-sound" data-sound-toggle aria-label="Turn sound on" aria-pressed="false" title="Turn sound on"><svg class="control-icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M8 14V5l8-2v9M8 7l8-2"/><ellipse cx="5.5" cy="14.5" rx="2.5" ry="2"/><ellipse cx="13.5" cy="12.5" rx="2.5" ry="2"/></svg><span class="sound-off">/</span></button></div></div>
        <div class="br-stage"><canvas id="borough-board" width="1100" height="680" tabindex="0" role="application" aria-label="Borough Rush city driving. W accelerates, S brakes and reverses, A and D steer. E performs a job action. M opens the map. P pauses." aria-describedby="borough-control-help">Canvas support is required to drive.</canvas><div class="br-hud"><div class="br-mission"><span id="borough-objective" role="status" aria-live="polite"></span><strong id="borough-context"></strong><div class="br-progress"><i id="borough-progress"></i></div></div><div class="br-hud-numbers"><div><span id="borough-clock-label">SHIFT</span><strong id="borough-clock">6:00</strong></div><div><span>SCORE</span><strong id="borough-score">00000</strong></div></div></div><div id="borough-dispatch" class="br-dispatch" role="status" aria-live="polite"></div></div>
        <div class="br-touch" aria-label="Touch driving controls"><div><button data-br-key="left" aria-label="Steer left">←</button><button data-br-key="right" aria-label="Steer right">→</button></div><button id="borough-touch-action" class="br-action">ACTION</button><div><button data-br-key="back" class="br-brake" aria-label="Brake and reverse">BRAKE</button><button data-br-key="forward" class="br-gas" aria-label="Accelerate">GAS ↑</button></div></div>
        <div id="borough-control-help" class="br-keyboard">${controls}</div><p class="br-touch-hint">Hold steering and gas together. At a job, stop and tap Action. For fires, connect the hose, then drag on the flames to spray.</p>
      </div>
      <dialog id="borough-dialog" class="br-dialog" aria-labelledby="borough-dialog-title"></dialog>`;
    this.renderer = new BoroughRenderer($('borough-board')); this.dialog = $('borough-dialog');
    this.renderer.fullMap($('borough-garage-map'), { player: { x: 1518, y: 2450, angle: -Math.PI / 2 }, pursuers: [], free: true });
    document.querySelectorAll('[data-br-preview]').forEach(canvas => drawGarageVehicle(canvas, canvas.dataset.brPreview));
    if ($('borough-preview')) drawBoroughPreview($('borough-preview'));
    this.updateSelection(); this.refreshRecords(); this.bind();
  }
  bind() {
    $('borough-back').addEventListener('click', () => { location.hash = ''; });
    $('borough-start').addEventListener('click', () => this.startRun());
    document.querySelectorAll('[data-br-vehicle]').forEach(button => button.addEventListener('click', () => { this.selected = button.dataset.brVehicle; this.updateSelection(); }));
    $('borough-duty').addEventListener('click', () => { this.free = false; this.updateSelection(); });
    $('borough-free').addEventListener('click', () => { this.free = true; this.updateSelection(); });
    $('borough-pause-button').addEventListener('click', () => this.pause());
    $('borough-map-button').addEventListener('click', () => this.openMap());
    $('borough-help-button').addEventListener('click', () => this.brief(false));
    this.dialog.addEventListener('cancel', event => { event.preventDefault(); if (this.game?.state === 'results') this.garage(); else this.resume(); });
    this.dialog.addEventListener('click', event => {
      const button = event.target.closest('[data-br-dialog]'); if (!button) return;
      const action = button.dataset.brDialog;
      if (action === 'resume') this.resume();
      if (action === 'garage') this.garage();
      if (action === 'retry') this.startRun();
      if (action === 'end-route') { this.game.finish(true, 'Collection report'); this.results(); }
      if (action === 'rescue') { this.game.rescue(); this.resume(); }
      if (action === 'switch') { this.game.changeVehicle(button.dataset.mode); this.selected = this.game.mode; setText('borough-role', this.game.spec.name); this.resume(); }
    });
    document.addEventListener('keydown', e => {
      if (!this.active || e.ctrlKey || e.metaKey || e.altKey) return;
      const key = e.key.toLowerCase();
      if (!this.game) { if (key === 'escape') location.hash = ''; return; }
      if (this.dialog.open) { if ((key === 'p' || key === 'm') && this.game.state === 'playing') { e.preventDefault(); this.resume(); } return; }
      const inputs = { w: 'forward', arrowup: 'forward', s: 'back', arrowdown: 'back', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right', ' ': 'handbrake' };
      if (inputs[key]) {
        if (key === ' ' && e.target.closest('button,a')) return;
        e.preventDefault(); this.sources.set(`key:${key}`, inputs[key]); this.unlockAudio();
      } else if (!e.repeat) {
        if (key === 'e') { e.preventDefault(); this.game.action(); this.unlockAudio(); }
        if (key === 'p' || key === 'escape') { e.preventDefault(); this.pause(); }
        if (key === 'm') { e.preventDefault(); this.openMap(); }
        if (key === 'r') { e.preventDefault(); this.game.rescue(); }
      }
    });
    document.addEventListener('keyup', e => this.sources.delete(`key:${e.key.toLowerCase()}`));
    document.querySelectorAll('[data-br-key]').forEach(button => {
      button.addEventListener('pointerdown', e => { if (!this.active || !this.game || this.game.paused) return; e.preventDefault(); button.setPointerCapture(e.pointerId); this.sources.set(`touch:${e.pointerId}`, button.dataset.brKey); button.classList.add('is-held'); this.unlockAudio(); });
      const release = e => { this.sources.delete(`touch:${e.pointerId}`); button.classList.remove('is-held'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release); button.addEventListener('lostpointercapture', release);
    });
    $('borough-touch-action').addEventListener('click', () => { this.game?.action(); this.unlockAudio(); });
    const board = $('borough-board');
    const aim = e => { if (this.game) this.aim = this.renderer.world(e.clientX, e.clientY); };
    board.addEventListener('pointerdown', e => { if (!this.active || !this.game || this.game.paused) return; e.preventDefault(); board.focus({ preventScroll: true }); board.setPointerCapture(e.pointerId); aim(e); this.sprayPointer = e.pointerId; this.unlockAudio(); });
    board.addEventListener('pointermove', aim);
    const releaseSpray = e => { if (e.pointerId === this.sprayPointer) this.sprayPointer = null; };
    board.addEventListener('pointerup', releaseSpray); board.addEventListener('pointercancel', releaseSpray); board.addEventListener('lostpointercapture', releaseSpray);
    window.addEventListener('blur', () => this.away());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.away(); this.lastTime = 0; });
  }
  clearInput() { this.sources.clear(); this.sprayPointer = null; document.querySelectorAll('.br-touch .is-held').forEach(el => el.classList.remove('is-held')); }
  away() { this.clearInput(); if (this.active && this.game?.state === 'playing' && !this.game.paused) this.pause(); }
  updateSelection() {
    document.querySelectorAll('[data-br-vehicle]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.brVehicle === this.selected)));
    $('borough-duty').setAttribute('aria-pressed', String(!this.free)); $('borough-free').setAttribute('aria-pressed', String(this.free));
    const spec = VEHICLES[this.selected]; setText('borough-selected-tag', this.free ? 'OFF DUTY / NO CLOCK. NO PRESSURE.' : spec.tag);
    setText('borough-selected-name', this.free ? `Free Drive · ${spec.vehicle}` : spec.name);
    setText('borough-selected-goal', this.free ? 'Explore every borough. Switch between all six vehicles from Pause.' : spec.goal);
  }
  refreshRecords() {
    document.querySelectorAll('[data-br-record]').forEach(el => { const record = this.records[el.dataset.brRecord]; el.textContent = record ? `${record.rating} / BEST ${record.score.toLocaleString()}` : 'NO SHIFTS LOGGED'; });
    setText('borough-save-note', this.storageOK ? 'Personal records saved in this browser.' : 'Storage unavailable. Records last for this visit.');
  }
  start() {
    this.active = true; $('borough-screen').hidden = false; document.body.classList.add('game-active');
    document.title = "Borough Rush — Georg's Arcade"; this.garage(); window.scrollTo({ top: 0, behavior: 'instant' });
  }
  stop() { this.active = false; this.game = null; this.clearInput(); this.lastTime = 0; this.closeDialog(); $('borough-screen').hidden = true; }
  closeDialog() { if (this.dialog.open) this.dialog.close(); }
  garage() {
    this.closeDialog(); this.game = null; this.clearInput(); this.lastTime = 0;
    $('borough-garage').hidden = false; $('borough-play').hidden = true; this.refreshRecords(); this.updateSelection();
    document.querySelector(`[data-br-vehicle="${this.selected}"]`).focus({ preventScroll: true });
  }
  startRun() {
    this.closeDialog(); this.clearInput(); this.handledResults = false;
    this.game = new BoroughGame(this.selected, { free: this.free }); this.renderer.camera = { x: this.game.player.x, y: this.game.player.y };
    this.renderer.pathKey = ''; this.renderer.path = []; this.lastTime = 0; this.hudTime = 0;
    $('borough-garage').hidden = true; $('borough-play').hidden = false; setText('borough-role', this.game.spec.name);
    this.renderer.render(this.game, 1, this.reduced); this.updateHUD(); this.brief(true); this.unlockAudio();
  }
  showDialog(html) { this.clearInput(); this.game.paused = true; this.dialog.innerHTML = html; if (!this.dialog.open) this.dialog.showModal(); this.lastTime = 0; }
  brief(start) {
    if (!this.game) return;
    const g = this.game, v = g.spec;
    this.showDialog(`<span class="br-kicker">${g.free ? 'OFF DUTY' : v.tag}</span><h2 id="borough-dialog-title">${g.free ? 'The city is yours.' : v.name + '.'}</h2><canvas id="borough-brief-car" width="280" height="106" aria-hidden="true"></canvas><p>${g.free ? 'No clock, no jobs. Learn the shortcuts, find your favorite bridge, and switch vehicles from Pause.' : v.goal}</p><p class="br-dialog-note">${g.free ? 'WASD to drive. Space for the handbrake. M opens the city map.' : v.instruction}</p>${g.mode === 'fire' && !g.free ? '<p class="br-dialog-note">Mouse: aim and hold to spray. Touch: drag over the flames. Stay parked near the hydrant and sweep the stream across every hotspot.</p>' : ''}<div class="br-dialog-controls">${controls}</div><button class="br-primary" data-br-dialog="resume">${start ? 'Let’s drive' : 'Back to the city'} <span>↗</span></button>`);
    drawGarageVehicle($('borough-brief-car'), g.mode);
  }
  resume() { this.closeDialog(); if (this.game) this.game.paused = false; this.clearInput(); this.lastTime = 0; $('borough-board').focus({ preventScroll: true }); }
  pause() {
    if (!this.game || this.game.state !== 'playing') return;
    this.showDialog(`<span class="br-kicker">THE CITY CAN WAIT</span><h2 id="borough-dialog-title">Taking a breather.</h2><p>${this.game.free ? 'Change your ride or keep exploring.' : 'Your mission clock is paused.'}</p><button class="br-primary" data-br-dialog="resume">Back to the city <span>↗</span></button>${this.game.free ? `<div class="br-switch">${Object.entries(VEHICLES).map(([mode, v]) => `<button data-br-dialog="switch" data-mode="${mode}">${v.vehicle}</button>`).join('')}</div>` : ''}<div class="br-dialog-actions">${this.game.mode === 'garbage' && !this.game.free ? '<button data-br-dialog="end-route">Finish collection shift</button>' : ''}<button data-br-dialog="rescue">Roadside assist (−50)</button><button data-br-dialog="garage">Choose another vehicle</button></div>`);
  }
  openMap() {
    if (!this.game || this.game.state !== 'playing') return;
    this.showDialog('<span class="br-kicker">CROWN CITY / STREET ATLAS</span><h2 id="borough-dialog-title">Know your way.</h2><canvas id="borough-full-map" width="800" height="610" aria-label="City map. Your car is a white arrow, the job marker is yellow, police are blue, and the robber is red."></canvas><p class="br-dialog-note">WHITE / YOU · YELLOW / JOB + ROUTE · BLUE / POLICE · RED / ROBBER</p><button class="br-primary" data-br-dialog="resume">Back to the city <span>↗</span></button>');
    const map = $('borough-full-map');
    this.renderer.fullMap(map, this.game);
    if(this.game.garbageSites){
      const label=document.createElement('label'); label.className='br-route-picker'; label.textContent='Next collection point (any order)';
      const select=document.createElement('select');select.id='borough-collection-select';
      for(const site of this.game.garbageSites.filter(s=>!s.collected)){const option=document.createElement('option');option.value=site.id;option.textContent=`${String(site.id+1).padStart(2,'0')} / ${site.name}`;select.append(option);}
      select.value=String(this.game.target.id);label.append(select);map.after(label);
      const choose=id=>{if(this.game.selectGarbageSite(Number(id))){select.value=String(id);this.renderer.fullMap(map,this.game);this.updateHUD();}};
      select.addEventListener('change',()=>choose(select.value));
      map.setAttribute('aria-label','Garbage collection planner. Yellow squares are remaining bins. Use the collection point selector or click a square to choose your next stop.');
      map.addEventListener('click',event=>{const p=this.renderer.mapWorld(map,event.clientX,event.clientY);const site=this.game.garbageSites.filter(s=>!s.collected).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y))[0];if(site&&Math.hypot(site.x-p.x,site.y-p.y)<180)choose(site.id);});
    }
  }
  results() {
    const g = this.game; this.handledResults = true;
    if (!g.free && (!this.records[g.mode] || g.score > this.records[g.mode].score)) {
      this.records[g.mode] = { score: g.score, rating: g.rating };
      try { localStorage.setItem(RECORD_KEY, JSON.stringify(this.records)); } catch { this.storageOK = false; }
    }
    const detail = g.mode === 'bus' ? `${g.stats.passengers} passengers carried` : g.mode === 'garbage' ? `${g.stats.bins}/${g.garbageSites.length*3} bins collected · ${g.completed}/${g.garbageSites.length} stops cleared` : g.mode === 'taxi' ? `${g.stats.fares} fares delivered` : g.mode === 'fire' ? `${g.completed} fires contained · ${g.failed} incidents timed out` : g.success ? 'Pursuit complete' : 'Try a different route next time';
    this.showDialog(`<span class="br-kicker">SHIFT REPORT / ${g.rating}</span><h2 id="borough-dialog-title">${g.resultTitle}.</h2><div class="br-result-score">${g.score.toLocaleString()}<span>POINTS</span></div><p>${detail}</p><div class="br-result-stats"><div><strong>${g.late}</strong><span>LATE STOPS</span></div><div><strong>${g.bumps}</strong><span>BUMPS</span></div><div><strong>${formatTime(g.time)}</strong><span>ON THE ROAD</span></div></div><button class="br-primary" data-br-dialog="retry">Another round <span>↗</span></button><div class="br-dialog-actions"><button data-br-dialog="garage">Choose another vehicle</button></div>`);
  }
  updateHUD() {
    const g = this.game; if (!g) return;
    setText('borough-objective', g.objective); setText('borough-score', String(g.score).padStart(5, '0'));
    setText('borough-clock-label', g.free ? 'OFF DUTY' : g.mode === 'garbage' ? 'BONUS' : ['escape', 'police'].includes(g.mode) ? 'PURSUIT' : 'SHIFT');
    setText('borough-clock', g.free ? '∞' : g.remaining < 0 ? '+' + formatTime(-g.remaining) : formatTime(g.remaining));
    let context = '', progress = 0;
    if (g.free) context = 'P / Pause to change vehicles';
    else if (g.mode === 'escape') { const left=Math.max(0,g.searchDuration-g.escapeHidden,25-g.time);context=g.capture>.2?`BOXED IN / ${formatTime(4-g.capture)} to escape`:g.escapeHidden<.1?'IN SIGHT / Police are sharing your location':`SEARCH / Stay hidden ${formatTime(left)}`;progress=g.capture>.2?g.capture/4:g.escapeHidden/(g.escapeHidden+left); }
    else if (g.mode === 'police') { context = g.robber.surrendering ? `ROBBER YIELDING / Brake and stop nearby · ${Math.round(g.capture/2*100)}%` : g.capture>.1 ? `SURRENDER / ${Math.round(g.capture/2*100)}%` : !g.siren ? 'E / Switch ON your siren to make the robber yield' : `FOLLOW CLOSELY / ${Math.round(g.compliance/6*100)}% · Stay inside the red ring`;progress=g.robber.surrendering?g.capture/2:g.compliance/6; }
    else if (g.service) { progress = Math.min(1, g.service.elapsed / g.service.duration); context = g.mode === 'bus' && progress === 1 && g.time < g.deadline ? `BOARDING COMPLETE / Depart in ${formatTime(g.deadline - g.time)}` : `KEEP STILL / ${Math.round(progress * 100)}%`; }
    else if (g.mode === 'fire' && g.hose) { context = `AIM + HOLD / Incident ${formatTime(g.deadline - g.time)}`; progress = 1 - g.hotspots.reduce((s, f) => s + f.heat, 0) / g.hotspots.length; }
    else if(g.mode==='garbage') {const near=g.garbageSites.some(s=>!s.collected&&Math.hypot(s.x-g.player.x,s.y-g.player.y)<70);context=near?'NEARBY BINS / Align, stop and press E to collect':`${g.target.name} · ${g.stopStatus().text} · M plans your route`;progress=g.completed/g.garbageSites.length;}
    else { const left = g.deadline - g.time; context = `${g.stopStatus().text} · ${left >= 0 ? 'DUE ' + formatTime(left) : 'LATE +' + formatTime(-left)}`; }
    setText('borough-context', context); $('borough-progress').style.width = `${Math.max(0, Math.min(100, progress * 100))}%`;
    $('borough-dispatch').hidden = g.noticeTime <= 0; if (g.noticeTime > 0) setText('borough-dispatch', g.notice);
    setText('borough-touch-action', g.mode === 'fire' ? g.hose ? 'UNHOOK' : 'CONNECT' : g.mode === 'police' ? 'SIREN' : 'ACTION');
  }
  frame(time) {
    if (!this.active || !this.game) { this.lastTime = 0; return; }
    const dt = this.lastTime ? Math.min(.05, (time - this.lastTime) / 1000) : 0; this.lastTime = time;
    const input = Object.fromEntries([...this.sources.values()].map(key => [key, true])); input.aim = this.aim; input.spray = this.sprayPointer != null;
    this.game.aim = this.aim; this.game.spraying = input.spray;
    this.game.update(dt, input);
    for (const event of this.game.drainEvents()) this.sound(({ bump: 'jump', job: 'fruit', success: 'level-clear', failure: 'death', connect: 'power', board: 'pellet' })[event]);
    if (!this.game.paused) this.renderer.render(this.game, Math.max(.016, dt), this.reduced);
    this.hudTime = (this.hudTime || 0) + dt;
    if (this.hudTime >= .1) { this.updateHUD(); this.hudTime = 0; }
    if (this.game.state === 'results' && !this.handledResults) { this.updateHUD(); this.results(); }
  }
}
