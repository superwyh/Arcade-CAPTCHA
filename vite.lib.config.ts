import { defineConfig } from 'vite';
export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'lib',
    lib: { entry: 'src/index.ts', name: 'GameCaptcha', formats: ['es', 'umd'], fileName: (format) => format === 'es' ? 'game-captcha.js' : 'game-captcha.umd.cjs', cssFileName: 'game-captcha' },
  },
});
