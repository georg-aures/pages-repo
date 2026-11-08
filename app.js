import { PacmanGame, MAZE, DIRECTIONS } from './engine.js';
import { DinoController, drawDinoPreview } from './dino.js';
import { WormController } from './worm.js';
import { BoroughController } from './borough.js?v=2';
import { drawWormPreview } from './worm-renderer.js';

const $ = id => document.getElementById(id);
const board = $('board');
const ctx = board.getContext('2d');
const TILE = 20;
const BEST_KEY = 'georg-arcade-pacman-best';
const SOUND_KEY = 'georg-arcade-sound';
let best = 0;
let soundEnabled = false;
try {
  best = Math.max(0, Number(localStorage.getItem(BEST_KEY)) || 0);
  soundEnabled = localStorage.getItem(SOUND_KEY) === 'true';
} catch { /* Gameplay also works with browser storage disabled. */ }

let game = null;
let active = false;
let lastTime = 0;
let audioContext;
let lastPelletSound = 0;
let overlayMode = null;
let previousLives = -1;
let lastGame = 'pacman';
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dino = new DinoController({ sound, unlockAudio });
const worm = new WormController({ sound, unlockAudio });
const borough = new BoroughController({ sound, unlockAudio });

function sound(event) {
  if (!soundEnabled || !audioContext || audioContext.state !== 'running') return;
  const now = audioContext.currentTime;
  if (event === 'pellet' && now - lastPelletSound < 0.09) return;
  if (event === 'pellet') lastPelletSound = now;
  const tones = {
    pellet: [260, 400, 0.055], power: [160, 720, 0.26], ghost: [400, 1000, 0.2],
    death: [350, 65, 0.65], fruit: [600, 1200, 0.2], 'extra-life': [520, 1040, 0.4],
    'level-clear': [400, 1200, 0.7],
    jump: [320, 760, 0.12], milestone: [650, 1000, 0.25],
    'worm-heart':[660,1320,.4], 'worm-treasure':[780,1050,.22], 'worm-key':[520,1100,.3],
    'worm-chest':[420,1400,.6], 'worm-relic':[640,1560,.6], 'worm-door':[280,880,.45],
    'worm-push':[130,95,.1], 'worm-sanctuary':[440,880,.45], 'worm-rescue':[380,540,.35], 'worm-zone':[330,990,.6],
  };
  if (!tones[event]) return;
  const [start, end, duration] = tones[event];
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(start, now);
  oscillator.frequency.exponentialRampToValueAtTime(end, now + duration);
  gain.gain.setValueAtTime(0.045, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

function unlockAudio() {
  if (!soundEnabled) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    audioContext.resume().catch(() => {});
  } catch { /* Sound is optional. */ }
}

function updateSoundButton() {
  document.querySelectorAll('[data-sound-toggle]').forEach(button => {
    const label = button.dataset.soundLang === 'de' ? `Ton ${soundEnabled ? 'ausschalten' : 'einschalten'}` : `Turn sound ${soundEnabled ? 'off' : 'on'}`;
    button.setAttribute('aria-pressed', String(soundEnabled));
    button.setAttribute('aria-label', label);
    button.title = label;
    button.querySelector('.sound-off').hidden = soundEnabled;
  });
}

// Cache the maze because its walls never change during a game.
const mazeCanvas = document.createElement('canvas');
mazeCanvas.width = board.width;
mazeCanvas.height = board.height;
const mazeCtx = mazeCanvas.getContext('2d');
mazeCtx.fillStyle = '#06070b';
mazeCtx.fillRect(0, 0, 560, 620);
MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
  if (cell !== '#') return;
  mazeCtx.fillStyle = '#09132e';
  mazeCtx.fillRect(x * TILE, y * TILE, TILE, TILE);
}));
mazeCtx.strokeStyle = '#335bff';
mazeCtx.lineWidth = 1.7;
mazeCtx.lineJoin = 'round';
MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
  if (cell !== '#') return;
  const X = x * TILE, Y = y * TILE;
  mazeCtx.beginPath();
  if (MAZE[y - 1]?.[x] !== '#') { mazeCtx.moveTo(X, Y + 2); mazeCtx.lineTo(X + TILE, Y + 2); }
  if (MAZE[y + 1]?.[x] !== '#') { mazeCtx.moveTo(X, Y + TILE - 2); mazeCtx.lineTo(X + TILE, Y + TILE - 2); }
  if (row[x - 1] !== '#') { mazeCtx.moveTo(X + 2, Y); mazeCtx.lineTo(X + 2, Y + TILE); }
  if (row[x + 1] !== '#') { mazeCtx.moveTo(X + TILE - 2, Y); mazeCtx.lineTo(X + TILE - 2, Y + TILE); }
  mazeCtx.stroke();
}));
mazeCtx.strokeStyle = '#f6b1da';
mazeCtx.lineWidth = 3;
mazeCtx.beginPath();
mazeCtx.moveTo(13 * TILE, 12.5 * TILE);
mazeCtx.lineTo(15 * TILE, 12.5 * TILE);
mazeCtx.stroke();

