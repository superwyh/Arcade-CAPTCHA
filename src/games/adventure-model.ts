import type { GameAction } from '../types';
import { ATTACK_COOLDOWN, ATTACK_DURATION, attackTouches, swordFrame, swordTouches, type Direction } from './adventure-combat';
export type { Direction } from './adventure-combat';

export const ROOM_WIDTH = 15, ROOM_HEIGHT = 10, MAX_DUNGEONS = 3;
export type EnemyKind = 'slime' | 'bat' | 'skeleton' | 'guardian';
export interface Position { x: number; y: number }
export interface Enemy extends Position { kind: EnemyKind; health: number; hit: number; timer: number; phase: number }
export interface Chest extends Position { kind: 'key' | 'sword' | 'heart' | 'heal'; opened: boolean }
export interface Room { id: number; doors: Partial<Record<Direction, number>>; walls: Position[]; enemies: Enemy[]; chest?: Chest; cleared: boolean }
export interface Projectile extends Position { vx: number; vy: number; life: number }
export type AdventureEvent = 'sword' | 'hurt' | 'hit' | 'chest' | 'room' | 'clear' | 'exit';
export const directions: Record<Direction, Position> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
const reverse: Record<Direction, Direction> = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function createDungeon(depth = 0): Room[] {
  const rooms: Room[] = Array.from({ length: 9 }, (_, id) => ({ id, doors: {}, walls: [], enemies: [], cleared: id === 7 }));
  for (const [a, b] of [[7, 4], [7, 6], [4, 3], [3, 0], [0, 1], [4, 5], [5, 2], [2, 1], [5, 8]]) {
    const direction: Direction = b === a - 3 ? 'up' : b === a + 3 ? 'down' : b < a ? 'left' : 'right';
    rooms[a].doors[direction] = b; rooms[b].doors[reverse[direction]] = a;
  }
  const add = (room: number, kind: EnemyKind, x: number, y: number) => rooms[room].enemies.push({
    kind, x, y, health: kind === 'guardian' ? 14 + depth * 2 : kind === 'skeleton' ? 3 : kind === 'slime' ? 2 : 1,
    hit: 0, timer: 1.8 + room * .07, phase: room + x,
  });
  for (const id of [0, 2, 3, 4, 5, 6, 8]) {
    // Entrance lanes and the center remain clear, including after room transitions.
    const layouts: Record<number, Position[]> = {
      0: [{ x: 4, y: 5 }, { x: 5, y: 5 }, { x: 9, y: 5 }, { x: 10, y: 5 }],
      2: [{ x: 4, y: 3 }, { x: 10, y: 3 }, { x: 4, y: 6 }, { x: 10, y: 6 }],
      3: [{ x: 4, y: 5 }, { x: 10, y: 5 }],
      4: [{ x: 3, y: 3 }, { x: 11, y: 3 }, { x: 3, y: 6 }, { x: 11, y: 6 }],
      5: [{ x: 4, y: 4 }, { x: 4, y: 5 }, { x: 10, y: 4 }, { x: 10, y: 5 }],
    };
    rooms[id].walls = layouts[id] ?? [];
    add(id, id % 2 === 0 ? 'slime' : 'skeleton', 5.5, 3.5);
    add(id, id % 3 === 0 ? 'bat' : 'slime', 9.5, 6.5);
    if (id === 2 || id === 5) add(id, 'bat', 10.5, 2.5);
  }
  add(1, 'guardian', 7.5, 3.5);
  rooms[0].chest = { x: 7.5, y: 3.5, kind: 'key', opened: false };
  rooms[3].chest = { x: 7.5, y: 3.5, kind: 'sword', opened: false };
  rooms[6].chest = { x: 7.5, y: 3.5, kind: 'heart', opened: false };
  rooms[8].chest = { x: 7.5, y: 3.5, kind: 'heal', opened: false };
  return rooms;
}

export class AdventureModel {
  rooms = createDungeon();
  roomId = 7;
  x = 7.5;
  y = 6.5;
  facing: Direction = 'up';
  attackFacing: Direction = 'up';
  health = 6;
  maxHealth = 6;
  key = false;
  bossUnlocked = false;
  swordLevel = 1;
  completed = 0;
  elapsed = 0;
  walking = 0;
  moving = false;
  swing = 0;
  cooldown = 0;
  invulnerable = 0;
  roomGrace = 0;
  flash = 0;
  visited = new Set([7]);
  projectiles: Projectile[] = [];
  hearts: Position[] = [];
  sparks: (Position & { life: number })[] = [];
  private struck = new Set<Enemy>();
  events: AdventureEvent[] = [];
  get room() { return this.rooms[this.roomId]; }
  get remaining() { return this.room.enemies.filter(enemy => enemy.health > 0).length; }
  get alive() { return this.health > 0; }
  get won() { return this.completed >= MAX_DUNGEONS; }
  get exitOpen() { return this.roomId === 1 && this.bossUnlocked && this.remaining === 0; }

