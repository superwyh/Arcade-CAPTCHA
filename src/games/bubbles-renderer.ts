import { BubblesModel, bubbleCenter, BUBBLE_LIMIT, BUBBLE_ORIGIN, BUBBLE_MISS_LIMIT } from './bubbles-model';

const colors = [
  ['#ff5a65', '#a72743', '#ffb7ab'], ['#4ca6ef', '#245494', '#a1dcff'],
  ['#f5cf48', '#ab7a25', '#fff0a1'], ['#64cc72', '#32854c', '#b6f2a0'],
];
export function renderBubbles(ctx: CanvasRenderingContext2D, model: BubblesModel) {
  const rect = (color: string, x: number, y: number, w: number, h: number) => { ctx.fillStyle = color; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const bubble = (x: number, y: number, color: number) => {
    x = Math.round(x); y = Math.round(y); const [fill, shade, light] = colors[color];
    rect(shade, x - 5, y - 9, 10, 18); rect(shade, x - 9, y - 5, 18, 10); rect(shade, x - 7, y - 7, 14, 14);
    rect(fill, x - 5, y - 7, 10, 12); rect(fill, x - 7, y - 5, 12, 10);
    rect(light, x - 4, y - 5, 4, 2); rect(light, x - 5, y - 3, 2, 2);
    // Shapes distinguish bubbles as well as colors.
    if (color === 0) rect(shade, x, y, 3, 3);
    else if (color === 1) { rect(shade, x - 1, y, 2, 4); rect(shade, x + 2, y, 2, 4); }
    else if (color === 2) { rect(shade, x - 1, y, 5, 2); rect(shade, x + 1, y - 2, 2, 6); }
    else { rect(shade, x - 1, y + 1, 3, 2); rect(shade, x + 1, y - 1, 3, 2); }
  };
  ctx.imageSmoothingEnabled = false;
  rect('#171c2c', 0, 0, 268, 192);
  rect('#344258', 12, 0, 5, 192); rect('#607187', 12, 0, 2, 192);
  rect('#344258', 251, 0, 5, 192); rect('#607187', 254, 0, 2, 192);
  const ceiling = Math.round(model.ceiling);
  rect('#29364c', 17, 0, 234, ceiling + 3); rect('#8796a4', 17, ceiling + 1, 234, 2);
  for (let x = 20; x < 250; x += 10) rect('#955364', x, BUBBLE_LIMIT, 4, 1);
  if (model.ready) {
    const trace = model.trace(); let carry = 5;
    for (let i = 1; i < trace.points.length; i++) {
      const a = trace.points[i - 1], b = trace.points[i], length = Math.hypot(b.x - a.x, b.y - a.y);
      for (; carry < length; carry += 9) rect('#a3abb7', a.x + (b.x - a.x) * carry / length - 1, a.y + (b.y - a.y) * carry / length - 1, 2, 2);
      carry -= length;
    }
    if (trace.cell) {
      const center = bubbleCenter(trace.cell, model.ceiling);
      ctx.globalAlpha = .28; bubble(center.x, center.y, model.current); ctx.globalAlpha = 1;
    }
  }
  for (const cell of model.bubbles.values()) { const center = bubbleCenter(cell, model.ceiling); bubble(center.x, center.y, cell.color); }
  for (const particle of model.particles) {
    if (particle.falling) bubble(particle.x, particle.y, particle.color);
    else rect(colors[particle.color][0], particle.x, particle.y, 3, 3);
  }
  if (model.shot) bubble(model.shot.x, model.shot.y, model.shot.color);
  for (let d = 22; d >= 5; d -= 3) {
    const x = BUBBLE_ORIGIN.x + Math.sin(model.angle) * d, y = BUBBLE_ORIGIN.y - Math.cos(model.angle) * d;
    rect('#8293a8', x - 3, y - 3, 6, 6); rect('#b5c4ce', x - 2, y - 3, 2, 3);
  }
  rect('#4b5e78', 118, 176, 32, 9); rect('#9babbc', 120, 184, 28, 3);
  if (!model.shot) bubble(BUBBLE_ORIGIN.x, BUBBLE_ORIGIN.y, model.current);
  bubble(183, 177, model.next);
  rect('#8492a5', 163, 177, 7, 2); rect('#8492a5', 163, 175, 2, 6);
  for (let i = 0; i < BUBBLE_MISS_LIMIT; i++) rect(i < BUBBLE_MISS_LIMIT - model.misses ? '#95a6b7' : '#384357', 29 + i * 9, 178, 5, 4);
}
