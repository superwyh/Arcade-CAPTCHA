import { describe, expect, it } from 'vitest';
import { BubblesModel, bubbleCenter, bubbleColumns, bubbleKey, bubbleNeighbors, BUBBLE_LEFT, BUBBLE_RIGHT, BUBBLE_ROW_HEIGHT, BUBBLE_MAX_ANGLE } from '../src/games/bubbles-model';
import { bestBubbleAim, seededRandom } from './bubbles-player';

function board(cells: [number, number, number][]) {
  const model = new BubblesModel(); model.bubbles.clear();
  for (const [row, col, color] of cells) model.bubbles.set(bubbleKey(row, col), { row, col, color });
  return model;
}
const fire = (model: BubblesModel, angle = model.angle) => { model.aim(angle); expect(model.shoot()).toBe(true); model.update(2000); };

describe('Bubble shooter geometry and rules', () => {
  it('starts with an attached 63-bubble board, four colors and matching ammunition', () => {
    const model = new BubblesModel(1, seededRandom(17));
    expect(model.bubbles.size).toBe(63); expect(model.ready).toBe(true); expect(model.complete).toBe(false);
    const colors = new Set([...model.bubbles.values()].map(cell => cell.color));
    expect(colors.size).toBe(4); expect(colors.has(model.current)).toBe(true); expect(colors.has(model.next)).toBe(true);
    expect(model.score).toBe(0);
    expect([...new BubblesModel(1, seededRandom(18)).bubbles.values()]).not.toEqual([...model.bubbles.values()]);
  });
  it('has symmetric, in-bounds six-way hex neighbors at exactly one diameter apart', () => {
    for (let row = 0; row < 9; row++) for (let col = 0; col < bubbleColumns(row); col++) {
      const point = bubbleCenter({ row, col });
      for (const next of bubbleNeighbors(row, col)) {
        expect(next.col).toBeGreaterThanOrEqual(0); expect(next.col).toBeLessThan(bubbleColumns(next.row));
        expect(bubbleNeighbors(next.row, next.col)).toContainEqual({ row, col });
        const other = bubbleCenter(next); expect(Math.hypot(point.x - other.x, point.y - other.y)).toBeCloseTo(18);
      }
    }
  });
  it('clears three connected colors and does not clear a pair or diagonal non-neighbors', () => {
    const pair = board([[0, 6, 0]]); pair.current = 0; fire(pair);
    expect(pair.bubbles.size).toBe(2); expect(pair.score).toBe(0); expect(pair.misses).toBe(1);
    pair.current = 0; fire(pair, bestBubbleAim(pair));
    expect(pair.bubbles.size).toBe(0); expect(pair.score).toBe(1); expect(pair.complete).toBe(true);
    expect(pair.shoot()).toBe(false);
    const diagonal = board([[0, 5, 0], [0, 6, 1], [1, 6, 0]]); diagonal.current = 2; fire(diagonal);
    expect(diagonal.bubbles.size).toBe(4); expect(diagonal.score).toBe(0);
  });
  it('drops disconnected groups but retains bubbles connected to another ceiling anchor', () => {
    const model = board([[0, 5, 0], [0, 6, 0], [1, 5, 1], [2, 5, 2], [0, 0, 3]]);
    model.current = 0; model.next = 0; fire(model, bestBubbleAim(model));
    expect([...model.bubbles.values()]).toEqual([{ row: 0, col: 0, color: 3 }]);
    expect(model.particles.filter(p => p.falling)).toHaveLength(2);
    expect(model.score).toBe(0); expect(model.current).toBe(3); expect(model.next).toBe(3);
  });
  it('banks against either wall and flight follows the displayed path without tunnelling', () => {
    for (const angle of [-1.05, 1.05]) {
      const model = board([[0, 6, 0]]); model.aim(angle);
      const trace = model.trace(); expect(trace.points.length).toBeGreaterThanOrEqual(3);
      expect(trace.points[1].x).toBe(angle < 0 ? BUBBLE_LEFT : BUBBLE_RIGHT);
      const a = trace.points[0], b = trace.points[1], c = trace.points[2];
      expect(Math.abs((b.x - a.x) / (b.y - a.y))).toBeCloseTo(Math.abs((c.x - b.x) / (c.y - b.y)));
      model.current = 1; model.shoot();
      for (let frame = 0; frame < 200 && model.shot; frame++) {
        model.update(7); if (model.shot) { expect(model.shot.x).toBeGreaterThanOrEqual(BUBBLE_LEFT - 1e-6); expect(model.shot.x).toBeLessThanOrEqual(BUBBLE_RIGHT + 1e-6); }
      }
      expect(model.bubbles.get(bubbleKey(trace.cell!.row, trace.cell!.col))?.color).toBe(1);
      expect(model.bubbles.size).toBe(2);
    }
  });
  it('lands on an empty neighboring cell and never overlaps or overwrites an existing bubble', () => {
    for (let seed = 1; seed <= 5; seed++) {
      const model = new BubblesModel(1, seededRandom(seed));
      for (let step = 0; step <= 46; step++) {
        const trace = model.trace(-1.15 + step * .05); expect(trace.cell).toBeDefined();
        expect(model.bubbles.has(bubbleKey(trace.cell!.row, trace.cell!.col))).toBe(false);
        const landing = bubbleCenter(trace.cell!);
        for (const bubble of model.bubbles.values()) { const center = bubbleCenter(bubble); expect(Math.hypot(center.x - landing.x, center.y - landing.y)).toBeGreaterThanOrEqual(18 - 1e-6); }
        expect(trace.length).toBeGreaterThan(50);
      }
    }
  });
  it('lowers the ceiling only after five consecutive misses and resets the counter on a match', () => {
    const model = board([[0, 0, 0], [0, 12, 1]]);
    for (let shot = 0; shot < 5; shot++) { model.current = shot % 2 + 2; fire(model, 0); if (shot < 4) expect(model.ceiling).toBe(0); }
    expect(model.ceiling).toBe(BUBBLE_ROW_HEIGHT); expect(model.misses).toBe(0);
    const match = board([[0, 5, 0], [0, 6, 0], [0, 0, 1]]); match.misses = 4; match.current = 0;
    fire(match, bestBubbleAim(match)); expect(match.misses).toBe(0); expect(match.ceiling).toBe(0);
  });
  it('fails at the danger line and never awards partial-board progress', () => {
    const model = board(Array.from({ length: 9 }, (_, row) => [row, 6, row % 2])); model.current = 2;
    fire(model, 0); expect(model.alive).toBe(false); expect(model.score).toBe(0); expect(model.complete).toBe(false);
    expect(model.shoot()).toBe(false);
  });
  it('clamps aiming and permits only one shot in flight', () => {
    const model = new BubblesModel(); model.aim(100); expect(model.angle).toBe(BUBBLE_MAX_ANGLE);
    model.aim(-100); expect(model.angle).toBe(-BUBBLE_MAX_ANGLE);
    model.aim(NaN); expect(model.angle).toBe(-BUBBLE_MAX_ANGLE);
    model.aimAt(134, 0); expect(model.angle).toBe(0);
    expect(model.shoot()).toBe(true); const shot = model.shot;
    expect(model.shoot()).toBe(false); expect(model.shot).toBe(shot);
    model.aim(.5); expect(model.shot!.trace.points[0]).toEqual({ x: 134, y: 172 });
  });
  it.each([1, 17, 42, 123, 999])('clears a complete random board through legal aimed shots (seed %i)', seed => {
    const model = new BubblesModel(1, seededRandom(seed)); let shots = 0;
    while (!model.complete && model.alive && shots < 100) { fire(model, bestBubbleAim(model)); shots++; }
    expect(model.alive).toBe(true); expect(model.complete).toBe(true); expect(model.bubbles.size).toBe(0);
    expect(shots).toBeGreaterThan(3); expect(shots).toBeLessThan(60);
  });
  it('plays all five boards, counts only completed boards and generates the next after its transition', () => {
    const model = new BubblesModel(5, seededRandom(77)); let shots = 0;
    while (!model.complete && model.alive && shots < 300) {
      if (model.transition > 0) { const score = model.score; expect(model.shoot()).toBe(false); model.update(650); expect(model.score).toBe(score); expect(model.bubbles.size).toBeGreaterThan(50); }
      const score = model.score; fire(model, bestBubbleAim(model)); shots++;
      expect(model.score === score || model.score === score + 1).toBe(true);
      if (model.score > score) expect(model.bubbles.size).toBe(0);
    }
    expect(model.alive).toBe(true); expect(model.complete).toBe(true); expect(model.score).toBe(5);
  });
});
