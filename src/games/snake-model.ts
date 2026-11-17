import type { GameAction } from '../types';

export type SnakeDirection = 'left' | 'right' | 'up' | 'down';
export interface SnakeCell { x: number; y: number }
export const SNAKE_COLUMNS = 22, SNAKE_ROWS = 16, SNAKE_TARGET = 12, SNAKE_MAX_TARGET = 100;
const vectors: Record<SnakeDirection, SnakeCell> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
const same = (a: SnakeCell, b: SnakeCell) => a.x === b.x && a.y === b.y;

export class SnakeModel {
  readonly width = SNAKE_COLUMNS;
  readonly height = SNAKE_ROWS;
  body: SnakeCell[] = [{ x: 4, y: 8 }, { x: 3, y: 8 }, { x: 2, y: 8 }, { x: 1, y: 8 }];
  direction: SnakeDirection = 'right';
  food: SnakeCell | undefined;
  score = 0;
  alive = true;
  private turns: SnakeDirection[] = [];

  constructor(private random: () => number = Math.random) {
    this.food = { x: 10 + Math.floor(random() * 5), y: 8 };
  }
  get full() { return this.body.length === this.width * this.height; }
  get stepMs() { return Math.max(135, 210 - this.score * 4); }
  clearTurns() { this.turns = []; }
  turn(action: GameAction) {
    if (!this.alive || this.full || !Object.hasOwn(vectors, action) || this.turns.length >= 2) return;
    const direction = action as SnakeDirection, previous = this.turns.at(-1) ?? this.direction;
    const next = vectors[direction], last = vectors[previous];
    if (direction !== previous && (next.x !== -last.x || next.y !== -last.y)) this.turns.push(direction);
  }
  private spawnFood() {
    const occupied = new Set(this.body.map(cell => cell.y * this.width + cell.x));
    const empty: SnakeCell[] = [];
    for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
      if (!occupied.has(y * this.width + x)) empty.push({ x, y });
    }
    this.food = empty.length ? empty[Math.floor(this.random() * empty.length)] : undefined;
  }
  step() {
    if (!this.alive || this.full) return;
    this.direction = this.turns.shift() ?? this.direction;
    const delta = vectors[this.direction], head = this.body[0];
    const next = { x: head.x + delta.x, y: head.y + delta.y };
    const eating = !!this.food && same(next, this.food);
    // On an ordinary move the tail vacates its cell, so that cell is safe to enter.
    const occupied = eating ? this.body : this.body.slice(0, -1);
    if (next.x < 0 || next.x >= this.width || next.y < 0 || next.y >= this.height || occupied.some(cell => same(cell, next))) {
      this.alive = false; this.clearTurns(); return;
    }
    this.body.unshift(next);
    if (eating) { this.score++; this.spawnFood(); }
    else this.body.pop();
  }
}
