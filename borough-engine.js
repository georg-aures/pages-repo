import { nodes, edges, route, navigationRoute, nearestNode, roadAt, roadPosition, drivable, STOPS, BUS_STOPS, BUS_LINE, GARBAGE_SITES, seeded, visibleBetween, signalGreen } from './borough-city.js?v=2';
export const VEHICLES = {
  escape: { name: 'The Getaway', vehicle: 'Sport convertible', tag: 'OUTRUN THE CITY', color: '#e96e50', speed: 248, accel: 150, turn: 2.8, length: 34, width: 17, goal: 'Break line of sight. Stay hidden from the police search for 15 seconds.', instruction: 'Police share sightings and investigate your last known route. Break sight and keep moving until the search ends.', icon: '01' },
  police: { name: 'Hot Pursuit', vehicle: 'American police cruiser', tag: 'CATCH THE GETAWAY', color: '#8ab7dd', speed: 228, accel: 135, turn: 2.6, length: 37, width: 18, goal: 'Switch on your siren and follow the robber closely until they pull over. Stop nearby to finish.', instruction: 'E switches your siren. Stay within the marked pursuit range for 6 seconds to make the robber yield, then brake alongside. Blocking their car also works.', icon: '02' },
  fire: { name: 'First Response', vehicle: 'Fire engine', tag: 'EVERY SECOND COUNTS', color: '#f1564f', speed: 179, accel: 100, turn: 1.9, length: 48, width: 21, goal: 'Reach the hydrant, stop, press E, then aim and hold to spray.', instruction: 'Extinguish every hotspot. Each incident has its own deadline; 3 calls complete a shift.', icon: '03' },
  garbage: { name: 'Clean Sweep', vehicle: 'Orange garbage truck', tag: 'MAKE A CLEAN GETAWAY', color: '#f49b4b', speed: 158, accel: 94, turn: 1.9, length: 45, width: 22, goal: 'Align with the collection bay, stop and press E for your crew.', instruction: 'Clear all 174 bins in any order. M opens the route planner: select a collection point. The bonus clock can expire without ending your route.', icon: '04' },
  bus: { name: 'On the Line', vehicle: 'City bus', tag: 'YOUR CITY. YOUR ROUTE.', color: '#70c5bc', speed: 169, accel: 86, turn: 1.8, length: 55, width: 21, goal: 'Follow the route. Park in the bay and press E to open the doors.', instruction: 'Keep still for boarding. Early? Wait for departure. Late? Finish the route for a lower bonus.', icon: '05' },
  taxi: { name: 'Fare Game', vehicle: 'New York taxi', tag: 'TIME IS TIP MONEY', color: '#f4cb59', speed: 216, accel: 132, turn: 2.55, length: 35, width: 18, goal: 'Stop at the pickup and press E. Deliver your passenger to the next marker.', instruction: 'Fast deliveries earn bigger tips. Late fares still count. Pick a shortcut and go.', icon: '06' },
};
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
export function vehiclesTouch(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const angle of [a.angle, a.angle + Math.PI / 2, b.angle, b.angle + Math.PI / 2]) {
    const projection = Math.abs(dx * Math.cos(angle) + dy * Math.sin(angle));
    const radius = car => Math.abs(Math.cos(car.angle - angle)) * car.length / 2 + Math.abs(Math.sin(car.angle - angle)) * car.width / 2;
    if (projection > radius(a) + radius(b) + 1) return false;
  }
  return true;
}
const taxiLines = ['My meeting started three minutes ago.', 'The scenic route? My wallet says no.', 'I left the oven on. Probably.', 'That bridge is my lucky bridge.', 'Five stars if my coffee survives.', 'I am late for a very important nap.', 'Can we beat the subway? For science.'];
export class BoroughGame {
  constructor(mode = 'taxi', { free = false, seed = Date.now(), traffic = 108 } = {}) {
    if (!VEHICLES[mode]) throw new Error('Unknown vehicle');
    this.random = seeded(seed); this.mode = mode; this.spec = VEHICLES[mode]; this.free = free;
    this.time = 0; this.remaining = 360; this.state = 'playing'; this.paused = false;
    this.score = 0; this.completed = 0; this.failed = 0; this.bumps = 0; this.late = 0;
    this.events = []; this.notice = ''; this.noticeTime = 0; this.siren = mode === 'police' || mode === 'fire';
    this.player = { x: 1518, y: 2450, angle: -Math.PI / 2, ...this.spec, speed: 0 };
    this.lastSafe = { x: this.player.x, y: this.player.y, angle: this.player.angle };
    this.hitCooldown = 0; this.service = null; this.departure = 0; this.routeVersion = 0; this.capture = 0;
    this.stats = { fares: 0, passengers: 0, bins: 0, fires: 0 };
    this.nextCarId = 1; this.junctions = new Map(); this.traffic = []; this.pursuers = []; this.robber = null;
    this.spawnTraffic(traffic);
    if (free) { this.target = null; this.message('Off duty. Every borough is yours. Change vehicles from Pause.'); }
    else if (mode === 'escape') this.startEscape();
    else if (mode === 'police') this.startPolice();
    else if (mode === 'bus') { this.busStops = BUS_STOPS; this.busLine = BUS_LINE; this.remaining = 480; this.nextJob(); }
    else if (mode === 'garbage') { this.garbageSites = GARBAGE_SITES.map(s => ({ ...s })); this.remaining = 480; this.nextJob(); }
    else this.nextJob();
  }
  message(text) { this.notice = text; this.noticeTime = 5; }
  emit(type) { this.events.push(type); }
  drainEvents() { return this.events.splice(0); }
  makeAI(nodeId, destination, kind) {
    const from = nodes[nodeId];
    const next = (destination !== null ? route(nodeId, destination)[1] : null) ?? from.links[Math.floor(this.random() * from.links.length)].to;
    const car = { id: this.nextCarId++, from: nodeId, to: next, progress: 0, x: from.x, y: from.y, angle: 0, speed: 0, cruise: kind === 'traffic' ? 72 + this.random() * 30 : 210, kind, plan: [], block: 0, length: 34, width: 17, wait: 0, lane: this.nextCarId % 2, prevFrom: null, crossing: null, destination: null, arrived: false, surrendering: false, roadAngle: 0, rerouteTime: 0 };
    if (destination !== null) this.planAI(car, destination); else car.nextTo = this.chooseNext(car);
    this.positionAI(car); return car;
  }
  spawnTraffic(count) {
    const candidates = edges.filter(e => e.width >= 55 && e.length > 160);
    const nearby = candidates.filter(e => distance(nodes[e.from], this.player) < 1100);
    const colors = ['#b4b9ad', '#ae5c4d', '#dbbc7a', '#668e9c', '#435d73', '#bbb0a4', '#877a9c'];
    for (let tries = 0; this.traffic.length < count && tries < count * 35; tries++) {
      const pool = this.traffic.length < count * .5 && nearby.length ? nearby : candidates;
      const edge = pool[Math.floor(this.random() * pool.length)], reverse = this.random() < .5;
      const car = this.makeAI(reverse ? edge.to : edge.from, null, 'traffic');
      car.to = reverse ? edge.from : edge.to; car.progress = .2 + this.random() * .6; car.nextTo = this.chooseNext(car); this.positionAI(car);
      if (distance(car, this.player) < 140 || this.traffic.some(c => distance(car, c) < 65)) continue;
      car.color = colors[this.traffic.length % colors.length]; this.traffic.push(car);
    }
  }
  chooseNext(car) {
    if (car.plan.length) return car.plan[0];
    let links = nodes[car.to].links.filter(l => l.to !== car.from && (car.kind !== 'traffic' || l.edge.width >= 55));
    if (!links.length) links = nodes[car.to].links;
    const incoming = Math.atan2(nodes[car.to].y - nodes[car.from].y, nodes[car.to].x - nodes[car.from].x);
    const choices = links.map(l => {
      const count = this.traffic.filter(c => c.from === car.to && c.to === l.to).length;
      const angle = Math.atan2(nodes[l.to].y - nodes[car.to].y, nodes[l.to].x - nodes[car.to].x);
      return { id: l.to, weight: (Math.cos(angle - incoming) > .8 ? 2 : 1) / (1 + count * 3) };
    });
    let n = this.random() * choices.reduce((sum, c) => sum + c.weight, 0);
    return choices.find(c => (n -= c.weight) <= 0)?.id ?? choices[0].id;
  }
  planAI(car, destination) { car.plan = route(car.to, destination).slice(1); car.destination = destination; car.nextTo = this.chooseNext(car); }
  laneOffset(car, from, to) {
    const width = nodes[from].links.find(l => l.to === to)?.edge.width || 74;
    return width >= 96 ? width * (car.lane ? .375 : .125) : width * .25;
  }
  junctionPoint(car, before, at, after) {
    const n = nodes[at], next = nodes[after], len = distance(n, next);
    const u = { x: (next.x - n.x) / len, y: (next.y - n.y) / len }, offset = this.laneOffset(car, at, after);
    if (before == null) return { x: n.x - u.y * offset, y: n.y + u.x * offset };
    const prev = nodes[before], d = distance(prev, n), v = { x: (n.x - prev.x) / d, y: (n.y - prev.y) / d };
    const previousOffset = this.laneOffset(car, before, at), det = v.x * u.y - v.y * u.x;
    const a = { x: n.x - v.y * previousOffset, y: n.y + v.x * previousOffset }, b = { x: n.x - u.y * offset, y: n.y + u.x * offset };
    if (Math.abs(det) < .01) return b;
    const t = ((b.x - a.x) * u.y - (b.y - a.y) * u.x) / det;
    const result = { x: a.x + v.x * t, y: a.y + v.y * t };
    return distance(result, n) < 80 && drivable(result,0) ? result : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }
  positionAI(car) {
    const a = nodes[car.from], b = nodes[car.to], len = distance(a, b), dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    const offset = this.laneOffset(car, car.from, car.to);
    const start = this.junctionPoint(car, car.prevFrom, car.from, car.to), end = this.junctionPoint(car, car.from, car.to, car.nextTo ?? car.from);
    const position = t => {
      let x = a.x + dx * t * len - dy * offset, y = a.y + dy * t * len + dx * offset;
      const blend = Math.min(65,len/2);
      const f = Math.max(0, 1 - t * len / blend), z = Math.max(0, 1 - (1 - t) * len / blend);
      x += (start.x - (a.x - dy * offset)) * f * f + (end.x - (b.x - dy * offset)) * z * z;
      y += (start.y - (a.y + dx * offset)) * f * f + (end.y - (b.y + dx * offset)) * z * z;
      return { x, y };
    };
    const p = position(car.progress), p1 = position(Math.max(0, car.progress - .001)), p2 = position(Math.min(1, car.progress + .001));
    car.x = p.x; car.y = p.y; car.angle = Math.atan2(p2.y - p1.y, p2.x - p1.x); car.roadAngle = Math.atan2(dy, dx);
  }
  moveAI(car, dt) {
    if (car.arrived) return;
    const edge = nodes[car.from].links.find(l => l.to === car.to).edge;
    const remaining = edge.length * (1 - car.progress), junction = nodes[car.to], controlled = junction.links.length > 2;
    let speed = car.cruise;
    if (car.kind === 'traffic') speed = Math.min(speed, edge.width < 75 ? 78 : 105);
    if (remaining < 100 && Math.abs(wrap(Math.atan2(nodes[car.nextTo].y - junction.y, nodes[car.nextTo].x - junction.x) - car.roadAngle)) > .5) speed = Math.min(speed, car.kind === 'traffic' ? 64 : 125);
    if (car.kind === 'traffic' && this.siren && ['fire', 'police'].includes(this.mode) && distance(car, this.player) < 230) speed *= .65;
    if (car.surrendering) speed = 0;
    const otherCars = [...this.traffic, ...this.pursuers, ...(this.robber ? [this.robber] : [])];
    let clearance = Infinity;
    for (const other of otherCars) {
      if (other === car || distance(car, other) > 130) continue;
      if (other.from === car.from && other.to === car.to && Math.abs(this.laneOffset(car, car.from, car.to) - this.laneOffset(other, other.from, other.to)) < 20) {
        const gap = (other.progress - car.progress) * edge.length;
        if (gap > 0) clearance = Math.min(clearance, gap - 49);
      }
      const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
      const across = Math.abs(-(other.x - car.x) * Math.sin(car.angle) + (other.y - car.y) * Math.cos(car.angle));
      if (ahead > 0 && across < 17 && Math.cos(other.angle - car.angle) > .3) clearance = Math.min(clearance, ahead - 48);
    }
    const ahead = (this.player.x - car.x) * Math.cos(car.angle) + (this.player.y - car.y) * Math.sin(car.angle);
    const across = Math.abs(-(this.player.x - car.x) * Math.sin(car.angle) + (this.player.y - car.y) * Math.cos(car.angle));
    if (ahead > 0 && ahead < (car.kind === 'robber' ? 100 : 80) && across < (this.player.width + car.width) / 2 + 4 && Math.abs(this.player.speed) < 65) clearance = Math.min(clearance, ahead - (this.player.length + car.length) / 2 - 8);
    if (clearance < 45) speed = Math.min(speed, Math.max(0, clearance * 2));
    const stopLine = Math.max(...junction.links.map(l=>l.edge.width))/2 + 45;
    if (controlled && remaining < stopLine + 70 && remaining > 32 && car.crossing !== car.to) {
      const held = this.junctions.get(car.to);
      const green = car.kind !== 'traffic' || signalGreen(junction, this.time, car.roadAngle);
      const out = nodes[car.nextTo], outAngle = Math.atan2(out.y - junction.y, out.x - junction.x), offset = this.laneOffset(car, car.to, car.nextTo);
      const exit = { x: junction.x + Math.cos(outAngle) * 85 - Math.sin(outAngle) * offset, y: junction.y + Math.sin(outAngle) * 85 + Math.cos(outAngle) * offset };
      const exitBlocked = otherCars.some(c => c !== car && c.speed < 40 && c.from === car.to && c.to === car.nextTo && c.progress * distance(nodes[c.from],nodes[c.to]) < 115 && Math.abs(this.laneOffset(car,car.to,car.nextTo)-this.laneOffset(c,c.from,c.to)) < 20);
      if (!green || exitBlocked || (held && held.id !== car.id && held.until > this.time)) { speed = Math.min(speed, Math.max(0, (remaining - stopLine) * 2)); clearance = Math.min(clearance, Math.max(0,remaining-stopLine)); }
      else if (remaining < stopLine + 20) { this.junctions.set(car.to, { id: car.id, until: this.time + 5 }); car.crossing = car.to; }
    }
    car.block = Math.max(0, car.block - dt); if (car.block > 0) speed = 0;
    car.speed += Math.max(-210 * dt, Math.min(95 * dt, speed - car.speed));
    let travel = Math.min(car.speed * dt, Math.max(0, clearance));
    const saved = { from: car.from, to: car.to, progress: car.progress, prevFrom: car.prevFrom, nextTo: car.nextTo, plan: [...car.plan], arrived: car.arrived };
    for (let guard = 0; travel > 0 && guard < 8; guard++) {
      const length = distance(nodes[car.from], nodes[car.to]), available = (1 - car.progress) * length;
      if (travel < available) { car.progress += travel / length; travel = 0; }
      else {
        travel -= available; car.prevFrom = car.from; car.from = car.to; car.to = car.nextTo; car.progress = 0;
        if (car.from === car.destination && car.kind === 'robber') { car.arrived = true; travel = 0; car.speed = 0; }
        if (car.plan[0] === car.to) car.plan.shift(); car.nextTo = this.chooseNext(car);
      }
    }
    this.positionAI(car);
    if (otherCars.some(c => c !== car && distance(car, c) < 62 && vehiclesTouch(car, c))) {
      Object.assign(car, saved); this.positionAI(car); car.speed = 0;
    }
    car.wait = car.speed < 1 ? car.wait + dt : 0;
    if(car.kind==='traffic' && car.wait>14 && remaining>stopLine-5 && this.time-car.rerouteTime>14){const alternatives=nodes[car.to].links.filter(l=>l.to!==car.from&&l.to!==car.nextTo&&l.edge.width>=55);if(alternatives.length)car.nextTo=alternatives[Math.floor(this.random()*alternatives.length)].to;car.rerouteTime=this.time;}
    if (car.crossing != null && car.from === car.crossing && car.progress * distance(nodes[car.from], nodes[car.to]) > 66) {
      if (this.junctions.get(car.crossing)?.id === car.id) this.junctions.delete(car.crossing); car.crossing = null;
    }
  }
  maintainTraffic() {
    if (Math.floor(this.time / 5) === this.trafficCheck) return;
    this.trafficCheck = Math.floor(this.time / 5);
    const close = this.traffic.filter(c => distance(c, this.player) < 1000).length;
    const car = this.traffic.find(c => distance(c, this.player) > 1100 && (c.wait > 24 || (close < 18 && distance(c, this.player) > 1800)));
    if (!car) return;
    const candidates = edges.filter(e => e.width >= 60 && e.length > 190 && distance(nodes[e.from], this.player) > 950 && distance(nodes[e.from], this.player) < 1500);
    for (let i = 0; i < 30 && candidates.length; i++) {
      const edge = candidates[Math.floor(this.random()*candidates.length)], replacement=this.makeAI(edge.from,null,'traffic');
      replacement.to=edge.to; replacement.progress=.3+this.random()*.4;replacement.nextTo=this.chooseNext(replacement);this.positionAI(replacement);
      if(distance(replacement,this.player)<1000 || this.traffic.some(c=>c!==car && distance(c,replacement)<70))continue;
      for(const [id, owner] of this.junctions) if(owner.id===car.id)this.junctions.delete(id);
      const color=car.color;Object.assign(car,replacement,{color,wait:0,crossing:null,prevFrom:null});break;
    }
  }
  startEscape() {
    this.remaining = 180; this.escapeHidden = 0; this.searchDuration = 15;
    this.lastSighting = this.pursuitNode();
    const starts = [{ x: 1500, y: 2820 }, { x: 1800, y: 2520 }, { x: 1500, y: 2820 }];
    for (let i = 0; i < 3; i++) {
      const car = this.makeAI(nearestNode(starts[i]).id, this.lastSighting, 'pursuer');
      car.progress = i === 2 ? .45 : .05; car.cruise = 222 + i * 4; car.search = 15; car.lost = false;
      this.positionAI(car); this.pursuers.push(car);
    }
    this.traffic = this.traffic.filter(c=>this.pursuers.every(p=>distance(c,p)>75));
    this.message('Dispatch: three cruisers coordinating the search. Break sight and stay hidden for 15 seconds.');
  }
  startPolice() {
    this.remaining = 180; this.compliance = 0; this.siren = false;
    const start = nearestNode({ x: 1500, y: 2220 });
    this.robber = this.makeAI(start.id, nearestNode({ x: 4400, y: 660 }).id, 'robber');
    this.traffic = this.traffic.filter(c=>distance(c,this.robber)>75);
    this.robber.cruise = 138; this.robber.color = '#db625f';
    this.target = { x: 4400, y: 660, name: 'Robber escape point' };
    this.message('E: siren ON. Stay close to the red car for 6 seconds; it will pull over. Stop alongside to finish.');
  }
  selectGarbageSite(id) {
    const site = this.garbageSites?.find(s => s.id === id && !s.collected);
    if (!site || this.service) return false;
    this.target = site; this.lastStop = site.id; this.deadline = 480; this.routeVersion++;
    return true;
  }
  nextGarbageSite() {
    const available = this.garbageSites.filter(s => !s.collected).sort((a, b) => distance(a, this.player) - distance(b, this.player));
    if (!available.length) { this.finish(true, 'City cleaned'); return; }
    this.selectGarbageSite(available[0].id); this.jobBumps = this.bumps;
    this.message(`${this.garbageSites.length - this.completed} collection points left. Any order: M opens your route planner.`);
  }
  selectStop(min = 350, max = 1600) {
    const options = STOPS.filter(s => distance(s, this.player) > min && distance(s, this.player) < max && s.id !== this.lastStop);
    return (options.length ? options : STOPS)[Math.floor(this.random() * (options.length || STOPS.length))];
  }
  nextJob() {
    this.service = null; this.departure = 0;
    if (this.mode === 'garbage') { this.nextGarbageSite(); return; }
    let stop;
    if (this.mode === 'bus') stop = this.busStops[this.completed];
    else stop = this.selectStop(350, this.mode === 'fire' ? 1300 : 1500);
    this.target = { ...stop }; this.lastStop = stop.id; this.routeVersion++;
    const length = navigationRoute(this.player, stop, { arrivalAngle: this.mode === 'bus' ? stop.angle : undefined }).length;
    this.deadline = this.time + Math.max(30, length / (this.spec.speed * .43) + 15);
    this.jobLate = false; this.jobBumps = this.bumps;
    if (this.mode === 'fire') {
      this.deadline += 45; this.hose = false;
      const side = Math.sign(stop.curbX - stop.x);
      this.hotspots = Array.from({ length: 5 }, (_, i) => ({ x: stop.curbX + side * (44 + (i % 2) * 43), y: stop.curbY - 48 + Math.floor(i / 2) * 43, heat: 1 }));
      this.message(`Dispatch: building fire at ${stop.name}. Connect at the blue hydrant.`);
    } else if (this.mode === 'taxi') {
      this.taxiStage = 'pickup'; this.customer = taxiLines[Math.floor(this.random() * taxiLines.length)];
      this.message(`New fare waiting at ${stop.name}.`);
    } else this.message(`${this.mode === 'bus' ? 'Next stop' : 'Collection point'}: ${stop.name}. Follow the marked bay.`);
  }
  stopStatus() {
    if (!this.target) return { ready: false, text: 'Explore the city' };
    const near = distance(this.player, this.target) < (this.mode === 'fire' ? 85 : 57);
    const stopped = Math.abs(this.player.speed) < 2;
    const aligned = !['bus', 'garbage'].includes(this.mode) || Math.abs(wrap(this.player.angle - this.target.angle)) < .55;
    return { near, stopped, aligned, ready: near && stopped && aligned, text: !near ? 'Follow the route' : !stopped ? 'Brake to a full stop' : !aligned ? 'Align with the bay arrow' : 'Press E / Action' };
  }
  action() {
    if (this.state !== 'playing' || this.paused) return;
    if (this.free) { this.message('Off duty. Open Pause to change your vehicle.'); return; }
    if (['police', 'escape'].includes(this.mode)) {
      if (this.mode === 'police') { this.siren = !this.siren; this.message(this.siren ? 'Siren on. Traffic will yield.' : 'Siren off.'); }
      return;
    }
    if (this.service) return;
    if (this.mode === 'garbage') {
      const nearby = this.garbageSites.filter(s => !s.collected && distance(s, this.player) < 57).sort((a,b) => distance(a,this.player)-distance(b,this.player));
      if (nearby.length) this.selectGarbageSite(nearby[0].id);
    }
    const status = this.stopStatus();
    if (!status.ready) { this.message(status.text === 'Follow the route' ? 'Get closer to the marked stopping bay.' : status.text); return; }
    this.player.speed = 0;
    if (this.mode === 'fire') { this.hose = !this.hose; this.message(this.hose ? 'Hydrant connected. Aim at the flames and hold to spray.' : 'Hose disconnected.'); this.emit('connect'); return; }
    this.arrivalTime = this.time;
    this.service = { elapsed: 0, duration: this.mode === 'garbage' ? 5 : this.mode === 'bus' ? 4 : 1.8 };
    this.message(this.mode === 'garbage' ? 'Crew collecting. Keep the truck still.' : this.mode === 'bus' ? 'Doors open. Passengers boarding.' : this.taxiStage === 'pickup' ? 'Passenger boarding…' : 'Passenger stepping out…');
  }
  finishService() {
    const mode = this.mode;
    if (mode === 'taxi' && this.taxiStage === 'pickup') {
      this.taxiStage = 'delivery'; this.target = { ...this.selectStop(800, 4200) }; this.routeVersion++;
      const length = navigationRoute(this.player, this.target).length;
      this.deadline = this.time + Math.max(35, length / (this.spec.speed * .5) + 15);
      this.jobLate = false; this.jobBumps = this.bumps; this.message(`“${this.customer}” → ${this.target.name}`); this.emit('board'); return;
    }
    const late = (this.arrivalTime ?? this.time) > this.deadline;
    if (late) this.late++;
    const clean = this.bumps === this.jobBumps ? 100 : 0;
    const timeBonus = Math.max(0, Math.round(this.deadline - (this.arrivalTime ?? this.time)));
    const bonus = (late ? 120 : 300 + (mode === 'garbage' ? Math.min(120, timeBonus) : timeBonus * 5)) + (late ? 0 : clean);
    this.score += bonus; this.completed++; this.emit('job');
    if (mode === 'bus') this.stats.passengers += 4 + Math.floor(this.random() * 12);
    if (mode === 'garbage') { this.stats.bins += this.target.bins; this.target.collected = true; }
    if (mode === 'taxi') this.stats.fares++;
    if ((mode === 'bus' && this.completed >= this.busStops.length) || (mode === 'garbage' && this.completed >= this.garbageSites.length)) this.finish(true, 'Route complete');
    else { this.nextJob(); this.message(`+${bonus} points${!late && clean ? " · clean driving bonus" : late ? " · late stop" : ""}. ${this.notice}`); }
  }
  finish(success, title) { this.state = 'results'; this.success = success; this.resultTitle = title; this.service = null; this.player.speed = 0; this.emit(success ? 'success' : 'failure'); }
  rescue() {
    if (this.state !== 'playing') return;
    Object.assign(this.player, this.lastSafe, { speed: 0 }); this.hose = false; this.service = null;
    this.score = Math.max(0, this.score - 50); this.message('Roadside assist. Back on the road (−50 points).');
  }
  changeVehicle(mode) {
    if (!this.free || !VEHICLES[mode]) return;
    this.mode = mode; this.spec = VEHICLES[mode]; Object.assign(this.player, this.spec, { speed: 0 }); this.siren = false;
    this.message(`Off duty in the ${this.spec.vehicle.toLowerCase()}.`);
  }
  update(dt, input = {}) {
    if (this.state !== 'playing' || this.paused || !Number.isFinite(dt) || dt <= 0) return;
    // Fixed substeps prevent fast vehicles tunnelling through curbs at low frame rates.
    dt = Math.min(dt, .1);
    while (dt > .00001) { const step = Math.min(dt, 1 / 60); this.step(step, input); dt -= step; if (this.state !== 'playing') break; }
  }
  step(dt, input) {
    this.time += dt; this.noticeTime = Math.max(0, this.noticeTime - dt); this.hitCooldown = Math.max(0, this.hitCooldown - dt);
    if (!this.free) this.remaining -= dt;
    const p = this.player, spec = this.spec, old = { x: p.x, y: p.y };
    const throttle = input.forward ? 1 : 0, reverse = input.back ? 1 : 0;
    if (this.hose && throttle) { this.hose = false; this.message('Hose disconnected.'); }
    const acceleration = throttle ? spec.accel : reverse ? (p.speed > 5 ? -spec.accel * 2.5 : -spec.accel * .6) : -Math.sign(p.speed) * 39;
    p.speed += acceleration * dt; if (!throttle && !reverse && Math.abs(p.speed) < 1) p.speed = 0;
    p.speed = Math.max(-spec.speed * .32, Math.min(spec.speed, p.speed));
    if (input.handbrake) p.speed *= Math.exp(-dt * 3.2);
    const steer = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    p.angle = wrap(p.angle + steer * spec.turn * Math.min(1, Math.abs(p.speed) / 55) * Math.sign(p.speed) * dt * (input.handbrake ? 1.35 : 1));
    const next = { x: p.x + Math.cos(p.angle) * p.speed * dt, y: p.y + Math.sin(p.angle) * p.speed * dt };
    const violation = position => {
      let sum = 0;
      for (const offset of [-spec.length * .35, 0, spec.length * .35]) {
        const point = { x: position.x + Math.cos(p.angle) * offset, y: position.y + Math.sin(p.angle) * offset }, r = roadAt(point);
        sum += Math.max(0, r.distance - r.width / 2 - 8);
      }
      return sum;
    };
    const before = violation(old), limit = Math.max(.001, before - .00001);
    if (violation(next) <= limit) { p.x = next.x; p.y = next.y; }
    else {
      const r = roadAt(p), len = Math.hypot(r.x2 - r.x1, r.y2 - r.y1), ux = (r.x2 - r.x1) / len, uy = (r.y2 - r.y1) / len;
      const along = (next.x - p.x) * ux + (next.y - p.y) * uy;
      const slide = { x: p.x + ux * along, y: p.y + uy * along };
      if (Math.abs(along) > .001 && violation(slide) <= limit) { p.x = slide.x; p.y = slide.y; p.speed *= Math.exp(-dt * 2); }
      else p.speed = 0;
      if (this.hitCooldown <= 0) { this.hitCooldown = .5; this.emit('bump'); }
    }
    if (drivable(p,-10) && violation(p)<.001 && Math.abs(p.speed) > 25) this.lastSafe = { x: p.x, y: p.y, angle: p.angle };
    this.maintainTraffic();
    this.traffic.forEach(c => this.moveAI(c, dt));
    if (this.robber) this.moveAI(this.robber, dt);
    if (this.mode === 'escape' && !this.free) this.updateEscape(dt);
    const all = [...this.traffic, ...this.pursuers.filter(c => !c.lost), ...(this.robber ? [this.robber] : [])];
    for (const c of all) {
      if (distance(p, c) < spec.length + c.length && vehiclesTouch(p, c) && this.hitCooldown <= 0) {
        p.x = old.x; p.y = old.y; p.speed *= -.25; c.block = .45; this.hitCooldown = .8;
        this.bumps++; this.emit('bump'); this.score = Math.max(0, this.score - 10);
      }
    }
    if (this.free) return;
    if (this.mode === 'police') {
      const r = this.robber, gap = distance(p, r);
      const following = this.siren && gap < 155 && visibleBetween(p, r) && Math.abs(p.speed - r.speed) < 110;
      this.compliance = Math.max(0, Math.min(6, this.compliance + dt * (following ? 1 : -.3)));
      if (this.compliance >= 6 && !r.surrendering) { r.surrendering = true; this.message('The robber is pulling over. Brake and stop nearby to complete the arrest.'); this.emit('connect'); }
      if (gap < 100 && Math.abs(p.speed) < 40 && r.speed < 30) this.capture += dt;
      else this.capture = Math.max(0, this.capture - dt * .6);
      if (this.capture >= 2) { this.score += 1500 + Math.round(this.remaining) * 5; this.completed = 1; this.finish(true, 'Getaway stopped'); }
      else if (r.arrived) this.finish(false, 'The robber slipped away');
    }
    if (this.service) {
      if (!this.stopStatus().ready) { this.service = null; this.message('Service interrupted. Stop in the bay and press E again.'); }
      else {
        this.service.elapsed += dt;
        const wait = this.mode === 'bus' ? this.time >= this.deadline : true;
        if (this.service.elapsed >= this.service.duration && wait) { this.service = null; this.finishService(); }
      }
    }
    if (this.mode === 'fire') this.updateFire(dt, input);
    if (this.remaining <= 0 && this.mode !== 'garbage' && this.state === 'playing') {
      this.finish(!['escape', 'police'].includes(this.mode), ['escape', 'police'].includes(this.mode) ? 'Pursuit timed out' : 'Shift complete');
    }
  }
  pursuitNode() {const e=roadPosition(this.player,this.player.angle).edge,a=nodes[e.from],b=nodes[e.to];return Math.cos(Math.atan2(b.y-a.y,b.x-a.x)-this.player.angle)>=0?e.to:e.from;}
  updateEscape(dt) {
    const seen = this.pursuers.some(c => distance(c, this.player) < 730 && visibleBetween(c, this.player));
    if (seen) { this.escapeHidden = 0; this.lastSighting = this.pursuitNode(); }
    else this.escapeHidden += dt;
    for (const c of this.pursuers) {
      c.search = Math.max(0, this.searchDuration - this.escapeHidden, 25 - this.time); c.lost = c.search <= 0;
      if (Math.floor(this.time / 1.4) !== c.planTime) {
        let destination = this.lastSighting;
        // They share actual sightings, then search the last known junction and adjacent blocks.
        if (!seen && distance(c, nodes[destination]) < 150) {
          const links = nodes[destination].links; destination = links[Math.floor(this.random() * links.length)].to;
        }
        this.planAI(c, destination); c.planTime = Math.floor(this.time / 1.4);
      }
      c.cruise = distance(c, this.player) > 500 ? 240 : 222 + (c.id % 3) * 4;
      this.moveAI(c, dt);
    }
    const held = this.pursuers.some(c => distance(c, this.player) < 72) && Math.abs(this.player.speed) < 25;
    this.capture = Math.max(0, this.capture + dt * (held ? 1 : -1));
    if (this.capture >= 4) this.finish(false, 'Boxed in');
    else if (this.escapeHidden >= this.searchDuration && this.time >= 25) { this.score += 2000 + Math.round(this.remaining) * 8; this.completed = 1; this.finish(true, 'You lost the tail'); }
  }
  updateFire(dt, input) {
    if (this.hose && distance(this.player, this.target) > 100) this.hose = false;
    if (this.hose && input.spray && input.aim) {
      for (const f of this.hotspots) {
        if (f.heat > 0 && distance(this.player, f) < 330 && distance(input.aim, f) < 34) f.heat = Math.max(0, f.heat - dt * .42);
      }
    }
    if (this.hotspots.every(f => f.heat <= 0)) {
      this.completed++; this.stats.fires++; this.score += 800 + Math.max(0, Math.round(this.deadline - this.time)) * 5; this.emit('job');
      if (this.completed + this.failed >= 3) this.finish(true, 'Fire shift complete'); else this.nextJob();
    } else if (this.time > this.deadline) {
      this.failed++; this.emit('failure');
      if (this.completed + this.failed >= 3) this.finish(this.completed > 0, 'Fire shift complete');
      else { this.nextJob(); this.message('Incident timed out. Another crew took over. New call received.'); }
    }
  }
  get objective() {
    if (this.free) return 'OFF DUTY / Explore all three districts';
    if (this.mode === 'escape') return `${this.pursuers.filter(c => !c.lost).length} CRUISERS / Break line of sight`;
    if (this.mode === 'police') return 'INTERCEPT / Stop the red getaway car';
    if (this.mode === 'fire') return this.hose ? `EXTINGUISH / ${this.hotspots.filter(f => f.heat > 0).length} hotspots remaining` : `RESPOND / ${this.target.name}`;
    if (this.mode === 'taxi') return `${this.taxiStage === 'pickup' ? 'PICKUP' : 'DELIVER'} / ${this.target.name}`;
    if (this.mode === 'garbage') return `COLLECT / ${this.completed}/${this.garbageSites.length} stops · ${this.stats.bins}/${this.garbageSites.length * 3} bins`;
    return `BUS ${this.completed + 1}/${this.busStops.length} / ${this.target.name}`;
  }
  get destination() { return this.mode === 'police' && !this.free ? this.robber : this.target; }
  get rating() { return this.score >= 3000 ? 'GOLD' : this.score >= 1500 ? 'SILVER' : this.score >= 500 ? 'BRONZE' : 'ROOKIE'; }
}
