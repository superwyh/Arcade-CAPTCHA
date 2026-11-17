export interface BubbleCell { row: number; col: number; color: number }
export interface BubblePoint { x: number; y: number }
export interface BubbleTrace { points: BubblePoint[]; cell?: { row: number; col: number }; length: number }
export interface BubbleShot { color: number; trace: BubbleTrace; distance: number; x: number; y: number }
export interface BubbleParticle extends BubblePoint { color: number; vx: number; vy: number; life: number; falling: boolean }

export const BUBBLES_TARGET = 1, BUBBLES_MAX_TARGET = 5;
export const BUBBLE_RADIUS = 9, BUBBLE_PITCH = 18, BUBBLE_ROW_HEIGHT = Math.sqrt(3) * 9;
export const BUBBLE_LEFT = 26, BUBBLE_RIGHT = 242, BUBBLE_LIMIT = 147;
export const BUBBLE_ORIGIN = { x: 134, y: 172 };
export const BUBBLE_MAX_ANGLE = 1.15, BUBBLE_SPEED = 330, BUBBLE_MISS_LIMIT = 5;
export const bubbleKey = (row: number, col: number) => `${row}:${col}`;
export const bubbleColumns = (row: number) => row % 2 ? 12 : 13;
export function bubbleCenter(cell: { row: number; col: number }, ceiling = 0): BubblePoint {
  return { x: BUBBLE_LEFT + cell.col * BUBBLE_PITCH + (cell.row % 2) * BUBBLE_RADIUS, y: 12 + cell.row * BUBBLE_ROW_HEIGHT + ceiling };
}
export function bubbleNeighbors(row: number, col: number) {
  const shift = row % 2 ? 0 : -1;
  return [[row, col - 1], [row, col + 1], [row - 1, col + shift], [row - 1, col + shift + 1], [row + 1, col + shift], [row + 1, col + shift + 1]]
    .filter(([r, c]) => r >= 0 && c >= 0 && c < bubbleColumns(r)).map(([row, col]) => ({ row, col }));
}
const distance = (a: BubblePoint, b: BubblePoint) => Math.hypot(a.x - b.x, a.y - b.y);

export class BubblesModel {
  readonly bubbles = new Map<string, BubbleCell>();
  readonly particles: BubbleParticle[] = [];
  angle = 0;
  ceiling = 0;
  misses = 0;
  score = 0;
  alive = true;
  current = 0;
  next = 0;
  shot?: BubbleShot;
  transition = 0;

  constructor(readonly target = BUBBLES_TARGET, private random: () => number = Math.random) { this.newBoard(); }
  get complete() { return this.score >= this.target; }
  get ready() { return this.alive && !this.complete && !this.shot && this.transition <= 0; }
  private chooseColor() {
    const colors = [...new Set([...this.bubbles.values()].map(cell => cell.color))];
    return colors[Math.floor(this.random() * colors.length)] ?? 0;
  }
  private newBoard() {
    this.bubbles.clear(); this.ceiling = 0; this.misses = 0; this.angle = 0;
    // Pair rows to form color clusters.
    const rows = this.score >= 2 ? 6 : 5;
    let band: number[] = [];
    for (let row = 0; row < rows; row++) {
      if (row % 2 === 0) {
        band = [];
        for (let group = 0; group < 5; group++) {
          const choices = [0, 1, 2, 3].filter(color => color !== band.at(-1));
          band.push(choices[Math.floor(this.random() * choices.length)]);
        }
      }
      for (let col = 0; col < bubbleColumns(row); col++) {
        this.bubbles.set(bubbleKey(row, col), { row, col, color: band[Math.floor(col / 3)] });
      }
    }
    this.current = this.chooseColor(); this.next = this.chooseColor();
  }
  aim(angle: number) { if (Number.isFinite(angle)) this.angle = Math.max(-BUBBLE_MAX_ANGLE, Math.min(BUBBLE_MAX_ANGLE, angle)); }
  aimAt(x: number, y: number) { this.aim(Math.atan2(x - BUBBLE_ORIGIN.x, Math.max(8, BUBBLE_ORIGIN.y - y))); }

