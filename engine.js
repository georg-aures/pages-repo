// Game rules are independent of the page and renderer. Coordinates are tile centers.
export const MAZE = [
  '############################',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#o####.#####.##.#####.####o#',
  '#.####.#####.##.#####.####.#',
  '#..........................#',
  '#.####.##.########.##.####.#',
  '#.####.##.########.##.####.#',
  '#......##....##....##......#',
  '######.##### ## #####.######',
  '_____#.##### ## #####.#_____',
  '_____#.##          ##.#_____',
  '_____#.## ###--### ##.#_____',
  '######.## #      # ##.######',
  '      .   #      #   .      ',
  '######.## #      # ##.######',
  '_____#.## ######## ##.#_____',
  '_____#.##          ##.#_____',
  '_____#.## ######## ##.#_____',
  '######.## ######## ##.######',
  '#............##............#',
  '#.####.#####.##.#####.####.#',
  '#.####.#####.##.#####.####.#',
  '#o..##.......  .......##..o#',
  '###.##.##.########.##.##.###',
  '###.##.##.########.##.##.###',
  '#......##....##....##......#',
  '#.##########.##.##########.#',
  '#.##########.##.##########.#',
  '#..........................#',
  '############################',
];

export const DIRECTIONS = {
  up: { x: 0, y: -1, angle: -Math.PI / 2 },
  left: { x: -1, y: 0, angle: Math.PI },
  down: { x: 0, y: 1, angle: Math.PI / 2 },
  right: { x: 1, y: 0, angle: 0 },
};
const REVERSE = { up: 'down', down: 'up', left: 'right', right: 'left' };
const GHOSTS = [
  { name: 'Blinky', color: '#ff525e', x: 13, y: 11, corner: { x: 25, y: -2 } },
  { name: 'Pinky', color: '#ffacd1', x: 13, y: 14, corner: { x: 2, y: -2 } },
  { name: 'Inky', color: '#62e5ee', x: 12, y: 14, corner: { x: 27, y: 32 } },
  { name: 'Clyde', color: '#ffb46a', x: 15, y: 14, corner: { x: 0, y: 32 } },
];
const key = (x, y) => `${x},${y}`;
const distance = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const actor = (x, y, dir) => ({ x, y, dir, target: null });

export class PacmanGame {
  constructor({ random = Math.random } = {}) {
    this.random = random;
    this.events = [];
    this.reset();
  }

  reset() {
    this.score = 0;
    this.lives = 3;
    this.level = 1;
    this.extraLife = false;
    this.events = [];
    this.loadLevel();
  }

