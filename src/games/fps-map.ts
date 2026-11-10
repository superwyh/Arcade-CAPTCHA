export type EnemyKind = 'guard' | 'imp' | 'brute';
export type PickupKind = 'ammo' | 'health' | 'armor' | 'key';
export interface Position { x: number; y: number }
export interface Enemy extends Position { kind: EnemyKind; health: number; awake: boolean; cooldown: number; hit: number }
export interface Pickup extends Position { kind: PickupKind; taken: boolean }
export interface Projectile extends Position { vx: number; vy: number; life: number }
export interface Sector { map: string[]; spawn: Position; angle: number; enemies: Enemy[]; pickups: Pickup[]; exit: Position }
export const SECTOR_COUNT = 5;
export const MAP_SIZE = 25;
type Room = { id: number; x: number; y: number; left: number; top: number; right: number; bottom: number };

/** A randomized room graph with a spanning tree and extra loops; every carved area is connected. */
export function createSector(index: number, random: () => number = Math.random): Sector {
  const pick = <T>(items: T[]) => items[Math.floor(random() * items.length)];
  const shuffle = <T>(items: T[]) => {
    for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [items[i], items[j]] = [items[j], items[i]]; }
    return items;
  };
  const theme = String(index % 3 + 1);
  const tiles = Array.from({ length: MAP_SIZE }, () => Array<string>(MAP_SIZE).fill(theme));
  const rooms: Room[] = Array.from({ length: 9 }, (_, id) => {
    const x = 4 + id % 3 * 8, y = 4 + Math.floor(id / 3) * 8;
    const halfWidth = pick([2, 3]), halfHeight = pick([2, 3]);
    return { id, x, y, left: x - halfWidth, right: x + halfWidth, top: y - halfHeight, bottom: y + halfHeight };
  });
  const neighbors = (id: number) => [id % 3 > 0 ? id - 1 : -1, id % 3 < 2 ? id + 1 : -1, id >= 3 ? id - 3 : -1, id < 6 ? id + 3 : -1].filter(n => n >= 0);
  const start = pick([0, 2, 6, 8]), wanted = pick([7, 8, 9]), visited = new Set([start]);
  const edges: [number, number][] = [], frontier: [number, number][] = neighbors(start).map(id => [start, id]);
  while (visited.size < wanted && frontier.length) {
    const [from, to] = frontier.splice(Math.floor(random() * frontier.length), 1)[0];
    if (visited.has(to)) continue;
    visited.add(to); edges.push([from, to]);
    for (const neighbor of neighbors(to)) if (!visited.has(neighbor)) frontier.push([to, neighbor]);
  }
  // Alternate routes avoid forcing every encounter into a dead end.
  for (const id of visited) for (const next of neighbors(id)) {
    if (next <= id || !visited.has(next) || edges.some(([a, b]) => a === id && b === next || a === next && b === id)) continue;
    if (random() < .35) edges.push([id, next]);
  }
  for (const id of visited) {
    const room = rooms[id];
    for (let y = room.top; y <= room.bottom; y++) for (let x = room.left; x <= room.right; x++) tiles[y][x] = '.';
  }
  for (const [a, b] of edges) {
    const from = rooms[a], to = rooms[b];
    if (from.y === to.y) {
      const y = from.y + pick([-1, 0, 1]);
      for (let x = Math.min(from.x, to.x); x <= Math.max(from.x, to.x); x++) { tiles[y][x] = '.'; tiles[y + 1][x] = '.'; }
    } else {
      const x = from.x + pick([-1, 0, 1]);
      for (let y = Math.min(from.y, to.y); y <= Math.max(from.y, to.y); y++) { tiles[y][x] = '.'; tiles[y][x + 1] = '.'; }
    }
  }
  // Borders and inset wall panels are decorative; floor connectivity stays intact.
  for (let y = 1; y < MAP_SIZE - 1; y++) for (let x = 1; x < MAP_SIZE - 1; x++) {
    if (tiles[y][x] !== '.' && (tiles[y][x - 1] === '.' || tiles[y - 1][x] === '.') && (x + y) % 5 === 0) tiles[y][x] = String((index + 1) % 3 + 1);
  }
  const spawn = { x: rooms[start].x + .5, y: rooms[start].y + .5 };
  const distance = new Map<number, number>(), queue = [Math.floor(spawn.y) * MAP_SIZE + Math.floor(spawn.x)];
  distance.set(queue[0], 0);
  for (let head = 0; head < queue.length; head++) {
    const cell = queue[head], x = cell % MAP_SIZE, y = Math.floor(cell / MAP_SIZE);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const next = ny * MAP_SIZE + nx;
      if (tiles[ny]?.[nx] !== '.' || distance.has(next)) continue;
      distance.set(next, distance.get(cell)! + 1); queue.push(next);
    }
  }
  const roomDistance = (room: Room) => distance.get(room.y * MAP_SIZE + room.x)!;
  const combatRooms = shuffle([...visited].filter(id => id !== start).map(id => rooms[id]));
  const farthest = [...combatRooms].sort((a, b) => roomDistance(b) - roomDistance(a));
  const exitRoom = farthest[0], keyRoom = farthest[1];
  // Put the exit in an outer wall, with a reachable floor cell directly in front.
  const exits = [
    { x: exitRoom.left - 1, y: exitRoom.y }, { x: exitRoom.right + 1, y: exitRoom.y },
    { x: exitRoom.x, y: exitRoom.top - 1 }, { x: exitRoom.x, y: exitRoom.bottom + 1 },
  ].filter(p => p.x > 0 && p.y > 0 && p.x < MAP_SIZE - 1 && p.y < MAP_SIZE - 1 && tiles[p.y][p.x] !== '.');
  // Every room also has corners outside corridor entrances if its sides open onto neighbors.
  const exitCell = exits.length ? pick(exits) : { x: exitRoom.left, y: exitRoom.top };
  tiles[exitCell.y][exitCell.x] = 'E';
  const exit = { x: exitCell.x + .5, y: exitCell.y + .5 };
  const occupied: Position[] = [spawn, exit];
  const spot = (room: Room): Position => {
    const candidates: Position[] = [];
    for (let y = room.top + 1; y < room.bottom; y++) for (let x = room.left + 1; x < room.right; x++) {
      if (tiles[y][x] === '.' && occupied.every(p => Math.hypot(p.x - x - .5, p.y - y - .5) >= 1)) candidates.push({ x: x + .5, y: y + .5 });
    }
    if (!candidates.length) throw new Error('No free FPS spawn cell.');
    const result = pick(candidates); occupied.push(result); return result;
  };
  const enemies: Enemy[] = [];
  const count = 8 + Math.floor(index / 2);
  for (let i = 0; i < count; i++) {
    const room = combatRooms[i % combatRooms.length];
    const kind: EnemyKind = i === count - 1 || index > 2 && i === count - 2 ? 'brute' : pick(['guard', 'imp']);
    enemies.push({ ...spot(room), kind, health: (kind === 'brute' ? 95 : kind === 'imp' ? 65 : 55) + Math.min(index, 2) * 5, awake: false, cooldown: 1.5 + random() * .8, hit: 0 });
  }
  const pickups: Pickup[] = [];
  const add = (room: Room, kind: PickupKind) => pickups.push({ ...spot(room), kind, taken: false });
  add(keyRoom, 'key');
  add(rooms[start], 'ammo');
  add(farthest[0], 'ammo'); add(farthest[Math.floor(farthest.length / 2)], 'ammo');
  add(farthest[1], 'health'); add(farthest[farthest.length - 1], 'health');
  add(farthest[2], 'armor');
  const firstEdge = edges.find(([a, b]) => a === start || b === start)!;
  const facing = rooms[firstEdge[0] === start ? firstEdge[1] : firstEdge[0]];
  return { map: tiles.map(row => row.join('')), spawn, exit, enemies, pickups, angle: Math.atan2(facing.y - rooms[start].y, facing.x - rooms[start].x) };
}
