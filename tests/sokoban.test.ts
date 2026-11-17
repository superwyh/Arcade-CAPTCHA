import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SokobanModel, SOKOBAN_LEVELS } from '../src/games/sokoban-model';
import { solveSokoban } from './sokoban-solver';

const state = (model: SokobanModel) => ({ player: { ...model.player }, boxes: [...model.boxes].sort(), moves: model.moves, direction: model.direction, placed: model.placed });
describe('Sokoban rules and level solvability', () => {
  it.each(SOKOBAN_LEVELS.map((layout, i) => ({ layout, level: i + 1, minimumPushes: [27, 20, 21, 20, 19][i] })))('level $level is bounded, challenging and completable using legal moves', ({ layout, minimumPushes }) => {
    const model = new SokobanModel(layout);
    expect(layout.every(row => row.length === model.width)).toBe(true);
    expect(model.width * 24).toBeLessThanOrEqual(268); expect(model.height * 24).toBeLessThanOrEqual(192);
    expect(layout[0]).toMatch(/^#+$/); expect(layout.at(-1)).toMatch(/^#+$/);
    expect(layout.every(row => row.startsWith('#') && row.endsWith('#'))).toBe(true);
    expect(layout.join('').match(/[@+]/g)).toHaveLength(1);
    expect(model.boxes.size).toBe(model.goals.size); expect(model.boxes.size).toBe(4);
    expect(model.placed).toBe(0); expect(model.complete).toBe(false);
    const solution = solveSokoban(layout); expect(solution.length).toBeGreaterThan(60);
    let pushes = 0;
    solution.forEach((direction, step) => {
      const before = [...model.boxes].sort().join(',');
      expect(model.move(direction)).toBe(true);
      if ([...model.boxes].sort().join(',') !== before) pushes++;
      expect(model.complete).toBe(step === solution.length - 1);
    });
    expect(pushes).toBe(minimumPushes);
    expect(model.placed).toBe(model.goals.size);
    expect(model.move('left')).toBe(false);
    while (model.undo()) { /* Every legal move must be reversible, including the final push. */ }
    expect(state(model)).toEqual(state(new SokobanModel(layout)));
  });
  it('preserves the source puzzles apart from solid-wall cropping and transposition', () => {
    const source = readFileSync(new URL('../third-party/boxoban/levels.txt', import.meta.url), 'utf8');
    const records = source.split(/; (\d+)\r?\n/), puzzles = new Map<number, string[]>();
    for (let i = 1; i < records.length; i += 2) puzzles.set(Number(records[i]), records[i + 1].trim().split(/\r?\n/));
    const adaptations = [
      { id: 6, x: 0, y: 1, width: 8, height: 9, transpose: true },
      { id: 47, x: 0, y: 0, width: 7, height: 10, transpose: true },
      { id: 7, x: 0, y: 0, width: 10, height: 8, transpose: false },
      { id: 27, x: 0, y: 3, width: 10, height: 7, transpose: false },
      { id: 17, x: 0, y: 0, width: 10, height: 6, transpose: false },
    ];
    adaptations.forEach((adaptation, i) => {
      const original = puzzles.get(adaptation.id)!;
      original.forEach((row, y) => [...row].forEach((cell, x) => {
        if (x < adaptation.x || x >= adaptation.x + adaptation.width || y < adaptation.y || y >= adaptation.y + adaptation.height) expect(cell).toBe('#');
      }));
      let cropped = original.slice(adaptation.y, adaptation.y + adaptation.height).map(row => row.slice(adaptation.x, adaptation.x + adaptation.width));
      if (adaptation.transpose) cropped = [...cropped[0]].map((_, x) => cropped.map(row => row[x]).join(''));
      expect(SOKOBAN_LEVELS[i]).toEqual(cropped);
    });
  });
  it('blocks walls, map bounds, two crates at once and crates against walls without adding undo steps', () => {
    const model = new SokobanModel(['########', '#@$$ . #', '# $    #', '# #  . #', '#    . #', '########']);
    const before = state(model);
    expect(model.move('up')).toBe(false); expect(model.move('left')).toBe(false); expect(model.move('right')).toBe(false);
    expect(state(model)).toEqual(before);
    model.move('down'); expect(model.move('right')).toBe(true);
    model.move('left'); model.move('down'); model.move('down'); model.move('right'); model.move('up');
    expect(model.player).toEqual({ x: 2, y: 4 }); // Wall at (2,3).
    expect(model.isWall(-1, 0)).toBe(true); expect(model.isWall(0, -1)).toBe(true);
    expect(model.isWall(8, 2)).toBe(true); expect(model.isWall(2, 6)).toBe(true);
    const boxed = new SokobanModel(['#####', '#@$##', '# . #', '#####']);
    expect(boxed.move('right')).toBe(false); expect(boxed.moves).toBe(0);
  });
  it('never pulls crates when walking backwards and undoes pushes and walking independently', () => {
    const model = new SokobanModel(['#######', '#     #', '# @$ .#', '#     #', '#######']);
    const start = state(model);
    model.move('right'); const pushed = state(model);
    model.move('left'); expect([...model.boxes]).toEqual(pushed.boxes);
    expect(model.undo()).toBe(true); expect(state(model)).toEqual(pushed);
    expect(model.undo()).toBe(true); expect(state(model)).toEqual(start);
    expect(model.undo()).toBe(false); expect(state(model)).toEqual(start);
  });
  it('requires every goal and restores covered goals when a crate is moved off or undone', () => {
    const model = new SokobanModel(['########', '#      #', '# @* . #', '# $    #', '########']);
    expect(model.placed).toBe(1); expect(model.complete).toBe(false);
    model.move('right'); expect(model.placed).toBe(0); expect(model.goals.has(19)).toBe(true);
    model.undo(); expect(model.placed).toBe(1); expect(model.complete).toBe(false);
  });
  it('allows recovering a crate from a dead corner with undo', () => {
    const model = new SokobanModel(['#######', '# $@ .#', '#     #', '#######']);
    model.move('left'); expect(model.boxes.has(8)).toBe(true);
    expect(model.move('left')).toBe(false); expect(model.complete).toBe(false);
    model.undo(); expect(model.player).toEqual({ x: 3, y: 1 }); expect(model.boxes.has(9)).toBe(true);
  });
});
