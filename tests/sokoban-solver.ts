import type { SokobanDirection } from '../src/games/sokoban-model';

// Search by pushes, then return the walking inputs needed for each push.
export function solveSokoban(layout: readonly string[]): SokobanDirection[] {
  const width = layout[0].length, floor = new Set<number>(), goals = new Set<number>(), initialBoxes: number[] = [];
  let initialPlayer = -1;
  layout.forEach((row, y) => [...row].forEach((cell, x) => {
    const index = y * width + x;
    if (cell !== '#') floor.add(index);
    if (cell === '.' || cell === '*' || cell === '+') goals.add(index);
    if (cell === '$' || cell === '*') initialBoxes.push(index);
    if (cell === '@' || cell === '+') initialPlayer = index;
  }));
  const steps: [SokobanDirection, number][] = [['left', -1], ['up', -width], ['right', 1], ['down', width]];
  const reachable = (player: number, boxes: number[]) => {
    const routes = new Map<number, SokobanDirection[]>([[player, []]]), queue = [player];
    for (let head = 0; head < queue.length; head++) for (const [direction, offset] of steps) {
      const next = queue[head] + offset;
      if (floor.has(next) && !boxes.includes(next) && !routes.has(next)) {
        routes.set(next, [...routes.get(queue[head])!, direction]); queue.push(next);
      }
    }
    return routes;
  };
  const queue = [{ player: initialPlayer, boxes: initialBoxes, path: [] as SokobanDirection[] }], seen = new Set<string>();
  for (let head = 0; head < queue.length; head++) {
    if (head > 100000) throw new Error('Sokoban search exceeded its state budget');
    const state = queue[head];
    if (state.boxes.every(box => goals.has(box))) return state.path;
    const routes = reachable(state.player, state.boxes);
    const key = `${Math.min(...routes.keys())}:${[...state.boxes].sort((a, b) => a - b).join(',')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    for (const box of state.boxes) for (const [direction, offset] of steps) {
      const stand = routes.get(box - offset), next = box + offset;
      if (!stand || !floor.has(next) || state.boxes.includes(next)) continue;
      // Prune corners without a goal.
      if (!goals.has(next) && (!floor.has(next - 1) || !floor.has(next + 1)) && (!floor.has(next - width) || !floor.has(next + width))) continue;
      queue.push({ player: box, boxes: state.boxes.map(value => value === box ? next : value), path: [...state.path, ...stand, direction] });
    }
  }
  throw new Error('Unsolvable Sokoban level');
}
