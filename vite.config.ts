import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'PPF-Bot',
        namespace: 'https://pixmap.fun/ https://pixelplanet.fun/ https://pixunivers.fun/',
        version: '1.0.0',
        description: 'Automated pixel placement bot for pixmap.fun, pixelplanet.fun and pixunivers.fun',
        author: 'PPF-Bot',
        match: ['https://pixmap.fun/*', 'https://pixelplanet.fun/*', 'https://pixunivers.fun/*'],
        icon: 'https://briocheis.cool/logo.png',
        grant: ['unsafeWindow'],
        'run-at': 'document-start',
      },
      build: {
        fileName: 'ppf-bot.user.js',
      },
    }),
  ],
  build: {
    outDir: 'dist',
    minify: false,
  },
});
