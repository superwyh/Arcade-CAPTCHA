import { describe, expect, it } from 'vitest';
import { RacingModel, RACE_LANES, RACE_TARGET } from '../src/games/racing-model';
import type { GameAction } from '../src/types';

function seeded(seed: number) { return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }
function step(model: RacingModel, count: number, actions: GameAction[] = [], x?: number) {
  for (let i = 0; i < count; i++) model.tick(.02, new Set(actions), x);
}

describe('Racing', () => {
  it('starts moving with a safe opening, and supports acceleration, braking and steering', () => {
    const model = new RacingModel(undefined, seeded(1));
    expect(model.target).toBe(RACE_TARGET); expect(model.cars.every(car => car.distance >= 115)).toBe(true);
    step(model, 150); expect(model.distance).toBeGreaterThan(70); expect(model.health).toBe(3);
    step(model, 50, ['boost']); expect(model.speed).toBeGreaterThan(30);
    step(model, 50, ['brake'], 0); expect(model.speed).toBe(12);
    step(model, 30, ['right']); expect(model.x).toBeGreaterThan(.8);
  });
  it('keeps damage bounded during a collision and penalizes sustained off-road driving', () => {
    const model = new RacingModel(undefined, seeded(1));
    model.cars = [{ x: 0, distance: 3, sprite: 4, hit: false }, { x: 0, distance: 3, sprite: 5, hit: false }];
    step(model, 1); expect(model.health).toBe(2); expect(model.invulnerable).toBeGreaterThan(1);
    step(model, 30); expect(model.health).toBe(2);
    model.cars = []; model.x = 1.25; step(model, 150, ['right']);
    expect(model.health).toBe(1); expect(model.speed).toBeLessThan(10); expect(model.x).toBe(1.25);
  });
  it('freezes after victory or death and never wins when dying at the finish', () => {
    const winner = new RacingModel(40, seeded(1)); step(winner, 200);
    expect(winner.won).toBe(true); expect(winner.score).toBe(40);
    const elapsed = winner.elapsed; step(winner, 50); expect(winner.elapsed).toBe(elapsed);
    const loser = new RacingModel(1, seeded(1)); loser.health = 1;
    loser.cars = [{ x: 0, distance: 1, sprite: 4, hit: false }]; step(loser, 50);
    expect(loser.alive).toBe(false); expect(loser.won).toBe(false);
    const stopped = loser.distance; step(loser, 50); expect(loser.distance).toBe(stopped);
  });
  it('does not let rendering or far-road queries change future traffic', () => {
    const a = new RacingModel(undefined, seeded(19)), b = new RacingModel(undefined, seeded(19));
    for (let i = 0; i < 1000; i++) {
      a.curveAt(a.distance + 1600); a.curveAt(100000);
      a.tick(.02); b.tick(.02);
    }
    expect(a.cars).toEqual(b.cars); expect(a.distance).toBe(b.distance); expect(a.x).toBe(b.x);
  });
  it.each(Array.from({ length: 20 }, (_, index) => index + 1))('can finish random course %i through ordinary steering', seed => {
    const model = new RacingModel(undefined, seeded(seed)); let lane = -.72;
    for (let i = 0; i < 9000 && model.alive && !model.won; i++) {
      const threats = model.cars.filter(car => !car.hit && car.distance - model.distance > -5 && car.distance - model.distance < 60);
      if (threats.some(car => Math.abs(car.x - lane) < .4)) {
        const safe = RACE_LANES.filter(x => threats.every(car => Math.abs(car.x - x) >= .4));
        if (safe.length) lane = [...safe].sort((a, b) => Math.abs(a - model.x) - Math.abs(b - model.x))[0];
      }
      model.tick(.02, new Set(), lane);
    }
    expect(model.won).toBe(true); expect(model.elapsed).toBeGreaterThan(50); expect(model.health).toBeGreaterThan(0);
  });
});