function drawPacman(context, player, time, dying = 0) {
  const moving = player.target !== null;
  const mouth = dying ? Math.min(Math.PI, dying * Math.PI) : reducedMotion ? 0.22 : 0.10 + (moving ? (Math.sin(time * 20) + 1) * 0.19 : 0.18);
  const angle = DIRECTIONS[player.dir].angle;
  const draw = x => {
    context.fillStyle = '#ffe354';
    context.beginPath();
    context.moveTo(x, (player.y + 0.5) * TILE);
    context.arc(x, (player.y + 0.5) * TILE, 8.8, angle + mouth, angle + Math.PI * 2 - mouth);
    context.closePath();
    context.fill();
  };
  const x = (player.x + 0.5) * TILE;
  draw(x);
  if (player.x < 0) draw(x + 560);
  if (player.x > 27) draw(x - 560);
}

function drawGhost(context, ghost, frightened, time) {
  const blue = frightened > 0 && ghost.phase === 'roaming';
  const flash = blue && frightened < 2 && Math.floor(time * 7) % 2;
  const draw = offset => {
    const x = (ghost.x + 0.5) * TILE + offset;
    const y = (ghost.y + 0.5) * TILE;
    context.save();
    context.translate(x, y);
    if (ghost.phase !== 'eyes') {
      context.fillStyle = blue ? flash ? '#f3eddb' : '#253fee' : ghost.color;
      context.beginPath();
      context.arc(0, -1, 8, Math.PI, 0);
      context.lineTo(8, 8);
      const shift = Math.floor(time * 7) % 2;
      for (let i = 0; i < 4; i++) {
        context.lineTo(6 - i * 4, shift ? 5 : 8);
        context.lineTo(4 - i * 4, shift ? 8 : 5);
      }
      context.lineTo(-8, -1);
      context.fill();
    }
    if (blue) {
      context.fillStyle = flash ? '#f15555' : '#fff0d8';
      context.fillRect(-4, -2, 2, 2); context.fillRect(2, -2, 2, 2);
      context.strokeStyle = context.fillStyle;
      context.lineWidth = 1.3;
      context.beginPath();
      context.moveTo(-5, 5); context.lineTo(-3, 3); context.lineTo(-1, 5); context.lineTo(1, 3); context.lineTo(3, 5); context.lineTo(5, 3);
      context.stroke();
    } else {
      const d = DIRECTIONS[ghost.dir];
      for (const side of [-3.5, 3.5]) {
        context.fillStyle = '#fff';
        context.beginPath();context.ellipse(side, -1, 3.2, 3.8, 0, 0, Math.PI * 2);context.fill();
        context.fillStyle = '#2246bd';
        context.beginPath();context.arc(side + d.x * 1.4, -1 + d.y * 1.7, 1.7, 0, Math.PI * 2);context.fill();
      }
    }
    context.restore();
  };
  draw(0);
  if (ghost.x < 0) draw(560);
  if (ghost.x > 27) draw(-560);
}

function drawFruit(context, fruit) {
  const x = (fruit.x + 0.5) * TILE, y = (fruit.y + 0.5) * TILE;
  context.strokeStyle = '#a9d96a';context.lineWidth = 2;context.beginPath();
  context.moveTo(x - 4, y);context.quadraticCurveTo(x - 3, y - 10, x + 7, y - 9);context.lineTo(x + 4, y + 1);context.stroke();
  context.fillStyle = '#f7465c';
  for (const offset of [-4, 4]) {context.beginPath();context.arc(x + offset, y + 3, 4.7, 0, Math.PI * 2);context.fill();}
}

