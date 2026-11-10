import type { GameAction } from '../types';

export const RACE_TARGET = 1500, RACE_MAX_TARGET = 10000;
export const RACE_LANES = [-.72, -.24, .24, .72] as const;
export interface TrafficCar { x: number; distance: number; sprite: number; hit: boolean }
export class RacingModel {
  x = 0; distance = 0; elapsed = 0; speed = 22; health = 3;
  invulnerable = 0; offroadTime = 0; steering = 0; boosting = false;
  cars: TrafficCar[] = [];
  private nextWave = 65;
  private readonly roadSeed: number;
  constructor(readonly target = RACE_TARGET, private random: () => number = Math.random) {
    this.roadSeed = Math.floor(random() * 0x100000000);
    this.spawnWave(115);
  }
  get alive() { return this.health > 0; }
  get won() { return this.alive && this.distance >= this.target; }
  get score() { return Math.floor(this.distance); }
  curveAt(distance: number) {
    const segment = Math.max(0, Math.floor(distance / 160));
    const t = Math.max(0, distance / 160 - segment), blend = t * t * (3 - 2 * t);
    // Pure sampling: drawing distant road segments cannot change traffic generation.
    const value = (index: number) => {
      if (index < 2) return 0;
      let hash = Math.imul(this.roadSeed ^ index, 0x45d9f3b);
      hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b);
      return (((hash ^ (hash >>> 16)) >>> 0) / 0x100000000 * 2 - 1) * .85;
    };
    return value(segment) * (1 - blend) + value(segment + 1) * blend;
  }
  private spawnWave(ahead: number) {
    // At most two of four lanes are occupied in any wave, with ample distance between waves.
    const lanes = [0, 1, 2, 3];
    const count = this.distance > 200 && this.random() > .35 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const lane = lanes.splice(Math.min(lanes.length - 1, Math.floor(this.random() * lanes.length)), 1)[0];
      this.cars.push({ x: RACE_LANES[lane], distance: this.distance + ahead, sprite: 4 + Math.floor(this.random() * 3), hit: false });
    }
  }
  private crash() {
    if (this.invulnerable > 0 || !this.alive) return;
    this.health--; this.invulnerable = 1.6; this.speed = Math.max(6, this.speed * .45); this.offroadTime = 0;
  }
  tick(seconds: number, inputs: ReadonlySet<GameAction> = new Set(), pointerX?: number) {
    if (!this.alive || this.won) return;
    const dt = Math.max(0, Math.min(.04, seconds));
    this.elapsed += dt; this.invulnerable = Math.max(0, this.invulnerable - dt);
    const offroad = Math.abs(this.x) > .98;
    this.boosting = inputs.has('boost') && !inputs.has('brake') && !offroad;
    const desiredSpeed = offroad ? 8 : inputs.has('brake') ? 12 : this.boosting ? 38 : 25;
    const acceleration = desiredSpeed < this.speed ? 30 : 12;
    this.speed += Math.sign(desiredSpeed - this.speed) * Math.min(Math.abs(desiredSpeed - this.speed), acceleration * dt);
    const steering = pointerX === undefined ? Number(inputs.has('right')) - Number(inputs.has('left')) : Math.max(-1, Math.min(1, (pointerX - this.x) * 5));
    this.steering = Math.abs(steering) > .12 ? Math.sign(steering) : 0;
    this.x += steering * (1.25 + this.speed / 65) * dt - this.curveAt(this.distance) * this.speed / 90 * dt;
    this.x = Math.max(-1.25, Math.min(1.25, this.x));
    this.offroadTime = offroad ? this.offroadTime + dt : 0;
    if (this.offroadTime > 2) this.crash();
    const previousDistance = this.distance;
    this.distance = Math.min(this.target, this.distance + this.speed * dt);
    for (const car of this.cars) {
      const before = car.distance - previousDistance;
      car.distance += 10 * dt;
      const ahead = car.distance - this.distance;
      if (!car.hit && before > -4 && ahead < 4 && ahead > -4 && Math.abs(car.x - this.x) < .34 && this.invulnerable <= 0) {
        car.hit = true; this.crash();
      }
    }
    this.cars = this.cars.filter(car => car.distance - this.distance > -25);
    if (this.distance >= this.nextWave) { this.spawnWave(145); this.nextWave = this.distance + 60 + this.random() * 20; }
  }
}