  /** Shared collision path for the aiming guide and moving bubble. */
  trace(angle = this.angle): BubbleTrace {
    let point = { ...BUBBLE_ORIGIN }, vx = Math.sin(angle), vy = -Math.cos(angle), length = 0;
    const points = [point];
    for (let bounce = 0; bounce < 8; bounce++) {
      const ceilingY = 12 + this.ceiling;
      let travel = (ceilingY - point.y) / vy;
      let hit: BubbleCell | undefined, wall = false;
      const wallDistance = Math.abs(vx) < 1e-9 ? Infinity : ((vx > 0 ? BUBBLE_RIGHT : BUBBLE_LEFT) - point.x) / vx;
      if (wallDistance >= 0 && wallDistance < travel) { travel = wallDistance; wall = true; }
      for (const cell of this.bubbles.values()) {
        const center = bubbleCenter(cell, this.ceiling), dx = point.x - center.x, dy = point.y - center.y;
        const along = dx * vx + dy * vy;
        const discriminant = along * along - (dx * dx + dy * dy - BUBBLE_PITCH * BUBBLE_PITCH);
        if (discriminant < 0) continue;
        const enter = -along - Math.sqrt(discriminant);
        if (enter >= -1e-6 && enter <= travel + 1e-6) { travel = Math.max(0, enter); hit = cell; wall = false; }
      }
      if (!Number.isFinite(travel) || travel < 0) return { points, length };
      point = { x: point.x + vx * travel, y: point.y + vy * travel };
      points.push(point); length += travel;
      if (wall) { vx = -vx; continue; }
      const candidates = hit ? bubbleNeighbors(hit.row, hit.col) : Array.from({ length: 13 }, (_, col) => ({ row: 0, col }));
      const cell = candidates.filter(cell => !this.bubbles.has(bubbleKey(cell.row, cell.col)))
        .sort((a, b) => distance(bubbleCenter(a, this.ceiling), point) - distance(bubbleCenter(b, this.ceiling), point))[0];
      return { points, cell, length };
    }
    return { points, length };
  }
  shoot() {
    if (!this.ready) return false;
    this.shot = { color: this.current, trace: this.trace(), distance: 0, ...BUBBLE_ORIGIN };
    return true;
  }
  private connected(seeds: BubbleCell[], sameColor?: number) {
    const found = new Set<string>(), queue = [...seeds];
    for (let head = 0; head < queue.length; head++) {
      const cell = queue[head], key = bubbleKey(cell.row, cell.col);
      if (found.has(key) || (sameColor !== undefined && cell.color !== sameColor)) continue;
      found.add(key);
      for (const neighbor of bubbleNeighbors(cell.row, cell.col)) {
        const next = this.bubbles.get(bubbleKey(neighbor.row, neighbor.col));
        if (next && !found.has(bubbleKey(next.row, next.col))) queue.push(next);
      }
    }
    return found;
  }
  private remove(key: string, falling: boolean) {
    const bubble = this.bubbles.get(key)!; this.bubbles.delete(key);
    const center = bubbleCenter(bubble, this.ceiling);
    for (let i = 0; i < (falling ? 1 : 4); i++) this.particles.push({
      ...center, color: bubble.color, falling, life: falling ? 950 : 380,
      vx: falling ? (this.random() - .5) * 45 : (i % 2 ? 1 : -1) * (30 + this.random() * 35),
      vy: falling ? 20 : (i < 2 ? -1 : 1) * (25 + this.random() * 40),
    });
  }
  private settle(shot: BubbleShot) {
    this.shot = undefined;
    if (!shot.trace.cell) { this.alive = false; return; }
    const cell = { ...shot.trace.cell, color: shot.color }, key = bubbleKey(cell.row, cell.col);
    this.bubbles.set(key, cell);
    const cluster = this.connected([cell], cell.color);
    if (cluster.size >= 3) {
      for (const key of cluster) this.remove(key, false);
      const anchored = this.connected([...this.bubbles.values()].filter(cell => cell.row === 0));
      for (const key of this.bubbles.keys()) if (!anchored.has(key)) this.remove(key, true);
      this.misses = 0;
    } else if (++this.misses === BUBBLE_MISS_LIMIT) { this.ceiling += BUBBLE_ROW_HEIGHT; this.misses = 0; }
    if (!this.bubbles.size) { this.score++; this.transition = this.complete ? 0 : 650; return; }
    if ([...this.bubbles.values()].some(cell => bubbleCenter(cell, this.ceiling).y + BUBBLE_RADIUS >= BUBBLE_LIMIT)) { this.alive = false; return; }
    const available = new Set([...this.bubbles.values()].map(cell => cell.color));
    this.current = available.has(this.next) ? this.next : this.chooseColor();
    this.next = this.chooseColor();
  }
  update(delta: number) {
    if (!this.alive || this.complete || delta <= 0 || !Number.isFinite(delta)) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i]; particle.life -= delta;
      particle.x += particle.vx * delta / 1000; particle.y += particle.vy * delta / 1000; particle.vy += 280 * delta / 1000;
      if (particle.life <= 0 || particle.y > 208) this.particles.splice(i, 1);
    }
    if (this.transition > 0) { this.transition -= delta; if (this.transition <= 0) this.newBoard(); return; }
    const shot = this.shot; if (!shot) return;
    shot.distance += BUBBLE_SPEED * delta / 1000;
    if (shot.distance >= shot.trace.length) { this.settle(shot); return; }
    let remaining = shot.distance;
    for (let i = 1; i < shot.trace.points.length; i++) {
      const a = shot.trace.points[i - 1], b = shot.trace.points[i], length = distance(a, b);
      if (remaining <= length) {
        shot.x = a.x + (b.x - a.x) * remaining / length; shot.y = a.y + (b.y - a.y) * remaining / length; break;
      }
      remaining -= length;
    }
  }
}
