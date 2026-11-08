// Borough Rush's fixed street plan. Mission variation never changes the city.
export const CITY = { width: 4680, height: 3540 };
export const LAND = [
  { x: 100, y: 420, w: 1080, h: 2940, name: 'WEST DOCKS', color: '#69786d' },
  { x: 1410, y: 140, w: 1380, h: 3260, name: 'CROWN ISLAND', color: '#777b70' },
  { x: 3110, y: 420, w: 1420, h: 2940, name: 'EAST BOROUGHS', color: '#74796a' },
];
export const PARK = { x: 1846, y: 1006, w: 508, h: 508 };
const lines = [];
const line = (x1, y1, x2, y2, width = 74, name = '') => lines.push({ x1, y1, x2, y2, width, name });
const centralX = [1500, 1800, 2100, 2400, 2700];
const centralY = [360, 660, 960, 1260, 1560, 1920, 2220, 2520, 2820, 3180];
centralX.forEach((x, i) => {
  if (x === 2100) { line(x, 360, x, 960, 74, 'Park Avenue'); line(x, 1560, x, 3180, 74, 'Park Avenue'); }
  else line(x, 360, x, 3180, 74, ['Riverside Drive', 'Broadway', '', 'Lexington Ave', 'Harbor Avenue'][i]);
});
centralY.forEach((y, i) => {
  if (y === 1260) { line(1500, y, 1800, y, 74, 'Garden Street'); line(2400, y, 2700, y, 74, 'Garden Street'); }
  else line(1500, y, 2700, y, 74, `${i + 1}th Street`);
});
const outerY = [660, 1080, 1500, 1920, 2340, 2760, 3180];
[200, 500, 800, 1100].forEach(x => line(x, 660, x, 3180, 74, 'Dock Avenue'));
[3200, 3500, 3800, 4100, 4400].forEach(x => line(x, 660, x, 3180, 74, 'Borough Avenue'));
outerY.forEach(y => { line(200, y, 1100, y, 74, 'West Street'); line(3200, y, 4400, y, 74, 'East Street'); });
[660, 1920, 3180].forEach((y, i) => {
  line(1100, y, 1500, y, 68, ['Northspan Bridge', 'Union Bridge', 'Southspan Bridge'][i]);
  line(2700, y, 3200, y, 68, ['Queens Crossing', 'Foundry Bridge', 'Harbor Bridge'][i]);
});
line(1650, 1920, 1650, 2220, 37, 'Mercer Alley');
line(3500, 2550, 3800, 2550, 37, 'Foundry Cut');
line(800, 1290, 1100, 1290, 37, 'Warehouse Lane');
export const ROADS = lines;
export const nodes = [];
export const edges = [];
const byPosition = new Map();
function node(x, y) {
  const key = `${x},${y}`;
  if (!byPosition.has(key)) { const n = { id: nodes.length, x, y, links: [] }; byPosition.set(key, n); nodes.push(n); }
  return byPosition.get(key);
}
for (const a of lines) {
  const points = [node(a.x1, a.y1), node(a.x2, a.y2)];
  for (const b of lines) {
    if ((a.x1 === a.x2) === (b.x1 === b.x2)) continue;
    const v = a.x1 === a.x2 ? a : b, h = a.x1 === a.x2 ? b : a;
    if (v.x1 >= h.x1 && v.x1 <= h.x2 && h.y1 >= v.y1 && h.y1 <= v.y2) points.push(node(v.x1, h.y1));
  }
  const ordered = [...new Set(points)].sort((p, q) => (p.x + p.y) - (q.x + q.y));
  for (let i = 1; i < ordered.length; i++) {
    const from = ordered[i - 1], to = ordered[i];
    const edge = { id: edges.length, from: from.id, to: to.id, length: Math.hypot(from.x - to.x, from.y - to.y), width: a.width, name: a.name };
    edges.push(edge); from.links.push({ to: to.id, edge }); to.links.push({ to: from.id, edge });
  }
}
export function nearestNode(p) {
  let best = nodes[0], dist = Infinity;
  for (const n of nodes) { const d = (p.x - n.x) ** 2 + (p.y - n.y) ** 2; if (d < dist) { best = n; dist = d; } }
  return best;
}
export function roadAt(p) {
  let best = null;
  for (const r of lines) {
    const x = Math.max(r.x1, Math.min(r.x2, p.x)), y = Math.max(r.y1, Math.min(r.y2, p.y));
    const distance = Math.hypot(x - p.x, y - p.y);
    if (!best || distance < best.distance) best = { ...r, distance, x, y };
  }
  return best;
}
export function drivable(p, margin = 7) {
  const r = roadAt(p); return r.distance <= r.width / 2 + margin;
}
export function route(start, finish) {
  const source = typeof start === 'number' ? start : nearestNode(start).id;
  const end = typeof finish === 'number' ? finish : nearestNode(finish).id;
  const distances = new Map([[source, 0]]), previous = new Map(), pending = new Set([source]);
  while (pending.size) {
    let current = -1, best = Infinity;
    for (const id of pending) if (distances.get(id) < best) { current = id; best = distances.get(id); }
    pending.delete(current); if (current === end) break;
    for (const { to, edge } of nodes[current].links) {
      const cost = best + edge.length * (edge.width < 50 ? 1.05 : 1);
      if (cost < (distances.get(to) ?? Infinity)) { distances.set(to, cost); previous.set(to, current); pending.add(to); }
    }
  }
  if (!distances.has(end)) return [];
  const path = [end]; while (path[0] !== source) path.unshift(previous.get(path[0]));
  return path;
}
export const STOPS = [
  [1518, 2370, -Math.PI / 2, 'Mercer Market'], [1782, 2100, Math.PI / 2, 'Old Town'],
  [2082, 2670, Math.PI / 2, 'City Hall'], [2418, 2370, -Math.PI / 2, 'Grand Terminal'],
  [2682, 1770, Math.PI / 2, 'Museum Mile'], [2418, 1110, -Math.PI / 2, 'Crown Park East'],
  [1782, 1110, Math.PI / 2, 'Crown Park West'], [2118, 510, -Math.PI / 2, 'Uptown Plaza'],
  [818, 1710, -Math.PI / 2, 'Dockside Records'], [518, 2550, -Math.PI / 2, 'West Ferry'],
  [1082, 2130, Math.PI / 2, 'Warehouse Row'], [3182, 1710, Math.PI / 2, 'Foundry Square'],
  [3518, 2130, -Math.PI / 2, 'Eastside Diner'], [3818, 2970, -Math.PI / 2, 'Harbor Studios'],
  [4382, 1290, Math.PI / 2, 'Sunset Heights'], [4118, 870, -Math.PI / 2, 'Queenside Arcade'],
  [1518, 810, -Math.PI / 2, 'Riverside Cinema'], [2682, 3030, Math.PI / 2, 'South Pier'],
].map(([x, y, angle, name], id) => ({ id, x, y, angle, name, curbX: x + Math.sin(angle) * -40, curbY: y + Math.cos(angle) * 40 }));
export const LANDMARKS = [
  { x: 2100, y: 1260, name: 'CROWN PARK' }, { x: 2250, y: 2370, name: 'GRAND TERMINAL' },
  { x: 1950, y: 2970, name: 'CITY HALL' }, { x: 650, y: 2550, name: 'WEST FERRY' },
  { x: 3650, y: 1710, name: 'THE FOUNDRY' }, { x: 4250, y: 870, name: 'SUNSET HEIGHTS' },
];
export function seeded(seed = 1) { let n = seed >>> 0; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; }
const random = seeded(1847);
export const BUILDINGS = [];
function blocks(xs, ys, district) {
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++) {
    const x = xs[i - 1] + 53, y = ys[j - 1] + 53, w = xs[i] - xs[i - 1] - 106, h = ys[j] - ys[j - 1] - 106;
    if (district === 1 && x > 1800 && x < 2400 && y > 960 && y < 1560) continue;
    const alley = lines.find(r => r.width < 50 && ((r.x1 > x && r.x1 < x + w && r.y1 <= y && r.y2 >= y + h) || (r.y1 > y && r.y1 < y + h && r.x1 <= x && r.x2 >= x + w)));
    const sections = alley ? (alley.x1 === alley.x2 ? [{ x, y, w: alley.x1 - x - 28, h }, { x: alley.x1 + 28, y, w: x + w - alley.x1 - 28, h }] : [{ x, y, w, h: alley.y1 - y - 28 }, { x, y: alley.y1 + 28, w, h: y + h - alley.y1 - 28 }]) : [{ x, y, w, h }];
    for (const section of sections) {
      const split = section.w > 200 ? 2 : 1;
      for (let k = 0; k < split; k++) BUILDINGS.push({ ...section, x: section.x + k * section.w / split + 5, y: section.y + 5, w: section.w / split - 10, h: section.h - 10, palette: Math.floor(random() * 6), detail: random(), district });
    }
  }
}
blocks([200, 500, 800, 1100], outerY, 0); blocks(centralX, centralY, 1); blocks([3200, 3500, 3800, 4100, 4400], outerY, 2);
export function visibleBetween(a, b) {
  // Sample a ray through solid rooftops; narrow alleys stay usable as sight breaks.
  const length = Math.hypot(b.x - a.x, b.y - a.y), count = Math.ceil(length / 25);
  for (let i = 1; i < count; i++) {
    const x = a.x + (b.x - a.x) * i / count, y = a.y + (b.y - a.y) * i / count;
    if (BUILDINGS.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h)) return false;
  }
  return true;
}
