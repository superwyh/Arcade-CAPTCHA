import { describe, expect, it } from 'vitest';
import { createSector, FpsModel, MAP_SIZE, SECTOR_COUNT, angleDifference, type Enemy, type Position } from '../src/games/fps-model';
import type { GameAction } from '../src/types';

function pathTo(model: FpsModel, target: Position): Position[] {
  const start = Math.floor(model.y) * MAP_SIZE + Math.floor(model.x);
  const end = Math.floor(target.y) * MAP_SIZE + Math.floor(target.x);
  const queue = [start], parents = new Map<number, number>([[start, -1]]);
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]; if (current === end) break;
    const x = current % MAP_SIZE, y = Math.floor(current / MAP_SIZE);
    for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
      const id = ny * MAP_SIZE + nx;
      if (!parents.has(id) && nx >= 0 && ny >= 0 && nx < MAP_SIZE && ny < MAP_SIZE && !model.solid(nx + .5, ny + .5)) { parents.set(id, current); queue.push(id); }
    }
  }
  if (!parents.has(end)) return [];
  const path: Position[] = [];
  for (let current = end; current !== start; current = parents.get(current)!) path.unshift({ x: current % MAP_SIZE + .5, y: Math.floor(current / MAP_SIZE) + .5 });
  path.push(target); return path;
}

