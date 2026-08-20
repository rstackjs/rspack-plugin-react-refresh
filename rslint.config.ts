import { defineConfig, globals, js, ts } from '@rslint/core';

export default defineConfig([
  js.configs.recommended,
  ts.configs.recommended,
  {
    files: ['client/**/*', 'test/fixtures/url/**/*.mjs'],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    files: ['client/reactRefresh.js'],
    languageOptions: {
      globals: {
        __react_refresh_test__: 'readonly',
      },
    },
  },
  {
    files: ['client/reactRefreshEntry.js'],
    languageOptions: {
      globals: {
        ...globals.rspack,
        __react_refresh_library__: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    files: ['client/refreshUtils.js'],
    languageOptions: {
      globals: {
        __reload_on_runtime_errors__: 'readonly',
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
