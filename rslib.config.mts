import { defineConfig } from '@rslib/core';

export default defineConfig({
  lib: [
    {
      format: 'cjs',
      bundle: true,
      dts: true,
      source: {
        tsconfigPath: './tsconfig.build.json',
      },
    },
  ],
});