  loadLevel() {
    this.pellets = new Map();
    MAZE.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === '.' || cell === 'o') this.pellets.set(key(x, y), cell);
    }));
    this.totalPellets = this.pellets.size;
    this.fruit = null;
    this.fruitTriggers = new Set();
    this.resetActors();
  }

  resetActors() {
    this.player = actor(13, 23, 'left');
    this.nextDirection = 'left';
    this.ghosts = GHOSTS.map((ghost, index) => ({
      ...ghost, ...actor(ghost.x, ghost.y, 'left'),
      phase: index === 0 ? 'roaming' : 'waiting',
      release: index * 3,
    }));
    this.elapsed = 0;
    this.modeClock = 0;
    this.frightened = 0;
    this.ghostCombo = 0;
    this.state = 'ready';
    this.timer = 1.5;
    this.paused = false;
  }

  turn(direction) {
    if (!DIRECTIONS[direction]) return;
    this.nextDirection = direction;
    // Reversals do not need to wait for the next intersection.
    const p = this.player;
    if (p.target && direction === REVERSE[p.dir]) {
      const oldTarget = p.target;
      p.target = { x: oldTarget.x - DIRECTIONS[p.dir].x, y: oldTarget.y - DIRECTIONS[p.dir].y };
      p.dir = direction;
    }
  }

  togglePause() {
    if (['ready', 'playing'].includes(this.state)) this.paused = !this.paused;
    return this.paused;
  }

  walkable(x, y, ghost = false) {
    if (y === 14 && (x === -1 || x === 28)) return true;
    const cell = MAZE[y]?.[x];
    if (cell === undefined || cell === '#' || cell === '_') return false;
    if (!ghost && (cell === '-' || (y >= 13 && y <= 15 && x >= 11 && x <= 16))) return false;
    return true;
  }

  neighbor(entity, direction, ghost = false) {
    const d = DIRECTIONS[direction];
    const x = entity.x + d.x;
    const y = entity.y + d.y;
    return this.walkable(x, y, ghost) ? { x, y } : null;
  }

  addScore(points) {
    this.score += points;
    if (!this.extraLife && this.score >= 10000) {
      this.extraLife = true;
      this.lives++;
      this.events.push('extra-life');
    }
  }

  eat() {
    const p = this.player;
    const position = key(p.x, p.y);
    const pellet = this.pellets.get(position);
    if (pellet) {
      this.pellets.delete(position);
      this.addScore(pellet === 'o' ? 50 : 10);
      this.events.push(pellet === 'o' ? 'power' : 'pellet');
      if (pellet === 'o') {
        this.frightened = Math.max(2, 8 - (this.level - 1) * 0.6);
        this.ghostCombo = 0;
        this.ghosts.filter(g => g.phase === 'roaming').forEach(g => this.reverse(g));
      }
      const eaten = this.totalPellets - this.pellets.size;
      for (const trigger of [70, 170]) {
        if (eaten >= trigger && !this.fruitTriggers.has(trigger)) {
          this.fruitTriggers.add(trigger);
          this.fruit = { x: 13, y: 17, timer: 10 };
        }
      }
      if (!this.pellets.size) {
        this.state = 'level-clear';
        this.timer = 2;
        this.events.push('level-clear');
      }
    }
    if (this.fruit && p.x === this.fruit.x && p.y === this.fruit.y) {
      this.addScore(100 * Math.min(this.level, 10));
      this.fruit = null;
      this.events.push('fruit');
    }
  }

  reverse(entity) {
    const direction = REVERSE[entity.dir];
    if (entity.target) {
      entity.target = {
        x: entity.target.x - DIRECTIONS[entity.dir].x,
        y: entity.target.y - DIRECTIONS[entity.dir].y,
      };
    }
    entity.dir = direction;
  }

  get mode() {
    const schedule = [7, 20, 7, 20, 5, 20, 5, Infinity];
    let time = this.modeClock;
    for (let i = 0; i < schedule.length; i++) {
      if (time < schedule[i]) return i % 2 === 0 ? 'scatter' : 'chase';
      time -= schedule[i];
    }
    return 'chase';
  }

  ghostTarget(ghost) {
    if (ghost.phase === 'eyes') return { x: 13, y: 14 };
    if (ghost.phase === 'leaving') return { x: 13, y: 11 };
    if (this.mode === 'scatter') return ghost.corner;
    const p = this.player;
    const d = DIRECTIONS[p.dir];
    if (ghost.name === 'Pinky') return { x: p.x + d.x * 4, y: p.y + d.y * 4 };
    if (ghost.name === 'Inky') {
      const red = this.ghosts[0];
      return { x: (p.x + d.x * 2) * 2 - red.x, y: (p.y + d.y * 2) * 2 - red.y };
    }
    if (ghost.name === 'Clyde' && distance(ghost, p) < 64) return ghost.corner;
    return p;
  }

  // BFS gives returning eyes and departing ghosts a reliable route through the door.
  routeHome(from, target) {
    const queue = [{ x: from.x, y: from.y, first: null }];
    const seen = new Set([key(from.x, from.y)]);
    for (let i = 0; i < queue.length; i++) {
      const node = queue[i];
      if (node.x === target.x && node.y === target.y) return node.first;
      for (const direction of Object.keys(DIRECTIONS)) {
        const n = this.neighbor(node, direction, true);
        if (!n) continue;
        n.x = (n.x + 28) % 28;
        const id = key(n.x, n.y);
        if (!seen.has(id)) {
          seen.add(id);
          queue.push({ ...n, first: node.first ?? direction });
        }
      }
    }
    return null;
  }

  chooseGhostDirection(ghost) {
    const target = this.ghostTarget(ghost);
    if (ghost.phase === 'eyes' || ghost.phase === 'leaving') return this.routeHome(ghost, target);
    let options = Object.keys(DIRECTIONS).filter(direction => {
      const n = this.neighbor(ghost, direction);
      return n && direction !== REVERSE[ghost.dir];
    });
    if (!options.length) options = [REVERSE[ghost.dir]].filter(d => this.neighbor(ghost, d));
    if (this.frightened > 0) return options[Math.floor(this.random() * options.length)];
    return options.sort((a, b) => distance(this.neighbor(ghost, a), target) - distance(this.neighbor(ghost, b), target))[0];
  }

  move(entity, amount, choose, onArrival) {
    let remaining = amount;
    while (remaining > 0.000001) {
      if (!entity.target) {
        const direction = choose();
        if (!direction) return;
        const target = this.neighbor(entity, direction, entity !== this.player && entity.phase !== 'roaming');
        if (!target) return;
        entity.dir = direction;
        entity.target = target;
      }
      const target = entity.target;
      const length = Math.abs(target.x - entity.x) + Math.abs(target.y - entity.y);
      if (length <= remaining + 0.000001) {
        entity.x = (target.x + 28) % 28;
        entity.y = target.y;
        entity.target = null;
        remaining -= length;
        if (onArrival?.() === false) return;
      } else {
        const d = DIRECTIONS[entity.dir];
        entity.x += d.x * remaining;
        entity.y += d.y * remaining;
        remaining = 0;
      }
    }
  }

  checkCollisions() {
    for (const ghost of this.ghosts) {
      if (ghost.phase !== 'roaming') continue;
      const dx = Math.min(Math.abs(ghost.x - this.player.x), 28 - Math.abs(ghost.x - this.player.x));
      if (dx ** 2 + (ghost.y - this.player.y) ** 2 > 0.55 ** 2) continue;
      if (this.frightened > 0) {
        ghost.phase = 'eyes';
        this.addScore(200 * 2 ** Math.min(this.ghostCombo++, 3));
        this.events.push('ghost');
      } else {
        this.lives--;
        this.state = 'dying';
        this.timer = 1.25;
        this.events.push('death');
        return;
      }
    }
  }

  update(dt) {
    if (this.paused || this.state === 'game-over') return;
    // Small simulation steps prevent entities crossing through one another.
    if (dt > 1 / 120 + 0.000001) {
      while (dt > 0) { const step = Math.min(dt, 1 / 120); this.update(step); dt -= step; }
      return;
    }
    if (this.state !== 'playing') {
      this.timer -= dt;
      if (this.timer <= 0) {
        if (this.state === 'ready') this.state = 'playing';
        else if (this.state === 'level-clear') { this.level++; this.loadLevel(); }
        else if (this.state === 'dying') {
          if (this.lives > 0) this.resetActors();
          else { this.state = 'game-over'; this.events.push('game-over'); }
        }
      }
      return;
    }
    this.elapsed += dt;
    if (this.fruit && (this.fruit.timer -= dt) <= 0) this.fruit = null;
    if (this.frightened > 0) this.frightened = Math.max(0, this.frightened - dt);
    else {
      const previous = this.mode;
      this.modeClock += dt;
      if (this.mode !== previous) this.ghosts.filter(g => g.phase === 'roaming').forEach(g => this.reverse(g));
    }
    const speed = Math.min(8, 5.7 + (this.level - 1) * 0.28);
    this.move(this.player, speed * dt, () => {
      if (this.neighbor(this.player, this.nextDirection)) return this.nextDirection;
      return this.neighbor(this.player, this.player.dir) ? this.player.dir : null;
    }, () => { this.eat(); return this.state === 'playing'; });
    if (this.state !== 'playing') return;
    this.checkCollisions();
    if (this.state !== 'playing') return;
    for (const ghost of this.ghosts) {
      if (ghost.phase === 'waiting') {
        if (this.elapsed >= ghost.release) ghost.phase = 'leaving';
        else continue;
      }
      const tunnel = ghost.y === 14 && (ghost.x < 6 || ghost.x > 21);
      const ghostSpeed = ghost.phase === 'eyes' ? 11 : ghost.phase === 'leaving' ? 4 : this.frightened > 0 ? 3.3 : tunnel ? 3 : speed * 0.91;
      this.move(ghost, ghostSpeed * dt, () => this.chooseGhostDirection(ghost), () => {
        if (ghost.phase === 'eyes' && ghost.x === 13 && ghost.y === 14) {
          ghost.phase = 'waiting';
          ghost.release = this.elapsed + 1.5;
          return false;
        }
        if (ghost.phase === 'leaving' && ghost.x === 13 && ghost.y === 11) ghost.phase = 'roaming';
      });
    }
    this.checkCollisions();
  }

  drainEvents() {
    return this.events.splice(0);
  }
}
