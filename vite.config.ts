import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import monkey, { cdn } from 'vite-plugin-monkey';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    open: false,
  },
  plugins: [
    preact(),
    monkey({
      entry: 'src/main.tsx',
      userscript: {
        name: 'FC SBC Enhanced Builder',
        namespace: 'fc-sbc-builder',
        match: [
          'https://www.ea.com/ea-sports-fc/ultimate-team/web-app/*',
          'https://www.ea.com/*/ea-sports-fc/ultimate-team/web-app/*',
        ],
        runAt: 'document-end',
        grant: ['unsafeWindow', 'GM_xmlhttpRequest'],
        updateURL: 'https://github.com/tomwang2011/fc-sbc/raw/main/dist/fc-sbc.user.js',
        downloadURL: 'https://github.com/tomwang2011/fc-sbc/raw/main/dist/fc-sbc.user.js',
        author: 'tomwang',
        description: 'Optimal SBC builder with Storage-First priority',
      },
      build: {
        // Disable CDN for now to ensure everything is bundled and bypass CSP
        externalGlobals: {},
      },
    }),
  ],
});