function enemy(x: number, y: number): Enemy { return { x, y, kind: 'guard', health: 55, awake: false, cooldown: 2, hit: 0 }; }
function seeded(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
function arena() {
  const model = new FpsModel(seeded(1));
  model.sector.map = Array.from({ length: MAP_SIZE }, (_, y) => Array.from({ length: MAP_SIZE }, (_, x) => x === 0 || y === 0 || x === MAP_SIZE - 1 || y === MAP_SIZE - 1 ? '1' : '.').join(''));
  model.x = 2.5; model.y = 3.5; model.angle = 0; model.sector.enemies = []; model.sector.pickups = [];
  return model;
}

describe('FPS sector rules', () => {
  it('keeps 100 generated maps enclosed and every objective reachable', () => {
    for (let seed = 0; seed < 100; seed++) {
      const model = new FpsModel(seeded(seed)); model.sector = createSector(seed % SECTOR_COUNT, seeded(seed + 200)); model.x = model.sector.spawn.x; model.y = model.sector.spawn.y;
      expect(model.sector.map).toHaveLength(MAP_SIZE);
      expect(model.sector.map.every(row => row.length === MAP_SIZE)).toBe(true);
      for (const entity of [...model.sector.enemies, ...model.sector.pickups]) {
        expect(model.canOccupy(entity.x, entity.y)).toBe(true);
        expect(pathTo(model, entity).length).toBeGreaterThan(0);
      }
      expect(model.remaining).toBeGreaterThanOrEqual(8);
      const positions = [model.sector.spawn, ...model.sector.enemies, ...model.sector.pickups].map(p => `${p.x},${p.y}`);
      expect(new Set(positions).size).toBe(positions.length);
      expect(model.sector.pickups.filter(p => p.kind === 'key')).toHaveLength(1);
      model.sector.enemies = []; model.key = true;
      expect(pathTo(model, model.sector.exit).length).toBeGreaterThan(0);
      for (let i = 0; i < MAP_SIZE; i++) expect([model.tile(i, 0), model.tile(i, MAP_SIZE - 1), model.tile(0, i), model.tile(MAP_SIZE - 1, i)].every(tile => tile !== '.')).toBe(true);
    }
  });
  it('generates varied layouts and supports reproducible random sources', () => {
    const maps = new Set(Array.from({ length: 30 }, (_, seed) => createSector(0, seeded(seed)).map.join('\n')));
    expect(maps.size).toBe(30);
    expect(createSector(2, seeded(77))).toEqual(createSector(2, seeded(77)));
    const random = seeded(5); expect(createSector(0, random).map).not.toEqual(createSector(0, random).map);
  });
  it('blocks movement at walls and normalizes diagonal movement', () => {
    const model = arena(); model.angle = Math.PI;
    for (let frame = 0; frame < 600; frame++) model.tick(1 / 60, new Set(['up']));
    expect(model.x).toBeGreaterThanOrEqual(1.2); expect(model.canOccupy(model.x, model.y)).toBe(true);
    const diagonal = arena(), straight = arena();
    diagonal.tick(.04, new Set(['up', 'strafe-right'])); straight.tick(.04, new Set(['up']));
    expect(Math.hypot(diagonal.x - 2.5, diagonal.y - 3.5)).toBeCloseTo(straight.x - 2.5);
  });
  it('shoots only the nearest visible enemy and enforces weapon cooldown', () => {
    const model = arena(); model.sector.enemies = [enemy(4.5, 3.5), enemy(5.5, 3.5)];
    model.fire(); model.fire();
    expect(model.sector.enemies.map(foe => foe.health)).toEqual([19, 55]); expect(model.ammo).toBe(31);
    for (let i = 0; i < 40; i++) model.tick(1 / 60);
    model.fire(); expect(model.kills).toBe(1); expect(model.sector.enemies[1].health).toBe(55);
  });
  it('does not allow shots or enemy projectiles through walls', () => {
    const model = arena(); model.sector.map = model.sector.map.map(row => row.slice(0, 7) + '1' + row.slice(8));
    model.sector.enemies = [enemy(12.5, 1.5)]; model.angle = Math.atan2(-2, 10);
    expect(model.visible(model.x, model.y, 12.5, 1.5)).toBe(false);
    model.fire(); expect(model.sector.enemies[0].health).toBe(55);
    model.projectiles = [{ x: 7.5, y: 2.5, vx: -2, vy: 0, life: 4 }]; model.tick(.02);
    expect(model.projectiles).toHaveLength(0);
  });
  it('keeps a melee fallback when ammunition runs out', () => {
    const model = arena(); model.ammo = 0; model.sector.enemies = [enemy(3.25, 3.5)]; model.fire();
    expect(model.sector.enemies[0].health).toBe(25); expect(model.ammo).toBe(0);
  });
  it('absorbs damage with armor and stops simulation after death', () => {
    const model = new FpsModel(); model.armor = 10; model.damage(20);
    expect(model.health).toBe(90); expect(model.armor).toBe(0);
    model.damage(1000); const before = [model.x, model.y, model.ammo, model.elapsed];
    model.tick(.04, new Set(['up', 'fire'])); expect([model.x, model.y, model.ammo, model.elapsed]).toEqual(before);
    expect(model.alive).toBe(false);
  });
  it('consumes useful supplies once and leaves full-health pickups available', () => {
    const model = new FpsModel(); model.sector.enemies = []; model.sector.pickups = [{ x: model.x, y: model.y, kind: 'health', taken: false }];
    model.tick(.02); expect(model.sector.pickups[0].taken).toBe(false);
    model.health = 40; model.tick(.02); model.tick(.02); expect(model.health).toBe(75); expect(model.sector.pickups[0].taken).toBe(true);
  });
  it('requires enemies, key and an actual exit visit before awarding a sector', () => {
    const model = new FpsModel(); model.x = model.sector.exit.x; model.y = model.sector.exit.y;
    model.tick(.02); expect(model.cleared).toBe(0);
    model.key = true; model.tick(.02); expect(model.cleared).toBe(0);
    model.sector.enemies = []; model.x = model.sector.spawn.x; model.y = model.sector.spawn.y;
    model.tick(.02); expect(model.cleared).toBe(0);
    model.x = model.sector.exit.x; model.y = model.sector.exit.y; model.tick(.02);
    expect(model.cleared).toBe(1); expect(model.key).toBe(false); expect(model.won).toBe(false); expect(model.remaining).toBeGreaterThan(0);
  });
  it.each([3, 29, 104])('can complete five randomized sectors with seed %s through normal gameplay', seed => {
    const model = new FpsModel(seeded(seed)), checkpoints: number[] = [];
    let lastSector = 0;
    for (let frame = 0; frame < 60 * 600 && model.alive && !model.won; frame++) {
      const inputs = new Set<GameAction>();
      const distance = (p: Position) => Math.hypot(p.x - model.x, p.y - model.y);
      const visible = model.sector.enemies.filter(foe => foe.health > 0 && distance(foe) < 8 && model.visible(model.x, model.y, foe.x, foe.y)).sort((a, b) => distance(a) - distance(b))[0];
      let target: Position | undefined, fighting = false;
      if (visible) { target = visible; fighting = true; }
      else {
        const supply = model.sector.pickups.filter(item => !item.taken && (item.kind === 'ammo' && model.ammo < 8 || item.kind === 'health' && model.health < 65 || item.kind === 'armor' && model.armor < 25 || item.kind === 'key' && model.remaining === 0));
        const candidates = supply.length ? supply : model.sector.enemies.filter(foe => foe.health > 0);
        const routes = (candidates.length ? candidates : [model.sector.exit]).map(p => pathTo(model, p)).filter(path => path.length).sort((a, b) => a.length - b.length);
        target = routes[0]?.[0];
      }
      if (target) {
        const error = angleDifference(Math.atan2(target.y - model.y, target.x - model.x) - model.angle);
        if (Math.abs(error) > .035) inputs.add(error < 0 ? 'left' : 'right');
        if (fighting) { if (Math.abs(error) < .1) inputs.add('fire'); if (distance(target) > 4 && Math.abs(error) < .25) inputs.add('up'); }
        else if (Math.abs(error) < .25) inputs.add('up');
      }
      model.tick(1 / 60, inputs); model.events.length = 0;
      if (model.cleared !== lastSector) { checkpoints.push(model.elapsed); lastSector = model.cleared; }
    }
    expect({ alive: model.alive, cleared: model.cleared, remaining: model.remaining, key: model.key, health: model.health, x: model.x, y: model.y }).toMatchObject({ alive: true, cleared: SECTOR_COUNT });
    expect(model.won).toBe(true); expect(checkpoints).toHaveLength(SECTOR_COUNT);
    expect(model.elapsed).toBeGreaterThan(180); expect(model.elapsed).toBeLessThan(480);
    console.info(`FPS simulated run: ${Math.round(model.elapsed)}s, sector exits at ${checkpoints.map(time => Math.round(time)).join('/')}s, ${model.shots} shots.`);
  }, 30_000);
});
