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
  css?: string;
};

type CompilationResult = {
  error: Error | null;
  stats: Stats;
  outputs: Outputs;
  plugin: ReactRefreshRspackPlugin;
};

const uniqueName = 'ReactRefreshLibrary';
const readOutput = (fixturePath: string, file: string) =>
  fs.existsSync(path.join(fixturePath, 'dist', file))
    ? fs.readFileSync(path.join(fixturePath, 'dist', file), 'utf-8')
    : '';

const compileWithReactRefresh = (
  fixturePath: string,
  refreshOptions: PluginOptions,
): Promise<CompilationResult> =>
  new Promise((resolve, reject) => {
    const dist = path.join(fixturePath, 'dist');
    const cjsEntry = path.join(fixturePath, 'index.js');
    const ctsEntry = path.join(fixturePath, 'index.cjs');
    const mjsEntry = path.join(fixturePath, 'index.mjs');
    const customLoader = fs.existsSync(path.join(fixturePath, 'loader.cjs'))
      ? path.join(fixturePath, 'loader.cjs')
      : path.join(import.meta.dirname, 'fixtures/loader/loader.cjs');
    const entry = fs.existsSync(cjsEntry)
      ? cjsEntry
      : fs.existsSync(ctsEntry)
        ? ctsEntry
        : mjsEntry;
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
        module: {
          rules: [
            {
              test: /\.css$/,
              type: 'css/auto',
            },
          ],
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
                test: /[\\/](react-refresh|rspack-plugin-react-refresh\/client)[\\/]/,
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
        if (error) {
          reject(error);
          return;
        }

        assert(stats, 'stats is not defined');
        const statsJson = stats.toJson({ all: true });

        if (statsJson.errors!.length > 0) {
          reject(
            new Error(
              `Compilation errors:\n${JSON.stringify(statsJson.errors, null, 2)}`,
            ),
          );
          return;
        }

        if (statsJson.warnings!.length > 0) {
          reject(
            new Error(
              `Compilation warnings:\n${JSON.stringify(statsJson.warnings, null, 2)}`,
            ),
          );
          return;
        }

        resolve({
          error,
          stats,
          outputs: {
            reactRefresh: readOutput(fixturePath, 'react-refresh.js'),
            fixture: readOutput(fixturePath, 'fixture.js'),
            runtime: readOutput(fixturePath, 'runtime.js'),
            vendor: readOutput(fixturePath, 'vendor.js'),
            css: readOutput(fixturePath, 'fixture.css') || undefined,
          },
          plugin,
        });
      },
    );
  });

describe('react-refresh-rspack-plugin', () => {
  it('should exclude node_modules when compiling with default options', async () => {
    const {
      outputs: { vendor },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/default'),
      {},
    );
    expect(vendor).not.toContain('function $RefreshReg$');
  });

  it('should include non node_modules when compiling with default options', async () => {
    const {
      outputs: { fixture },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/default'),
      {},
    );
    expect(fixture).toContain('function $RefreshReg$');
  });

  it('should add library to make sure work in Micro-Frontend', async () => {
    const {
      outputs: { reactRefresh },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/default'),
      {},
    );
    expect(reactRefresh).toContain(uniqueName);
  });

  it('should test selected file when compiling', async () => {
    const {
      outputs: { vendor },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        exclude: null,
        test: path.join(import.meta.dirname, 'fixtures/node_modules/foo'),
        include: null,
      },
    );
    expect(vendor).toContain('function $RefreshReg$');
  });

  it('should include selected file when compiling', async () => {
    const {
      outputs: { vendor },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        exclude: null,
        include: path.join(import.meta.dirname, 'fixtures/node_modules/foo'),
      },
    );
    expect(vendor).toContain('function $RefreshReg$');
  });

  it('should exclude selected file when compiling', async () => {
    const {
      outputs: { fixture },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        exclude: path.join(import.meta.dirname, 'fixtures/custom/index.js'),
      },
    );
    expect(fixture).not.toContain('function $RefreshReg$');
  });

  it('should exclude selected file via `resourceQuery` when compiling', async () => {
    const {
      outputs: { vendor },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/query'),
      {
        resourceQuery: { not: /raw/ },
      },
    );
    expect(vendor).not.toContain('function $RefreshReg$');
  });

  it('should exclude url dependency when compiling', async () => {
    const { stats } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/url'),
      {},
    );
    const json = stats.toJson({ all: false, outputPath: true });
    const asset = fs.readFileSync(
      path.resolve(json.outputPath!, 'sdk.js'),
      'utf-8',
    );
    expect(asset).not.toContain('function $RefreshReg$');
  });

  it('should allow custom inject loader when compiling', async () => {
    const {
      outputs: { fixture },
      plugin,
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        injectLoader: false,
      },
    );
    expect(plugin.options.reactRefreshLoader).toBe(
      'builtin:react-refresh-loader',
    );
    expect(fixture).not.toContain('function $RefreshReg$');
  });

  it('should allow custom inject entry when compiling', async () => {
    const {
      outputs: { reactRefresh },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        injectEntry: false,
      },
    );
    expect(reactRefresh).not.toContain('injectIntoGlobalHook(safeThis)');
  });

  it('should always exclude react-refresh related modules', async () => {
    const {
      outputs: { reactRefresh },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/custom'),
      {
        exclude: null,
      },
    );
    expect(reactRefresh).not.toContain('function $RefreshReg$');
  });

  it('should instrument the module with builtin:react-refresh-loader', async () => {
    const {
      outputs: { fixture },
      plugin,
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/loader'),
      {},
    );
    expect(plugin.options.reactRefreshLoader).toBe(
      'builtin:react-refresh-loader',
    );
    expect(fixture).not.toContain('TEST_LOADER');
    expect(fixture).toContain('function $RefreshReg$');
  });

  it('should instrument the module with the custom loader', async () => {
    const {
      outputs: { fixture },
      plugin,
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/loader'),
      {
        reactRefreshLoader: 'custom-react-refresh-loader',
      },
    );
    expect(plugin.options.reactRefreshLoader).toBe(
      'custom-react-refresh-loader',
    );
    expect(fixture).toContain('TEST_LOADER');
    expect(fixture).not.toContain('function $RefreshReg$');
  });

  it('should keep the default extension filter when include targets a directory', async () => {
    const {
      outputs: { fixture, css },
    } = await compileWithReactRefresh(
      path.join(import.meta.dirname, 'fixtures/include'),
      {
        include: path.join(import.meta.dirname, 'fixtures/include'),
        reactRefreshLoader: 'custom-react-refresh-loader',
      },
    );
    expect(fixture).toContain('TEST_LOADER');
    expect(css).toBeDefined();
    expect(css).not.toContain('TEST_LOADER');
  });
});
