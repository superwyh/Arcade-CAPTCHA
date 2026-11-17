import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { PNG } from 'pngjs';

const atlases = [
  ['adventure-hero', 128, 128], ['adventure-dungeon', 128, 128],
  ['racing-atlas', 192, 96], ['space-atlas', 192, 96],
];
await mkdir(new URL('../src/assets/runtime/', import.meta.url), { recursive: true });
for (const [name, width, height] of atlases) {
  const source = PNG.sync.read(await readFile(new URL(`../src/assets/${name}.png`, import.meta.url)));
  const atlas = new PNG({ width, height });
  // Match Canvas nearest-neighbor sampling at the destination pixel centers.
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const sx = Math.floor((x + .5) * source.width / width), sy = Math.floor((y + .5) * source.height / height);
    source.data.copy(atlas.data, (y * width + x) * 4, (sy * source.width + sx) * 4, (sy * source.width + sx + 1) * 4);
  }
  const bytes = PNG.sync.write(atlas, { colorType: 6 });
  const path = new URL(`../src/assets/runtime/${name}.png`, import.meta.url);
  const previous = await readFile(path).catch(() => undefined);
  if (!previous?.equals(bytes)) await writeFile(path, bytes);
  console.log(`${name}: ${source.width}×${source.height} → ${width}×${height}, ${bytes.length} bytes`);
}
