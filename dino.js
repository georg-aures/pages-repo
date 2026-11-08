import { DinoRun, GROUND, HEIGHT } from './dino-engine.js';

const PAPER = '#e9e8dc';
const INK = '#444b3e';
const BEST_KEY = 'georg-arcade-dino-best';
const $ = id => document.getElementById(id);
const TREX = [[0,10],[2,10],[2,12],[4,12],[4,14],[6,14],[6,9],[8,9],[8,7],[12,7],[12,2],[14,0],[23,0],[24,1],[24,8],[18,8],[18,10],[22,10],[22,12],[17,12],[17,15],[15,15],[15,18],[13,18],[13,21],[9,21],[9,19],[6,19],[6,17],[4,17],[4,15],[2,15],[2,13],[0,13]];

function dinosaur(ctx, player, distance, dead) {
  ctx.save();
  ctx.translate(Math.round(player.x), Math.round(player.y));
  ctx.scale(2, 2);
  ctx.fillStyle = INK;
  const step = Math.floor(distance / 50) % 2;
  if (player.ducking) {
    ctx.fillRect(21, 0, 9, 8);ctx.fillRect(5, 5, 20, 6);
    ctx.fillRect(2, 3, 6, 5);ctx.fillRect(0, 0, 2, 6);
    ctx.fillRect(7, 10, 3, step ? 2 : 4);ctx.fillRect(16, 10, 3, step ? 4 : 2);
    ctx.fillStyle = PAPER;ctx.fillRect(27, 2, 1, 1);ctx.fillRect(25, 6, 5, 1);
  } else {
    ctx.beginPath();
    TREX.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();ctx.fill();
    ctx.fillRect(7, 19, 3, step && player.grounded ? 3 : 5);
    ctx.fillRect(13, 18, 3, !step && player.grounded ? 4 : 6);
    ctx.fillRect(7, step && player.grounded ? 21 : 23, 5, 1);
    ctx.fillRect(13, !step && player.grounded ? 21 : 23, 5, 1);
    ctx.fillStyle = PAPER;
    ctx.fillRect(20, 2, 1, 1);ctx.fillRect(18, 7, 6, 1);
    if (dead) {
      ctx.fillRect(19, 1, 1, 1);ctx.fillRect(21, 1, 1, 1);
      ctx.fillRect(20, 2, 1, 1);ctx.fillRect(19, 3, 1, 1);ctx.fillRect(21, 3, 1, 1);
    }
  }
  ctx.restore();
}

function obstacle(ctx, item, elapsed) {
  const x = Math.round(item.x), y = Math.round(item.y);
  ctx.fillStyle = INK;
  if (item.type === 'bird') {
    ctx.fillRect(x + 10, y + 9, 25, 12);ctx.fillRect(x + 4, y + 4, 10, 13);
    ctx.fillRect(x, y + 10, 7, 4);ctx.fillRect(x + 33, y + 13, 10, 4);
    const flap = Math.floor(elapsed * 8) % 2;
    ctx.fillRect(x + 18, y + (flap ? 17 : 0), 8, 12);
    ctx.fillRect(x + 24, y + (flap ? 23 : -4), 5, 7);
    ctx.fillStyle = PAPER;ctx.fillRect(x + 7, y + 7, 2, 2);
    return;
  }
  for (let i = 0; i < item.count; i++) {
    const X = x + i * 24, h = item.height;
    ctx.fillRect(X + 8, y, 8, h);
    ctx.fillRect(X + 2, y + h * 0.32, 5, h * 0.3);
    ctx.fillRect(X + 2, y + h * 0.55, 12, 5);
    ctx.fillRect(X + 18, y + h * 0.2, 5, h * 0.33);
    ctx.fillRect(X + 12, y + h * 0.47, 11, 5);
  }
}

