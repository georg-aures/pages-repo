import test from 'node:test';
import assert from 'node:assert/strict';
import { BoroughGame, VEHICLES, distance, vehiclesTouch } from '../borough-engine.js';
import { nodes, edges, STOPS, ROADS, BUILDINGS, drivable, route, nearestNode } from '../borough-city.js';
const game = mode => new BoroughGame(mode, { seed: 42, traffic: 0 });
function advance(g, seconds, input = {}) { for (let t = 0; t < seconds; t += 1 / 30) g.update(1 / 30, input); }
function park(g) { Object.assign(g.player, { x: g.target.x, y: g.target.y, angle: g.target.angle, speed: 0 }); }

test('every street and job is connected, including both river crossings and the alleys', () => {
  for (const node of nodes) assert.ok(route(0, node.id).length, `unreachable ${node.id}`);
  for (const stop of STOPS) {
    assert.ok(drivable(stop), stop.name);
    assert.ok(route(STOPS[0], stop).length);
    assert.ok(!BUILDINGS.some(b => stop.x > b.x && stop.x < b.x + b.w && stop.y > b.y && stop.y < b.y + b.h));
  }
  assert.equal(ROADS.filter(r => /Bridge|Crossing/.test(r.name)).length, 6);
  assert.equal(ROADS.filter(r => r.width < 50).length, 3);
});
test('all six roles start with reachable jobs and their own handling; free drive has no timer', () => {
  for (const mode of Object.keys(VEHICLES)) {
    const g = game(mode); assert.equal(g.state, 'playing'); assert.equal(g.player.speed, 0, 'wait for the player to accelerate'); assert.ok(drivable(g.player));
    if (g.destination) assert.ok(route(g.player, g.destination).length);
    const free = new BoroughGame(mode, { free: true, traffic: 0 }); advance(free, 2);
    assert.equal(free.remaining, 360); assert.equal(free.target, null);
    free.changeVehicle('bus'); assert.equal(free.mode, 'bus'); assert.equal(free.player.length, VEHICLES.bus.length);
  }
});
test('acceleration, braking, steering and curbs respond without leaving the road', () => {
  const g = new BoroughGame('taxi', { free: true, traffic: 0 });
  const y = g.player.y; advance(g, 1, { forward: true }); assert.ok(g.player.y < y - 35);
  const speed = g.player.speed; advance(g, .25, { back: true }); assert.ok(g.player.speed < speed);
  const angle = g.player.angle; advance(g, .25, { forward: true, right: true }); assert.notEqual(g.player.angle, angle);
  advance(g, 10, { forward: true }); assert.ok(drivable(g.player, 9));
});
test('pause and completed results freeze clocks, traffic, player position and service', () => {
  const g = game('garbage'); park(g); g.action(); g.paused = true;
  const before = JSON.stringify(g); advance(g, 4, { forward: true }); assert.equal(JSON.stringify(g), before);
  g.paused = false; g.finish(true, 'Done'); const result = JSON.stringify(g); advance(g, 3); assert.equal(JSON.stringify(g), result);
});
test('garbage requires a full stop on the correct side and collects three bins only once', () => {
  const g = game('garbage'); park(g); g.player.angle += Math.PI; g.action(); assert.equal(g.service, null);
  park(g); g.player.speed = 20; g.action(); assert.equal(g.service, null);
  park(g); g.action(); advance(g, 2); assert.equal(g.stats.bins, 0);
  advance(g, 3.1); assert.equal(g.stats.bins, 3); assert.equal(g.completed, 1);
  advance(g, 2); assert.equal(g.stats.bins, 3);
});
test('moving away interrupts collection and permits a fresh attempt', () => {
  const g = game('garbage'); park(g); g.action(); advance(g, .5, { forward: true });
  assert.equal(g.service, null); assert.equal(g.stats.bins, 0); park(g); g.action(); advance(g, 5.1); assert.equal(g.stats.bins, 3);
});
test('late garbage, bus and taxi jobs keep playing and earn a reduced bonus', () => {
  for (const mode of ['garbage', 'bus', 'taxi']) {
    const g = game(mode); if (mode === 'taxi') g.taxiStage = 'delivery';
    g.deadline = -10; park(g); g.action(); advance(g, 5.2);
    assert.equal(g.state, 'playing', mode); assert.equal(g.completed, 1, mode); assert.equal(g.score, 120, mode); assert.equal(g.late, 1, mode);
  }
});
test('early bus boarding waits for departure, then earns an on-time rating', () => {
  const g = game('bus'); park(g); g.deadline = 12; g.action(); advance(g, 5);
  assert.equal(g.completed, 0); assert.ok(g.service); advance(g, 7.1);
  assert.equal(g.completed, 1); assert.equal(g.late, 0); assert.ok(g.stats.passengers >= 4); assert.ok(g.score > 300);
});
test('taxi pickup and delivery are separate jobs; only a delivery earns a fare', () => {
  const g = game('taxi'); const pickup = g.target.id; park(g); g.action(); advance(g, 2);
  assert.equal(g.taxiStage, 'delivery'); assert.notEqual(g.target.id, pickup); assert.equal(g.stats.fares, 0);
  park(g); g.action(); advance(g, 2); assert.equal(g.stats.fares, 1); assert.equal(g.taxiStage, 'pickup');
});
test('fire hose must be connected and aimed; all hotspots must be extinguished', () => {
  const g = game('fire'); park(g); const f = g.hotspots[0]; advance(g, 1, { spray: true, aim: f }); assert.equal(f.heat, 1);
  g.action(); assert.equal(g.hose, true); advance(g, 1, { spray: true, aim: { x: 0, y: 0 } }); assert.equal(f.heat, 1);
  for (const hotspot of [...g.hotspots]) advance(g, 2.5, { spray: true, aim: { x: hotspot.x, y: hotspot.y } });
  assert.equal(g.completed, 1); assert.equal(g.stats.fires, 1); assert.equal(g.hose, false);
});
test('a failed fire incident moves to the next call and three incidents end the shift', () => {
  const g = game('fire');
  for (let i = 0; i < 3; i++) { g.deadline = g.time - 1; advance(g, .1); }
  assert.equal(g.failed, 3); assert.equal(g.state, 'results'); assert.equal(g.success, false);
});
test('police can stop the robber without a collision and lose when it reaches the exit', () => {
  const g = game('police'); const r = g.robber; r.cruise = 0; r.speed = 0;
  Object.assign(g.player, { x: r.x + Math.cos(r.angle) * 45, y: r.y + Math.sin(r.angle) * 45, speed: 0 });
  advance(g, 3.2); assert.equal(g.state, 'results'); assert.equal(g.success, true); assert.equal(g.bumps, 0);
  const lose = game('police'); lose.robber.arrived = true; advance(lose, .1); assert.equal(lose.success, false);
});
test('escape needs every cruiser to lose sight; remaining stationary gets the player caught', () => {
  const g = game('escape'); advance(g, 12); assert.equal(g.state, 'results'); assert.equal(g.success, false);
  const win = game('escape'); Object.assign(win.player, { x: 4382, y: 1290 }); advance(win, 10.2);
  assert.equal(win.state, 'results'); assert.equal(win.success, true); assert.ok(win.pursuers.every(c => c.lost));
});
test('traffic follows streets for sustained runs and gentle contact never creates a damage state', () => {
  const g = new BoroughGame('taxi', { seed: 12, free: true, traffic: 40 });
  for (let i = 0; i < 1000; i++) { g.update(.1); if (i % 50 === 0) for (const c of g.traffic) assert.ok(drivable(c), `off-road traffic at ${c.x},${c.y}`); }
  const c = g.traffic[0]; Object.assign(g.player, { x: c.x, y: c.y, speed: 20 }); g.update(.02);
  assert.ok(g.bumps > 0); assert.equal(g.state, 'playing'); assert.ok(!('damage' in g.player));
});
test('a completed bus route ends once and records all passengers', () => {
  const g = game('bus');
  for (let i = 0; i < 8; i++) { g.deadline = g.time - 1; park(g); g.action(); advance(g, 4.2); }
  assert.equal(g.completed, 8); assert.equal(g.state, 'results'); assert.equal(g.success, true); assert.ok(g.stats.passengers >= 32);
});
test('roadside assist clears job interaction, stops the car and preserves completed work', () => {
  const g = game('garbage'); g.score = 200; g.completed = 2; park(g); g.action(); g.rescue();
  assert.equal(g.score, 150); assert.equal(g.completed, 2); assert.equal(g.service, null); assert.equal(g.player.speed, 0); assert.ok(drivable(g.player));
});

test('collision bounds include the nose of a long bus and respect vehicle rotation', () => {
  const bus = { x: 0, y: 0, angle: 0, length: 55, width: 21 };
  const car = { x: 39, y: 0, angle: 0, length: 34, width: 17 };
  assert.ok(vehiclesTouch(bus, car)); car.y = 30; assert.ok(!vehiclesTouch(bus, car));
  car.x = 0; car.y = 24; car.angle = Math.PI / 2; assert.ok(vehiclesTouch(bus, car));
});
