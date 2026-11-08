import { CITY, LAND, PARK, ROADS, nodes, BUILDINGS, LANDMARKS, roadAt, nearestNode, route } from './borough-city.js';
import { VEHICLES, distance } from './borough-engine.js';
const TAU = Math.PI * 2;
const roofs = ['#a19580', '#7d8985', '#b8ab92', '#8b7770', '#6b797e', '#a28c73'];
function rect(c, color, x, y, w, h) { c.fillStyle = color; c.fillRect(x, y, w, h); }
function text(c, value, x, y, size = 10, color = '#eee5d1', align = 'left') { c.font = `600 ${size}px monospace`; c.fillStyle = color; c.textAlign = align; c.fillText(value, x, y); }
function circle(c, color, x, y, r) { c.fillStyle = color; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); }
function line(c, color, width, x, y, xx, yy) { c.strokeStyle = color; c.lineWidth = width; c.beginPath(); c.moveTo(x, y); c.lineTo(xx, yy); c.stroke(); }
const overlaps = (r, b) => r.x < b.x + b.w && r.x + r.w > b.x && r.y < b.y + b.h && r.y + r.h > b.y;
function tree(c, x, y, size = 12) { circle(c, '#243b31', x + 4, y + 5, size + 1); circle(c, '#426b48', x, y, size); circle(c, '#608354', x - 3, y - 3, size * .7); circle(c, '#78935b', x - 5, y - 5, size * .3); }
function building(c, b) {
  const { x, y, w, h } = b;
  rect(c, '#26343870', x + 11, y + 15, w + 3, h + 4);
  rect(c, '#4a4d49', x - 2, y - 2, w + 4, h + 4);
  rect(c, roofs[b.palette], x, y, w, h);
  rect(c, '#d3c7a42c', x + 3, y + 3, w - 6, 4);
  rect(c, '#202c2e50', x + w - 6, y + 6, 6, h - 6);
  rect(c, '#202c2e60', x, y + h - 7, w, 7);
  c.strokeStyle = '#3b414136'; c.lineWidth = 1;
  for (let row = y + 14; row < y + h - 6; row += 20) { c.beginPath(); c.moveTo(x + 7, row); c.lineTo(x + w - 10, row); c.stroke(); }
  const units = b.detail > .5 ? 3 : 2;
  for (let i = 0; i < units; i++) {
    const xx = x + 20 + (i % 2) * Math.max(25, w * .45), yy = y + 22 + Math.floor(i / 2) * 40;
    rect(c, '#343c3d80', xx + 3, yy + 4, 21, 17); rect(c, '#b6b8a5', xx, yy, 20, 15);
    rect(c, '#5d6968', xx + 3, yy + 3, 14, 9);
    for (let k = 0; k < 4; k++) line(c, '#9ba393', 1, xx + 4, yy + 4 + k * 2, xx + 16, yy + 4 + k * 2);
  }
  if (b.detail > .72 && h > 140) {
    circle(c, '#27383a80', x + w - 27, y + h - 31, 18); circle(c, '#4d5148', x + w - 32, y + h - 37, 16);
    circle(c, '#9b8c65', x + w - 32, y + h - 39, 13); circle(c, '#c3ad7b', x + w - 35, y + h - 42, 7);
  } else if (b.detail < .28 && w > 100) {
    rect(c, '#4c7373', x + w - 52, y + h - 58, 34, 35); rect(c, '#84aaaa', x + w - 50, y + h - 56, 30, 31);
    line(c, '#344d50', 3, x + w - 35, y + h - 56, x + w - 35, y + h - 23);
  }
  // Cornice windows and fire escapes read as tiny pixel details from above.
  for (let xx = x + 11; xx < x + w - 6; xx += 17) { rect(c, '#e7c587', xx, y + h - 4, 6, 3); rect(c, '#253a40', xx, y + 2, 6, 2); }
  if (b.district === 1 && x > 2100 && x < 2400 && y > 2220 && y < 2520) {
    rect(c, '#9c9e8b', x + 9, y + 14, w - 18, h - 30);
    rect(c, '#334f58', x + w * .25, y + 28, w * .5, h - 75);
    rect(c, '#6b999b', x + w * .25 + 4, y + 32, w * .5 - 8, h - 83);
    for (let yy = y + 38; yy < y + h - 50; yy += 18) line(c, '#adc0aa', 2, x + w * .25, yy, x + w * .75, yy);
    line(c, '#adc0aa', 2, x + w / 2, y + 28, x + w / 2, y + h - 47);
    text(c, 'GRAND TERMINAL', x + w / 2, y + h - 18, 9, '#263d45', 'center');
  } else if (b.district === 1 && x > 1800 && x < 2100 && y > 2820) {
    rect(c, '#d7d0b2', x + 18, y + 18, w - 36, h - 36);
    rect(c, '#858b7d', x + w / 2 - 15, y + h / 2 - 22, 30, 44);
    circle(c, '#e0d7b8', x + w / 2, y + h / 2, 13); circle(c, '#969c84', x + w / 2, y + h / 2, 7);
    text(c, 'CITY HALL', x + w / 2, y + h - 29, 10, '#40504b', 'center');
  } else if (b.detail > .86 && b.district === 2 && h > 200) {
    rect(c, '#526e65', x + 15, y + h / 2, w - 30, h / 2 - 20);
    c.strokeStyle = '#c2c6a0'; c.lineWidth = 2; c.strokeRect(x + 23, y + h / 2 + 8, w - 46, h / 2 - 36);
    line(c, '#c2c6a0', 2, x + 23, y + h * .75, x + w - 23, y + h * .75);
    circle(c, '#c2c6a0', x + w / 2, y + h * .75, 15); circle(c, '#526e65', x + w / 2, y + h * .75, 13);
  }
  if (b.district === 0) { rect(c, '#333c3b', x + 10, y + h - 24, Math.min(w - 20, 105), 13); text(c, 'WAREHOUSE', x + 15, y + h - 14, 8, '#bcaa7b'); }
}
function staticCity(c, bounds) {
  rect(c, '#284c58', bounds.x, bounds.y, bounds.w, bounds.h);
  for (let x = Math.floor(bounds.x / 70) * 70; x < bounds.x + bounds.w; x += 70) for (let y = Math.floor(bounds.y / 42) * 42; y < bounds.y + bounds.h; y += 42) {
    line(c, '#79a4a214', 2, x, y, x + 24, y); line(c, '#b8c6ac0c', 1, x + 35, y + 22, x + 48, y + 22);
  }
  LAND.forEach(l => { rect(c, '#152e3a', l.x - 10, l.y - 10, l.w + 20, l.h + 20); rect(c, '#b9b39a', l.x - 4, l.y - 4, l.w + 8, l.h + 8); rect(c, l.color, l.x, l.y, l.w, l.h); });
  // Boardwalk planks and ferry piers.
  for (const x of [1160, 2794, 3082]) for (const y of [2280, 2470, 2910]) {
    rect(c, '#293e40', x, y + 5, 110, 28); rect(c, '#a28c66', x, y, 110, 23);
    for (let xx = x + 5; xx < x + 110; xx += 9) line(c, '#605e4d', 1, xx, y, xx, y + 23);
  }
  const roads = ROADS.filter(r => overlaps({ x: r.x1 - 60, y: r.y1 - 60, w: r.x2 - r.x1 + 120, h: r.y2 - r.y1 + 120 }, bounds));
  c.lineCap = 'square';
  for (const r of roads) {
    const bridge = (r.x1 === 1100 && r.x2 === 1500) || (r.x1 === 2700 && r.x2 === 3200);
    line(c, bridge ? '#162e39' : '#606965', r.width + 27, r.x1, r.y1 + (bridge ? 8 : 0), r.x2, r.y2 + (bridge ? 8 : 0));
    line(c, bridge ? '#adad96' : '#b2b09c', r.width + 18, r.x1, r.y1, r.x2, r.y2);
  }
  for (const r of roads) line(c, '#3b4547', r.width, r.x1, r.y1, r.x2, r.y2);
  for (const r of roads) {
    if (r.width < 50) continue;
    c.setLineDash([16, 15]); line(c, '#cab777', 2, r.x1, r.y1, r.x2, r.y2); c.setLineDash([]);
    if (r.x1 !== r.x2) {
      line(c, '#a8a89766', 1, r.x1, r.y1 - r.width / 2 + 5, r.x2, r.y1 - r.width / 2 + 5);
      line(c, '#a8a89766', 1, r.x1, r.y1 + r.width / 2 - 5, r.x2, r.y1 + r.width / 2 - 5);
    } else {
      line(c, '#a8a89766', 1, r.x1 - r.width / 2 + 5, r.y1, r.x1 - r.width / 2 + 5, r.y2);
      line(c, '#a8a89766', 1, r.x1 + r.width / 2 - 5, r.y1, r.x1 + r.width / 2 - 5, r.y2);
    }
  }
  for (const n of nodes) {
    if (n.links.length < 3 || !overlaps({ x: n.x - 70, y: n.y - 70, w: 140, h: 140 }, bounds)) continue;
    rect(c, '#3b4547', n.x - 34, n.y - 34, 68, 68);
    for (let i = -25; i <= 25; i += 10) {
      rect(c, '#d2cdb488', n.x + i, n.y - 48, 5, 14); rect(c, '#d2cdb488', n.x + i, n.y + 35, 5, 14);
      rect(c, '#d2cdb488', n.x - 48, n.y + i, 14, 5); rect(c, '#d2cdb488', n.x + 35, n.y + i, 14, 5);
    }
    rect(c, '#35413b', n.x + 42, n.y + 42, 5, 8);
  }
  BUILDINGS.filter(b => overlaps({ x: b.x, y: b.y, w: b.w + 15, h: b.h + 20 }, bounds)).forEach(b => building(c, b));
  rect(c, '#496348', PARK.x, PARK.y, PARK.w, PARK.h);
  rect(c, '#657a4d', PARK.x + 13, PARK.y + 13, PARK.w - 26, PARK.h - 26);
  line(c, '#b3ac7b', 12, 1880, 1040, 2320, 1480); line(c, '#b3ac7b', 12, 1880, 1480, 2320, 1040);
  circle(c, '#b9b590', 2100, 1260, 60); circle(c, '#385d66', 2100, 1260, 43); circle(c, '#72a4a1', 2100, 1260, 33); circle(c, '#d2d3ae', 2100, 1260, 8);
  for (let x = 1870; x <= 2330; x += 57) for (let y = 1030; y <= 1490; y += 58) if (Math.hypot(x - 2100, y - 1260) > 85 && Math.abs((x - 1880) - (y - 1040)) > 26 && Math.abs((x - 1880) + (y - 1480)) > 26) tree(c, x, y, 15 + (x % 5));
  for (const r of roads) {
    if (r.x1 !== r.x2 || r.width < 50) continue;
    for (let y = Math.max(r.y1 + 100, Math.floor(bounds.y / 140) * 140); y < Math.min(r.y2, bounds.y + bounds.h); y += 140) {
      tree(c, r.x1 - 46, y, 8); rect(c, '#64726a', r.x1 + 44, y - 24, 4, 18); rect(c, '#c8bfa6', r.x1 + 42, y - 28, 8, 5);
      rect(c, '#384f4d', r.x1 + 44, y + 32, 7, 10);
    }
  }
}
export function drawVehicle(c, car, time = 0, scale = 1) {
  const kind = car.kind === 'pursuer' ? 'police' : car.mode || car.kind;
  const spec = VEHICLES[kind] || car;
  const len = car.length || spec.length || 35, width = car.width || spec.width || 18;
  const color = car.color || spec.color || '#b9b6a6';
  c.save(); c.translate(car.x, car.y); c.rotate(car.angle || 0); c.scale(scale, scale);
  rect(c, '#101c2590', -len / 2 + 3, -width / 2 + 4, len + 1, width + 2);
  for (const xx of [-len * .32, len * .28]) { rect(c, '#18262c', xx - 3, -width / 2 - 2, 7, 3); rect(c, '#18262c', xx - 3, width / 2 - 1, 7, 3); }
  rect(c, '#202f35', -len / 2, -width / 2, len, width); rect(c, color, -len / 2 + 1, -width / 2 + 1, len - 2, width - 2);
  rect(c, '#ffffff35', -len / 2 + 3, -width / 2 + 2, len - 7, 2);
  if (kind === 'garbage') {
    rect(c, '#bc713a', -len / 2 + 2, -width / 2 + 3, len * .64, width - 6);
    for (let x = -len / 2 + 5; x < len * .16; x += 5) line(c, '#edab6580', 2, x, -width / 2 + 4, x, width / 2 - 4);
    rect(c, '#f2d8a0', len / 2 - 12, -width / 2 + 2, 6, width - 4);
  } else if (kind === 'fire') {
    rect(c, '#d3d2b9', -len / 2 + 4, -4, len - 15, 8);
    for (let x = -len / 2 + 7; x < len / 2 - 9; x += 6) line(c, '#626f72', 2, x, -4, x, 4);
    rect(c, '#263f48', len / 2 - 9, -width / 2 + 3, 5, width - 6);
  } else if (kind === 'bus') {
    rect(c, '#d4ded0', -len / 2 + 3, -width / 2 + 4, len - 13, width - 8);
    rect(c, '#34575d', len / 2 - 7, -width / 2 + 2, 4, width - 4);
    for (let x = -len / 2 + 6; x < len / 2 - 12; x += 9) { rect(c, '#34575d', x, -width / 2 + 1, 6, 2); rect(c, '#34575d', x, width / 2 - 3, 6, 2); }
  } else {
    if (kind === 'police') rect(c, '#e4e1cf', -len * .21, -width / 2 + 1, len * .48, width - 2);
    rect(c, '#263e49', 1, -width / 2 + 3, 7, width - 6);
    rect(c, '#77989e', 2, -width / 2 + 4, 2, width - 8);
    rect(c, kind === 'escape' ? '#362d2c' : '#384e55', -len * .25, -width / 2 + 3, 7, width - 6);
    rect(c, kind === 'escape' ? '#d69a67' : color, -len * .18, -width / 2 + 4, 8, width - 8);
    if (kind === 'taxi') { rect(c, '#293c3d', -4, -5, 6, 10); rect(c, '#ffe6a0', -3, -4, 4, 8); }
  }
  rect(c, '#f6edba', len / 2 - 2, -width / 2 + 2, 2, 4); rect(c, '#f6edba', len / 2 - 2, width / 2 - 6, 2, 4);
  rect(c, '#d64e43', -len / 2, -width / 2 + 2, 2, 3); rect(c, '#d64e43', -len / 2, width / 2 - 5, 2, 3);
  if ((kind === 'police' || kind === 'fire') && car.siren !== false) {
    const xx = kind === 'fire' ? len / 2 - 13 : -1;
    rect(c, '#182d35', xx - 2, -width / 2 + 1, 4, width - 2);
    rect(c, Math.sin(time * 12) > 0 ? '#ff615e' : '#813f44', xx - 2, -width / 2 + 1, 4, width / 2 - 1);
    rect(c, Math.sin(time * 12) < 0 ? '#83d9f4' : '#426981', xx - 2, 0, 4, width / 2 - 1);
  }
  c.restore();
}
export class BoroughRenderer {
  constructor(canvas) { this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.chunks = new Map(); this.camera = { x: 1518, y: 2450 }; this.zoom = 1.3; this.width = 1100; this.height = 680; this.lastRoute = -1; }
  resize() {
    const box = this.canvas.getBoundingClientRect(); const ratio = Math.min(1.5, globalThis.devicePixelRatio || 1);
    this.width = Math.max(300, box.width); this.height = Math.max(300, box.height);
    const w = Math.round(this.width * ratio), h = Math.round(this.height * ratio);
    if (this.canvas.width !== w || this.canvas.height !== h) { this.canvas.width = w; this.canvas.height = h; }
    this.ratio = ratio; this.zoom = this.width < 600 ? .93 : 1.32;
  }
  world(clientX, clientY) { const box = this.canvas.getBoundingClientRect(); return { x: (clientX - box.left - this.width / 2) / this.zoom + this.camera.x, y: (clientY - box.top - this.height / 2) / this.zoom + this.camera.y }; }
  chunk(x, y) {
    const key = `${x},${y}`;
    if (!this.chunks.has(key)) {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
      const c = canvas.getContext('2d'); c.translate(-x * 512, -y * 512); staticCity(c, { x: x * 512, y: y * 512, w: 512, h: 512 });
      if (this.chunks.size >= 24) this.chunks.delete(this.chunks.keys().next().value);
      this.chunks.set(key, canvas);
    }
    return this.chunks.get(key);
  }
  render(g, dt = .016, reduced = false) {
    this.resize(); const c = this.ctx, w = this.width, h = this.height;
    const smooth = reduced ? 1 : Math.min(1, dt * 7);
    const lead = Math.min(65, Math.abs(g.player.speed) * .23);
    this.camera.x += (g.player.x + Math.cos(g.player.angle) * lead - this.camera.x) * smooth;
    this.camera.y += (g.player.y + Math.sin(g.player.angle) * lead - this.camera.y) * smooth;
    c.setTransform(this.ratio, 0, 0, this.ratio, 0, 0); c.clearRect(0, 0, w, h);
    c.save(); c.translate(w / 2, h / 2); c.scale(this.zoom, this.zoom); c.translate(-this.camera.x, -this.camera.y);
    const bounds = { x: this.camera.x - w / this.zoom / 2, y: this.camera.y - h / this.zoom / 2, w: w / this.zoom, h: h / this.zoom };
    for (let x = Math.floor(bounds.x / 512); x <= Math.floor((bounds.x + bounds.w) / 512); x++) for (let y = Math.floor(bounds.y / 512); y <= Math.floor((bounds.y + bounds.h) / 512); y++) c.drawImage(this.chunk(x, y), x * 512, y * 512);
    this.drawRoute(c, g);
    for (const n of nodes) {
      if (n.links.length < 3 || Math.abs(n.x - this.camera.x) > w / this.zoom || Math.abs(n.y - this.camera.y) > h / this.zoom) continue;
      const green = Math.floor((g.time + n.x / 200) / 6) % 2 === 0;
      circle(c, green ? '#a7cc89' : '#ed805a', n.x + 44, n.y + 45, 2.5);
      // People stay on the pavement and have no collision or injury system.
      for (let i = 0; i < 2; i++) { const x = n.x - 47, y = n.y - 75 + i * 100 + Math.sin(g.time * .6 + n.id) * 18; circle(c, '#20323860', x + 2, y + 2, 3); rect(c, i ? '#d7b78b' : '#778ba7', x - 2, y - 3, 4, 7); circle(c, '#d5b797', x, y, 2); }
    }
    for (const car of g.traffic) if (Math.abs(car.x - this.camera.x) < w / this.zoom && Math.abs(car.y - this.camera.y) < h / this.zoom) drawVehicle(c, car, g.time);
    g.pursuers.filter(p => !p.lost).forEach(p => drawVehicle(c, p, g.time));
    if (g.robber) { drawVehicle(c, g.robber, g.time); this.marker(c, g.robber, '#f0806c', 'TARGET', g.time, reduced); }
    if (g.target && !['police', 'escape'].includes(g.mode)) this.drawJob(c, g, reduced);
    drawVehicle(c, { ...g.player, mode: g.mode, siren: g.siren }, g.time);
    if (g.hose && g.mode === 'fire' && g.state === 'playing') {
      line(c, '#c1a66f', 3, g.target.curbX, g.target.curbY, g.player.x - 6, g.player.y + 4);
      if (g.aim && g.spraying) {
        const dx = g.aim.x - g.player.x, dy = g.aim.y - g.player.y, length = Math.hypot(dx, dy), factor = Math.min(1, 330 / length);
        c.globalAlpha = .7; line(c, '#d6f1e6', 5, g.player.x, g.player.y, g.player.x + dx * factor, g.player.y + dy * factor);
        line(c, '#8bcbdc', 2, g.player.x, g.player.y, g.player.x + dx * factor, g.player.y + dy * factor); c.globalAlpha = 1;
        circle(c, '#b1e2df77', g.player.x + dx * factor, g.player.y + dy * factor, 15);
      }
    }
    // A subtle player ring helps keep the car readable in dense traffic.
    c.strokeStyle = '#f7df9866'; c.lineWidth = 1; c.beginPath(); c.arc(g.player.x, g.player.y, 31, 0, TAU); c.stroke();
    c.restore();
    this.edgeArrow(c, g); this.drawMinimap(c, g, 16, h - (w < 600 ? 131 : 165), w < 600 ? 145 : 185, w < 600 ? 115 : 145);
    rect(c, '#14292fe8', w - 103, h - 75, 87, 59); text(c, String(Math.round(Math.abs(g.player.speed) * .32)).padStart(2, '0'), w - 30, h - 38, 27, '#f1e5bc', 'right'); text(c, 'MPH', w - 30, h - 23, 9, '#a8b5aa', 'right');
    const road = roadAt(g.player); rect(c, '#182a30cf', w / 2 - 115, h - 31, 230, 23); text(c, road.name.toUpperCase(), w / 2, h - 15, 9, '#d2d4b9', 'center');
  }
  drawRoute(c, g) {
    const target = g.destination; if (!target || g.mode === 'escape') return;
    const source = nearestNode(g.player).id, end = nearestNode(target).id;
    const key = `${source}:${end}:${g.routeVersion}`;
    if (this.pathKey !== key) { this.pathKey = key; this.path = route(source, end).map(id => nodes[id]); }
    c.strokeStyle = '#f1cd6e9e'; c.lineWidth = 4; c.lineJoin = 'round'; c.setLineDash([9, 9]); c.beginPath();
    c.moveTo(g.player.x, g.player.y); this.path.forEach(p => c.lineTo(p.x, p.y)); c.lineTo(target.x, target.y); c.stroke(); c.setLineDash([]);
  }
  marker(c, p, color, label, time, reduced) {
    const lift = reduced ? 0 : Math.sin(time * 3) * 3;
    c.fillStyle = color; c.beginPath(); c.moveTo(p.x, p.y - 29 + lift); c.lineTo(p.x - 7, p.y - 41 + lift); c.lineTo(p.x + 7, p.y - 41 + lift); c.fill();
    text(c, label, p.x, p.y - 49 + lift, 9, color, 'center');
  }
  drawJob(c, g, reduced) {
    const t = g.target; c.save(); c.translate(t.x, t.y); c.rotate(t.angle);
    c.strokeStyle = g.stopStatus().ready ? '#9fe1ae' : '#f4ce76'; c.lineWidth = 2; c.setLineDash([7, 4]); c.strokeRect(-37, -18, 74, 36); c.setLineDash([]);
    c.fillStyle = '#f7d78044'; c.fillRect(-35, -16, 70, 32); c.fillStyle = '#f4ce76'; c.beginPath(); c.moveTo(28, 0); c.lineTo(14, -6); c.lineTo(14, 6); c.fill(); c.restore();
    this.marker(c, { x: t.curbX, y: t.curbY }, '#f2d27b', g.mode === 'taxi' ? g.taxiStage.toUpperCase() : g.mode === 'fire' ? 'HYDRANT' : 'STOP', g.time, reduced);
    if (g.mode === 'garbage') {
      for (let i = 0; i < 3; i++) {
        const progress = g.service ? g.service.elapsed / g.service.duration : 0;
        if (progress > (i + 1) / 3) continue;
        rect(c, '#213f39', t.curbX - 5, t.curbY - 25 + i * 21, 12, 15); rect(c, '#7b9b6c', t.curbX - 6, t.curbY - 27 + i * 21, 14, 4);
      }
      if (g.service) for (let i = 0; i < 2; i++) {
        const f = (Math.sin(g.service.elapsed * 3 + i * Math.PI) + 1) / 2;
        const x = g.player.x * (1 - f) + t.curbX * f, y = g.player.y * (1 - f) + (t.curbY + i * 18) * f;
        rect(c, '#e7b467', x - 3, y - 5, 6, 10); rect(c, '#df7b38', x - 3, y - 2, 6, 4); circle(c, '#cfab7a', x, y - 5, 3);
      }
    } else if (g.mode === 'taxi' || g.mode === 'bus') {
      const people = g.mode === 'taxi' ? (g.taxiStage === 'pickup' ? 1 : 0) : 4;
      for (let i = 0; i < people; i++) {
        const f = g.service ? Math.min(1, g.service.elapsed / (g.service.duration * .8)) : 0;
        const x = t.curbX * (1 - f) + g.player.x * f, y = (t.curbY + i * 11) * (1 - f) + g.player.y * f;
        rect(c, ['#af7b67', '#d4c181', '#778c9e', '#a3b793'][i], x - 2, y - 3, 5, 7); circle(c, '#e2bd8e', x, y - 3, 2);
      }
    } else if (g.mode === 'fire') {
      circle(c, '#153d4b', t.curbX + 2, t.curbY + 3, 8); rect(c, '#8fc7d2', t.curbX - 4, t.curbY - 6, 8, 15); rect(c, '#b4e1dc', t.curbX - 7, t.curbY - 3, 14, 4);
      for (const f of g.hotspots) {
        if (f.heat <= 0) { circle(c, '#27373b80', f.x, f.y, 15); continue; }
        const flick = reduced ? 1 : 1 + Math.sin(g.time * 12 + f.x) * .15;
        circle(c, '#27303a70', f.x + 7, f.y - 20, 16 * f.heat);
        circle(c, '#e76d3b66', f.x, f.y, 26 * f.heat); circle(c, '#e76d3b', f.x, f.y, 17 * f.heat * flick);
        circle(c, '#f4b65d', f.x - 2, f.y + 3, 11 * f.heat * flick); circle(c, '#f7e1a0', f.x, f.y + 5, 5 * f.heat);
      }
    }
  }
  edgeArrow(c, g) {
    const t = g.destination; if (!t) return;
    const x = (t.x - this.camera.x) * this.zoom + this.width / 2, y = (t.y - this.camera.y) * this.zoom + this.height / 2;
    if (x > 40 && x < this.width - 40 && y > 100 && y < this.height - 100) return;
    const angle = Math.atan2(y - this.height / 2, x - this.width / 2);
    const factor = Math.min((this.width / 2 - 35) / Math.max(1, Math.abs(x - this.width / 2)), (this.height / 2 - 100) / Math.max(1, Math.abs(y - this.height / 2)));
    const xx = this.width / 2 + (x - this.width / 2) * factor, yy = this.height / 2 + (y - this.height / 2) * factor;
    c.save(); c.translate(xx, yy); c.rotate(angle); c.fillStyle = '#f5d27e'; c.beginPath(); c.moveTo(13, 0); c.lineTo(-7, -8); c.lineTo(-3, 0); c.lineTo(-7, 8); c.fill(); c.restore();
  }
  drawMinimap(c, g, x, y, w, h, full = false) {
    c.save(); rect(c, '#10242cee', x - 3, y - 3, w + 6, h + 6); c.beginPath(); c.rect(x, y, w, h); c.clip();
    const scale = Math.min(w / CITY.width, h / CITY.height);
    c.translate(x + (w - CITY.width * scale) / 2, y + (h - CITY.height * scale) / 2); c.scale(scale, scale);
    rect(c, '#244551', 0, 0, CITY.width, CITY.height);
    LAND.forEach(l => rect(c, '#68766b', l.x, l.y, l.w, l.h)); rect(c, '#779260', PARK.x, PARK.y, PARK.w, PARK.h);
    ROADS.forEach(r => line(c, '#293e45', full ? 32 : 38, r.x1, r.y1, r.x2, r.y2));
    if (this.path && g.destination && !g.free) { c.strokeStyle = '#f3cf78'; c.lineWidth = full ? 18 : 24; c.beginPath(); this.path.forEach((p, i) => i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)); c.lineTo(g.destination.x, g.destination.y); c.stroke(); }
    g.pursuers.filter(p => !p.lost).forEach(p => circle(c, '#9ac9e1', p.x, p.y, 4 / scale));
    if (g.robber) circle(c, '#e97e65', g.robber.x, g.robber.y, 4 / scale);
    if (g.target) { circle(c, '#f6d07b', g.target.x, g.target.y, 5 / scale); circle(c, '#4b4840', g.target.x, g.target.y, 2 / scale); }
    c.save(); c.translate(g.player.x, g.player.y); c.rotate(g.player.angle); c.fillStyle = '#fff6c8'; c.beginPath(); c.moveTo(7 / scale, 0); c.lineTo(-4 / scale, -4 / scale); c.lineTo(-2 / scale, 0); c.lineTo(-4 / scale, 4 / scale); c.fill(); c.restore();
    if (full) LANDMARKS.forEach(l => text(c, l.name, l.x, l.y, 10 / scale, '#ebe2b8', 'center'));
    c.restore(); text(c, 'N ↑', x + w - 5, y + 13, 9, '#f2e0ae', 'right'); if (!full) text(c, 'M / CITY MAP', x + 6, y + h - 6, 8, '#e3d9b0');
  }
  fullMap(canvas, game) {
    const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height); this.drawMinimap(c, game, 0, 0, canvas.width, canvas.height, true);
  }
}
export function drawBoroughPreview(canvas) {
  const c = canvas.getContext('2d'); c.save(); c.fillStyle = '#244b56'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.scale(canvas.width / 720, canvas.height / 480); c.translate(-1220, -1810); staticCity(c, { x: 1220, y: 1810, w: 720, h: 480 });
  drawVehicle(c, { x: 1518, y: 2145, angle: -Math.PI / 2, mode: 'taxi', ...VEHICLES.taxi }, 0, 1.7);
  drawVehicle(c, { x: 1483, y: 2050, angle: Math.PI / 2, mode: 'police', ...VEHICLES.police }, 1, 1.4);
  c.restore();
}
export function drawGarageVehicle(canvas, mode) {
  const c = canvas.getContext('2d'); c.clearRect(0, 0, canvas.width, canvas.height);
  c.strokeStyle = '#cccfb51a'; c.lineWidth = 1;
  for (let i = 10; i < canvas.width; i += 22) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, canvas.height); c.stroke(); }
  line(c, '#e5cd7b33', 1, 0, canvas.height / 2, canvas.width, canvas.height / 2);
  drawVehicle(c, { x: canvas.width / 2, y: canvas.height / 2, angle: -.25, mode, ...VEHICLES[mode], siren: true }, .1, 2.35);
}
