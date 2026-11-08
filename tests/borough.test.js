import test from 'node:test';
import assert from 'node:assert/strict';
import { BoroughGame, VEHICLES, distance, vehiclesTouch } from '../borough-engine.js';
import { nodes, edges, STOPS, ROADS, BUILDINGS, drivable, route, nearestNode, navigationRoute, roadPosition, BUS_STOPS, GARBAGE_SITES, signalGreen } from '../borough-city.js';
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
    if(mode==='garbage'){g.time=490;g.remaining=-10;} g.deadline = -10; park(g); g.action(); advance(g, 5.2);
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
  const win = game('escape'); Object.assign(win.player, { x: 4382, y: 1290 }); advance(win, 25.2);
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
  for (let i = 0; i < BUS_STOPS.length; i++) { g.deadline = g.time - 1; park(g); g.action(); advance(g, 4.2); }
  assert.equal(g.completed, 10); assert.equal(g.state, 'results'); assert.equal(g.success, true); assert.ok(g.stats.passengers >= 40);
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


test('navigation goes straight to a destination ahead on the same street, through or between intersections', () => {
  for(const [start,end] of [
    [{x:1518,y:2450,angle:-Math.PI/2},{x:1537,y:2370}],
    [{x:630,y:1940,angle:Math.PI},{x:350,y:1940}],
    [{x:1518,y:2700,angle:-Math.PI/2},{x:1537,y:2070}],
  ]){
    const path=navigationRoute(start,end).points;
    for(let i=1;i<path.length;i++)assert.ok((path[i].x-path[i-1].x)*Math.cos(start.angle)+(path[i].y-path[i-1].y)*Math.sin(start.angle)>-.1,'route reversed behind the driver');
  }
});
test('diagonal streets are drivable and route across real intersection nodes', () => {
  assert.equal(ROADS.filter(r=>r.diagonal).length,3);assert.ok(new Set(ROADS.map(r=>r.width)).size>=7);
  const path=navigationRoute({x:1650,y:2670,angle:-Math.PI/4},{x:2250,y:2070}).points;
  assert.ok(path.every(p=>drivable(p,15)));assert.ok(path.every(p=>Math.abs(p.x+p.y-4320)<.01));
});
test('the garbage truck can reverse off a curb when its nose starts outside the road', () => {
  const g=new BoroughGame('garbage',{free:true,traffic:0});Object.assign(g.player,{x:1556,y:2380,angle:0,speed:0});
  const before=g.player.x;advance(g,1.8,{back:true});assert.ok(g.player.x<before-25,'reverse movement was pinned by the front bumper');assert.ok(drivable(g.player));
});
test('bus stops follow a clockwise line, use the right curb and leave space before a turn', () => {
  assert.equal(BUS_STOPS.length,10);
  for(const stop of BUS_STOPS){
    const p=roadPosition(stop,stop.angle), side=(stop.x-p.x)*-Math.sin(stop.angle)+(stop.y-p.y)*Math.cos(stop.angle);
    assert.ok(side>0,stop.name+' is on the wrong curb');
    const path=navigationRoute({...stop,angle:stop.angle},BUS_STOPS[(stop.id+1)%BUS_STOPS.length],{arrivalAngle:BUS_STOPS[(stop.id+1)%BUS_STOPS.length].angle}).points;
    const next=path.find(p=>distance(p,stop)>70);assert.ok(next,'no onward route');
    assert.ok((next.x-stop.x)*Math.cos(stop.angle)+(next.y-stop.y)*Math.sin(stop.angle)>90,stop.name+' turns immediately after departure');
    assert.ok(Math.min(...nodes.map(n=>distance(stop,n)))>120,stop.name+' is too close to a junction');
  }
});
test('garbage is a persistent citywide round that can be collected in any order and completed after the bonus clock', () => {
  const g=game('garbage');assert.equal(g.garbageSites.length,58);assert.equal(GARBAGE_SITES.length*3,174);
  for(const id of [50,5,32]){assert.ok(g.selectGarbageSite(id));park(g);g.action();advance(g,5.2);assert.ok(g.garbageSites[id].collected);}
  assert.equal(g.completed,3);assert.equal(g.stats.bins,9);assert.equal(g.selectGarbageSite(50),false);
  g.time=490;g.remaining=-10;advance(g,1);assert.equal(g.state,'playing');
  g.selectGarbageSite(12);park(g);g.action();advance(g,5.2);assert.equal(g.completed,4);assert.equal(g.late,1);
});
test('the robber yields after sustained siren pressure and can then be stopped without contact', () => {
  const g=game('police');assert.equal(g.siren,false);g.action();
  for(let i=0;i<190;i++){
    const r=g.robber;Object.assign(g.player,{x:r.x-Math.cos(r.angle)*110,y:r.y-Math.sin(r.angle)*110,angle:r.angle,speed:r.speed});g.update(1/30);
  }
  assert.ok(g.robber.surrendering,'close siren pursuit did not make the robber yield');
  advance(g,1);const r=g.robber;Object.assign(g.player,{x:r.x-Math.cos(r.angle)*65,y:r.y-Math.sin(r.angle)*65,speed:0});advance(g,2.2);
  assert.equal(g.state,'results');assert.equal(g.success,true);assert.equal(g.bumps,0);
});
test('escape is no longer won by disappearing for ten seconds and sightings restart the shared search', () => {
  const g=game('escape');Object.assign(g.player,{x:4400,y:1290});advance(g,11);assert.equal(g.state,'playing');
  const c=g.pursuers[0];Object.assign(g.player,{x:c.x+Math.cos(c.angle)*100,y:c.y+Math.sin(c.angle)*100,speed:80,angle:c.angle});g.update(.02);
  assert.ok(g.escapeHidden<.1);assert.ok(g.pursuers.every(c=>c.search>14));
});
test('traffic spawns without overlap and never collapses opposing lanes into the junction center', () => {
  const g=new BoroughGame('taxi',{seed:24,free:true,traffic:108});assert.equal(g.traffic.length,108);
  for(let i=0;i<g.traffic.length;i++)for(let j=i+1;j<g.traffic.length;j++)assert.ok(!vehiclesTouch(g.traffic[i],g.traffic[j]));
  const e=edges.find(e=>e.length>250 && e.width===70);const a=g.makeAI(e.from,null,'traffic'),b=g.makeAI(e.to,null,'traffic');
  a.to=e.to;b.to=e.from;a.nextTo=g.chooseNext(a);b.nextTo=g.chooseNext(b);a.progress=.99;b.progress=.01;g.positionAI(a);g.positionAI(b);
  assert.ok(!vehiclesTouch(a,b));
});

