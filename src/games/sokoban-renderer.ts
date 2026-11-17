import type { SokobanModel } from './sokoban-model';

// One sprite pixel is two canvas pixels; all positions stay on whole tiles.
const worker = [
  '   rrrr   ',
  '  rrrrrr  ',
  '  ksssss  ',
  '  kssks   ',
  '   sss    ',
  ' sbbbbss  ',
  ' ssbbbs   ',
  '  byyb    ',
  '  bbbb    ',
  '  kk kk   ',
];
const palette: Record<string, string> = { r: '#d9533e', k: '#29303b', s: '#f1bd80', b: '#367bb6', y: '#f4d67f' };

export function renderSokoban(ctx: CanvasRenderingContext2D, model: SokobanModel) {
  const tile = 24, left = Math.floor((268 - model.width * tile) / 2), top = Math.floor((192 - model.height * tile) / 2);
  const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(x, y, w, h); };
  ctx.imageSmoothingEnabled = false;
  rect('#202832', 0, 0, 268, 192);
  for (let row = 0; row < model.height; row++) for (let col = 0; col < model.width; col++) {
    const x = left + col * tile, y = top + row * tile, index = row * model.width + col;
    if (model.isWall(col, row)) {
      rect('#344653', x, y, tile, tile);
      rect('#718892', x + 1, y + 1, 22, 9); rect('#8c9da2', x + 1, y + 1, 22, 2);
      rect('#556c79', x + 1, y + 12, 10, 10); rect('#718892', x + 1, y + 12, 10, 2);
      rect('#627b88', x + 13, y + 12, 10, 10); rect('#83969f', x + 13, y + 12, 10, 2);
      continue;
    }
    rect((col + row) % 2 ? '#d8c9a5' : '#ddcfb0', x, y, tile, tile);
    rect('#c4b692', x, y + 22, tile, 2); rect('#c4b692', x + 22, y, 2, tile);
    if (model.goals.has(index)) {
      rect('#9c483e', x + 8, y + 6, 8, 12); rect('#9c483e', x + 6, y + 8, 12, 8);
      rect('#e4bda0', x + 9, y + 9, 6, 6);
    }
    if (model.boxes.has(index)) {
      const placed = model.goals.has(index);
      rect('#58422f', x + 2, y + 3, 21, 21);
      rect(placed ? '#41794c' : '#a56632', x + 2, y + 2, 20, 20);
      rect(placed ? '#a9cd7b' : '#e5b56b', x + 2, y + 2, 20, 3);
      rect(placed ? '#a9cd7b' : '#e5b56b', x + 2, y + 2, 3, 20);
      rect(placed ? '#77a360' : '#c78a46', x + 6, y + 6, 13, 13);
      for (let step = 0; step < 6; step++) {
        rect(placed ? '#aacd7d' : '#edc482', x + 6 + step * 2, y + 6 + step * 2, 3, 3);
        rect(placed ? '#aacd7d' : '#edc482', x + 16 - step * 2, y + 6 + step * 2, 3, 3);
      }
      rect('#58422f', x + 3, y + 3, 2, 2); rect('#58422f', x + 18, y + 18, 2, 2);
    }
  }
  const x = left + model.player.x * tile + 2, y = top + model.player.y * tile + 2;
  rect('#b3a283', x + 2, y + 19, 16, 3);
  worker.forEach((row, sy) => [...row].forEach((pixel, sx) => {
    let color = palette[pixel];
    if (model.direction === 'up' && sy >= 2 && sy <= 4 && pixel !== ' ') color = sy === 2 ? palette.r : '#96552f';
    if (color) rect(color, x + (model.direction === 'left' ? 9 - sx : sx) * 2, y + sy * 2, 2, 2);
  }));
}
