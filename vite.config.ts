import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Pixel Canvas Helper',
        namespace: 'https://pixmap.fun/',
        version: '1.0.0',
        description: 'Canvas enhancement utilities',
        author: 'Anonymous',
        match: ['https://pixmap.fun/*', 'https://pixelplanet.fun/*', 'https://pixunivers.fun/*'],
        icon: 'https://briocheis.cool/logo.png',
        grant: 'none',
        'run-at': 'document-start',
      },
      build: {
        fileName: 'ppf-bot.user.js',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    minify: true,
  },
});
