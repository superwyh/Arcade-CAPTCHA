import type { GameAction } from '../types';

export type MazeDirection = 'left' | 'right' | 'up' | 'down';
export interface MazeCell { x: number; y: number }
export interface MazeActor extends MazeCell { direction: MazeDirection; next?: MazeCell; progress: number }
export interface MazeGhost extends MazeActor { home: MazeCell; color: string; wait: number; stepMs: number }

export const PACMAN_MAP = [
  '#####################',
  '#o.................o#',
  '#.###.###.#.###.###.#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.## ##.#.###.#',
  '#.###.#.#   #.#.###.#',
  ' .....#.#   #.#..... ',
  '#.###.#.#####.#.###.#',
  '#.###.#.......#.###.#',
  '#......... .........#',
  '#.###.###.#.###.###.#',
  '#.###.###.#.###.###.#',
  '#o.................o#',
  '#####################',
] as const;
export const PACMAN_COLUMNS = 21, PACMAN_ROWS = 15;
export const PACMAN_TARGET = PACMAN_MAP.join('').split('').filter(cell => cell === '.' || cell === 'o').length;
export const PACMAN_STEP_MS = 200, PACMAN_POWER_MS = 7000;
const start = { x: 10, y: 10 };
const directions: MazeDirection[] = ['up', 'left', 'down', 'right'];
const vectors: Record<MazeDirection, MazeCell> = { left: { x: -1, y: 0 }, right: { x: 1, y: 0 }, up: { x: 0, y: -1 }, down: { x: 0, y: 1 } };
const opposite: Record<MazeDirection, MazeDirection> = { left: 'right', right: 'left', up: 'down', down: 'up' };
const index = (cell: MazeCell) => cell.y * PACMAN_COLUMNS + cell.x;
const actor = (cell: MazeCell, direction: MazeDirection): MazeActor => ({ ...cell, direction, progress: 0 });

export function mazeNeighbor(cell: MazeCell, direction: MazeDirection): MazeCell | undefined {
  const delta = vectors[direction];
  const y = cell.y + delta.y;
  let x = cell.x + delta.x;
  if (y === 7) x = (x + PACMAN_COLUMNS) % PACMAN_COLUMNS;
  if (y < 0 || y >= PACMAN_ROWS || x < 0 || x >= PACMAN_COLUMNS || PACMAN_MAP[y][x] === '#') return;
  return { x, y };
}

export function mazePosition(body: MazeActor): MazeCell {
  const delta = vectors[body.direction];
  return { x: body.x + (body.next ? delta.x * body.progress : 0), y: body.y + (body.next ? delta.y * body.progress : 0) };
}

export class PacmanModel {
  readonly width = PACMAN_COLUMNS;
  readonly height = PACMAN_ROWS;
  readonly pellets = new Map<number, boolean>();
  player = actor(start, 'left');
  ghosts: MazeGhost[] = [
    { ...actor({ x: 10, y: 6 }, 'up'), home: { x: 10, y: 6 }, color: '#ff4148', wait: 1800, stepMs: 270 },
    { ...actor({ x: 9, y: 6 }, 'right'), home: { x: 9, y: 6 }, color: '#ff9cce', wait: 3500, stepMs: 290 },
    { ...actor({ x: 11, y: 6 }, 'left'), home: { x: 11, y: 6 }, color: '#40e7e7', wait: 5200, stepMs: 310 },
  ];
  score = 0;
  lives = 3;
  powered = 0;
  invulnerable = 0;
  respawning = 0;
  elapsed = 0;
  private wanted: MazeDirection = 'left';

  constructor(private random: () => number = Math.random) {
    PACMAN_MAP.forEach((row, y) => [...row].forEach((cell, x) => {
      if (cell === '.' || cell === 'o') this.pellets.set(index({ x, y }), cell === 'o');
    }));
  }
  get alive() { return this.lives > 0; }
  get complete() { return this.pellets.size === 0; }
  clearTurn() { this.wanted = this.player.direction; }

  turn(action: GameAction) {
    if (!this.alive || !Object.hasOwn(vectors, action)) return;
    this.wanted = action as MazeDirection;
    // Reversals work halfway along a corridor; perpendicular turns wait for its next center.
    if (this.player.next && this.wanted === opposite[this.player.direction]) {
      const previous = { x: this.player.x, y: this.player.y };
      Object.assign(this.player, this.player.next, { next: previous, progress: 1 - this.player.progress, direction: this.wanted });
    }
  }

