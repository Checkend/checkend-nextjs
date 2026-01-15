import { defineConfig } from 'tsup'

export default defineConfig({
  entry: [
    'src/index.ts',
    'src/client.ts',
    'src/server.ts',
    'src/edge.ts',
    'src/testing.ts',
  ],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  external: ['react', 'next', '@checkend/browser', '@checkend/node'],
  esbuildOptions(options) {
    options.banner = {
      js: '"use client";',
    }
  },
})
