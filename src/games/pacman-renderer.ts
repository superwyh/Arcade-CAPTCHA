import { PACMAN_MAP, PACMAN_POWER_MS, mazePosition, type MazeActor, type PacmanModel } from './pacman-model';

const tile = 12, left = 8, top = 12;
const disk = ['00011111000', '00111111100', '01111111110', '11111111111', '11111111111', '11111111111', '11111111111', '11111111111', '01111111110', '00111111100', '00011111000'];
const ghostShape = ['00011111000', '00111111100', '01111111110', '11111111111', '11111111111', '11111111111', '11111111111', '11111111111', '11111111111', '11011111011', '10011011001'];

function pacman(ctx: CanvasRenderingContext2D, x: number, y: number, direction: MazeActor['direction'], mouth: number) {
  ctx.fillStyle = '#ffe600';
  for (let row = 0; row < 11; row++) for (let col = 0; col < 11; col++) {
    if (disk[row][col] !== '1') continue;
    const dx = col - 5, dy = row - 5;
    const forward = direction === 'right' ? dx : direction === 'left' ? -dx : direction === 'down' ? dy : -dy;
    const side = direction === 'right' || direction === 'left' ? dy : dx;
    if (forward >= 0 && Math.abs(side) <= forward * mouth) continue;
    ctx.fillRect(Math.round(x) + col - 5, Math.round(y) + row - 5, 1, 1);
  }
}

export function renderPacman(ctx: CanvasRenderingContext2D, model: PacmanModel) {
  ctx.fillStyle = '#03030b'; ctx.fillRect(0, 0, 268, 192);
  for (let y = 0; y < model.height; y++) for (let x = 0; x < model.width; x++) {
    const px = left + x * tile, py = top + y * tile;
    if (PACMAN_MAP[y][x] === '#') {
      ctx.fillStyle = '#080e32'; ctx.fillRect(px, py, tile, tile);
      ctx.fillStyle = '#304dff';
      if (y > 0 && PACMAN_MAP[y - 1][x] !== '#') ctx.fillRect(px, py + 1, tile, 1);
      if (y + 1 < model.height && PACMAN_MAP[y + 1][x] !== '#') ctx.fillRect(px, py + tile - 2, tile, 1);
      if (x > 0 && PACMAN_MAP[y][x - 1] !== '#') ctx.fillRect(px + 1, py, 1, tile);
      if (x + 1 < model.width && PACMAN_MAP[y][x + 1] !== '#') ctx.fillRect(px + tile - 2, py, 1, tile);
    } else if (model.pellets.has(y * model.width + x)) {
      const power = model.pellets.get(y * model.width + x);
      ctx.fillStyle = '#ffddb4';
      const size = power ? (Math.floor(model.elapsed / 180) % 2 ? 4 : 6) : 2;
      ctx.fillRect(px + (tile - size) / 2, py + (tile - size) / 2, size, size);
    }
  }
  ctx.fillStyle = '#ff9cce'; ctx.fillRect(left + 10 * tile, top + 5 * tile + 1, tile, 2);
  for (let life = 0; life < model.lives; life++) pacman(ctx, 13 + life * 14, 5, 'right', .7);
  if (model.powered > 0) {
    ctx.fillStyle = '#18295c'; ctx.fillRect(208, 4, 50, 4);
    ctx.fillStyle = '#58b6ff'; ctx.fillRect(208, 4, Math.ceil(50 * model.powered / PACMAN_POWER_MS), 4);
  }
  ctx.save(); ctx.beginPath(); ctx.rect(left, top, model.width * tile, model.height * tile); ctx.clip();
  const centers = (body: MazeActor) => {
    const p = mazePosition(body), x = left + p.x * tile + tile / 2, y = top + p.y * tile + tile / 2;
    return [{ x, y }, ...(p.x < .5 ? [{ x: x + model.width * tile, y }] : p.x > model.width - 1.5 ? [{ x: x - model.width * tile, y }] : [])];
  };
  for (const ghost of model.ghosts) for (const center of centers(ghost)) {
    const x = Math.round(center.x) - 5, y = Math.round(center.y) - 5;
    const frightened = model.powered > 0 && ghost.wait <= 0;
    ctx.fillStyle = frightened ? model.powered < 2000 && Math.floor(model.elapsed / 180) % 2 ? '#fff' : '#2445ee' : ghost.color;
    for (let row = 0; row < 11; row++) for (let col = 0; col < 11; col++) {
      if (ghostShape[row][col] === '1') ctx.fillRect(x + col, y + row, 1, 1);
    }
    ctx.fillStyle = frightened ? '#ffcfad' : '#fff';
    ctx.fillRect(x + 2, y + 3, 3, 3); ctx.fillRect(x + 7, y + 3, 3, 3);
    if (frightened) {
      ctx.fillRect(x + 2, y + 8, 2, 1); ctx.fillRect(x + 4, y + 7, 2, 1); ctx.fillRect(x + 6, y + 8, 2, 1);
    } else {
      ctx.fillStyle = '#102985';
      const dx = ghost.direction === 'left' ? 0 : ghost.direction === 'right' ? 2 : 1;
      const dy = ghost.direction === 'up' ? 0 : ghost.direction === 'down' ? 2 : 1;
      ctx.fillRect(x + 2 + dx, y + 3 + dy, 1, 1); ctx.fillRect(x + 7 + dx, y + 3 + dy, 1, 1);
    }
  }
  if (model.invulnerable <= 0 || Math.floor(model.elapsed / 120) % 2 === 0) {
    for (const center of centers(model.player)) pacman(ctx, center.x, center.y, model.player.direction, .2 + .65 * Math.abs(Math.sin(model.elapsed / 85)));
  }
  ctx.restore();
}
