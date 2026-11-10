import { describe, expect, it } from 'vitest';
import { AdventureModel, createDungeon, directions, ROOM_HEIGHT, ROOM_WIDTH, type Direction, type Position } from '../src/games/adventure-model';
import type { GameAction } from '../src/types';

function route(model: AdventureModel, target: Position) {
  const start = Math.floor(model.y) * ROOM_WIDTH + Math.floor(model.x), end = Math.floor(target.y) * ROOM_WIDTH + Math.floor(target.x);
  if (start === end) return target;
  const queue = [start], parents = new Map([[start, -1]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head], x = current % ROOM_WIDTH, y = Math.floor(current / ROOM_WIDTH);
    if (current === end) break;
    for (const d of Object.values(directions)) {
      const nx = x + d.x, ny = y + d.y, next = ny * ROOM_WIDTH + nx;
      if (nx < 0 || ny < 0 || nx >= ROOM_WIDTH || ny >= ROOM_HEIGHT || parents.has(next) || !model.canOccupy(nx + .5, ny + .5)) continue;
      parents.set(next, current); queue.push(next);
    }
  }
  if (!parents.has(end)) return undefined;
  let next = end;
  while (parents.get(next) !== start) next = parents.get(next)!;
  return { x: next % ROOM_WIDTH + .5, y: Math.floor(next / ROOM_WIDTH) + .5 };
}

