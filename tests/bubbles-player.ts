import { BubblesModel, BUBBLE_MAX_ANGLE, bubbleKey, bubbleNeighbors } from '../src/games/bubbles-model';

export function seededRandom(seed: number) {
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
export function bestBubbleAim(model: BubblesModel) {
  let best = -Infinity, angle = 0;
  const visited = new Set<string>();
  for (let i = 0; i <= 230; i++) {
    const candidate = -BUBBLE_MAX_ANGLE + i * .01, cell = model.trace(candidate).cell;
    if (!cell) continue;
    const key = bubbleKey(cell.row, cell.col); if (visited.has(key)) continue; visited.add(key);
    const trial = new BubblesModel(1, () => .3);
    trial.bubbles.clear(); for (const [key, bubble] of model.bubbles) trial.bubbles.set(key, { ...bubble });
    trial.ceiling = model.ceiling; trial.misses = model.misses; trial.current = model.current; trial.next = model.next;
    trial.aim(candidate); trial.shoot(); trial.update(2000);
    const removed = model.bubbles.size + 1 - trial.bubbles.size;
    const neighbors = bubbleNeighbors(cell.row, cell.col).filter(n => model.bubbles.get(bubbleKey(n.row, n.col))?.color === model.current).length;
    const value = (trial.complete ? 10000 : 0) + (trial.alive ? 0 : -10000) + removed * 100 + neighbors * 10 - cell.row - Math.abs(candidate) * .1;
    if (value > best) { best = value; angle = candidate; }
  }
  return angle;
}