export function renderDino(ctx, model, preview = false) {
  const width = model.width;
  ctx.fillStyle = PAPER;ctx.fillRect(0, 0, width, HEIGHT);
  ctx.strokeStyle = '#c9ccba';ctx.lineWidth = 2;
  ctx.beginPath();ctx.arc(width - 95, 72, 20, 0, Math.PI * 2);ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const x = ((150 + i * 280 - model.distance * 0.13) % (width + 200) + width + 200) % (width + 200) - 70;
    const y = 72 + (i % 3) * 32;
    ctx.beginPath();ctx.moveTo(x, y + 12);ctx.lineTo(x + 14, y + 12);ctx.lineTo(x + 14, y + 5);ctx.lineTo(x + 24, y + 5);ctx.lineTo(x + 24, y);ctx.lineTo(x + 38, y);ctx.lineTo(x + 38, y + 7);ctx.lineTo(x + 49, y + 7);ctx.lineTo(x + 49, y + 12);ctx.lineTo(x + 62, y + 12);ctx.stroke();
  }
  ctx.strokeStyle = '#bdc2aa';ctx.lineWidth = 1;
  ctx.beginPath();ctx.moveTo(0, GROUND - 1);
  for (let x = 0; x <= width; x += 5) ctx.lineTo(x, GROUND - 7 - Math.sin((x + model.distance * 0.08) / 110) * 8);
  ctx.stroke();
  ctx.fillStyle = INK;ctx.fillRect(0, GROUND, width, 2);
  ctx.fillStyle = '#a6ad95';
  for (let i = 0; i < width / 52 + 2; i++) {
    const x = i * 52 - model.distance % 52;
    ctx.fillRect(x, GROUND + 12 + i % 3 * 6, i % 2 ? 5 : 12, 2);
  }
  model.obstacles.forEach(item => obstacle(ctx, item, model.elapsed));
  dinosaur(ctx, model.player, model.distance, model.state === 'game-over');
  if (model.state === 'ready' && !preview) {
    ctx.textAlign = 'center';ctx.fillStyle = INK;
    ctx.font = `bold ${width < 700 ? 20 : 23}px monospace`;
    ctx.fillText('READY, LITTLE RUNNER?', width * 0.58, 152);
    ctx.font = '12px monospace';ctx.fillStyle = '#747e65';
    ctx.fillText('SPACE / UP / TAP TO START', width * 0.58, 180);
  }
}

export function drawDinoPreview(canvas) {
  const model = new DinoRun();
  model.distance = 180;
  model.elapsed = 2;
  model.player.x = 160;
  model.obstacles = [
    { type: 'cactus', x: 490, y: GROUND - 64, width: 24, height: 64, count: 1 },
    { type: 'cactus', x: 760, y: GROUND - 44, width: 48, height: 44, count: 2 },
  ];
  renderDino(canvas.getContext('2d'), model, true);
}