function render(context, model, time, preview = false) {
  context.drawImage(mazeCanvas, 0, 0);
  context.fillStyle = '#f6d8ae';
  for (const [position, type] of model.pellets) {
    const [x, y] = position.split(',').map(Number);
    if (type === 'o' && !reducedMotion && Math.floor(time * 3) % 2 === 1 && !preview) continue;
    context.beginPath();
    context.arc((x + 0.5) * TILE, (y + 0.5) * TILE, type === 'o' ? 5.5 : 1.6, 0, Math.PI * 2);
    context.fill();
  }
  if (model.fruit) drawFruit(context, model.fruit);
  if (model.state !== 'dying') model.ghosts.forEach(ghost => drawGhost(context, ghost, model.frightened, time));
  const death = model.state === 'dying' ? 1 - model.timer / 1.25 : 0;
  drawPacman(context, model.player, time, death);
  if (model.state === 'ready' && !preview) {
    context.fillStyle = '#06070b';context.fillRect(10 * TILE, 16.9 * TILE, 8 * TILE, 1.2 * TILE);
    context.fillStyle = '#ffe354';context.font = 'bold 15px monospace';context.textAlign = 'center';
    context.fillText('READY!', 14 * TILE, 17.75 * TILE);
  }
  if (model.state === 'level-clear' && Math.floor(model.timer * 5) % 2 && !reducedMotion) {
    context.fillStyle = '#ffffff25';context.fillRect(0, 0, 560, 620);
  }
}

function showOverlay(mode) {
  if (mode === overlayMode) return;
  overlayMode = mode;
  $('board-overlay').hidden = mode === null;
  if (!mode) return;
  const messages = {
    paused: ['TAKE YOUR TIME', 'Paused', 'The maze can wait.', 'Keep playing'],
    over: ['THERE’S ALWAYS ONE MORE TRY', 'Game over', `You scored ${game.score.toLocaleString()} points. Ready for another round?`, 'Play again'],
  };
  const [kicker, title, description, label] = messages[mode];
  $('overlay-kicker').textContent = kicker;
  $('overlay-title').textContent = title;
  $('overlay-description').textContent = description;
  $('overlay-button').replaceChildren(document.createTextNode(label));
  const arrow = document.createElement('span'); arrow.textContent = '→'; arrow.setAttribute('aria-hidden', 'true');
  $('overlay-button').append(arrow);
  $('overlay-button').focus({ preventScroll: true });
}

function updateHud() {
  $('score').textContent = String(game.score).padStart(6, '0');
  $('level').textContent = String(game.level).padStart(2, '0');
  if (game.score > best) {
    best = game.score;
    try { localStorage.setItem(BEST_KEY, String(best)); } catch {}
  }
  $('best').textContent = String(best).padStart(6, '0');
  if (previousLives !== game.lives) {
    previousLives = game.lives;
    $('lives').replaceChildren(...Array.from({ length: game.lives }, () => {
      const life = document.createElement('span'); life.className = 'life'; life.setAttribute('aria-hidden', 'true'); return life;
    }));
    $('lives').setAttribute('aria-label', `${game.lives} lives remaining`);
  }
  const status = game.paused ? 'Paused' : game.state === 'ready' ? 'Ready!' : game.state === 'dying' ? 'Caught!' : game.state === 'level-clear' ? 'Maze cleared!' : game.state === 'game-over' ? 'Game over' : game.frightened > 0 ? 'Eat the ghosts!' : 'Clear every dot';
  if ($('game-status').textContent !== status) $('game-status').textContent = status;
  $('pause-button').querySelector('span').textContent = game.paused ? 'Resume' : 'Pause';
  $('pause-button').disabled = !['ready', 'playing'].includes(game.state);
  if (game.state === 'game-over') showOverlay('over');
  else if (!game.paused) showOverlay(null);
}

function startGame() {
  borough.stop();
  dino.stop();
  worm.stop();
  lastGame = 'pacman';
  game = new PacmanGame();
  active = true;
  previousLives = -1;
  lastTime = 0;
  overlayMode = undefined;
  $('lobby').hidden = true;
  $('game-screen').hidden = false;
  document.body.classList.add('game-active');
  document.title = "Pac-Man — Georg's Arcade";
  updateHud();
  render(ctx, game, 0);
  unlockAudio();
  window.scrollTo({ top: 0, behavior: 'instant' });
  board.focus({ preventScroll: true });
}

function returnToLobby() {
  active = false;
  game = null;
  $('lobby').hidden = false;
  $('game-screen').hidden = true;
  document.body.classList.remove('game-active');
  document.title = "Georg's Arcade — Play a classic";
  $(({dino:'dino-play-button',wurm:'worm-play-button',borough:'borough-play-button'})[lastGame] || 'play-button').focus({ preventScroll: true });
}

function togglePause() {
  if (!game || !['ready', 'playing'].includes(game.state)) return;
  game.togglePause();
  showOverlay(game.paused ? 'paused' : null);
  updateHud();
  if (!game.paused) board.focus({ preventScroll: true });
}

