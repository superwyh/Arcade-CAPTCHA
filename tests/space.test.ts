import { describe, expect, it } from 'vitest';
import { SpaceModel } from '../src/games/space-model';

const seeded = (seed: number) => () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; };
function advance(model: SpaceModel, seconds: number) { for (let i = 0; i < seconds * 50; i++) model.tick(.02); }

describe('Space shooter', () => {
  it('starts shooting automatically, with a safe opening and no idle victory', () => {
    const model = new SpaceModel(3, seeded(1)); model.tick(.02);
    expect(model.shots).toHaveLength(2); expect(model.enemies).toHaveLength(8);
    advance(model, 3); expect(model.health).toBe(3); expect(model.won).toBe(false);
    advance(model, 100); expect(model.won).toBe(false); expect(model.alive).toBe(false);
  });
  it('bounds keyboard and pointer movement and keeps diagonal speed consistent', () => {
    const a = new SpaceModel(), b = new SpaceModel();
    a.tick(.04, new Set(['right'])); b.tick(.04, new Set(['right', 'up']));
    expect(Math.hypot(b.x - 134, b.y - 163)).toBeCloseTo(a.x - 134);
    for (let i = 0; i < 100; i++) a.tick(.02, new Set(['right', 'down']));
    expect(a.x).toBe(256); expect(a.y).toBe(178);
    for (let i = 0; i < 100; i++) b.tick(.02, new Set(), { x: -999, y: -999 });
    expect(b.x).toBe(12); expect(b.y).toBe(108);
  });
  it('detects fast projectiles and grants invulnerability after a single hit', () => {
    const model = new SpaceModel(); model.invulnerable = 0;
    model.enemyShots = Array.from({ length: 3 }, () => ({ x: model.x, y: model.y - 20, vx: 0, vy: 1000 }));
    model.tick(.04); expect(model.health).toBe(2); expect(model.invulnerable).toBeGreaterThan(1);
    expect(model.enemyShots).toHaveLength(0); model.tick(.04); expect(model.health).toBe(2);
  });
  it('does not advance when only one enemy is killed', () => {
    const model = new SpaceModel(); model.enemies[0].hp = 0; model.tick(.02);
    expect(model.enemies).toHaveLength(7); expect(model.score).toBe(0);
  });
  it.each([1, 3, 5])('requires the final boss for a %i-stage target and freezes on completion', target => {
    const model = new SpaceModel(target, seeded(7));
    for (let stage = 0; stage < target; stage++) {
      expect(!!model.boss).toBe(stage === target - 1);
      model.enemies.forEach(enemy => enemy.hp = 0); model.health = 2;
      model.tick(.02); expect(model.score).toBe(stage + 1);
      if (stage < target - 1) {
        expect(model.health).toBe(3); expect(model.enemyShots).toHaveLength(0); expect(model.intermission).toBeGreaterThan(0);
        advance(model, 1.2);
      }
    }
    expect(model.won).toBe(true); const elapsed = model.elapsed; advance(model, 2); expect(model.elapsed).toBe(elapsed);
  });
  it('never verifies a fatal hit on the same frame as the last kill', () => {
    const model = new SpaceModel(1); model.health = 1; model.invulnerable = 0;
    model.enemies[0].hp = 0; model.enemyShots = [{ x: model.x, y: model.y, vx: 0, vy: 0 }]; model.tick(.02);
    expect(model.alive).toBe(false); expect(model.won).toBe(false); expect(model.score).toBe(0);
    const elapsed = model.elapsed; advance(model, 2); expect(model.elapsed).toBe(elapsed);
  });
  it.each([1, 7, 19, 42, 103, 511])('can complete seed %i through normal movement and automatic fire', seed => {
    const model = new SpaceModel(3, seeded(seed));
    for (let i = 0; i < 50 * 180 && model.alive && !model.won; i++) {
      const enemy = [...model.enemies].sort((a, b) => Math.abs(a.x - model.x) - Math.abs(b.x - model.x))[0];
      const flight = enemy ? Math.max(0, (model.y - enemy.y) / 215) : 0;
      const target = enemy ? enemy.baseX + Math.sin((model.phaseTime + flight) * (enemy.type === 'boss' ? .85 : .7) + enemy.phase) * (enemy.type === 'boss' ? 82 : 24) : model.x;
      let bestX = model.x, bestCost = Infinity;
      for (let x = 12; x <= 256; x += 4) {
        let cost = Math.abs(target - x) * .12 + Math.abs(model.x - x) * .01;
        for (const shot of model.enemyShots) for (const time of [.15, .35, .6, .9, 1.2]) {
          const px = model.x + Math.max(-180 * time, Math.min(180 * time, x - model.x));
          const distance = Math.hypot(px - shot.x - shot.vx * time, 172 - shot.y - shot.vy * time);
          cost += Math.max(0, 17 - distance) ** 2;
        }
        if (cost < bestCost) { bestCost = cost; bestX = x; }
      }
      model.tick(.02, new Set(), { x: bestX, y: 172 });
    }
    expect({ score: model.score, lives: model.health, time: Math.round(model.elapsed) }).toMatchObject({ score: 3 });
    expect(model.won).toBe(true); expect(model.elapsed).toBeGreaterThan(20);
  });
});
