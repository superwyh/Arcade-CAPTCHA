export type Direction = 'up' | 'down' | 'left' | 'right';
export const ATTACK_DURATION = .26, ATTACK_COOLDOWN = .38;
const WINDUP = .06, EXTENSION_END = .18;

// Blade bounds in 32 × 32 frames, relative to the character's center.
export const swordPixels: Record<Direction, readonly [number, number, number, number]> = {
  down: [-6, 5, -3, 14], up: [-6, -13, -3, -5],
  left: [-15, 4, -5, 7], right: [5, 4, 16, 7],
};
export function swordFrame(remaining: number): 0 | 2 | 3 {
  if (remaining <= 0) return 0;
  const elapsed = ATTACK_DURATION - remaining;
  return elapsed >= WINDUP && elapsed < EXTENSION_END ? 3 : elapsed < .22 ? 2 : 0;
}
export function swordTouches(direction: Direction, dx: number, dy: number, radius: number) {
  const [left, top, right, bottom] = swordPixels[direction];
  return dx + radius >= left / 16 && dx - radius <= right / 16
    && dy + radius >= top / 16 && dy - radius <= bottom / 16;
}

// Enemies use a wider sweep; projectile interception uses swordTouches.
export function attackTouches(direction: Direction, dx: number, dy: number, radius: number) {
  const forward = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
  const side = direction === 'left' || direction === 'right' ? dy : dx;
  const reach = 1.65 + radius;
  return forward >= -.05 && Math.abs(side) <= .7 + radius && Math.hypot(dx, dy) <= reach;
}
