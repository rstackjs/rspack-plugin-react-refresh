import { defineConfig, globals, js, ts } from '@rslint/core';

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['client/**/*', 'test/fixtures/url/**/*.mjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.rspack,
        __react_refresh_test__: 'readonly',
        __react_refresh_library__: 'readonly',
        __reload_on_runtime_errors__: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: globals.rstest,
    },
  },
]);