describe('Adventure dungeon', () => {
  it('connects all nine rooms with reciprocal doors and reachable treasures', () => {
    const model = new AdventureModel(), visited = new Set([7]), queue = [7];
    const opposite = { left: 'right', right: 'left', up: 'down', down: 'up' } as const;
    for (let i = 0; i < queue.length; i++) {
      const room = model.rooms[queue[i]];
      for (const [direction, next] of Object.entries(room.doors) as [Direction, number][]) {
        expect(model.rooms[next].doors[opposite[direction]]).toBe(room.id);
        if (!visited.has(next)) { visited.add(next); queue.push(next); }
      }
      model.roomId = room.id; model.x = 7.5; model.y = 5;
      for (const entity of [...room.enemies, ...(room.chest ? [room.chest] : [])]) expect(route(model, entity)).toBeDefined();
    }
    expect(visited.size).toBe(9);
    expect(createDungeon(2)[1].enemies[0].health).toBeGreaterThan(createDungeon()[1].enemies[0].health);
  });
  it('blocks walls and locked rooms without consuming the key early', () => {
    const model = new AdventureModel(); model.roomId = 0; model.room.enemies = []; model.x = 13.2; model.y = 5;
    for (let i = 0; i < 60; i++) model.tick(1 / 60, new Set(['right']));
    expect(model.roomId).toBe(0); expect(model.bossUnlocked).toBe(false);
    model.key = true;
    for (let i = 0; i < 60 && model.roomId === 0; i++) model.tick(1 / 60, new Set(['right']));
    expect(model.roomId).toBe(1); expect(model.key).toBe(false); expect(model.bossUnlocked).toBe(true);
  });
  it('normalizes diagonals and releases gameplay after death', () => {
    const straight = new AdventureModel(), diagonal = new AdventureModel();
    straight.tick(.04, new Set(['right'])); diagonal.tick(.04, new Set(['right', 'up']));
    expect(Math.hypot(diagonal.x - 7.5, diagonal.y - 6.5)).toBeCloseTo(straight.x - 7.5);
    diagonal.health = 0; const before = [diagonal.x, diagonal.y, diagonal.elapsed]; diagonal.tick(.04, new Set(['right', 'attack']));
    expect([diagonal.x, diagonal.y, diagonal.elapsed]).toEqual(before);
  });
  it('respects sword direction, cooldown and walls', () => {
    const model = new AdventureModel(); model.roomId = 4; model.x = 7.5; model.y = 5; model.facing = 'right';
    model.room.enemies = [
      { x: 8.5, y: 5, kind: 'slime', health: 2, hit: 0, phase: 0, timer: 2 },
      { x: 6.5, y: 5, kind: 'slime', health: 2, hit: 0, phase: 0, timer: 2 },
    ];
    model.attack(); model.attack(); expect(model.room.enemies.map(e => e.health)).toEqual([2, 2]);
    for (let i = 0; i < 4; i++) model.tick(.02);
    expect(model.room.enemies.map(e => e.health)).toEqual([1, 2]);
    for (let i = 0; i < 20; i++) model.tick(.02);
    model.room.walls.push({ x: 8, y: 5 }); model.attack();
    for (let i = 0; i < 6; i++) model.tick(.02);
    expect(model.room.enemies[0].health).toBe(1);
  });
  it.each(['up', 'down', 'left', 'right'] as const)('hits along the visible %s blade, not beside or behind the hero', direction => {
    const model = new AdventureModel(), d = directions[direction]; model.x = 7.5; model.y = 5; model.facing = direction;
    model.room.enemies = [
      { x: model.x + d.x, y: model.y + d.y, kind: 'slime', health: 3, hit: 1, phase: 0, timer: 2 },
      { x: model.x - d.y * 1.1, y: model.y + d.x * 1.1, kind: 'slime', health: 3, hit: 1, phase: 0, timer: 2 },
      { x: model.x - d.x, y: model.y - d.y, kind: 'slime', health: 3, hit: 1, phase: 0, timer: 2 },
    ];
    model.attack(); model.tick(.04); expect(model.room.enemies.map(e => e.health)).toEqual([3, 3, 3]);
    model.tick(.04); expect(model.room.enemies.map(e => e.health)).toEqual([2, 3, 3]);
    for (let i = 0; i < 4; i++) model.tick(.04);
    expect(model.room.enemies.map(e => e.health)).toEqual([2, 3, 3]);
  });
  it('plants the hero and locks the direction until the attack recovers', () => {
    const model = new AdventureModel(); model.facing = 'left'; model.attack(); const x = model.x, y = model.y;
    for (let i = 0; i < 6; i++) model.tick(.04, new Set(['right', 'up']));
    expect([model.x, model.y, model.facing, model.attackFacing]).toEqual([x, y, 'left', 'left']);
    expect(model.moving).toBe(false);
    model.tick(.04, new Set(['right'])); expect(model.x).toBeGreaterThan(x); expect(model.facing).toBe('right');
  });
  it.each(['up', 'down', 'left', 'right'] as const)('gives moving enemies generous reach and lateral tolerance when facing %s', direction => {
    const model = new AdventureModel(), d = directions[direction]; model.facing = direction; model.y = 5;
    const target = (forward: number, side: number) => ({ x: model.x + d.x * forward - d.y * side, y: model.y + d.y * forward + d.x * side, kind: 'slime' as const, health: 3, hit: 1, phase: 0, timer: 2 });
    model.room.enemies = [target(1.8, .3), target(1, .85), target(1, -.85), target(-.4, 0), target(2.5, 0), target(.7, 1.5)];
    model.attack(); model.tick(.04); model.tick(.04);
    expect(model.room.enemies.map(enemy => enemy.health)).toEqual([2, 2, 2, 3, 3, 3]);
  });
  it('advances the walk cycle with distance and stops animating when blocked', () => {
    const model = new AdventureModel(); model.x = 1.23; model.y = 3;
    model.tick(.04, new Set(['left'])); const phase = model.walking;
    model.tick(.04, new Set(['left'])); expect(model.moving).toBe(false); expect(model.walking).toBe(phase);
    model.tick(.04, new Set(['right'])); expect(model.moving).toBe(true); expect(model.walking).toBeGreaterThan(phase);
    const stopped = model.walking; model.tick(.04); expect(model.moving).toBe(false); expect(model.walking).toBe(stopped);
  });
  it('blocks a projectile with the extended blade, but not during wind-up or off to the side', () => {
    const model = new AdventureModel(); model.facing = 'right';
    model.projectiles = [
      { x: model.x + .8, y: model.y + .3, vx: 0, vy: 0, life: 2 },
      { x: model.x, y: model.y - 1, vx: 0, vy: 0, life: 2 },
    ];
    model.attack(); model.tick(.04); expect(model.projectiles).toHaveLength(2);
    model.tick(.04); expect(model.projectiles).toHaveLength(1); expect(model.projectiles[0].y).toBe(model.y - 1);
  });
  it('opens chests only after combat and applies each reward once', () => {
    const model = new AdventureModel(); model.roomId = 0; const chest = model.room.chest!; model.x = chest.x; model.y = chest.y;
    model.tick(.02); expect(model.key).toBe(false); model.room.enemies = []; model.tick(.02); expect(model.key).toBe(true);
    model.key = false; model.tick(.02); expect(model.key).toBe(false);
    model.roomId = 3; model.room.enemies = []; model.tick(.02); expect(model.swordLevel).toBe(2);
    model.roomId = 6; model.room.enemies = []; model.health = 2; model.tick(.02); expect(model.health).toBe(7); expect(model.maxHealth).toBe(7);
    model.tick(.02); expect(model.maxHealth).toBe(7);
  });
  it('awards progress only for visiting the unlocked stairs after defeating the guardian', () => {
    const model = new AdventureModel(); model.roomId = 1; model.x = 7.5; model.y = 2;
    model.tick(.02); expect(model.completed).toBe(0);
    model.bossUnlocked = true; model.tick(.02); expect(model.completed).toBe(0);
    model.room.enemies = []; model.y = 5; model.tick(.02); expect(model.completed).toBe(0);
    model.y = 2; model.tick(.02); expect(model.completed).toBe(1); expect(model.roomId).toBe(7);
    expect(model.key).toBe(false); expect(model.rooms[1].enemies[0].health).toBe(16);
  });
  it('limits repeated damage and supports healing', () => {
    const model = new AdventureModel(); model.damage(); model.damage(); expect(model.health).toBe(5);
    model.hearts.push({ x: model.x, y: model.y }); model.tick(.02); expect(model.health).toBe(6); expect(model.hearts).toHaveLength(0);
  });
  it('can explore all rooms and finish with ordinary movement and attacks', () => {
    const model = new AdventureModel(), itinerary = [7, 6, 7, 4, 5, 8, 5, 2, 5, 4, 3, 0, 1];
    const visited = new Set<number>(); let leg = 0;
    for (let frame = 0; frame < 60 * 300 && model.alive && model.completed < 1; frame++) {
      visited.add(model.roomId);
      if (model.roomId === itinerary[leg + 1]) leg++;
      const inputs = new Set<GameAction>();
      const distance = (p: Position) => Math.hypot(p.x - model.x, p.y - model.y);
      const enemy = model.room.enemies.filter(e => e.health > 0).sort((a, b) => distance(a) - distance(b))[0];
      let target: Position | undefined, combat = false;
      if (enemy) { target = enemy; combat = true; }
      else if (model.room.chest && !model.room.chest.opened) target = model.room.chest;
      else if (model.health < model.maxHealth && model.hearts.length) target = model.hearts[0];
      else if (model.roomId === 1) target = { x: 7.5, y: 2 };
      else {
        const next = itinerary[leg + 1];
        const direction = (Object.keys(model.room.doors) as Direction[]).find(d => model.room.doors[d] === next)!;
        target = { x: direction === 'left' ? .5 : direction === 'right' ? 14.5 : 7.5, y: direction === 'up' ? .5 : direction === 'down' ? 9.5 : 5 };
      }
      if (target) {
        const waypoint = route(model, target);
        if (waypoint) {
          const dx = waypoint.x - model.x, dy = waypoint.y - model.y;
          const aimX = target.x - model.x, aimY = target.y - model.y;
          const facing: Direction = Math.abs(aimX) > Math.abs(aimY) ? aimX < 0 ? 'left' : 'right' : aimY < 0 ? 'up' : 'down';
          const inRange = combat && distance(target) < (enemy?.kind === 'guardian' ? 1.3 : 1.05)
            && Math.min(Math.abs(aimX), Math.abs(aimY)) < .1 && model.visible(model, target);
          if (!inRange) {
            if (Math.abs(dx) > .06) inputs.add(dx < 0 ? 'left' : 'right');
            if (Math.abs(dy) > .06) inputs.add(dy < 0 ? 'up' : 'down');
          } else if (model.facing !== facing) inputs.add(facing);
          if (inRange) inputs.add('attack');
        }
      }
      model.tick(1 / 60, inputs); model.events.length = 0;
    }
    expect(model.completed, JSON.stringify({ health: model.health, room: model.roomId, remaining: model.remaining, x: model.x, y: model.y, enemies: model.room.enemies, leg, visited: [...visited] })).toBe(1);
    expect(visited.size).toBe(9); expect(model.elapsed).toBeGreaterThan(30); expect(model.elapsed).toBeLessThan(300);
    console.info(`Adventure full dungeon: ${Math.round(model.elapsed)} seconds, ${visited.size} rooms, ${model.health} hearts left.`);
  });
});
