import test from 'node:test';
import assert from 'node:assert/strict';
import { DinoRun, GROUND } from '../dino-engine.js';

function gameWith(obstacle) {
  const game = new DinoRun({ random: () => 0.5 });
  game.state = 'playing';
  game.spawnTimer = Infinity;
  game.obstacles = [obstacle];
  return game;
}

const cactus = (x, count = 1, height = 64) => ({
  type: 'cactus', x, y: GROUND - height, width: count * 24, height, count,
});

test('Auto starts a waiting game and turning it off preserves the run', () => {
  const game = new DinoRun();
  game.setAutoMode(true);
  assert.equal(game.autoMode, true);
  assert.equal(game.state, 'playing');
  game.update(1);
  const score = game.score, distance = game.distance;
  game.setAutoMode(false);
  assert.equal(game.autoMode, false);
  assert.equal(game.state, 'playing');
  assert.equal(game.score, score);
  assert.equal(game.distance, distance);
});

test('Auto calculates the ballistic apex over the center of a cactus cluster', () => {
  const game = gameWith(cactus(68, 3));
  game.setAutoMode(true);
  game.update(1 / 120);
  const seconds = (game.obstacles[0].x + 36 - 104) / game.speed;
  const expectedLift = 800 ** 2 / (2 * 2200) - 2200 * seconds ** 2 / 2;
  assert.ok(Math.abs(GROUND - 48 - game.player.y - expectedLift) < 0.000001);
  assert.ok(expectedLift > 145);
  assert.equal(game.state, 'playing');
  assert.equal(game.player.grounded, false);
});

test('Auto clears every cactus size at initial and maximum speeds on all screen sizes', () => {
  for (const width of [480, 600, 960]) {
    for (const elapsed of [0, 100]) {
      for (const count of [1, 2, 3]) {
        for (const height of [44, 64]) {
          const game = gameWith(cactus(width + 24, count, height));
          game.width = width;
          game.elapsed = elapsed;
          game.setAutoMode(true);
          game.update(4);
          assert.equal(game.state, 'playing', JSON.stringify({ width, elapsed, count, height }));
          assert.equal(game.player.grounded, true);
          assert.equal(game.drainEvents().filter(event => event === 'jump').length, 1);
        }
      }
    }
  }
});

test('Auto ducks low birds, stays upright under high birds, and stands after they pass', () => {
  for (const low of [true, false]) {
    const game = gameWith({ type: 'bird', x: 85, y: GROUND - (low ? 62 : 110), width: 44, height: 28 });
    game.setAutoMode(true);
    game.update(1 / 120);
    assert.equal(game.state, 'playing');
    assert.equal(game.player.ducking, low);
    assert.equal(game.player.grounded, true);
    game.update(0.5);
    assert.equal(game.player.ducking, false);
    assert.equal(game.state, 'playing');
    assert.ok(!game.drainEvents().includes('jump'));
  }
});

test('Auto takes over imminent collisions even during a short manual jump or duck', () => {
  for (const pose of ['standing', 'jumping', 'ducking']) {
    const game = gameWith(cactus(95, 3));
    if (pose === 'jumping') {game.jump();game.releaseJump();}
    if (pose === 'ducking') game.duck(true);
    game.setAutoMode(true);
    game.update(1);
    assert.equal(game.state, 'playing', pose);
    assert.equal(game.player.grounded, true);
  }
});

test('manual jump, jump-release, and duck inputs cannot interfere while Auto is driving', () => {
  const game = gameWith(cactus(180));
  game.setAutoMode(true);
  game.update(1 / 120);
  const player = { ...game.player };
  assert.equal(game.jump(), false);
  game.releaseJump();
  game.duck(true);
  assert.deepEqual(game.player, player);
  game.update(1);
  assert.equal(game.state, 'playing');
});

test('Pause freezes an automatic run, including its jump, and resume continues safely', () => {
  const game = gameWith(cactus(180, 3));
  game.setAutoMode(true);
  game.update(0.05);
  assert.equal(game.player.grounded, false);
  game.togglePause();
  const paused = JSON.stringify(game);
  game.update(20);
  assert.equal(JSON.stringify(game), paused);
  game.togglePause();
  game.update(1);
  assert.equal(game.autoMode, true);
  assert.equal(game.state, 'playing');
});

test('enabling Auto while paused respects Pause; enabling it after game over starts fresh', () => {
  const paused = gameWith(cactus(180));
  paused.togglePause();
  paused.setAutoMode(true);
  const distance = paused.distance;
  paused.update(10);
  assert.equal(paused.paused, true);
  assert.equal(paused.distance, distance);
  paused.togglePause();paused.update(2);
  assert.equal(paused.state, 'playing');

  const over = gameWith(cactus(95));
  over.update(1 / 120);
  assert.equal(over.state, 'game-over');
  over.setAutoMode(true);
  assert.equal(over.state, 'playing');
  assert.equal(over.score, 0);
  assert.equal(over.obstacles.length, 0);
  over.update(10);
  assert.equal(over.state, 'playing');
});

test('turning Auto off midair returns to ordinary jump physics without resetting position', () => {
  const game = gameWith(cactus(68, 3));
  game.setAutoMode(true);game.update(1 / 120);
  game.obstacles = [];
  const { y, vy } = game.player;
  game.setAutoMode(false);
  assert.equal(game.player.y, y);
  game.update(0.1);
  const expected = y + vy * 0.1 + 2200 * 0.1 ** 2 / 2;
  assert.ok(Math.abs(game.player.y - expected) < 0.000001);
});

test('collision detection remains active in Auto mode and manual runs still end on impact', () => {
  // An intentionally broken planner is a negative control: Auto is not immunity.
  const auto = gameWith(cactus(95));
  auto.setAutoMode(true);
  auto.updateAutoPose = () => {};
  auto.update(1 / 120);
  assert.equal(auto.state, 'game-over');
  const manual = gameWith(cactus(95));
  manual.update(1 / 120);
  assert.equal(manual.state, 'game-over');
});

test('automatic movement is independent of frame chunking', () => {
  const small = new DinoRun({ width: 600, random: () => 0.5 });
  const large = new DinoRun({ width: 600, random: () => 0.5 });
  small.setAutoMode(true);large.setAutoMode(true);
  for (let i = 0; i < 360; i++) small.update(1 / 120);
  large.update(3);
  assert.equal(small.score, large.score);
  assert.equal(small.player.ducking, large.player.ducking);
  assert.ok(Math.abs(small.player.y - large.player.y) < 0.000001);
  assert.deepEqual(small.drainEvents(), large.drainEvents());
});

test('64 seeded ten-minute runs survive every obstacle variant through maximum difficulty', () => {
  const variants = new Set();
  for (let seed = 1; seed <= 64; seed++) {
    let state = seed;
    const random = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 4294967296;
    };
    const width = [480, 600, 960][seed % 3];
    const game = new DinoRun({ width, random });
    const create = game.createObstacle.bind(game);
    game.createObstacle = () => {
      const obstacle = create();
      variants.add(obstacle.type === 'bird' ? `bird-${obstacle.y}` : `cactus-${obstacle.count}-${obstacle.height}`);
      return obstacle;
    };
    game.setAutoMode(true);
    game.update(600);
    assert.equal(game.state, 'playing', `seed ${seed}, width ${width}, elapsed ${game.elapsed}`);
    assert.ok(game.elapsed > 599.99);
    assert.ok(game.score > 14000);
    assert.ok(game.drainEvents().filter(event => event === 'jump').length > 100);
  }
  assert.equal(variants.size, 8); // Six cactus sizes and two bird heights.
});