function route() {
  if (location.hash !== '#borough') borough.stop();
  if (location.hash === '#pacman') startGame();
  else if (location.hash === '#dino') {
    worm.stop();
    active = false;
    game = null;
    lastGame = 'dino';
    $('lobby').hidden = true;
    $('game-screen').hidden = true;
    dino.start();
  } else if (location.hash === '#wurm') {
    dino.stop();
    active = false;
    game = null;
    lastGame = 'wurm';
    $('lobby').hidden = true;
    $('game-screen').hidden = true;
    worm.start();
  } else if (location.hash === '#borough') {
    dino.stop();
    worm.stop();
    active = false;
    game = null;
    lastGame = 'borough';
    $('lobby').hidden = true;
    $('game-screen').hidden = true;
    borough.start();
  } else {
    dino.stop();
    worm.stop();
    returnToLobby();
  }
}

function navigateToGame(name) {
  if (location.hash === `#${name}`) route();
  else location.hash = name;
}

$('play-button').addEventListener('click', () => navigateToGame('pacman'));
$('dino-play-button').addEventListener('click', () => navigateToGame('dino'));
$('worm-play-button').addEventListener('click', () => navigateToGame('wurm'));
$('borough-play-button').addEventListener('click', () => navigateToGame('borough'));
$('back-button').addEventListener('click', () => { location.hash = ''; });
$('pause-button').addEventListener('click', togglePause);
$('restart-button').addEventListener('click', startGame);
$('overlay-button').addEventListener('click', () => {
  if (overlayMode === 'over') startGame();
  else togglePause();
});
document.querySelectorAll('[data-sound-toggle]').forEach(button => button.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  try { localStorage.setItem(SOUND_KEY, String(soundEnabled)); } catch {}
  updateSoundButton();unlockAudio();
  if (soundEnabled) sound('fruit');
}));
window.addEventListener('hashchange', route);

const keys = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', a: 'left', s: 'down', d: 'right' };
document.addEventListener('keydown', event => {
  if (!active || event.altKey || event.ctrlKey || event.metaKey) return;
  const k = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (keys[k]) {event.preventDefault();game.turn(keys[k]);unlockAudio();}
  else if ((k === 'p' || k === ' ') && !event.repeat) {
    // Native Space activation remains available for focused buttons.
    if (k === ' ' && event.target.closest('button,a')) return;
    event.preventDefault();togglePause();
  } else if (k === 'Escape') location.hash = '';
});

document.querySelectorAll('[data-direction]').forEach(button => {
  button.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (active) { game.turn(button.dataset.direction); unlockAudio(); }
  });
  // Keyboard and assistive technology activation also work.
  button.addEventListener('click', event => {
    if (event.detail === 0 && active) game.turn(button.dataset.direction);
  });
});
let swipeStart = null;
board.addEventListener('pointerdown', event => {
  swipeStart = { x: event.clientX, y: event.clientY };
  board.setPointerCapture(event.pointerId);
  unlockAudio();
});
board.addEventListener('pointermove', event => {
  if (!swipeStart || !active) return;
  const dx = event.clientX - swipeStart.x, dy = event.clientY - swipeStart.y;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 14) return;
  game.turn(Math.abs(dx) > Math.abs(dy) ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up');
  swipeStart = { x: event.clientX, y: event.clientY };
});
board.addEventListener('pointerup', () => { swipeStart = null; });
board.addEventListener('pointercancel', () => { swipeStart = null; });
function pauseWhenAway() {
  if (active && game && !game.paused && ['ready', 'playing'].includes(game.state)) togglePause();
}
window.addEventListener('blur', pauseWhenAway);
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseWhenAway(); lastTime = 0; });

function frame(time) {
  requestAnimationFrame(frame);
  dino.frame(time);
  worm.frame(time);
  borough.frame(time);
  if (!active || !game) { lastTime = 0; return; }
  const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 0;
  lastTime = time;
  game.update(dt);
  game.drainEvents().forEach(sound);
  updateHud();
  render(ctx, game, time / 1000);
}

const previewGame = new PacmanGame();
previewGame.player.x = 6; previewGame.player.y = 23; previewGame.player.dir = 'right';
previewGame.ghosts.forEach((g, i) => {g.x = 11 + i * 2;g.y = 17;g.phase = 'roaming';g.dir = 'left';});
render($('preview').getContext('2d'), previewGame, 0, true);
drawDinoPreview($('dino-preview'));
drawWormPreview($('worm-preview'));
updateSoundButton();
if (['#pacman', '#dino', '#wurm', '#borough'].includes(location.hash)) route();
requestAnimationFrame(frame);
