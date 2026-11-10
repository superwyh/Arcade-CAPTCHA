import type { GameAction } from '../types';
import { createSector, MAP_SIZE, SECTOR_COUNT, type Sector, type Enemy, type Projectile } from './fps-map';
export { createSector, MAP_SIZE, SECTOR_COUNT } from './fps-map';
export type { EnemyKind, PickupKind, Position, Enemy, Pickup, Projectile, Sector } from './fps-map';
export type FpsEvent = 'shot' | 'punch' | 'hit' | 'hurt' | 'pickup' | 'unlock' | 'sector';
export function angleDifference(angle: number) { return Math.atan2(Math.sin(angle), Math.cos(angle)); }

export class FpsModel {
  sector: Sector;
  x: number;
  y: number;
  angle: number;
  constructor(private random: () => number = Math.random) {
    this.sector = createSector(0, random);
    this.x = this.sector.spawn.x; this.y = this.sector.spawn.y; this.angle = this.sector.angle;
  }
  health = 100;
  armor = 50;
  ammo = 32;
  cleared = 0;
  key = false;
  elapsed = 0;
  sectorTime = 0;
  recoil = 0;
  muzzleFlash = 0;
  damageFlash = 0;
  pickupFlash = 0;
  walking = 0;
  cooldown = 0;
  shots = 0;
  kills = 0;
  won = false;
  projectiles: Projectile[] = [];
  events: FpsEvent[] = [];
  private navigation = new Map<number, number>();
  private navTimer = 0;
  get alive() { return this.health > 0; }
  get remaining() { return this.sector.enemies.filter(enemy => enemy.health > 0).length; }
  get doorOpen() { return this.key && this.remaining === 0; }

