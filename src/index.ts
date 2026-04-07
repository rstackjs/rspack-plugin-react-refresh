import type { Compiler } from '@rspack/core';
import { normalizeOptions } from './options.js';
import type { NormalizedPluginOptions, PluginOptions } from './options.js';
import {
  getRefreshRuntimeDirPath,
  getRefreshRuntimePaths,
  reactRefreshEntryPath,
  reactRefreshPath,
  refreshUtilsPath,
} from './paths.js';

export type { PluginOptions };

function addEntry(entry: string, compiler: Compiler) {
  new compiler.rspack.EntryPlugin(compiler.context, entry, {
    name: undefined,
  }).apply(compiler);
}

const PLUGIN_NAME = 'ReactRefreshRspackPlugin';

class ReactRefreshRspackPlugin {
  options: NormalizedPluginOptions;

  /**
   * @deprecated
   */
  static get deprecated_runtimePaths() {
    return getRefreshRuntimePaths();
  }

  constructor(options: PluginOptions = {}) {
    this.options = normalizeOptions(options);
  }

  apply(compiler: Compiler) {
    if (
      // Webpack do not set process.env.NODE_ENV, so we need to check for mode.
      // Ref: https://github.com/webpack/webpack/issues/7074
      (compiler.options.mode !== 'development' ||
        // We also check for production process.env.NODE_ENV,
        // in case it was set and mode is non-development (e.g. 'none')
        (process.env.NODE_ENV && process.env.NODE_ENV === 'production')) &&
      !this.options.forceEnable
    ) {
      return;
    }

    if (this.options.injectEntry) {
      addEntry(reactRefreshEntryPath, compiler);
    }

    new compiler.rspack.ProvidePlugin({
      $ReactRefreshRuntime$: reactRefreshPath,
    }).apply(compiler);

    if (this.options.injectLoader) {
      compiler.options.module.rules.unshift({
        test: this.options.test,
        // biome-ignore lint: exists
        include: this.options.include!,
        exclude: {
          // biome-ignore lint: exists
          or: [this.options.exclude!, [...getRefreshRuntimePaths()]].filter(
            Boolean,
          ),
        },
        resourceQuery: this.options.resourceQuery,
        dependency: {
          // Assets loaded via `new URL("static/sdk.js", import.meta.url)` are asset modules
          // React Refresh should not be injected for asset modules as they are static resources
          not: ['url'],
        },
        use: this.options.reactRefreshLoader,
      });
    }

    const definedModules: Record<string, string | boolean> = {
      // For Multiple Instance Mode
      __react_refresh_library__: JSON.stringify(
        compiler.rspack.Template.toIdentifier(
          this.options.library ||
            compiler.options.output.uniqueName ||
            compiler.options.output.library,
        ),
      ),
      __reload_on_runtime_errors__: this.options.reloadOnRuntimeErrors,
    };
    const providedModules: Record<string, string> = {
      __react_refresh_utils__: refreshUtilsPath,
    };
    new compiler.rspack.DefinePlugin(definedModules).apply(compiler);
    new compiler.rspack.ProvidePlugin(providedModules).apply(compiler);

    compiler.options.resolve.alias = {
      'react-refresh': getRefreshRuntimeDirPath(),
      ...compiler.options.resolve.alias,
    };

    compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.additionalTreeRuntimeRequirements.tap(
        PLUGIN_NAME,
        (_, runtimeRequirements) => {
          runtimeRequirements.add(compiler.rspack.RuntimeGlobals.moduleCache);
        },
      );
    });
  }
}

export { ReactRefreshRspackPlugin };