  private collect() {
    const key = index(this.player), power = this.pellets.get(key);
    if (!this.pellets.delete(key)) return;
    this.score++;
    if (power) this.powered = PACMAN_POWER_MS;
  }

  private move(body: MazeActor, delta: number, stepMs: number, choose: () => MazeDirection | undefined, enter?: () => void) {
    let distance = delta / stepMs;
    while (distance > 1e-8) {
      if (!body.next) {
        const direction = choose();
        if (!direction) return;
        body.next = mazeNeighbor(body, direction);
        if (!body.next) return;
        body.direction = direction;
      }
      const moved = Math.min(distance, 1 - body.progress);
      body.progress += moved; distance -= moved;
      if (body.progress >= 1 - 1e-8) {
        Object.assign(body, body.next); body.next = undefined; body.progress = 0;
        enter?.();
      }
    }
  }

  private distances(target: MazeCell) {
    const distances = new Map<number, number>([[index(target), 0]]), queue = [target];
    for (let i = 0; i < queue.length; i++) for (const direction of directions) {
      const next = mazeNeighbor(queue[i], direction);
      if (!next || distances.has(index(next))) continue;
      distances.set(index(next), distances.get(index(queue[i]))! + 1); queue.push(next);
    }
    return distances;
  }

  private steerGhost(ghost: MazeGhost, number: number): MazeDirection | undefined {
    let choices = directions.filter(direction => mazeNeighbor(ghost, direction));
    if (choices.length > 1) choices = choices.filter(direction => direction !== opposite[ghost.direction]);
    if (!choices.length) return;
    let target: MazeCell = this.player.next ?? this.player;
    const inHouse = ghost.y >= 5 && ghost.y <= 7 && ghost.x >= 9 && ghost.x <= 11;
    if (inHouse) target = { x: 10, y: 4 };
    else if (!this.powered && this.elapsed % 24000 < 6500) target = [{ x: 19, y: 1 }, { x: 1, y: 1 }, { x: 19, y: 13 }][number];
    else if (!this.powered && number === 1) {
      for (let ahead = 0; ahead < 3; ahead++) target = mazeNeighbor(target, this.player.direction) ?? target;
    }
    const distances = this.distances(target), flee = this.powered > 0 && !inHouse;
    let best = flee ? -Infinity : Infinity, selected = choices[0];
    for (const direction of choices) {
      const distance = distances.get(index(mazeNeighbor(ghost, direction)!)) ?? 1000;
      if ((flee ? distance > best : distance < best) || distance === best && this.random() < .35) { best = distance; selected = direction; }
    }
    return selected;
  }

  private collide() {
    const player = mazePosition(this.player);
    for (const ghost of this.ghosts) {
      if (ghost.wait > 0) continue;
      const other = mazePosition(ghost), dx = Math.abs(player.x - other.x);
      if (Math.hypot(Math.min(dx, this.width - dx), player.y - other.y) >= .65) continue;
      if (this.powered > 0) {
        Object.assign(ghost, actor(ghost.home, 'up'), { next: undefined, wait: 3000 });
      } else if (this.invulnerable <= 0) {
        this.lives--;
        if (this.alive) {
          this.player = actor(start, 'left'); this.wanted = 'left';
          this.ghosts.forEach((enemy, i) => Object.assign(enemy, actor(enemy.home, 'up'), { next: undefined, wait: 1800 + i * 1700 }));
          this.powered = 0; this.invulnerable = 1800; this.respawning = 800;
        }
        return;
      }
    }
  }

  update(delta: number) {
    if (!Number.isFinite(delta) || delta <= 0) return;
    let remaining = Math.min(delta, 1000);
    while (remaining > 0 && this.alive && !this.complete) {
      // Small simulation slices also catch actors crossing between two adjacent cells.
      const step = Math.min(remaining, 8); remaining -= step; this.elapsed += step;
      if (this.respawning > 0) { this.respawning = Math.max(0, this.respawning - step); continue; }
      this.powered = Math.max(0, this.powered - step);
      this.invulnerable = Math.max(0, this.invulnerable - step);
      this.move(this.player, step, PACMAN_STEP_MS, () => mazeNeighbor(this.player, this.wanted) ? this.wanted : mazeNeighbor(this.player, this.player.direction) ? this.player.direction : undefined, () => this.collect());
      this.ghosts.forEach((ghost, i) => {
        if (ghost.wait > 0) { ghost.wait = Math.max(0, ghost.wait - step); return; }
        this.move(ghost, step, this.powered > 0 ? 420 : ghost.stepMs, () => this.steerGhost(ghost, i));
      });
      this.collide();
    }
  }
}
