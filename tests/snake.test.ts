import { describe, expect, it } from 'vitest';
import { SnakeModel, SNAKE_TARGET, type SnakeDirection } from '../src/games/snake-model';

function seeded(seed: number) { return () => { seed = Math.imul(seed, 1664525) + 1013904223 | 0; return (seed >>> 0) / 4294967296; }; }

describe('Snake rules', () => {
  it('moves automatically, grows only on food and keeps food off the body', () => {
    const model = new SnakeModel(() => 0);
    model.step(); expect(model.body[0]).toEqual({ x: 5, y: 8 }); expect(model.body).toHaveLength(4); expect(model.score).toBe(0);
    const speed = model.stepMs;
    for (let i = 0; i < 5; i++) model.step();
    expect(model.score).toBe(1); expect(model.body).toHaveLength(5); expect(model.stepMs).toBeLessThan(speed);
    expect(model.body).not.toContainEqual(model.food);
  });
  it('rejects reversal and repeated keys, and applies queued corners on separate steps', () => {
    const model = new SnakeModel();
    model.turn('left'); model.turn('up'); model.turn('up'); model.turn('down'); model.turn('left'); model.turn('down');
    model.step(); expect(model.body[0]).toEqual({ x: 4, y: 7 });
    model.step(); expect(model.body[0]).toEqual({ x: 3, y: 7 });
    model.step(); expect(model.body[0]).toEqual({ x: 2, y: 7 }); expect(model.alive).toBe(true);
  });
  it('fails on walls and occupied body cells, then freezes', () => {
    const wall = new SnakeModel(); wall.body[0] = { x: 21, y: 8 }; wall.step();
    expect(wall.alive).toBe(false); const before = structuredClone(wall.body); wall.turn('down'); wall.step(); expect(wall.body).toEqual(before);
    const self = new SnakeModel(); self.body = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }, { x: 5, y: 3 }]; self.step();
    expect(self.alive).toBe(false); expect(self.score).toBe(0);
  });
  it('allows moving into the vacating tail', () => {
    const model = new SnakeModel(); model.body = [{ x: 3, y: 3 }, { x: 3, y: 4 }, { x: 4, y: 4 }, { x: 4, y: 3 }];
    model.step(); expect(model.alive).toBe(true); expect(model.body[0]).toEqual({ x: 4, y: 3 }); expect(model.body).toHaveLength(4);
  });
  it('handles a full board without retry loops or food on the snake', () => {
    const model = new SnakeModel(() => 0); model.direction = 'down';
    model.body = [{ x: 21, y: 14 }];
    for (let y = 0; y < 16; y++) for (let x = 0; x < 22; x++) if (!(x === 21 && y >= 14)) model.body.push({ x, y });
    model.food = { x: 21, y: 15 }; model.step();
    expect(model.full).toBe(true); expect(model.food).toBeUndefined(); expect(model.alive).toBe(true); expect(model.score).toBe(1);
    model.step(); expect(model.score).toBe(1);
  });
  it.each([1, 7, 17, 24, 58, 103, 512, 1024])('can reach the default target with ordinary turns on seed %i', seed => {
    const model = new SnakeModel(seeded(seed));
    const directions: [SnakeDirection, number, number][] = [['left', -1, 0], ['right', 1, 0], ['up', 0, -1], ['down', 0, 1]];
    for (let tick = 0; tick < 1200 && model.alive && model.score < SNAKE_TARGET; tick++) {
      const start = model.body[0], food = model.food!;
      const occupied = new Set(model.body.slice(0, -1).map(c => c.y * model.width + c.x));
      const queue: { x: number; y: number; first?: SnakeDirection }[] = [{ ...start }];
      const seen = new Set([start.y * model.width + start.x]);
      let turn: SnakeDirection | undefined;
      for (let i = 0; i < queue.length; i++) {
        const cell = queue[i];
        if (cell.x === food.x && cell.y === food.y) { turn = cell.first; break; }
        for (const [direction, dx, dy] of directions) {
          const x = cell.x + dx, y = cell.y + dy, index = y * model.width + x;
          if (x < 0 || x >= model.width || y < 0 || y >= model.height || occupied.has(index) || seen.has(index)) continue;
          seen.add(index); queue.push({ x, y, first: cell.first ?? direction });
        }
      }
      expect(turn).toBeDefined(); model.turn(turn!); model.step();
      expect(model.body).not.toContainEqual(model.food);
    }
    expect(model.alive).toBe(true); expect(model.score).toBe(SNAKE_TARGET);
  });
});
