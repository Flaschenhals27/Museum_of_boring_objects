// @ts-check
import { defineConfig } from 'astro/config';

import solidJs from '@astrojs/solid-js';

import node from '@astrojs/node';

import db from '@astrojs/db';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  integrations: [solidJs(), db()],

  adapter: node({
    mode: 'standalone'
  }),

  vite: {
    // Für Connection von externen Geräten, z.B. Handy.
    // Betrifft NUR den Dev-Server (astro dev) — der Production-Build
    // mit dem Node-Adapter nutzt diese Vite-Server-Config nicht.
    server: {
      allowedHosts: true
    }
  }
});