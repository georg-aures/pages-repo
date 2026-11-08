// Physics use logical pixels and seconds; the browser only scales the canvas.
export const GROUND = 282;
export const HEIGHT = 360;
const GRAVITY = 2200;
const JUMP_SPEED = -800;
const overlaps = (a, b) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;

export class DinoRun {
  constructor({ random = Math.random, width = 960 } = {}) {
    this.random = random;
    this.width = Math.max(480, width);
    this.reset();
  }

  reset() {
    this.state = 'ready';
    this.paused = false;
    this.autoMode = false;
    this.elapsed = 0;
    this.distance = 0;
    this.score = 0;
    this.speed = 320;
    this.milestone = 0;
    this.spawnTimer = 0.9;
    this.obstacles = [];
    this.events = [];
    this.player = { x: 80, y: GROUND - 48, width: 48, height: 48, vy: 0, grounded: true, ducking: false };
  }

  jump() {
    if (this.autoMode || this.paused || this.state === 'game-over') return false;
    if (this.state === 'ready') this.state = 'playing';
    const p = this.player;
    if (!p.grounded || p.ducking) return false;
    p.vy = JUMP_SPEED;
    p.grounded = false;
    this.events.push('jump');
    return true;
  }

  releaseJump() {
    if (this.autoMode) return;
    // Even a quick tap clears a tall cactus; holding gives a higher arc.
    if (this.player.vy < -620) this.player.vy = -620;
  }

  duck(held) {
    if (this.autoMode || this.paused || this.state === 'game-over') return;
    const p = this.player;
    const bottom = p.y + p.height;
    p.ducking = held;
    p.height = held ? 28 : 48;
    p.width = held ? 60 : 48;
    p.y = bottom - p.height;
    if (held && !p.grounded) p.vy = Math.max(p.vy, 450);
  }

  togglePause() {
    if (this.state !== 'playing') return this.paused;
    this.paused = !this.paused;
    return this.paused;
  }

  setAutoMode(enabled) {
    if (enabled && this.state === 'game-over') this.reset();
    this.autoMode = enabled;
    if (enabled && this.state === 'ready') this.state = 'playing';
    if (!enabled && this.player.ducking) {
      const bottom = this.player.y + this.player.height;
      Object.assign(this.player, { ducking: false, width: 48, height: 48, y: bottom - 48 });
    }
  }

  updateAutoPose() {
    const p = this.player;
    const wasGrounded = p.grounded;
    const timeToApex = -JUMP_SPEED / GRAVITY;
    const jumpHeight = JUMP_SPEED ** 2 / (2 * GRAVITY);
    let lift = 0, vy = 0;
    for (const obstacle of this.obstacles) {
      if (obstacle.type !== 'cactus') continue;
      // Put the apex exactly over the cactus/cluster's center. Resolve the same
      // ballistic arc from distance after obstacles move, so late frames and
      // taking over mid-run cannot miss the ideal launch frame.
      const secondsToCenter = (obstacle.x + obstacle.width / 2 - (p.x + 24)) / this.speed;
      if (Math.abs(secondsToCenter) >= timeToApex) continue;
      const height = jumpHeight - GRAVITY * secondsToCenter ** 2 / 2;
      if (height > lift) {
        lift = height;
        vy = -GRAVITY * secondsToCenter;
      }
    }
    const ducking = lift === 0 && this.obstacles.some(obstacle =>
      obstacle.type === 'bird' && obstacle.y + obstacle.height > GROUND - 48 &&
      obstacle.x + obstacle.width > p.x && obstacle.x < p.x + 60 + this.speed * 0.18);
    const height = ducking ? 28 : 48;
    Object.assign(p, {
      ducking, width: ducking ? 60 : 48, height,
      y: GROUND - height - lift, vy, grounded: lift === 0,
    });
    if (wasGrounded && !p.grounded) this.events.push('jump');
  }

  createObstacle() {
    // Birds appear only after the player has had time to learn the jump.
    if (this.elapsed >= 15 && this.random() < 0.25) {
      return { type: 'bird', x: this.width + 24, y: GROUND - (this.random() < 0.6 ? 62 : 110), width: 44, height: 28 };
    }
    const count = this.random() < 0.55 ? 1 : this.random() < 0.7 ? 2 : 3;
    const height = this.random() < 0.5 ? 44 : 64;
    return { type: 'cactus', x: this.width + 24, y: GROUND - height, width: count * 24, height, count };
  }

  playerBoxes() {
    const p = this.player;
    return p.ducking ? [
      { x: p.x + 10, y: p.y + 11, width: 38, height: 12 },
      { x: p.x + 43, y: p.y + 2, width: 15, height: 13 },
    ] : [
      { x: p.x + 12, y: p.y + 18, width: 21, height: 24 },
      { x: p.x + 27, y: p.y + 2, width: 19, height: 17 },
      { x: p.x + 14, y: p.y + 38, width: 16, height: 9 },
    ];
  }

  obstacleBoxes(obstacle) {
    if (obstacle.type === 'bird') return [{ x: obstacle.x + 5, y: obstacle.y + 7, width: 32, height: 15 }];
    return Array.from({ length: obstacle.count }, (_, i) => ({
      x: obstacle.x + i * 24 + 3, y: obstacle.y + 3, width: 17, height: obstacle.height - 3,
    }));
  }

  update(dt) {
    if (this.paused || this.state !== 'playing' || dt <= 0) return;
    // Collision steps remain small even when a caller supplies a long frame.
    if (dt > 1 / 120 + 0.000001) {
      while (dt > 0 && this.state === 'playing' && !this.paused) {
        const step = Math.min(dt, 1 / 120);
        this.update(step);
        dt -= step;
      }
      return;
    }
    this.elapsed += dt;
    // Smaller screens retain at least ~0.85 s of visible reaction distance.
    const cap = Math.min(720, (this.width - 150) / 0.85);
    this.speed = Math.min(cap, 320 + this.elapsed * 5.5);
    this.distance += this.speed * dt;
    this.score = Math.floor(this.distance / 16);
    const p = this.player;
    if (!this.autoMode && !p.grounded) {
      p.y += p.vy * dt + 0.5 * GRAVITY * dt * dt;
      p.vy += GRAVITY * dt;
      if (p.y + p.height >= GROUND) {
        p.y = GROUND - p.height;
        p.vy = 0;
        p.grounded = true;
      }
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.obstacles.push(this.createObstacle());
      // A full jump and landing fit between consecutive obstacles, at any speed.
      this.spawnTimer += 1.25 + this.random() * 0.65;
    }
    this.obstacles.forEach(obstacle => { obstacle.x -= this.speed * dt; });
    this.obstacles = this.obstacles.filter(obstacle => obstacle.x + obstacle.width > -10);
    if (this.autoMode) this.updateAutoPose();
    const boxes = this.playerBoxes();
    if (this.obstacles.some(obstacle => this.obstacleBoxes(obstacle).some(box => boxes.some(player => overlaps(player, box))))) {
      this.state = 'game-over';
      this.events.push('death');
    }
    if (Math.floor(this.score / 100) > this.milestone) {
      this.milestone = Math.floor(this.score / 100);
      this.events.push('milestone');
    }
  }

  drainEvents() {
    return this.events.splice(0);
  }
}
