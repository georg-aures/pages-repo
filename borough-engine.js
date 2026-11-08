import { CITY, nodes, edges, route, nearestNode, roadAt, drivable, STOPS, seeded, visibleBetween } from './borough-city.js';
export const VEHICLES = {
  escape: { name: 'The Getaway', vehicle: 'Sport convertible', tag: 'OUTRUN THE CITY', color: '#e96e50', speed: 248, accel: 150, turn: 2.8, length: 34, width: 17, goal: 'Break line of sight. Lose every pursuer for 10 seconds.', instruction: 'Corners and alleys break sight. Keep moving: police can hold you stopped.', icon: '01' },
  police: { name: 'Hot Pursuit', vehicle: 'American police cruiser', tag: 'CATCH THE GETAWAY', color: '#8ab7dd', speed: 228, accel: 135, turn: 2.6, length: 37, width: 18, goal: 'Get ahead of the robber and keep their car stopped for 3 seconds.', instruction: 'E switches your siren. Traffic yields. The red car is heading for an escape point.', icon: '02' },
  fire: { name: 'First Response', vehicle: 'Fire engine', tag: 'EVERY SECOND COUNTS', color: '#f1564f', speed: 179, accel: 100, turn: 1.9, length: 48, width: 21, goal: 'Reach the hydrant, stop, press E, then aim and hold to spray.', instruction: 'Extinguish every hotspot. Each incident has its own deadline; 3 calls complete a shift.', icon: '03' },
  garbage: { name: 'Clean Sweep', vehicle: 'Orange garbage truck', tag: 'MAKE A CLEAN GETAWAY', color: '#f49b4b', speed: 158, accel: 94, turn: 1.9, length: 45, width: 22, goal: 'Align with the collection bay, stop and press E for your crew.', instruction: 'Stay still while the workers collect all three bins. Late stops reduce your bonus.', icon: '04' },
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
  constructor(mode = 'taxi', { free = false, seed = Date.now(), traffic = 62 } = {}) {
    if (!VEHICLES[mode]) throw new Error('Unknown vehicle');
    this.random = seeded(seed); this.mode = mode; this.spec = VEHICLES[mode]; this.free = free;
    this.time = 0; this.remaining = 360; this.state = 'playing'; this.paused = false;
    this.score = 0; this.completed = 0; this.failed = 0; this.bumps = 0; this.late = 0;
    this.events = []; this.notice = ''; this.noticeTime = 0; this.siren = mode === 'police' || mode === 'fire';
    this.player = { x: 1518, y: 2450, angle: -Math.PI / 2, ...this.spec, speed: 0 };
    this.lastSafe = { x: this.player.x, y: this.player.y, angle: this.player.angle };
    this.hitCooldown = 0; this.service = null; this.departure = 0; this.routeVersion = 0; this.capture = 0;
    this.stats = { fares: 0, passengers: 0, bins: 0, fires: 0 };
    this.traffic = Array.from({ length: traffic }, (_, i) => {
      const n = nodes[Math.floor(this.random() * nodes.length)];
      const car = this.makeAI(n.id, null, 'traffic'); car.progress = this.random(); this.positionAI(car);
      car.color = ['#b4b9ad', '#ae5c4d', '#dbbc7a', '#668e9c', '#435d73', '#bbb0a4', '#877a9c'][i % 7];
      return car;
    }).filter(c => distance(c, this.player) > 110);
    this.pursuers = []; this.robber = null;
    if (free) { this.target = null; this.message('Off duty. Every borough is yours. Change vehicles from Pause.'); }
    else if (mode === 'escape') this.startEscape();
    else if (mode === 'police') this.startPolice();
    else if (mode === 'bus') { this.busStops = [0, 1, 6, 7, 5, 4, 3, 2]; this.nextJob(); }
    else this.nextJob();
  }
  message(text) { this.notice = text; this.noticeTime = 5; }
  emit(type) { this.events.push(type); }
  drainEvents() { return this.events.splice(0); }
  makeAI(nodeId, destination, kind) {
    const from = nodes[nodeId];
    const next = (destination !== null ? route(nodeId, destination)[1] : null) ?? from.links[Math.floor(this.random() * from.links.length)].to;
    const car = { from: nodeId, to: next, progress: 0, x: from.x, y: from.y, angle: 0, speed: 0, cruise: kind === 'traffic' ? 62 + this.random() * 36 : 178, kind, plan: [], block: 0, length: 34, width: 17 };
    if (destination !== null) this.planAI(car, destination);
    this.positionAI(car); return car;
  }
  planAI(car, destination) { car.plan = route(car.to, destination).slice(1); car.destination = destination; }
  positionAI(car) {
    const a = nodes[car.from], b = nodes[car.to], dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const link = a.links.find(l => l.to === car.to), offset = (link?.edge.width || 74) * 0.23;
    const blend = Math.min(1, car.progress * 6, (1 - car.progress) * 6);
    car.x = a.x + dx * car.progress - dy / len * offset * blend;
    car.y = a.y + dy * car.progress + dx / len * offset * blend;
    car.angle = Math.atan2(dy, dx);
  }
  moveAI(car, dt) {
    let speed = car.cruise;
    const remaining = distance(nodes[car.from], nodes[car.to]) * (1 - car.progress);
    if (car.kind === 'traffic') {
      const vertical = Math.abs(Math.sin(car.angle)) > 0.5;
      const green = (Math.floor((this.time + nodes[car.to].x / 200) / 6) % 2 === 0) === vertical;
      if (!green && remaining < 55 && nodes[car.to].links.length > 2) speed = remaining < 23 ? 0 : speed * 0.4;
      if (this.siren && ['fire', 'police'].includes(this.mode) && distance(car, this.player) < 250) speed *= .3;
      for (const other of this.traffic) {
        if (other === car || distance(car, other) > 65) continue;
        const ahead = (other.x - car.x) * Math.cos(car.angle) + (other.y - car.y) * Math.sin(car.angle);
        const across = Math.abs(-(other.x - car.x) * Math.sin(car.angle) + (other.y - car.y) * Math.cos(car.angle));
        if (ahead > 0 && ahead < 55 && across < 18) speed = Math.min(speed, ahead < 36 ? 0 : 35);
      }
    }
    const ahead = (this.player.x - car.x) * Math.cos(car.angle) + (this.player.y - car.y) * Math.sin(car.angle);
    const across = Math.abs(-(this.player.x - car.x) * Math.sin(car.angle) + (this.player.y - car.y) * Math.cos(car.angle));
    if (ahead > 0 && ahead < (car.kind === 'robber' ? 76 : 48) && across < 25 && Math.abs(this.player.speed) < 55) speed = 0;
    car.block = Math.max(0, car.block - dt); if (car.block > 0) speed = 0;
    car.speed += (speed - car.speed) * Math.min(1, dt * 5);
    let travel = car.speed * dt;
    for (let guard = 0; travel > 0 && guard < 10; guard++) {
      const length = distance(nodes[car.from], nodes[car.to]);
      const available = (1 - car.progress) * length;
      if (travel < available) { car.progress += travel / length; travel = 0; }
      else {
        travel -= available;
        const old = car.from; car.from = car.to; car.progress = 0;
        if (car.from === car.destination && car.kind === 'robber') { car.arrived = true; travel = 0; car.speed = 0; }
        const links = nodes[car.from].links.filter(l => l.to !== old);
        car.to = car.plan.shift() ?? (links.length ? links[Math.floor(this.random() * links.length)].to : old);
      }
    }
    this.positionAI(car);
  }
  startEscape() {
    this.remaining = 180; this.escapeSearch = 10;
    const starting = nearestNode({ x: 1500, y: 2820 });
    for (let i = 0; i < 3; i++) {
      const car = this.makeAI(starting.id, nearestNode(this.player).id, 'pursuer');
      car.progress = i * .16; car.cruise = 184 + i * 5; car.search = 10; car.lost = false;
      this.positionAI(car); this.pursuers.push(car);
    }
    this.message('Dispatch: three cruisers on your tail. Break sight, then stay hidden for 10 seconds.');
  }
  startPolice() {
    this.remaining = 180;
    const start = nearestNode({ x: 1500, y: 2220 });
    this.robber = this.makeAI(start.id, nearestNode({ x: 4400, y: 660 }).id, 'robber');
    this.robber.cruise = 155; this.robber.color = '#db625f';
    this.target = { x: 4400, y: 660, name: 'Robber escape point' };
    this.message('Dispatch: red getaway car, northbound. Get ahead and bring it to a safe stop.');
  }
  selectStop(min = 350, max = 1600) {
    const options = STOPS.filter(s => distance(s, this.player) > min && distance(s, this.player) < max && s.id !== this.lastStop);
    return (options.length ? options : STOPS)[Math.floor(this.random() * (options.length || STOPS.length))];
  }
  nextJob() {
    this.service = null; this.departure = 0;
    let stop;
    if (this.mode === 'bus') stop = STOPS[this.busStops[this.completed]];
    else stop = this.selectStop(350, this.mode === 'fire' ? 1300 : 1500);
    this.target = { ...stop }; this.lastStop = stop.id; this.routeVersion++;
    const path = route(this.player, stop);
    const length = path.reduce((sum, id, i) => sum + (i ? distance(nodes[id], nodes[path[i - 1]]) : 0), 0);
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
      const path = route(this.player, this.target);
      const length = path.reduce((s, id, i) => s + (i ? distance(nodes[id], nodes[path[i - 1]]) : 0), 0);
      this.deadline = this.time + Math.max(35, length / (this.spec.speed * .5) + 15);
      this.jobLate = false; this.jobBumps = this.bumps; this.message(`“${this.customer}” → ${this.target.name}`); this.emit('board'); return;
    }
    const late = (this.arrivalTime ?? this.time) > this.deadline;
    if (late) this.late++;
    const clean = this.bumps === this.jobBumps ? 100 : 0;
    const bonus = (late ? 120 : 300 + Math.max(0, Math.round(this.deadline - (this.arrivalTime ?? this.time))) * 5) + (late ? 0 : clean);
    this.score += bonus; this.completed++; this.emit('job');
    if (mode === 'bus') this.stats.passengers += 4 + Math.floor(this.random() * 12);
    if (mode === 'garbage') this.stats.bins += 3;
    if (mode === 'taxi') this.stats.fares++;
    if ((mode === 'bus' && this.completed >= this.busStops.length) || (mode === 'garbage' && this.completed >= 9)) this.finish(true, 'Route complete');
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
    const front = { x: next.x + Math.cos(p.angle) * spec.length * .35, y: next.y + Math.sin(p.angle) * spec.length * .35 };
    if (drivable(next, 8) && drivable(front, 8)) { p.x = next.x; p.y = next.y; }
    else { p.speed *= -.18; if (this.hitCooldown <= 0) { this.hitCooldown = .5; this.emit('bump'); } }
    if (roadAt(p).distance < 25 && Math.abs(p.speed) > 25) this.lastSafe = { x: p.x, y: p.y, angle: p.angle };
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
      const r = this.robber, close = distance(p, r) < 83;
      if (close && Math.abs(p.speed) < 40 && r.speed < 45) this.capture += dt;
      else this.capture = Math.max(0, this.capture - dt * .6);
      if (this.capture >= 3) { this.score += 1500 + Math.round(this.remaining) * 5; this.completed = 1; this.finish(true, 'Getaway stopped'); }
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
    if (this.remaining <= 0 && this.state === 'playing') {
      this.finish(!['escape', 'police'].includes(this.mode), ['escape', 'police'].includes(this.mode) ? 'Pursuit timed out' : 'Shift complete');
    }
  }
  updateEscape(dt) {
    const playerNode = nearestNode(this.player).id;
    for (const c of this.pursuers) {
      if (c.lost) continue;
      const seen = distance(c, this.player) < 510 && visibleBetween(c, this.player);
      if (seen) { c.search = 10; c.lastKnown = playerNode; }
      else c.search = Math.max(0, c.search - dt);
      if (Math.floor(this.time) !== c.planTime) { this.planAI(c, c.lastKnown ?? playerNode); c.planTime = Math.floor(this.time); }
      this.moveAI(c, dt);
      if (c.search <= 0) { c.lost = true; this.message('One cruiser lost the trail.'); }
    }
    const remaining = this.pursuers.filter(c => !c.lost);
    const held = remaining.some(c => distance(c, this.player) < 64) && Math.abs(this.player.speed) < 25;
    this.capture = Math.max(0, this.capture + dt * (held ? 1 : -1));
    if (this.capture >= 4) this.finish(false, 'Boxed in');
    else if (!remaining.length) { this.score += 2000 + Math.round(this.remaining) * 8; this.completed = 1; this.finish(true, 'You lost the tail'); }
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
    return `${this.mode === 'bus' ? 'BUS STOP' : 'COLLECT'} / ${this.target.name}`;
  }
  get destination() { return this.mode === 'police' && !this.free ? this.robber : this.target; }
  get rating() { return this.score >= 3000 ? 'GOLD' : this.score >= 1500 ? 'SILVER' : this.score >= 500 ? 'BRONZE' : 'ROOKIE'; }
}
