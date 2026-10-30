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

// Isolated test processes avoid Windows' shell command-length limit.
// Compile fail-fast; after compilation, collect *all* test failures so release
// validation reports every regression instead of one at a time.
rmSync(build, {recursive: true, force: true});
// Use TypeScript's JS entrypoint so this runner works on Windows.
run([path.join(app, 'node_modules/typescript/lib/tsc.js'), '-p', 'tsconfig.core.json', '--outDir', build]);
const failed = [];
for (const test of tests) {
  const result = spawnSync(process.execPath, [path.resolve(app, test)], {cwd: app, stdio: 'inherit', windowsHide: true});
  if (result.error || result.status !== 0) {
    failed.push(test);
    console.error(`FAIL: ${test} (exit ${result.status ?? 'unknown'})`);
  }
}
if (failed.length) {
  console.error(`FAILED: ${failed.length}/${tests.length} mobile core checks:\n${failed.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: all ${tests.length} mobile core checks`);
}
