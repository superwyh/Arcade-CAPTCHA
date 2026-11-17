import { describe, expect, it } from 'vitest';
import { PacmanModel, PACMAN_MAP, PACMAN_TARGET, PACMAN_STEP_MS, PACMAN_POWER_MS, mazeNeighbor, mazePosition, type MazeDirection } from '../src/games/pacman-model';

const directions: MazeDirection[] = ['up', 'left', 'down', 'right'];
function quiet(model = new PacmanModel(() => .5)) { model.ghosts.forEach(ghost => ghost.wait = Infinity); return model; }
function advance(model: PacmanModel, time: number) { while (time > 0) { const step = Math.min(40, time); model.update(step); time -= step; } }

describe('Pac-Man maze and rules', () => {
  it('has four power pellets, a reachable home and no unreachable pellets', () => {
    const model = new PacmanModel();
    expect(PACMAN_MAP.every(row => row.length === model.width)).toBe(true);
    expect(model.pellets.size).toBe(140); expect(PACMAN_TARGET).toBe(model.pellets.size);
    expect([...model.pellets.values()].filter(Boolean)).toHaveLength(4);
    const queue = [{ ...model.player }], seen = new Set([model.player.y * model.width + model.player.x]);
    for (let i = 0; i < queue.length; i++) for (const direction of directions) {
      const next = mazeNeighbor(queue[i], direction), key = next && next.y * model.width + next.x;
      if (next && key !== undefined && !seen.has(key)) { seen.add(key); queue.push({ ...model.player, ...next }); }
    }
    for (const key of model.pellets.keys()) expect(seen.has(key)).toBe(true);
    for (const ghost of model.ghosts) expect(seen.has(ghost.y * model.width + ghost.x)).toBe(true);
  });
  it('moves automatically, consumes each pellet once and stops harmlessly at walls', () => {
    const model = quiet(); advance(model, PACMAN_STEP_MS);
    expect(model.player).toMatchObject({ x: 9, y: 10 }); expect(model.score).toBe(1); expect(model.complete).toBe(false);
    model.turn('right'); advance(model, PACMAN_STEP_MS); model.turn('left'); advance(model, PACMAN_STEP_MS);
    expect(model.score).toBe(1);
    advance(model, 4000); expect(model.player).toMatchObject({ x: 1, y: 10 }); expect(model.lives).toBe(3);
  });
  it('buffers perpendicular turns until a junction and reverses smoothly between centers', () => {
    const model = quiet(); advance(model, 100); model.turn('up'); advance(model, 300);
    expect(model.player).toMatchObject({ x: 9, y: 9, direction: 'up' });
    const reverse = quiet(); advance(reverse, 100); const before = mazePosition(reverse.player); reverse.turn('right');
    expect(mazePosition(reverse.player).x).toBeCloseTo(before.x);
    advance(reverse, 100); expect(reverse.player).toMatchObject({ x: 10, y: 10 });
  });
  it('wraps both ends of the tunnel and cannot leave the map elsewhere', () => {
    const model = quiet(); Object.assign(model.player, { x: 0, y: 7 }); model.turn('left'); advance(model, 200);
    expect(model.player).toMatchObject({ x: 20, y: 7 });
    model.turn('right'); advance(model, 200); expect(model.player).toMatchObject({ x: 0, y: 7 });
    expect(mazeNeighbor({ x: 0, y: 1 }, 'left')).toBeUndefined();
    expect(mazeNeighbor({ x: 1, y: 1 }, 'up')).toBeUndefined();
  });
  it('power pellets allow eating ghosts without adding verification progress', () => {
    const model = quiet(); Object.assign(model.player, { x: 2, y: 1 }); advance(model, 200);
    expect(model.score).toBe(1); expect(model.powered).toBe(PACMAN_POWER_MS);
    Object.assign(model.ghosts[0], { x: 1, y: 1, wait: 0 }); advance(model, 8);
    expect(model.ghosts[0].wait).toBe(3000); expect(model.score).toBe(1); expect(model.lives).toBe(3);
    model.ghosts.forEach(ghost => ghost.wait = Infinity); advance(model, PACMAN_POWER_MS);
    expect(model.powered).toBe(0);
  });
  it('detects crossing collisions and preserves eaten pellets when respawning', () => {
    const model = quiet(); advance(model, 200); const collected = model.pellets.size;
    Object.assign(model.player, { x: 5, y: 4, next: { x: 6, y: 4 }, direction: 'right', progress: .48 }); model.turn('right');
    Object.assign(model.ghosts[0], { x: 6, y: 4, next: { x: 5, y: 4 }, direction: 'left', progress: .48, wait: 0 }); model.invulnerable = 0;
    advance(model, 8); expect(model.lives).toBe(2); expect(model.respawning).toBe(800);
    expect(model.pellets.size).toBe(collected); expect(model.score).toBe(1);
    const position = mazePosition(model.player); advance(model, 400); expect(mazePosition(model.player)).toEqual(position);
    advance(model, 600); expect(model.lives).toBe(2); expect(model.invulnerable).toBeGreaterThan(0);
  });
  it('detects collisions through the tunnel seam', () => {
    const model = quiet(); Object.assign(model.player, { x: 0, y: 7 });
    Object.assign(model.ghosts[0], { x: 20, y: 7, next: { x: 0, y: 7 }, direction: 'right', progress: .6, wait: 0 });
    model.invulnerable = 0; advance(model, 8); expect(model.lives).toBe(2);
  });
  it('uses three lives and freezes after a fatal collision', () => {
    const model = quiet();
    for (let lives = 2; lives >= 0; lives--) {
      model.respawning = 0; model.invulnerable = 0;
      Object.assign(model.ghosts[0], { ...model.player, wait: 0 }); advance(model, 8);
      expect(model.lives).toBe(lives);
    }
    expect(model.alive).toBe(false); const elapsed = model.elapsed;
    model.turn('up'); advance(model, 1000); expect(model.elapsed).toBe(elapsed);
  });
  it('keeps every actor on legal corridor edges during a normal game', () => {
    const model = new PacmanModel(() => .3);
    for (let frame = 0; frame < 1800 && model.alive; frame++) {
      if (frame % 32 === 0) model.turn(directions[Math.floor(frame / 32) % 4]);
      model.update(16);
      for (const body of [model.player, ...model.ghosts]) {
        expect(PACMAN_MAP[body.y][body.x]).not.toBe('#');
        if (body.next) expect(body.next).toEqual(mazeNeighbor(body, body.direction));
        expect(body.progress).toBeGreaterThanOrEqual(0); expect(body.progress).toBeLessThan(1);
      }
    }
  });
  it('gives the same simulation at different render frame rates', () => {
    const a = new PacmanModel(() => .3), b = new PacmanModel(() => .3);
    for (let i = 0; i < 500; i++) a.update(16);
    for (let i = 0; i < 200; i++) b.update(40);
    expect(a.score).toBe(b.score); expect(a.lives).toBe(b.lives); expect(a.player).toEqual(b.player);
    expect(a.ghosts).toEqual(b.ghosts);
  });
});
