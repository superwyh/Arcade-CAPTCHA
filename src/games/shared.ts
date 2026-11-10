export const tetrominoColors = ['#000000', '#32cddd', '#f4d849', '#ad5cdb', '#56c85b', '#ed5358', '#4e72df', '#ee963f'];

export function pixelBlock(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, color: string) {
  x = Math.round(x); y = Math.round(y);
  ctx.fillStyle = color; ctx.fillRect(x, y, width, height);
  ctx.fillStyle = '#ffffff55'; ctx.fillRect(x, y, width, 2); ctx.fillRect(x, y, 2, height);
  ctx.fillStyle = '#00000040'; ctx.fillRect(x, y + height - 2, width, 2); ctx.fillRect(x + width - 2, y, 2, height);
}

export function pixelIcon(rows: readonly string[], colors: Record<string, string>) {
  const pixels = rows.flatMap((row, y) => [...row].flatMap((value, x) => colors[value] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${colors[value]}"/>` : []));
  return `<svg viewBox="0 0 8 8" width="16" height="16" aria-hidden="true" shape-rendering="crispEdges">${pixels.join('')}</svg>`;
}

export function canvasSurface(surface: HTMLElement, width = 268, height = 192) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  canvas.setAttribute('role', 'img');
  surface.append(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('此浏览器不支持 Canvas 2D。');
  ctx.imageSmoothingEnabled = false;
  return { canvas, ctx, width, height };
}

export function animationLoop(tick: (delta: number) => void) {
  let handle = 0;
  let last = 0;
  let active = false;
  const frame = (time: number) => {
    if (!active) return;
    const delta = last ? Math.min(time - last, 40) : 0;
    last = time;
    tick(delta);
    if (active) handle = requestAnimationFrame(frame);
  };
  const start = () => { if (!active) { active = true; last = 0; handle = requestAnimationFrame(frame); } };
  const stop = () => { active = false; cancelAnimationFrame(handle); };
  return { start, stop };
}

export function listenForSwipe(element: HTMLElement, callback: (direction: 'left' | 'right' | 'up' | 'down') => void) {
  let start: { x: number; y: number } | undefined;
  const down = (event: PointerEvent) => {
    start = { x: event.clientX, y: event.clientY };
    element.setPointerCapture?.(event.pointerId);
  };
  const up = (event: PointerEvent) => {
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    start = undefined;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    callback(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };
  const cancel = () => { start = undefined; };
  element.addEventListener('pointerdown', down);
  element.addEventListener('pointerup', up);
  element.addEventListener('pointercancel', cancel);
  return () => {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('pointerup', up);
    element.removeEventListener('pointercancel', cancel);
  };
}
