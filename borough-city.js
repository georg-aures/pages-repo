// The street plan is fixed. Distances and routing use segment geometry, including diagonals.
export const CITY = { width: 4680, height: 3540 };
export const LAND = [
  { x: 100, y: 420, w: 1080, h: 2940, name: 'WEST DOCKS', color: '#69786d' },
  { x: 1410, y: 140, w: 1380, h: 3260, name: 'CROWN ISLAND', color: '#777b70' },
  { x: 3110, y: 420, w: 1420, h: 2940, name: 'EAST BOROUGHS', color: '#74796a' },
];
export const PARK = { x: 1846, y: 1006, w: 508, h: 508 };
export const FEATURES = [
  { x: 255, y: 2415, w: 190, h: 260, kind: 'parking', name: 'FERRY PARK & RIDE' },
  { x: 855, y: 1570, w: 185, h: 260, kind: 'containers', name: 'CONTAINER YARD' },
  { x: 3565, y: 735, w: 170, h: 255, kind: 'court', name: 'QUEENSIDE COURTS' },
  { x: 4160, y: 1580, w: 180, h: 260, kind: 'garden', name: 'SUNSET GARDENS' },
  { x: 1855, y: 2010, w: 190, h: 140, kind: 'plaza', name: 'MERCER SQUARE' },
  { x: 2460, y: 420, w: 175, h: 170, kind: 'garden', name: 'LIGHTHOUSE GREEN' },
];
const lines = [];
const line = (x1, y1, x2, y2, width, name, extra = {}) => lines.push({ id: lines.length, x1, y1, x2, y2, width, name, ...extra });
const centralX = [1500, 1800, 2100, 2400, 2700];
const centralY = [360, 660, 960, 1260, 1560, 1920, 2220, 2520, 2820, 3180];
centralX.forEach((x, i) => {
  const width = [104, 78, 86, 78, 96][i], name = ['Riverside Drive', 'Amsterdam Avenue', 'Park Avenue', 'Lexington Avenue', 'Harbor Avenue'][i];
  if (x === 2100) { line(x, 360, x, 960, width, name); line(x, 1560, x, 3180, width, name); }
  else line(x, 360, x, 3180, width, name);
});
centralY.forEach((y, i) => {
  const width = [62, 104, 64, 54, 80, 104, 66, 72, 62, 96][i];
  const name = ['Uptown Street', 'North Cross Boulevard', 'Museum Street', 'Garden Street', 'Park South', 'Union Boulevard', 'Mercer Street', 'Terminal Street', 'City Hall Street', 'South Shore Drive'][i];
  if (y === 1260) { line(1500, y, 1800, y, width, name); line(2400, y, 2700, y, width, name); }
  else line(1500, y, 2700, y, width, name);
});
const outerY = [660, 1080, 1500, 1920, 2340, 2760, 3180];
[200, 500, 800, 1100].forEach((x, i) => line(x, 660, x, 3180, [70, 60, 82, 96][i], ['Dockside Way', 'Ferry Street', 'Warehouse Avenue', 'West Quay'][i]));
[3200, 3500, 3800, 4100, 4400].forEach((x, i) => line(x, 660, x, 3180, [96, 70, 104, 60, 76][i], ['Foundry Avenue', 'Orchard Street', 'Queenside Avenue', 'Sunset Street', 'East Shore Road'][i]));
outerY.forEach((y, i) => {
  const width = [96, 62, 70, 104, 62, 82, 96][i];
  line(200, y, 1100, y, width, ['North Dock Road', 'Iron Street', 'Market Street', 'Union Boulevard', 'Ferry Lane', 'Canal Street', 'West Coast Road'][i]);
  line(3200, y, 4400, y, width, ['Queens Cross', 'Orchard Road', 'East Market Street', 'Foundry Boulevard', 'Studio Street', 'Harbor Road', 'East Coast Road'][i]);
});
[660, 1920, 3180].forEach((y, i) => {
  line(1100, y, 1500, y, [96, 104, 86][i], ['Northspan Bridge', 'Union Bridge', 'Southspan Bridge'][i], { bridge: true });
  line(2700, y, 3200, y, [96, 104, 86][i], ['Queens Crossing', 'Foundry Bridge', 'Harbor Bridge'][i], { bridge: true });
});
line(1650, 1920, 1650, 2220, 37, 'Mercer Alley');
line(3500, 2550, 3800, 2550, 37, 'Foundry Cut');
line(800, 1290, 1100, 1290, 37, 'Warehouse Lane');
line(1500, 2820, 2400, 1920, 90, 'Broadway', { diagonal: true });
line(3200, 3180, 4400, 2340, 100, 'Queens Boulevard', { diagonal: true });
line(200, 1080, 800, 1500, 66, 'Ironworks Road', { diagonal: true });
export const ROADS = lines;
const cross = (a, b) => a.x * b.y - a.y * b.x;
export function project(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y, length2 = dx * dx + dy * dy;
  const t = length2 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length2)) : 0;
  const x = a.x + dx * t, y = a.y + dy * t;
  return { x, y, t, distance: Math.hypot(p.x - x, p.y - y) };
}
function intersection(a, b) {
  const p = { x: a.x1, y: a.y1 }, q = { x: b.x1, y: b.y1 };
  const u = { x: a.x2 - a.x1, y: a.y2 - a.y1 }, v = { x: b.x2 - b.x1, y: b.y2 - b.y1 };
  const det = cross(u, v); if (Math.abs(det) < 1e-8) return null;
  const d = { x: q.x - p.x, y: q.y - p.y }, t = cross(d, v) / det, s = cross(d, u) / det;
  return t >= -1e-7 && t <= 1 + 1e-7 && s >= -1e-7 && s <= 1 + 1e-7 ? { x: p.x + t * u.x, y: p.y + t * u.y } : null;
}
export const nodes = [], edges = [];
const byPosition = new Map();
function node(x, y) {
  x = Math.round(x * 10000) / 10000; y = Math.round(y * 10000) / 10000;
  const key = `${x},${y}`;
  if (!byPosition.has(key)) { const n = { id: nodes.length, x, y, links: [] }; byPosition.set(key, n); nodes.push(n); }
  return byPosition.get(key);
}
for (const a of lines) {
  const points = [node(a.x1, a.y1), node(a.x2, a.y2)];
  for (const b of lines) { const p = intersection(a, b); if (p) points.push(node(p.x, p.y)); }
  const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
  const ordered = [...new Set(points)].sort((p, q) => (p.x - q.x) * dx + (p.y - q.y) * dy);
  for (let i = 1; i < ordered.length; i++) {
    const from = ordered[i - 1], to = ordered[i], length = Math.hypot(from.x - to.x, from.y - to.y);
    if (length < .01) continue;
    const edge = { id: edges.length, from: from.id, to: to.id, length, width: a.width, name: a.name, road: a };
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
    const point = project(p, { x: r.x1, y: r.y1 }, { x: r.x2, y: r.y2 });
    if (!best || point.distance - r.width / 2 < best.distance - best.width / 2) best = { ...r, ...point };
  }
  return best;
}
export function drivable(p, margin = 7) { const r = roadAt(p); return r.distance <= r.width / 2 + margin; }
export function roadPosition(p, heading) {
  let best = null, cost = Infinity;
  for (const edge of edges) {
    const a = nodes[edge.from], b = nodes[edge.to], point = project(p, a, b);
    const angle = Math.atan2(b.y - a.y, b.x - a.x);
    const alignment = heading === undefined ? 0 : (1 - Math.abs(Math.cos(angle - heading))) * 5;
    const score = point.distance + alignment;
    if (score < cost) { cost = score; best = { ...point, edge }; }
  }
  return best;
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
      const cost = best + edge.length * (edge.width < 50 ? 1.1 : 1);
      if (cost < (distances.get(to) ?? Infinity)) { distances.set(to, cost); previous.set(to, current); pending.add(to); }
    }
  }
  if (!distances.has(end)) return [];
  const path = [end]; while (path[0] !== source) path.unshift(previous.get(path[0]));
  return path;
}
export function navigationRoute(start, finish, { arrivalAngle } = {}) {
  // Both vehicles are virtual nodes ON their road edges, rather than snapped intersections.
  const a = roadPosition(start, start.angle), b = roadPosition(finish, arrivalAngle);
  let best = null;
  const consider = (points, ids = []) => {
    const compact = points.filter((p, i) => !i || Math.hypot(p.x - points[i - 1].x, p.y - points[i - 1].y) > .01);
    const length = compact.reduce((s, p, i) => s + (i ? Math.hypot(p.x - compact[i - 1].x, p.y - compact[i - 1].y) : 0), 0);
    const first = compact.find(p => Math.hypot(p.x - a.x, p.y - a.y) > 12);
    const headingPenalty = first && start.angle !== undefined && Math.cos(Math.atan2(first.y - a.y, first.x - a.x) - start.angle) < -.3 ? 100 : 0;
    const prev = [...compact.slice(0, -1)].reverse().find(p => Math.hypot(p.x - b.x, p.y - b.y) > 5);
    if (arrivalAngle !== undefined && prev && Math.cos(Math.atan2(b.y - prev.y, b.x - prev.x) - arrivalAngle) < .8) return;
    if (!best || length + headingPenalty < best.cost) best = { points: compact, ids, length, cost: length + headingPenalty };
  };
  if (a.edge.id === b.edge.id) consider([a, b]);
  for (const source of [a.edge.from, a.edge.to]) for (const end of [b.edge.from, b.edge.to]) {
    const ids = route(source, end), points = ids.map(id => nodes[id]);
    if (points.length) consider([a, ...points, b], ids);
  }
  // Include the actual curb positions only as short perpendicular links at either end.
  const result = best || { points: [a, b], ids: [], length: Math.hypot(a.x - b.x, a.y - b.y) };
  result.points = [{ x: start.x, y: start.y }, ...result.points, { x: finish.x, y: finish.y }];
  return result;
}
export function stopOnRoad(x, y, angle, name, id) {
  const r = roadAt({ x, y }), offset = r.width / 2 - 15;
  const rightX = -Math.sin(angle), rightY = Math.cos(angle);
  return { id, x: x + rightX * offset, y: y + rightY * offset, angle, name, curbX: x + rightX * (r.width / 2 + 10), curbY: y + rightY * (r.width / 2 + 10) };
}
export const STOPS = [
  [1500, 2370, -Math.PI / 2, 'Mercer Market'], [1800, 2100, Math.PI / 2, 'Old Town'],
  [2100, 2670, Math.PI / 2, 'City Hall'], [2400, 2370, -Math.PI / 2, 'Grand Terminal'],
  [2700, 1770, Math.PI / 2, 'Museum Mile'], [2400, 1110, -Math.PI / 2, 'Crown Park East'],
  [1800, 1110, Math.PI / 2, 'Crown Park West'], [2100, 510, -Math.PI / 2, 'Uptown Plaza'],
  [800, 1710, -Math.PI / 2, 'Dockside Records'], [500, 2550, -Math.PI / 2, 'West Ferry'],
  [1100, 2130, Math.PI / 2, 'Warehouse Row'], [3200, 1710, Math.PI / 2, 'Foundry Square'],
  [3500, 2130, -Math.PI / 2, 'Eastside Diner'], [3800, 2970, -Math.PI / 2, 'Harbor Studios'],
  [4400, 1290, Math.PI / 2, 'Sunset Heights'], [4100, 870, -Math.PI / 2, 'Queenside Arcade'],
  [1500, 810, -Math.PI / 2, 'Riverside Cinema'], [2700, 3030, Math.PI / 2, 'South Pier'],
].map(([x, y, angle, name], id) => stopOnRoad(x, y, angle, name, id));
// Clockwise line: stops sit at least 120 m from turns and always on the right curb.
export const BUS_STOPS = [
  [1500, 2370, -Math.PI / 2, 'Mercer Market'], [1500, 1750, -Math.PI / 2, 'Riverside Museum'],
  [1500, 1130, -Math.PI / 2, 'Crown Park West'], [1950, 660, 0, 'Uptown Plaza'],
  [2700, 810, Math.PI / 2, 'Queens Crossing'], [2700, 1710, Math.PI / 2, 'Museum Mile'],
  [2700, 2370, Math.PI / 2, 'Grand Terminal'], [2700, 2990, Math.PI / 2, 'South Pier'],
  [2260, 3180, Math.PI, 'City Hall'], [1500, 2990, -Math.PI / 2, 'West Ferry Interchange'],
].map(([x, y, angle, name], id) => stopOnRoad(x, y, angle, name, id));
export const BUS_LINE = [{ x: 1500, y: 2450 }, { x: 1500, y: 660 }, { x: 2700, y: 660 }, { x: 2700, y: 3180 }, { x: 1500, y: 3180 }, { x: 1500, y: 2990 }];
export const GARBAGE_SITES = [{ ...STOPS[0], id:0, collected:false, bins:3 }];
for (const edge of edges) {
  if (GARBAGE_SITES.length >= 58) break;
  if (edge.road.bridge || edge.width < 55 || edge.length < 210) continue;
  const a = nodes[edge.from], b = nodes[edge.to], angle = Math.atan2(b.y - a.y, b.x - a.x) + (GARBAGE_SITES.length % 2 ? Math.PI : 0);
  // A generous, distributed round. One side per block; players choose the order.
  const x = (a.x + b.x) / 2, y = (a.y + b.y) / 2;
  if (GARBAGE_SITES.some(s => Math.hypot(s.x - x, s.y - y) < 330)) continue;
  GARBAGE_SITES.push({ ...stopOnRoad(x, y, angle, edge.name, GARBAGE_SITES.length), collected: false, bins: 3 });
}
// Fill the last few gaps without placing collections on bridges or at intersections.
for(const edge of edges){
  if(GARBAGE_SITES.length>=58)break;
  if(edge.road.bridge || edge.width<55 || edge.length<200)continue;
  const a=nodes[edge.from],b=nodes[edge.to],x=(a.x+b.x)/2,y=(a.y+b.y)/2;
  if(GARBAGE_SITES.some(s=>Math.hypot(s.x-x,s.y-y)<190))continue;
  const angle=Math.atan2(b.y-a.y,b.x-a.x)+(GARBAGE_SITES.length%2?Math.PI:0);
  GARBAGE_SITES.push({...stopOnRoad(x,y,angle,edge.name,GARBAGE_SITES.length),collected:false,bins:3});
}
export const LANDMARKS = [
  { x: 2100, y: 1260, name: 'CROWN PARK' }, { x: 2250, y: 2370, name: 'GRAND TERMINAL' },
  { x: 1950, y: 2970, name: 'CITY HALL' }, { x: 650, y: 2550, name: 'WEST FERRY' },
  { x: 3650, y: 1710, name: 'THE FOUNDRY' }, { x: 4250, y: 870, name: 'SUNSET HEIGHTS' },
];
export function seeded(seed = 1) { let n = seed >>> 0; return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296; }; }
const random = seeded(1847);
export const BUILDINGS = [];
function roadCutsRect(r, b) {
  const a = { x: r.x1, y: r.y1 }, z = { x: r.x2, y: r.y2 };
  if ((a.x >= b.x && a.x <= b.x + b.w && a.y >= b.y && a.y <= b.y + b.h) || (z.x >= b.x && z.x <= b.x + b.w && z.y >= b.y && z.y <= b.y + b.h)) return true;
  const corners = [{ x: b.x, y: b.y }, { x: b.x + b.w, y: b.y }, { x: b.x + b.w, y: b.y + b.h }, { x: b.x, y: b.y + b.h }];
  if (corners.some(p => project(p, a, z).distance < r.width / 2 + 9)) return true;
  return corners.some((p, i) => { const q = corners[(i + 1) % 4]; return intersection(r, { x1: p.x, y1: p.y, x2: q.x, y2: q.y }); });
}
function blocks(xs, ys, district) {
  for (let i = 1; i < xs.length; i++) for (let j = 1; j < ys.length; j++) {
    const midX = (xs[i - 1] + xs[i]) / 2, midY = (ys[j - 1] + ys[j]) / 2;
    const left = roadAt({ x: xs[i - 1], y: midY }).width / 2 + 18, right = roadAt({ x: xs[i], y: midY }).width / 2 + 18;
    const top = roadAt({ x: midX, y: ys[j - 1] }).width / 2 + 18, bottom = roadAt({ x: midX, y: ys[j] }).width / 2 + 18;
    const x = xs[i - 1] + left, y = ys[j - 1] + top, w = xs[i] - xs[i - 1] - left - right, h = ys[j] - ys[j - 1] - top - bottom;
    if (district === 1 && x > 1800 && x < 2400 && y > 960 && y < 1560) continue;
    const cols = district === 0 ? (random() < .4 ? 1 : 2) : 2, rows = h > 270 ? 3 : random() < .55 ? 2 : 1;
    for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) {
      const b = { x: x + col * w / cols + 3, y: y + row * h / rows + 3, w: w / cols - 9, h: h / rows - 9, palette: Math.floor(random() * 6), detail: random(), district };
      if (b.w < 45 || b.h < 45 || ROADS.some(r => roadCutsRect(r, b)) || FEATURES.some(f => b.x < f.x + f.w && b.x + b.w > f.x && b.y < f.y + f.h && b.y + b.h > f.y)) continue;
      BUILDINGS.push(b);
    }
  }
}
blocks([200, 500, 800, 1100], outerY, 0); blocks(centralX, centralY, 1); blocks([3200, 3500, 3800, 4100, 4400], outerY, 2);
// Recognizable civic landmarks interrupt the smaller surrounding building plots.
for(const landmark of [
  {x:2164,y:2280,w:160,h:172,palette:1,detail:.62,district:1,landmark:'terminal',block:{x:2100,y:2220,w:300,h:300}},
  {x:1864,y:2880,w:176,h:225,palette:2,detail:.9,district:1,landmark:'cityhall',block:{x:1800,y:2820,w:300,h:360}},
]){
  const r=landmark.block;
  for(let i=BUILDINGS.length-1;i>=0;i--){const b=BUILDINGS[i];if(b.x>r.x&&b.x<r.x+r.w&&b.y>r.y&&b.y<r.y+r.h)BUILDINGS.splice(i,1);}
  BUILDINGS.push(landmark);
}
export function visibleBetween(a, b) {
  const length = Math.hypot(b.x - a.x, b.y - a.y), count = Math.ceil(length / 25);
  for (let i = 1; i < count; i++) {
    const x = a.x + (b.x - a.x) * i / count, y = a.y + (b.y - a.y) * i / count;
    if (BUILDINGS.some(r => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h)) return false;
  }
  return true;
}
export function signalGreen(n, time, angle) {
  const vertical = Math.abs(Math.sin(angle)) > .72;
  return (Math.floor((time + n.x / 200) / 7) % 2 === 0) === vertical;
}
