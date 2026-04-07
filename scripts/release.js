import path from 'path';
import { fileURLToPath } from 'url';
import cac from 'cac';
import { $ } from 'execa';
import fs from 'fs-extra';

let cli = cac('release');
cli.option(
  '--dry-run <run>',
  'Perform a dry run without publishing or pushing tags',
  {
    default: 'false',
  },
);
cli.option('--tag <tag>', 'The npm tag to publish under (default: canary)', {
  default: 'canary',
});

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PKG_PATH = path.resolve(__dirname, '../package.json');
const pkg = fs.readJsonSync(PKG_PATH);
const publishVersion = pkg.version;

const parsed = cli.parse();
const npmTag = parsed.options.tag;
const isDryRun = parsed.options.dryRun === 'true';

const allowedTags = ['latest', 'canary', 'alpha', 'beta', 'rc', 'nightly'];
if (!allowedTags.includes(npmTag)) {
  throw new Error(
    `Invalid npm tag: ${npmTag}. Allowed tags: ${allowedTags.join(', ')}`,
  );
}

const prereleaseTags = ['alpha', 'beta', 'rc', 'canary', 'nightly'];
if (
  npmTag === 'latest' &&
  prereleaseTags.some((tag) => publishVersion.includes(tag))
) {
  throw Error(`Can't release ${publishVersion} to latest tag`);
}

console.info(
  `Release ${npmTag} version ${publishVersion}${isDryRun ? '(dry-run)' : ''}`,
);

try {
  const flags = isDryRun
    ? ['--dry-run', `--tag`, npmTag, `--no-git-checks`]
    : [`--tag`, npmTag, `--no-git-checks`];
  await $`pnpm publish ${flags}`;
  console.info(`Published successfully`);
} catch (e) {
  console.error(`Publish failed: ${e.message}`);
  process.exit(1);
}

// Push tag to GitHub
if (!isDryRun) {
  console.info(`Pushing tag to github`);
  const tagName = `v${publishVersion}`;
  try {
    await $`git config --global --add safe.directory /github/workspace`;
    await $`git config --global user.name "github-actions[bot]"`;
    await $`git config --global user.email "github-actions[bot]@users.noreply.github.com"`;
    await $`git status`;
    await $`git tag ${tagName}`;
    await $`git push origin ${tagName}`;
    console.info(`Pushed tag successfully`);
  } catch (e) {
    console.error(`Push tag failed: ${e.message}`);
    process.exit(1);
  }
}

console.info(`Release completed`);
