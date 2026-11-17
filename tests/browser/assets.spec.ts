import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

for (const [name, width, height] of [
  ['adventure-hero', 128, 128], ['adventure-dungeon', 128, 128],
  ['racing-atlas', 192, 96], ['space-atlas', 192, 96],
] as const) {
  test(`${name} preserves the rendered source pixels`, async ({ page }) => {
    const dataURL = async (path: string) => `data:image/png;base64,${(await readFile(path)).toString('base64')}`;
    const original = await dataURL(`src/assets/${name}.png`), runtime = await dataURL(`src/assets/runtime/${name}.png`);
    const mismatch = await page.evaluate(async ({ original, runtime, width, height }) => {
      async function pixels(src: string) {
        const image = new Image(); image.src = src; await image.decode();
        const decoded = document.createElement('canvas'); decoded.width = image.width; decoded.height = image.height;
        const source = decoded.getContext('2d', { willReadFrequently: true })!;
        source.drawImage(image, 0, 0);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
        ctx.imageSmoothingEnabled = false; ctx.drawImage(decoded, 0, 0, width, height);
        return ctx.getImageData(0, 0, width, height).data;
      }
      const [before, after] = await Promise.all([pixels(original), pixels(runtime)]);
      let changed = 0;
      for (let i = 0; i < before.length; i++) if (Math.abs(before[i] - after[i]) > 2) changed++;
      return changed;
    }, { original, runtime, width, height });
    expect(mismatch).toBe(0);
  });
}
