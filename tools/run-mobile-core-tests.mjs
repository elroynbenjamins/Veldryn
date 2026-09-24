import {spawnSync} from 'node:child_process';
import {readFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'apps/mobile');
const build = path.join(app, '.core-build');
const tests = JSON.parse(readFileSync(new URL('./mobile-core-tests.json', import.meta.url), 'utf8'));

function run(args) {
  const result = spawnSync(process.execPath, args, {cwd: app, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Separate processes avoid Windows' shell command-length limit while preserving
// the existing test order, clean compilation, and fail-fast behavior.
rmSync(build, {recursive: true, force: true});
run([path.join(app, 'node_modules/typescript/bin/tsc'), '-p', 'tsconfig.core.json', '--outDir', build]);
for (const test of tests) run([path.resolve(app, test)]);
console.log(`PASS: all ${tests.length} mobile core checks`);
