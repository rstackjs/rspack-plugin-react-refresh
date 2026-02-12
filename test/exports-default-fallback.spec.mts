import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

test('esm wrapper supports default-only dist export shape', async () => {
  const tempDir = mkdtempSync(join(tmpdir(), 'react-refresh-export-wrapper-'));
  try {
    const wrapperSource = readFileSync('exports/index.mjs', 'utf8');
    const wrapperPath = join(tempDir, 'index.mjs');
    const fixturePath = join(tempDir, 'dist-fixture.mjs');
    const fixtureClassName = 'MockReactRefreshRspackPlugin';

    writeFileSync(
      fixturePath,
      `export default class ${fixtureClassName} {\n  constructor() {\n    this.options = { reactRefreshLoader: true };\n  }\n}\n`,
    );
    writeFileSync(
      wrapperPath,
      wrapperSource.replace('../dist/index.js', './dist-fixture.mjs'),
    );

    const mod = await import(pathToFileURL(wrapperPath).href);
    const instance = new mod.ReactRefreshRspackPlugin();

    expect(instance.options.reactRefreshLoader).toBeTruthy();
    expect(mod.default).toBe(mod.ReactRefreshRspackPlugin);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
});