  doorOpen(direction: Direction) {
    const next = this.room.doors[direction];
    return next !== undefined && this.remaining === 0 && (next !== 1 || this.key || this.bossUnlocked);
  }
  wall(x: number, y: number, passage = true) {
    if (x < 1 || x >= ROOM_WIDTH - 1 || y < 1 || y >= ROOM_HEIGHT - 1) {
      if (passage) {
        if (x >= 6 && x < 9 && (y < 1 && this.doorOpen('up') || y >= ROOM_HEIGHT - 1 && this.doorOpen('down'))) return false;
        if (y >= 4 && y < 6 && (x < 1 && this.doorOpen('left') || x >= ROOM_WIDTH - 1 && this.doorOpen('right'))) return false;
      }
      return true;
    }
    return this.room.walls.some(wall => Math.floor(x) === wall.x && Math.floor(y) === wall.y);
  }
  canOccupy(x: number, y: number, passage = true, radius = .22) {
    return !this.wall(x - radius, y - radius, passage) && !this.wall(x + radius, y - radius, passage)
      && !this.wall(x - radius, y + radius, passage) && !this.wall(x + radius, y + radius, passage);
  }
  private move(entity: Position, dx: number, dy: number, passage = false) {
    if (this.canOccupy(entity.x + dx, entity.y, passage)) entity.x += dx;
    if (this.canOccupy(entity.x, entity.y + dy, passage)) entity.y += dy;
  }
  visible(a: Position, b: Position) {
    const steps = Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) * 8);
    for (let i = 1; i <= steps; i++) if (this.wall(a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps)) return false;
    return true;
  }
  attack() {
    if (!this.alive || this.won || this.cooldown > 0 || this.swing > 0) return;
    this.swing = ATTACK_DURATION; this.cooldown = ATTACK_COOLDOWN;
    this.attackFacing = this.facing; this.struck.clear(); this.moving = false; this.events.push('sword');
  }
  private strike() {
    // Damage exists only while the generated frame actually extends the blade.
    if (swordFrame(this.swing) !== 3) return;
    const direction = directions[this.attackFacing];
    for (const enemy of this.room.enemies) {
      if (enemy.health <= 0 || this.struck.has(enemy) || !attackTouches(this.attackFacing, enemy.x - this.x, enemy.y - this.y, enemy.kind === 'guardian' ? .6 : .38) || !this.visible(this, enemy)) continue;
      this.struck.add(enemy); enemy.health -= this.swordLevel; enemy.hit = .24; this.events.push('hit');
      this.sparks.push({ x: enemy.x, y: enemy.y, life: .16 });
      if (enemy.kind !== 'guardian') this.move(enemy, direction.x * .3, direction.y * .3);
    }
    this.projectiles = this.projectiles.filter(p => !swordTouches(this.attackFacing, p.x - this.x, p.y - this.y, .12) || !this.visible(this, p));
  }
  damage() {
    if (!this.alive || this.won || this.invulnerable > 0 || this.roomGrace > 0) return;
    this.health--; this.invulnerable = 1; this.events.push('hurt');
  }
  private enter(direction: Direction) {
    if (!this.doorOpen(direction)) return;
    const next = this.room.doors[direction]!;
    if (next === 1 && !this.bossUnlocked) { this.key = false; this.bossUnlocked = true; }
    this.roomId = next; this.visited.add(next); this.events.push('room');
    this.x = direction === 'left' ? ROOM_WIDTH - 1.6 : direction === 'right' ? 1.6 : 7.5;
    this.y = direction === 'up' ? ROOM_HEIGHT - 1.6 : direction === 'down' ? 1.6 : 5;
    this.projectiles = []; this.hearts = []; this.sparks = []; this.roomGrace = .8;
  }
  private nextDungeon() {
    this.completed++; this.events.push('exit');
    if (this.won) return;
    this.rooms = createDungeon(this.completed); this.roomId = 7; this.x = 7.5; this.y = 6.5; this.facing = 'up';
    this.visited = new Set([7]); this.key = false; this.bossUnlocked = false; this.projectiles = []; this.hearts = []; this.sparks = [];
    this.swing = 0; this.cooldown = 0; this.struck.clear(); this.moving = false;
    this.health = Math.min(this.maxHealth, this.health + 3); this.roomGrace = .8;
  }
  tick(seconds: number, inputs: ReadonlySet<GameAction> = new Set()) {
    if (!this.alive || this.won) return;
    const dt = Math.max(0, Math.min(seconds, .04));
    this.elapsed += dt; this.cooldown = Math.max(0, this.cooldown - dt); this.swing = Math.max(0, this.swing - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt); this.roomGrace = Math.max(0, this.roomGrace - dt); this.flash = Math.max(0, this.flash - dt);
    for (const spark of this.sparks) spark.life -= dt;
    this.sparks = this.sparks.filter(spark => spark.life > 0);
    const dx = Number(inputs.has('right')) - Number(inputs.has('left')), dy = Number(inputs.has('down')) - Number(inputs.has('up'));
    this.moving = Boolean((dx || dy) && this.swing <= 0);
    if (this.moving) {
      this.facing = dx ? dx > 0 ? 'right' : 'left' : dy > 0 ? 'down' : 'up';
      const beforeX = this.x, beforeY = this.y;
      const speed = dt * 3.2 / Math.max(1, Math.hypot(dx, dy)); this.move(this, dx * speed, dy * speed, true);
      const distance = Math.hypot(this.x - beforeX, this.y - beforeY);
      this.moving = distance > .0001;
      this.walking += distance * 2;
    }
    if (this.x < .65) this.enter('left'); else if (this.x > ROOM_WIDTH - .65) this.enter('right');
    else if (this.y < .65) this.enter('up'); else if (this.y > ROOM_HEIGHT - .65) this.enter('down');
    if (inputs.has('attack')) this.attack();
    this.strike();
    for (const enemy of this.room.enemies) {
      enemy.hit = Math.max(0, enemy.hit - dt);
      if (enemy.health <= 0 || enemy.hit > 0 || this.roomGrace > 0) continue;
      enemy.timer -= dt; enemy.phase += dt;
      const dx = this.x - enemy.x, dy = this.y - enemy.y, distance = Math.hypot(dx, dy);
      if (distance < (enemy.kind === 'guardian' ? .85 : .55)) this.damage();
      if (enemy.kind === 'guardian' && enemy.timer <= 0) {
        const angle = Math.atan2(dy, dx);
        for (const spread of [-.35, 0, .35]) this.projectiles.push({ x: enemy.x, y: enemy.y, vx: Math.cos(angle + spread) * 2.4, vy: Math.sin(angle + spread) * 2.4, life: 4 });
        enemy.timer = 2.2;
      }
      if (distance > .45) {
        const speed = (enemy.kind === 'bat' ? 1.35 : enemy.kind === 'guardian' ? .65 : .85) * dt;
        const wobble = enemy.kind === 'bat' ? Math.sin(enemy.phase * 5) * .5 : 0;
        // Slide around pillars when direct pursuit meets a corner.
        const mx = dx / distance * speed, my = dy / distance * speed;
        const oldX = enemy.x, oldY = enemy.y; this.move(enemy, mx + wobble * speed, my);
        if (enemy.x === oldX && enemy.y === oldY) this.move(enemy, -dy / distance * speed, dx / distance * speed);
      }
    }
    for (const p of this.projectiles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (this.wall(p.x, p.y, false)) p.life = 0;
      else if (Math.hypot(p.x - this.x, p.y - this.y) < .35) { this.damage(); p.life = 0; }
    }
    this.projectiles = this.projectiles.filter(p => p.life > 0);
    if (!this.alive) return;
    if (!this.remaining && !this.room.cleared) {
      this.room.cleared = true; this.events.push('clear');
      if (this.health < this.maxHealth && this.roomId !== 1) this.hearts.push({ x: 7.5, y: 5 });
    }
    this.hearts = this.hearts.filter(heart => {
      if (Math.hypot(this.x - heart.x, this.y - heart.y) > .7 || this.health === this.maxHealth) return true;
      this.health = Math.min(this.maxHealth, this.health + 2); this.flash = .2; return false;
    });
    const chest = this.room.chest;
    if (chest && !chest.opened && !this.remaining && Math.hypot(this.x - chest.x, this.y - chest.y) < .9) {
      chest.opened = true; this.flash = .35; this.events.push('chest');
      if (chest.kind === 'key') this.key = true;
      if (chest.kind === 'sword') this.swordLevel = 2;
      if (chest.kind === 'heart') { this.maxHealth = Math.min(8, this.maxHealth + 1); this.health = this.maxHealth; }
      if (chest.kind === 'heal') this.health = this.maxHealth;
    }
    if (this.exitOpen && Math.hypot(this.x - 7.5, this.y - 2) < .65) this.nextDungeon();
  }
}
