import test from 'node:test';
import assert from 'node:assert/strict';
import { MAZE, PacmanGame } from '../engine.js';

function running() {
  const game = new PacmanGame({ random: () => 0.3 });
  game.state = 'playing';
  return game;
}
function place(entity, x, y, dir = 'left') {
  Object.assign(entity, { x, y, dir, target: null });
}

test('classic maze has 244 reachable pellets, four power pellets, and a protected ghost house', () => {
  const game = running();
  assert.equal(MAZE.length, 31);
  assert.ok(MAZE.every(row => row.length === 28));
  assert.equal(game.pellets.size, 244);
  assert.equal([...game.pellets.values()].filter(p => p === 'o').length, 4);
  const queue = [{ x: 13, y: 23 }];
  const seen = new Set(['13,23']);
  for (let i = 0; i < queue.length; i++) {
    for (const direction of ['up', 'down', 'left', 'right']) {
      const n = game.neighbor(queue[i], direction);
      if (!n) continue;
      n.x = (n.x + 28) % 28;
      const key = `${n.x},${n.y}`;
      if (!seen.has(key)) {seen.add(key);queue.push(n);}
    }
  }
  assert.ok([...game.pellets.keys()].every(key => seen.has(key)));
  assert.equal(game.walkable(13, 12), false);
  assert.equal(game.walkable(13, 14), false);
  assert.equal(game.walkable(13, 14, true), true);
});

test('a blocked turn is buffered until the next intersection', () => {
  const game = running();
  game.ghosts = [];
  game.turn('up');
  game.update(0.44);
  assert.ok(game.player.x < 13);
  game.update(0.2);
  assert.equal(game.player.x, 12);
  assert.ok(game.player.y < 23);
});

test('player stops at walls and can reverse between tile centers', () => {
  const game = running();
  game.ghosts = [];
  place(game.player, 1, 1);
  game.nextDirection = 'left';
  game.update(1);
  assert.equal(game.player.x, 1);
  game.turn('right');
  game.update(0.1);
  const before = game.player.x;
  game.turn('left');
  game.update(0.05);
  assert.ok(game.player.x < before);
  assert.ok(game.player.x >= 1);
});

test('both tunnel entrances wrap without entering walls or void cells', () => {
  for (const [x, dir, expected] of [[0, 'left', 27], [27, 'right', 0]]) {
    const game = running();
    game.ghosts = [];
    place(game.player, x, 14, dir);
    game.nextDirection = dir;
    game.update(1 / 5.7);
    assert.ok(Math.abs(game.player.x - expected) < 0.001);
    assert.equal(game.player.y, 14);
  }
});

test('power pellets score 50, frighten ghosts, and permit escalating ghost scores', () => {
  const game = running();
  place(game.player, 1, 3);
  game.eat();
  assert.equal(game.score, 50);
  assert.ok(game.frightened > 0);
  for (let i = 0; i < 4; i++) {
    place(game.ghosts[i], 1, 3);
    game.ghosts[i].phase = 'roaming';
    game.checkCollisions();
  }
  assert.equal(game.score, 50 + 200 + 400 + 800 + 1600);
  assert.ok(game.ghosts.every(g => g.phase === 'eyes'));
  assert.equal(game.lives, 3);
});

test('a collision removes exactly one life and preserves pellets and score on respawn', () => {
  const game = running();
  game.score = 120;
  game.pellets.delete('1,1');
  place(game.ghosts[0], game.player.x, game.player.y);
  game.checkCollisions();
  assert.equal(game.lives, 2);
  assert.equal(game.state, 'dying');
  game.update(1.3);
  assert.equal(game.state, 'ready');
  assert.equal(game.score, 120);
  assert.equal(game.pellets.has('1,1'), false);
});

test('the final life ends the game and restart resets the run', () => {
  const game = running();
  game.lives = 1;
  place(game.ghosts[0], game.player.x, game.player.y);
  game.checkCollisions();
  game.update(1.3);
  assert.equal(game.state, 'game-over');
  assert.equal(game.lives, 0);
  game.reset();
  assert.equal(game.state, 'ready');
  assert.equal(game.lives, 3);
  assert.equal(game.score, 0);
});

test('clearing the maze advances the level and refills it without losing score or lives', () => {
  const game = running();
  game.pellets = new Map([['1,1', '.']]);
  game.lives = 2;
  place(game.player, 1, 1);
  game.eat();
  assert.equal(game.state, 'level-clear');
  game.update(2.1);
  assert.equal(game.level, 2);
  assert.equal(game.pellets.size, 244);
  assert.equal(game.score, 10);
  assert.equal(game.lives, 2);
});

test('pause freezes movement, timers, and release clocks', () => {
  const game = running();
  game.frightened = 5;
  game.togglePause();
  const snapshot = JSON.stringify(game);
  game.update(10);
  assert.equal(JSON.stringify(game), snapshot);
  game.togglePause();
  game.update(0.1);
  assert.ok(game.elapsed > 0);
});

test('ghosts leave the house and eaten ghosts return through the door', () => {
  const game = running();
  // Keep player safely away while verifying the ghost lifecycle.
  place(game.player, 1, 1, 'left');
  game.nextDirection = 'left';
  const pinky = game.ghosts[1];
  game.ghosts = [pinky];
  game.update(5);
  assert.equal(pinky.phase, 'roaming');
  place(pinky, 13, 11);
  pinky.phase = 'eyes';
  game.update(0.4);
  assert.equal(pinky.phase, 'waiting');
  assert.equal(pinky.x, 13);
  assert.equal(pinky.y, 14);
  game.update(2.5);
  assert.equal(pinky.phase, 'roaming');
});

test('fruit appears after 70 dots and expires; 10,000 points awards one extra life', () => {
  const game = running();
  game.ghosts = [];
  const pellets = [...game.pellets.keys()].slice(0, 70);
  for (const key of pellets) {
    const [x, y] = key.split(',').map(Number);
    place(game.player, x, y);
    game.eat();
  }
  assert.ok(game.fruit);
  game.update(10.1);
  assert.equal(game.fruit, null);
  game.score = 9990;
  game.addScore(10);
  assert.equal(game.lives, 4);
  game.addScore(10000);
  assert.equal(game.lives, 4);
});

test('fixed and variable update sizes produce the same movement', () => {
  const small = running(), large = running();
  small.ghosts = []; large.ghosts = [];
  for (let i = 0; i < 120; i++) small.update(1 / 120);
  large.update(1);
  assert.ok(Math.abs(small.player.x - large.player.x) < 0.00001);
  assert.equal(small.score, large.score);
});
