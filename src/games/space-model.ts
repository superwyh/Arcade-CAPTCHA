import type { GameAction } from '../types';

export const SPACE_TARGET = 3, SPACE_MAX_TARGET = 5;
export interface SpacePoint { x: number; y: number }
export interface SpaceShot extends SpacePoint { vx: number; vy: number }
export interface SpaceEnemy extends SpacePoint {
  type: 'scout' | 'fighter' | 'boss'; hp: number; maxHp: number;
  baseX: number; baseY: number; phase: number; fireIn: number;
}
export interface SpaceExplosion extends SpacePoint { age: number; size: number }
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));

function segmentDistance(a: SpacePoint, b: SpacePoint, point: SpacePoint) {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy;
  const t = length ? clamp(((point.x - a.x) * dx + (point.y - a.y) * dy) / length, 0, 1) : 0;
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}

export class SpaceModel {
  x = 134; y = 163; health = 3; invulnerable = 0; elapsed = 0; score = 0; steering = 0;
  enemies: SpaceEnemy[] = [];
  shots: SpaceShot[] = [];
  enemyShots: SpaceShot[] = [];
  explosions: SpaceExplosion[] = [];
  phaseTime = 0;
  intermission = 0;
  private fireIn = 0;
  private volley = 0;
  constructor(readonly target = SPACE_TARGET, private random: () => number = Math.random) { this.spawnPhase(); }
  get alive() { return this.health > 0; }
  get won() { return this.alive && this.score >= this.target; }
  get boss() { return this.enemies.find(enemy => enemy.type === 'boss'); }

  private spawnPhase() {
    this.phaseTime = 0; this.volley = 0;
    if (this.score === this.target - 1) {
      const hp = 90 + this.score * 10;
      this.enemies = [{ type: 'boss', x: 134, y: 34, baseX: 134, baseY: 46, phase: 0, hp, maxHp: hp, fireIn: 2.8 }];
      return;
    }
    const rows = this.score === 0 ? 2 : 3;
    this.enemies = Array.from({ length: rows * 4 }, (_, index) => {
      const row = Math.floor(index / 4), type = row === 0 ? 'fighter' : 'scout', hp = type === 'fighter' ? 3 : 2;
      return { type, x: 54 + index % 4 * 52 + Math.sin(row * .65) * 24, y: 20 + row * 24, baseX: 54 + index % 4 * 52, baseY: 32 + row * 24,
        phase: row * .65, hp, maxHp: hp, fireIn: 2.8 + this.random() * 2 + row * .5 };
    });
  }
  private shootEnemy(enemy: SpaceEnemy) {
    const boss = enemy.type === 'boss', angle = Math.atan2(this.y - enemy.y, this.x - enemy.x);
    const speed = boss ? 52 : 46 + this.score * 4;
    const angles = boss ? [-.52, -.26, 0, .26, .52] : [0];
    for (const offset of angles) this.enemyShots.push({ x: enemy.x, y: enemy.y + (boss ? 18 : 8), vx: Math.cos(angle + offset) * speed, vy: Math.sin(angle + offset) * speed });
    if (boss && ++this.volley % 2 === 0) for (const side of [-1, 1]) this.enemyShots.push({ x: enemy.x + side * 19, y: enemy.y + 17, vx: side * 12, vy: 63 });
    enemy.fireIn = boss ? 1.35 : 3.2 + this.random() * 2;
  }
  private damage() {
    if (this.invulnerable > 0 || !this.alive) return;
    this.health--; this.invulnerable = 1.6;
    this.explosions.push({ x: this.x, y: this.y, age: 0, size: 28 });
  }
  tick(seconds: number, inputs: ReadonlySet<GameAction> = new Set(), pointer?: SpacePoint) {
    if (!this.alive || this.won) return;
    const dt = clamp(seconds, 0, .04);
    this.elapsed += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
    let dx = Number(inputs.has('right')) - Number(inputs.has('left')), dy = Number(inputs.has('down')) - Number(inputs.has('up'));
    const length = Math.hypot(dx, dy);
    if (length) { dx = dx / length * 130 * dt; dy = dy / length * 130 * dt; }
    else if (pointer) {
      const distance = Math.hypot(pointer.x - this.x, pointer.y - this.y), amount = Math.min(1, 180 * dt / (distance || 1));
      dx = (pointer.x - this.x) * amount; dy = (pointer.y - this.y) * amount;
    }
    this.steering = Math.abs(dx) > .1 ? Math.sign(dx) : 0;
    this.x = clamp(this.x + dx, 12, 256); this.y = clamp(this.y + dy, 108, 178);
    for (const explosion of this.explosions) explosion.age += dt;
    this.explosions = this.explosions.filter(explosion => explosion.age < .4);
    if (this.intermission > 0) {
      this.intermission -= dt;
      if (this.intermission <= 0) { this.intermission = 0; this.spawnPhase(); }
      return;
    }
    this.phaseTime += dt; this.fireIn -= dt;
    if (this.fireIn <= 0) {
      for (const side of [-1, 1]) this.shots.push({ x: this.x + side * 4, y: this.y - 10, vx: 0, vy: -215 });
      this.fireIn += .2;
    }
    for (const enemy of this.enemies) {
      enemy.x = enemy.baseX + Math.sin(this.phaseTime * (enemy.type === 'boss' ? .85 : .7) + enemy.phase) * (enemy.type === 'boss' ? 82 : 24);
      enemy.y = enemy.baseY - Math.max(0, 12 - this.phaseTime * 24) + Math.sin(this.phaseTime * 1.4 + enemy.phase) * 3;
      enemy.fireIn -= dt;
      if (enemy.y >= 18 && enemy.fireIn <= 0) this.shootEnemy(enemy);
    }
    this.shots = this.shots.filter(shot => {
      const previousY = shot.y; shot.y += shot.vy * dt;
      const enemy = this.enemies.find(enemy => enemy.hp > 0 && enemy.y >= 8 && Math.abs(shot.x - enemy.x) <= (enemy.type === 'boss' ? 25 : 9)
        && shot.y <= enemy.y + (enemy.type === 'boss' ? 17 : 9) && previousY >= enemy.y - (enemy.type === 'boss' ? 17 : 9));
      if (enemy) {
        enemy.hp--;
        if (enemy.hp === 0) this.explosions.push({ x: enemy.x, y: enemy.y, age: 0, size: enemy.type === 'boss' ? 72 : 30 });
        return false;
      }
      return shot.y > -12;
    });
    this.enemies = this.enemies.filter(enemy => enemy.hp > 0);
    this.enemyShots = this.enemyShots.filter(shot => {
      const previous = { x: shot.x, y: shot.y }; shot.x += shot.vx * dt; shot.y += shot.vy * dt;
      if (segmentDistance(previous, shot, this) <= 6) { this.damage(); return false; }
      return shot.y < 204 && shot.x > -12 && shot.x < 280;
    });
    // Resolve fatal damage before checking stage completion.
    if (this.alive && this.enemies.length === 0) {
      this.score++; this.shots = []; this.enemyShots = [];
      if (!this.won) { this.intermission = 1.1; this.health = Math.min(3, this.health + 1); this.invulnerable = 1.5; }
    }
  }
}
