import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { type Stats, rspack } from '@rspack/core';
import {
  type PluginOptions,
  ReactRefreshRspackPlugin,
} from '@rspack/plugin-react-refresh';

type Outputs = {
  reactRefresh: string;
  fixture: string;
  runtime: string;
  vendor: string;
};

type CompilationCallback = (
  error: Error | null,
  stats: Stats | undefined,
  outputs: Outputs,
  plugin: ReactRefreshRspackPlugin,
) => void;

const uniqueName = 'ReactRefreshLibrary';

const compileWithReactRefresh = (
  fixturePath: string,
  refreshOptions: PluginOptions,
  callback: CompilationCallback,
) => {
  const dist = path.join(fixturePath, 'dist');
  const cjsEntry = path.join(fixturePath, 'index.js');
  const mjsEntry = path.join(fixturePath, 'index.mjs');
  const customLoader = path.join(fixturePath, 'loader.js');
  const entry = fs.existsSync(cjsEntry) ? cjsEntry : mjsEntry;
  const plugin = new ReactRefreshRspackPlugin(refreshOptions);
  rspack(
    {
      mode: 'development',
      context: fixturePath,
      entry: {
        fixture: entry,
      },
      output: {
        path: dist,
        uniqueName,
        assetModuleFilename: '[name][ext]',
      },
      resolveLoader: {
        alias: {
          'custom-react-refresh-loader': customLoader,
        },
      },
      plugins: [plugin],
      optimization: {
        runtimeChunk: {
          name: 'runtime',
        },
        splitChunks: {
          cacheGroups: {
            reactRefresh: {
              test: /[\\/](react-refresh|rspack-plugin-react-refresh\/client|react-refresh-webpack-plugin)[\\/]/,
              name: 'react-refresh',
              chunks: 'all',
              priority: -1000,
            },
            foo: {
              test: /[\\/]foo/,
              name: 'vendor',
              chunks: 'all',
              priority: -500,
              enforce: true,
            },
          },
        },
      },
    },
    (error, stats) => {
      expect(error).toBeFalsy();
      assert(stats, 'stats is not defined');
      const statsJson = stats.toJson({ all: true });
      expect(statsJson.errors).toHaveLength(0);
      expect(statsJson.warnings).toHaveLength(0);
      callback(
        error,
        stats,
        {
          reactRefresh: fs.readFileSync(
            path.join(fixturePath, 'dist', 'react-refresh.js'),
            'utf-8',
          ),
          fixture: fs.readFileSync(
            path.join(fixturePath, 'dist', 'fixture.js'),
            'utf-8',
          ),
          runtime: fs.readFileSync(
            path.join(fixturePath, 'dist', 'runtime.js'),
            'utf-8',
          ),
          vendor: fs.readFileSync(
            path.join(fixturePath, 'dist', 'vendor.js'),
            'utf-8',
          ),
        },
        plugin,
      );
    },
  );
};

describe('react-refresh-rspack-plugin', () => {
  it('should exclude node_modules when compiling with default options', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/default'),
        {},
        (_, __, { vendor }) => {
          expect(vendor).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should include non node_modules when compiling with default options', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/default'),
        {},
        (_, __, { fixture }) => {
          expect(fixture).toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should add library to make sure work in Micro-Frontend', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/default'),
        {},
        (_, __, { reactRefresh }) => {
          expect(reactRefresh).toContain(uniqueName);
          done();
        },
      );
    });
  });

  it('should test selected file when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          exclude: null,
          test: path.join(__dirname, 'fixtures/node_modules/foo'),
          include: null,
        },
        (_, __, { vendor }) => {
          expect(vendor).toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should include selected file when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          exclude: null,
          include: path.join(__dirname, 'fixtures/node_modules/foo'),
        },
        (_, __, { vendor }) => {
          expect(vendor).toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should exclude selected file when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          exclude: path.join(__dirname, 'fixtures/custom/index.js'),
        },
        (_, __, { fixture }) => {
          expect(fixture).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should exclude selected file via `resourceQuery` when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/query'),
        {
          resourceQuery: { not: /raw/ },
        },
        (_, __, { vendor }) => {
          expect(vendor).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should exclude url dependency when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/url'),
        {},
        (_, stats) => {
          const json = stats!.toJson({ all: false, outputPath: true });
          const asset = fs.readFileSync(
            path.resolve(json.outputPath!, 'sdk.js'),
            'utf-8',
          );
          expect(asset).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should allow custom inject loader when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          injectLoader: false,
        },
        (_, __, { fixture }, pl) => {
          expect(pl.options.reactRefreshLoader).toBe(
            'builtin:react-refresh-loader',
          );
          expect(fixture).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should allow custom inject entry when compiling', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          injectEntry: false,
        },
        (_, __, { reactRefresh }) => {
          expect(reactRefresh).not.toContain(
            'RefreshRuntime.injectIntoGlobalHook(safeThis)',
          );
          done();
        },
      );
    });
  });

  it('should always exclude react-refresh related modules', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/custom'),
        {
          exclude: null,
        },
        (_, __, { reactRefresh }) => {
          expect(reactRefresh).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should instrument the module with builtin:react-refresh-loader', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/loader'),
        {},
        (_, __, { fixture }, pl) => {
          expect(pl.options.reactRefreshLoader).toBe(
            'builtin:react-refresh-loader',
          );
          expect(fixture).not.toContain('TEST_LOADER');
          expect(fixture).toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });

  it('should instrument the module with the custom loader', () => {
    return new Promise<void>((done) => {
      compileWithReactRefresh(
        path.join(__dirname, 'fixtures/loader'),
        {
          reactRefreshLoader: 'custom-react-refresh-loader',
        },
        (_, __, { fixture }, pl) => {
          expect(pl.options.reactRefreshLoader).toBe(
            'custom-react-refresh-loader',
          );
          expect(fixture).toContain('TEST_LOADER');
          expect(fixture).not.toContain('function $RefreshReg$');
          done();
        },
      );
    });
  });
});
