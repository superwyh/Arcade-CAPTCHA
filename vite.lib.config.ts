import { defineConfig } from 'vite';
const games = ['tetris', 'merge', 'minesweeper', 'breakout', 'fps', 'adventure', 'racing', 'snake', 'space', 'pacman', 'sokoban', 'bubbles'];
export default defineConfig(({ mode }) => ({
  publicDir: false,
  build: {
    outDir: 'lib',
    emptyOutDir: mode !== 'umd',
    lib: mode === 'umd'
      ? { entry: 'src/index.ts', name: 'ArcadeCaptcha', formats: ['umd'], fileName: () => 'arcade-captcha.umd.cjs', cssFileName: 'arcade-captcha' }
      : {
        entry: { index: 'src/index.ts', core: 'src/api.ts', ...Object.fromEntries(games.map(game => [`games/${game === 'merge' ? '2048' : game}`, `src/games/${game}.ts`])) },
        formats: ['es'], fileName: (_format, name) => name === 'index' ? 'arcade-captcha.js' : `${name}.js`, cssFileName: 'arcade-captcha',
      },
    rollupOptions: { output: { chunkFileNames: 'chunks/[name]-[hash].js' } },
  },
}));
