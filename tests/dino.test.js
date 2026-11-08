import test from 'node:test';
import assert from 'node:assert/strict';
import { DinoRun, GROUND } from '../dino-engine.js';

function running(width = 960) {
  const game = new DinoRun({ width, random: () => 0.5 });
  game.state = 'playing';
  game.spawnTimer = Infinity;
  return game;
}

function cactus(game, x = 200, count = 1) {
  game.obstacles = [{ type: 'cactus', x, y: GROUND - 64, width: count * 24, height: 64, count }];
}

test('the run waits for an intentional start and resets cleanly for another try', () => {
  const game = new DinoRun();
  game.update(5);
  assert.equal(game.score, 0);
  assert.equal(game.distance, 0);
  assert.equal(game.obstacles.length, 0);
  assert.equal(game.jump(), true);
  assert.equal(game.state, 'playing');
  game.update(0.2);
  assert.ok(game.score > 0);
  game.reset();
  assert.equal(game.state, 'ready');
  assert.equal(game.score, 0);
  assert.equal(game.player.grounded, true);
});

test('a jump lands exactly on the ground and cannot be repeated in midair', () => {
  const game = running();
  assert.equal(game.jump(), true);
  game.update(0.2);
  assert.equal(game.jump(), false);
  assert.ok(game.player.y + game.player.height < GROUND);
  game.update(0.7);
  assert.equal(game.player.y + game.player.height, GROUND);
  assert.equal(game.player.grounded, true);
  assert.equal(game.player.vy, 0);
});

test('a quick tap clears a tall cactus, while a held jump reaches higher', () => {
  const tap = running(), hold = running();
  cactus(tap);
  tap.jump();tap.releaseJump();hold.jump();
  tap.update(0.28);hold.update(0.28);
  assert.ok(hold.player.y < tap.player.y);
  tap.update(0.6);
  assert.equal(tap.state, 'playing');
  assert.equal(tap.player.grounded, true);
});

test('a full jump clears a cluster of three tall cacti', () => {
  const game = running();
  cactus(game, 220, 3);
  game.jump();
  game.update(0.9);
  assert.equal(game.state, 'playing');
  assert.equal(game.player.grounded, true);
});

test('ducking keeps feet on the ground and restores the standing shape', () => {
  const game = running();
  game.duck(true);
  assert.equal(game.player.ducking, true);
  assert.equal(game.player.height, 28);
  assert.equal(game.player.y + game.player.height, GROUND);
  assert.equal(game.jump(), false);
  game.duck(false);
  assert.equal(game.player.height, 48);
  assert.equal(game.player.y + game.player.height, GROUND);
  assert.equal(game.jump(), true);
  game.duck(true);
  game.update(0.4);
  assert.equal(game.player.grounded, true);
});

test('low birds hit a standing dinosaur but can be ducked underneath', () => {
  for (const duck of [false, true]) {
    const game = running();
    game.obstacles = [{ type: 'bird', x: 85, y: GROUND - 62, width: 44, height: 28 }];
    game.duck(duck);
    game.update(1 / 120);
    assert.equal(game.state, duck ? 'playing' : 'game-over');
  }
});

test('birds are introduced after the first fifteen seconds', () => {
  const game = new DinoRun({ random: () => 0 });
  assert.equal(game.createObstacle().type, 'cactus');
  game.elapsed = 15;
  assert.equal(game.createObstacle().type, 'bird');
});

test('a collision freezes the run, and a long update cannot skip an obstacle', () => {
  const game = running();
  cactus(game, 280);
  game.update(1);
  assert.equal(game.state, 'game-over');
  assert.ok(game.obstacles[0].x > 50);
  const score = game.score, distance = game.distance;
  game.update(4);
  assert.equal(game.score, score);
  assert.equal(game.distance, distance);
  assert.equal(game.jump(), false);
  assert.deepEqual(game.drainEvents(), ['death']);
});

test('pause freezes physics, scoring, difficulty, and spawn timers', () => {
  const game = running();
  game.jump();game.update(0.1);game.togglePause();
  const snapshot = JSON.stringify(game);
  game.update(5);
  assert.equal(JSON.stringify(game), snapshot);
  assert.equal(game.jump(), false);
  game.togglePause();game.update(0.1);
  assert.ok(game.distance > JSON.parse(snapshot).distance);
});

test('difficulty increases, is capped, and keeps reaction time on smaller screens', () => {
  for (const width of [480, 600, 960]) {
    const game = running(width);
    game.update(90);
    assert.ok(game.speed > 320);
    assert.ok(game.speed <= 720);
    assert.ok((width - 150) / game.speed >= 0.85);
    const cap = game.speed;
    game.update(90);
    assert.equal(game.speed, cap);
  }
});

test('obstacles retain enough time between them even at maximum speed', () => {
  const game = running();
  game.elapsed = 100;
  game.spawnTimer = 0;
  game.playerBoxes = () => []; // Observe generation without ending this test run.
  const spawnTimes = [];
  const create = game.createObstacle.bind(game);
  game.createObstacle = () => { spawnTimes.push(game.elapsed);return create(); };
  game.update(10);
  assert.ok(spawnTimes.length >= 5);
  for (let i = 1; i < spawnTimes.length; i++) assert.ok(spawnTimes[i] - spawnTimes[i - 1] >= 1.24);
});

test('score milestones sound once and frame chunking does not change gameplay', () => {
  const small = running(), large = running();
  for (let i = 0; i < 720; i++) small.update(1 / 120);
  large.update(6);
  assert.equal(small.score, large.score);
  assert.ok(Math.abs(small.distance - large.distance) < 0.00001);
  assert.deepEqual(small.drainEvents(), ['milestone']);
  assert.deepEqual(small.drainEvents(), []);
});
