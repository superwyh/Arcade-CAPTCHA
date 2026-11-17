import type { SnakeModel } from './snake-model';

export function renderSnake(ctx: CanvasRenderingContext2D, model: SnakeModel) {
  const size = 12, offset = 2;
  ctx.fillStyle = '#14221c'; ctx.fillRect(0, 0, 268, 192);
  for (let y = 0; y < model.height; y++) for (let x = 0; x < model.width; x++) {
    ctx.fillStyle = (x + y) % 2 ? '#1b2d24' : '#203329';
    ctx.fillRect(offset + x * size, y * size, size, size);
  }
  if (model.food) {
    const x = offset + model.food.x * size, y = model.food.y * size;
    ctx.fillStyle = '#a72f36'; ctx.fillRect(x + 2, y + 4, 8, 6);
    ctx.fillStyle = '#f05a52'; ctx.fillRect(x + 2, y + 3, 8, 5); ctx.fillRect(x + 3, y + 8, 6, 2);
    ctx.fillStyle = '#ffd18b'; ctx.fillRect(x + 3, y + 4, 2, 2);
    ctx.fillStyle = '#9acb4b'; ctx.fillRect(x + 6, y + 1, 3, 2);
  }
  for (let i = model.body.length - 1; i >= 0; i--) {
    const cell = model.body[i], x = offset + cell.x * size, y = cell.y * size;
    ctx.fillStyle = i === 0 && !model.alive ? '#cb5849' : '#65a83c';
    const previous = model.body[i + 1];
    if (previous) {
      if (previous.x !== cell.x) ctx.fillRect(Math.min(x, offset + previous.x * size) + 5, y + 3, 14, 6);
      else ctx.fillRect(x + 3, Math.min(y, previous.y * size) + 5, 6, 14);
    }
    ctx.fillRect(x + 1, y + 1, 10, 10);
    ctx.fillStyle = i === 0 && !model.alive ? '#f38b6c' : i === 0 ? '#c2e66c' : '#94ce4b';
    ctx.fillRect(x + 2, y + 2, 8, 6);
    if (i === 0) {
      ctx.fillStyle = '#17291e';
      const eyes = model.direction === 'right' ? [[8, 3], [8, 8]] : model.direction === 'left' ? [[2, 3], [2, 8]] : model.direction === 'up' ? [[3, 2], [8, 2]] : [[3, 8], [8, 8]];
      for (const [ex, ey] of eyes) ctx.fillRect(x + ex, y + ey, 2, 2);
    }
  }
}
