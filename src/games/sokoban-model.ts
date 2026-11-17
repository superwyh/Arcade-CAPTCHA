import { SOKOBAN_LEVELS } from './sokoban-levels';
export { SOKOBAN_LEVELS } from './sokoban-levels';

export type SokobanDirection = 'left' | 'right' | 'up' | 'down';
export interface SokobanCell { x: number; y: number }

export const SOKOBAN_TARGET = 1;
export const SOKOBAN_MAX_TARGET = SOKOBAN_LEVELS.length;
const vectors: Record<SokobanDirection, SokobanCell> = {
  left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 },
};
interface Move { player: SokobanCell; direction: SokobanDirection; crate?: { from: number; to: number } }

export class SokobanModel {
  readonly width: number;
  readonly height: number;
  readonly goals = new Set<number>();
  readonly boxes = new Set<number>();
  player: SokobanCell = { x: 0, y: 0 };
  direction: SokobanDirection = 'down';
  private history: Move[] = [];

  constructor(readonly layout: readonly string[] = SOKOBAN_LEVELS[0]) {
    this.width = layout[0].length; this.height = layout.length;
    layout.forEach((row, y) => [...row].forEach((cell, x) => {
      const index = y * this.width + x;
      if (cell === '.' || cell === '*' || cell === '+') this.goals.add(index);
      if (cell === '$' || cell === '*') this.boxes.add(index);
      if (cell === '@' || cell === '+') this.player = { x, y };
    }));
  }
  get moves() { return this.history.length; }
  get placed() { return [...this.boxes].filter(box => this.goals.has(box)).length; }
  get complete() { return this.goals.size > 0 && this.boxes.size === this.goals.size && this.placed === this.goals.size; }
  isWall(x: number, y: number) { return x < 0 || x >= this.width || y < 0 || y >= this.height || this.layout[y][x] === '#'; }

  move(direction: SokobanDirection) {
    if (this.complete) return false;
    const delta = vectors[direction];
    const next = { x: this.player.x + delta.x, y: this.player.y + delta.y };
    if (this.isWall(next.x, next.y)) return false;
    const move: Move = { player: { ...this.player }, direction: this.direction };
    const index = next.y * this.width + next.x;
    if (this.boxes.has(index)) {
      const x = next.x + delta.x, y = next.y + delta.y, beyond = y * this.width + x;
      if (this.isWall(x, y) || this.boxes.has(beyond)) return false;
      this.boxes.delete(index); this.boxes.add(beyond);
      move.crate = { from: index, to: beyond };
    }
    this.history.push(move); this.player = next; this.direction = direction;
    return true;
  }
  undo() {
    const move = this.history.pop();
    if (!move) return false;
    this.player = move.player; this.direction = move.direction;
    if (move.crate) { this.boxes.delete(move.crate.to); this.boxes.add(move.crate.from); }
    return true;
  }
}