export class DinoController {
  constructor({ sound, unlockAudio }) {
    this.sound = sound;
    this.unlockAudio = unlockAudio;
    this.board = $('dino-board');
    this.ctx = this.board.getContext('2d');
    this.active = false;
    this.best = 0;
    this.duckSources = new Set();
    try { this.best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0); } catch {}
    $('dino-back-button').addEventListener('click', () => { location.hash = ''; });
    $('dino-pause-button').addEventListener('click', () => this.togglePause());
    $('dino-auto-button').addEventListener('click', () => this.toggleAuto());
    $('dino-restart-button').addEventListener('click', () => this.restart());
    $('dino-overlay-button').addEventListener('click', () => {
      if (this.model.state === 'game-over') this.restart(true);
      else this.togglePause();
    });
    for (const element of [this.board, $('dino-jump-button')]) {
      element.addEventListener('pointerdown', event => {
        if (!this.active || event.button !== 0 || this.model.paused) return;
        event.preventDefault();element.setPointerCapture(event.pointerId);
        this.jump();
      });
      const release = () => { if (this.active) this.model.releaseJump(); };
      element.addEventListener('pointerup', release);
      element.addEventListener('pointercancel', release);
    }
    $('dino-jump-button').addEventListener('click', event => { if (event.detail === 0) this.jump(); });
    const duckButton = $('dino-duck-button');
    duckButton.addEventListener('pointerdown', event => {
      if (!this.active || event.button !== 0 || this.model.paused) return;
      event.preventDefault();duckButton.setPointerCapture(event.pointerId);
      this.setDuck('pointer', true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) duckButton.addEventListener(type, () => this.setDuck('pointer', false));
    duckButton.addEventListener('click', event => { if (event.detail === 0) this.setDuck('button', !this.duckSources.has('button')); });
    document.addEventListener('keydown', event => this.keydown(event));
    document.addEventListener('keyup', event => {
      if (!this.active) return;
      const k = event.key.toLowerCase();
      if ([' ', 'arrowup', 'w'].includes(k)) this.model.releaseJump();
      if (['arrowdown', 's'].includes(k)) this.setDuck(k, false);
    });
    window.addEventListener('blur', () => this.pauseWhenAway());
    document.addEventListener('visibilitychange', () => { if (document.hidden) this.pauseWhenAway(); this.lastTime = 0; });
  }

  start() {
    this.active = true;
    this.model = new DinoRun({ width: window.innerWidth <= 650 ? 600 : 960 });
    this.board.width = this.model.width;
    this.board.height = HEIGHT;
    this.lastTime = 0;
    this.overlayMode = undefined;
    this.duckSources.clear();
    $('dino-screen').hidden = false;
    document.body.classList.add('game-active', 'dino-active');
    document.title = "Dino Run — Georg's Arcade";
    this.updateHud();
    renderDino(this.ctx, this.model);
    window.scrollTo({ top: 0, behavior: 'instant' });
    this.board.focus({ preventScroll: true });
    this.unlockAudio();
  }

  stop() {
    this.active = false;
    this.duckSources.clear();
    $('dino-screen').hidden = true;
    document.body.classList.remove('dino-active');
  }

  restart(run = false) {
    const auto = this.model.autoMode;
    this.model.reset();
    this.duckSources.clear();
    this.overlayMode = undefined;
    this.lastTime = 0;
    if (auto) this.model.setAutoMode(true);
    else if (run) this.model.jump();
    this.updateHud();
    this.board.focus({ preventScroll: true });
  }

  jump() {
    if (!this.active || this.model.autoMode) return;
    this.unlockAudio();
    if (this.model.state === 'game-over') this.restart(true);
    else this.model.jump();
    this.updateHud();
  }

  setDuck(source, held) {
    if (!this.active || this.model.autoMode) return;
    if (held) this.duckSources.add(source);
    else this.duckSources.delete(source);
    this.model.duck(this.duckSources.size > 0);
  }

  toggleAuto() {
    if (!this.active) return;
    this.duckSources.clear();
    this.model.setAutoMode(!this.model.autoMode);
    this.unlockAudio();
    this.updateHud();
  }

  togglePause() {
    if (!this.active || this.model.state !== 'playing') return;
    this.duckSources.clear();this.model.duck(false);this.model.releaseJump();
    this.model.togglePause();
    this.updateHud();
    if (!this.model.paused) this.board.focus({ preventScroll: true });
  }

  pauseWhenAway() {
    if (this.active && !this.model.paused && this.model.state === 'playing') this.togglePause();
  }

  keydown(event) {
    if (!this.active || event.altKey || event.ctrlKey || event.metaKey) return;
    const k = event.key.toLowerCase();
    if ([' ', 'arrowup', 'w'].includes(k)) {
      if (k === ' ' && event.target.closest('button,a')) return;
      event.preventDefault();
      if (!event.repeat) this.jump();
    } else if (['arrowdown', 's'].includes(k)) { event.preventDefault();this.setDuck(k, true); }
    else if (k === 'p' && !event.repeat) { event.preventDefault();this.togglePause(); }
    else if ((k === 'enter' || k === 'r') && !event.repeat && !event.target.closest('button,a')) { event.preventDefault();this.restart(true); }
    else if (k === 'escape') location.hash = '';
  }

  showOverlay(mode) {
    if (this.overlayMode === mode) return;
    this.overlayMode = mode;
    $('dino-overlay').hidden = !mode;
    if (!mode) return;
    const over = mode === 'over';
    $('dino-overlay-kicker').textContent = over ? 'A LITTLE FURTHER NEXT TIME' : 'CATCH YOUR BREATH';
    $('dino-overlay-title').textContent = over ? 'Nice run.' : 'Paused';
    $('dino-overlay-description').textContent = over ? `${this.model.score.toLocaleString()} points. There’s another adventure a little leap away.` : 'The desert isn’t going anywhere.';
    $('dino-overlay-button').firstChild.nodeValue = over ? 'Run again ' : 'Keep running ';
    $('dino-overlay-button').focus({ preventScroll: true });
  }

  updateHud() {
    const model = this.model;
    if (model.score > this.best) {
      this.best = model.score;
      try { localStorage.setItem(BEST_KEY, String(this.best)); } catch {}
    }
    $('dino-score').textContent = String(model.score).padStart(6, '0');
    $('dino-best').textContent = String(this.best).padStart(6, '0');
    $('dino-speed').textContent = `${(model.speed / 320).toFixed(1)}×`;
    const status = model.paused ? 'Paused' : model.autoMode ? 'Auto mode · perfect run' : model.state === 'ready' ? 'Ready when you are' : model.state === 'game-over' ? 'A good run. Another try?' : 'Keep those little legs moving';
    if ($('dino-status').textContent !== status) $('dino-status').textContent = status;
    $('dino-pause-button').disabled = model.state !== 'playing';
    $('dino-pause-button').querySelector('span').textContent = model.paused ? 'Resume' : 'Pause';
    $('dino-auto-button').setAttribute('aria-pressed', String(model.autoMode));
    $('dino-auto-button').textContent = model.autoMode ? 'Auto on' : 'Auto';
    $('dino-auto-button').title = model.autoMode ? 'Turn off auto mode and play manually' : 'Start a perfect automatic run';
    $('dino-jump-button').disabled = model.paused || model.autoMode;
    $('dino-jump-button').firstChild.nodeValue = model.state === 'game-over' ? 'Run again ' : 'Jump ';
    $('dino-duck-button').disabled = model.paused || model.autoMode || model.state !== 'playing';
    $('dino-duck-button').setAttribute('aria-pressed', String(model.player.ducking));
    this.showOverlay(model.state === 'game-over' ? 'over' : model.paused ? 'paused' : null);
  }

  frame(time) {
    if (!this.active) return;
    const dt = this.lastTime ? Math.min((time - this.lastTime) / 1000, 0.05) : 0;
    this.lastTime = time;
    this.model.update(dt);
    this.model.drainEvents().forEach(this.sound);
    this.updateHud();
    renderDino(this.ctx, this.model);
  }
}