  tile(x: number, y: number) { return this.sector.map[Math.floor(y)]?.[Math.floor(x)] ?? '1'; }
  solid(x: number, y: number) { const tile = this.tile(x, y); return tile !== '.' && (tile !== 'E' || !this.doorOpen); }
  canOccupy(x: number, y: number, radius = .2) {
    return !this.solid(x - radius, y - radius) && !this.solid(x + radius, y - radius) && !this.solid(x - radius, y + radius) && !this.solid(x + radius, y + radius);
  }
  move(dx: number, dy: number) {
    if (this.canOccupy(this.x + dx, this.y)) this.x += dx;
    if (this.canOccupy(this.x, this.y + dy)) this.y += dy;
  }
  /** Grid DDA: works with both unit rays and camera-plane rays. */
  castRay(x: number, y: number, dx: number, dy: number) {
    let cellX = Math.floor(x), cellY = Math.floor(y), side = 0, distance = 0;
    const stepX = dx < 0 ? -1 : 1, stepY = dy < 0 ? -1 : 1;
    const deltaX = Math.abs(1 / dx), deltaY = Math.abs(1 / dy);
    let sideX = (dx < 0 ? x - cellX : cellX + 1 - x) * deltaX;
    let sideY = (dy < 0 ? y - cellY : cellY + 1 - y) * deltaY;
    for (let step = 0; step < 64; step++) {
      if (sideX < sideY) { distance = sideX; sideX += deltaX; cellX += stepX; side = 0; }
      else { distance = sideY; sideY += deltaY; cellY += stepY; side = 1; }
      if (this.solid(cellX + .5, cellY + .5)) break;
    }
    const wall = side ? x + distance * dx : y + distance * dy;
    return { distance: Math.max(.01, distance), side, u: wall - Math.floor(wall), tile: this.tile(cellX + .5, cellY + .5) };
  }
  visible(x: number, y: number, tx: number, ty: number) {
    const distance = Math.hypot(tx - x, ty - y);
    return distance < .01 || this.castRay(x, y, (tx - x) / distance, (ty - y) / distance).distance + .02 >= distance;
  }
  fire() {
    if (!this.alive || this.won || this.cooldown > 0) return;
    const armed = this.ammo > 0;
    if (armed) this.ammo--;
    this.muzzleFlash = armed ? .07 : 0;
    this.shots++; this.recoil = .26; this.cooldown = armed ? .58 : .42;
    this.events.push(armed ? 'shot' : 'punch');
    let target: Enemy | undefined, nearest = armed ? 12 : 1.2;
    for (const enemy of this.sector.enemies) {
      if (enemy.health <= 0) continue;
      const dx = enemy.x - this.x, dy = enemy.y - this.y, distance = Math.hypot(dx, dy);
      if (distance < 8) enemy.awake = true;
      const error = Math.abs(angleDifference(Math.atan2(dy, dx) - this.angle));
      if (distance < nearest && error < Math.atan2(.32, distance) + .045 && this.visible(this.x, this.y, enemy.x, enemy.y)) { nearest = distance; target = enemy; }
    }
    if (target) {
      target.health -= armed ? 36 : 30; target.hit = .2; this.events.push('hit');
      if (target.health <= 0) this.kills++;
    }
  }
  damage(amount: number) {
    if (!this.alive || this.won) return;
    const absorbed = Math.min(this.armor, Math.ceil(amount * .6));
    this.armor -= absorbed; this.health = Math.max(0, this.health - amount + absorbed);
    this.damageFlash = .28; this.events.push('hurt');
  }
  private rebuildNavigation() {
    this.navigation.clear();
    const start = Math.floor(this.y) * MAP_SIZE + Math.floor(this.x), queue = [start]; this.navigation.set(start, 0);
    for (let head = 0; head < queue.length; head++) {
      const current = queue[head], distance = this.navigation.get(current)!;
      const x = current % MAP_SIZE, y = Math.floor(current / MAP_SIZE);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const id = ny * MAP_SIZE + nx;
        if (nx < 0 || ny < 0 || nx >= MAP_SIZE || ny >= MAP_SIZE || this.solid(nx + .5, ny + .5) || this.navigation.has(id)) continue;
        this.navigation.set(id, distance + 1); queue.push(id);
      }
    }
  }
  private updateEnemies(dt: number) {
    this.navTimer -= dt;
    if (this.navTimer <= 0) { this.rebuildNavigation(); this.navTimer = .35; }
    for (const enemy of this.sector.enemies) {
      enemy.hit = Math.max(0, enemy.hit - dt);
      if (enemy.health <= 0) continue;
      const dx = this.x - enemy.x, dy = this.y - enemy.y, distance = Math.hypot(dx, dy);
      const lineOfSight = distance < 9 && this.visible(enemy.x, enemy.y, this.x, this.y);
      if (distance < 6.5 && lineOfSight) enemy.awake = true;
      if (!enemy.awake || this.sectorTime < 4 || enemy.hit > 0) continue;
      enemy.cooldown -= dt;
      if (lineOfSight && enemy.cooldown <= 0 && distance < (enemy.kind === 'brute' ? .9 : 6.5)) {
        if (distance < .9) this.damage(enemy.kind === 'brute' ? 12 : 7);
        else this.projectiles.push({ x: enemy.x, y: enemy.y, vx: dx / distance * 2.3, vy: dy / distance * 2.3, life: 5 });
        enemy.cooldown = enemy.kind === 'brute' ? 1.4 : 2.6;
      }
      if (distance < (enemy.kind === 'brute' ? .7 : 2.8) && lineOfSight) continue;
      let targetX = this.x, targetY = this.y;
      if (!lineOfSight) {
        const cx = Math.floor(enemy.x), cy = Math.floor(enemy.y);
        let best = this.navigation.get(cy * MAP_SIZE + cx) ?? Infinity;
        targetX = enemy.x; targetY = enemy.y;
        for (const [nx, ny] of [[cx - 1, cy], [cx + 1, cy], [cx, cy - 1], [cx, cy + 1]]) {
          const value = this.navigation.get(ny * MAP_SIZE + nx);
          if (value !== undefined && value < best) { best = value; targetX = nx + .5; targetY = ny + .5; }
        }
      }
      const length = Math.hypot(targetX - enemy.x, targetY - enemy.y);
      if (length < .05) continue;
      const speed = (enemy.kind === 'brute' ? .75 : .5) * dt;
      const mx = (targetX - enemy.x) / length * speed, my = (targetY - enemy.y) / length * speed;
      const free = (x: number, y: number) => this.canOccupy(x, y, .22) && !this.sector.enemies.some(other => other !== enemy && other.health > 0 && Math.hypot(other.x - x, other.y - y) < .4);
      if (free(enemy.x + mx, enemy.y)) enemy.x += mx;
      if (free(enemy.x, enemy.y + my)) enemy.y += my;
    }
  }
  tick(seconds: number, inputs: ReadonlySet<GameAction> = new Set()) {
    if (!this.alive || this.won) return;
    const dt = Math.min(Math.max(seconds, 0), .05), wasOpen = this.doorOpen;
    this.elapsed += dt; this.sectorTime += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    this.recoil = Math.max(0, this.recoil - dt); this.damageFlash = Math.max(0, this.damageFlash - dt); this.pickupFlash = Math.max(0, this.pickupFlash - dt);
    this.muzzleFlash = Math.max(0, this.muzzleFlash - dt);
    this.angle = angleDifference(this.angle + ((inputs.has('right') ? 1 : 0) - (inputs.has('left') ? 1 : 0)) * dt * 1.9);
    const forward = Number(inputs.has('up')) - Number(inputs.has('down'));
    const strafe = Number(inputs.has('strafe-right')) - Number(inputs.has('strafe-left'));
    const scale = dt * 1.65 / Math.max(1, Math.hypot(forward, strafe));
    this.move((Math.cos(this.angle) * forward - Math.sin(this.angle) * strafe) * scale, (Math.sin(this.angle) * forward + Math.cos(this.angle) * strafe) * scale);
    if (forward || strafe) this.walking += dt * 9;
    if (inputs.has('fire')) this.fire();
    this.updateEnemies(dt);
    for (const projectile of this.projectiles) {
      projectile.x += projectile.vx * dt; projectile.y += projectile.vy * dt; projectile.life -= dt;
      if (this.solid(projectile.x, projectile.y)) projectile.life = 0;
      else if (Math.hypot(projectile.x - this.x, projectile.y - this.y) < .3) { this.damage(9); projectile.life = 0; }
    }
    this.projectiles = this.projectiles.filter(projectile => projectile.life > 0);
    if (!this.alive) return;
    for (const item of this.sector.pickups) {
      if (item.taken || Math.hypot(item.x - this.x, item.y - this.y) > .55) continue;
      if (item.kind === 'health' && this.health >= 100 || item.kind === 'armor' && this.armor >= 100 || item.kind === 'ammo' && this.ammo >= 99) continue;
      item.taken = true;
      if (item.kind === 'key') this.key = true;
      if (item.kind === 'health') this.health = Math.min(100, this.health + 35);
      if (item.kind === 'armor') this.armor = Math.min(100, this.armor + 40);
      if (item.kind === 'ammo') this.ammo = Math.min(99, this.ammo + 16);
      this.pickupFlash = .18; this.events.push('pickup');
    }
    if (!wasOpen && this.doorOpen) this.events.push('unlock');
    if (this.doorOpen && Math.hypot(this.x - this.sector.exit.x, this.y - this.sector.exit.y) < .55) {
      this.cleared++; this.events.push('sector');
      if (this.cleared === SECTOR_COUNT) { this.won = true; return; }
      this.sector = createSector(this.cleared, this.random); this.x = this.sector.spawn.x; this.y = this.sector.spawn.y; this.angle = this.sector.angle;
      this.key = false; this.sectorTime = 0; this.projectiles = []; this.navTimer = 0;
      this.health = Math.min(100, this.health + 20); this.armor = Math.min(100, this.armor + 20); this.ammo = Math.min(99, this.ammo + 8);
    }
  }
}