test('clearing all garbage in a chosen reverse order completes the city round exactly once', () => {
  const g=game('garbage');
  for(const site of [...g.garbageSites].reverse()){assert.ok(g.selectGarbageSite(site.id));park(g);g.action();advance(g,5.1);}
  assert.equal(g.state,'results');assert.equal(g.success,true);assert.equal(g.completed,58);assert.equal(g.stats.bins,174);assert.ok(g.garbageSites.every(s=>s.collected));
});
test('busy intersections retain spaced queues and keep traffic moving without overlaps or visible respawns', () => {
  const g=new BoroughGame('taxi',{seed:24,free:true,traffic:80});let moving=0,samples=0;
  for(let i=0;i<400;i++){
    const before=g.traffic.map(c=>({x:c.x,y:c.y}));g.update(.1);
    for(let j=0;j<g.traffic.length;j++)if(distance(g.traffic[j],g.player)<900)assert.ok(distance(before[j],g.traffic[j])<25,'visible respawn or junction jump');
    if(i%10)continue;
    for(let j=0;j<g.traffic.length;j++){const c=g.traffic[j];assert.ok(drivable(c));moving+=c.speed>5;samples++;for(let k=j+1;k<g.traffic.length;k++)assert.ok(!vehiclesTouch(c,g.traffic[k]),'overlapping NPC traffic');}
  }
  assert.ok(moving/samples>.55,'traffic gridlocked instead of clearing its queues');
});

test('roadside assist remembers a valid outer lane on a wide avenue', () => {
  const g=new BoroughGame('garbage',{free:true,traffic:0});Object.assign(g.player,{x:1539,y:2450,angle:-Math.PI/2,speed:55});g.update(.05);
  assert.equal(g.lastSafe.x,1539);Object.assign(g.player,{x:1600,y:2450,speed:0});g.rescue();assert.equal(g.player.x,1539);assert.ok(drivable(g.player));
});
