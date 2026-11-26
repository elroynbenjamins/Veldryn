import {spawnSync} from 'node:child_process';
import {readFileSync, rmSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const app = path.join(root, 'apps/mobile');
const build = path.join(app, '.core-build');
const tests = JSON.parse(readFileSync(new URL('./mobile-core-tests.json', import.meta.url), 'utf8'));

// Full validation remains the default. For quicker iterations, select tests by
// one or more case-insensitive path fragments, e.g. --match dungeon --match gem.
// --list previews the selection without compiling or executing any tests.
const filters = [];
let listOnly = false;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i += 1) {
  if (args[i] === '--list') {
    listOnly = true;
  } else if (args[i] === '--match') {
    const value = args[++i]?.trim().toLowerCase();
    if (!value || value.startsWith('--')) {
      console.error('--match requires a nonempty test-path fragment');
      process.exit(2);
    }
    filters.push(value);
  } else if (args[i] === '--help') {
    console.log('Usage: node tools/run-mobile-core-tests.mjs [--list] [--match fragment ...]');
    process.exit(0);
  } else {
    console.error(`Unknown argument: ${args[i]}`);
    process.exit(2);
  }
}
const selected = filters.length
  ? tests.filter((test) => filters.some((fragment) => test.toLowerCase().includes(fragment)))
  : tests;
if (selected.length === 0) {
  console.error(`No mobile core checks match: ${filters.join(', ')}`);
  process.exit(2);
}
if (listOnly) {
  console.log(selected.join('\n'));
  console.log(`Selected ${selected.length}/${tests.length} mobile core checks`);
  process.exit(0);
}

function run(args) {
  const result = spawnSync(process.execPath, args, {cwd: app, stdio: 'inherit', windowsHide: true});
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Isolated test processes avoid Windows' shell command-length limit.
// Compile fail-fast; after compilation, collect *all* selected test failures.
// Never reuse a stale .core-build in CI or normal local test runs.
const started = Date.now();
rmSync(build, {recursive: true, force: true});
run([path.join(app, 'node_modules/typescript/lib/tsc.js'), '-p', 'tsconfig.core.json', '--outDir', build]);
const compiledIn = Date.now() - started;
const failed = [];
const timings = [];
console.log(`Running ${selected.length}/${tests.length} mobile core checks`);
for (const test of selected) {
  const testStarted = Date.now();
  const result = spawnSync(process.execPath, [path.resolve(app, test)], {cwd: app, stdio: 'inherit', windowsHide: true});
  timings.push({test, ms: Date.now() - testStarted});
  if (result.error || result.status !== 0) {
    failed.push(test);
    console.error(`FAIL: ${test} (exit ${result.status ?? 'unknown'})`);
  }
}
const slowest = timings.slice().sort((a, b) => b.ms - a.ms).slice(0, 5);
console.log(`Timings: compile ${(compiledIn / 1000).toFixed(1)}s; total ${((Date.now() - started) / 1000).toFixed(1)}s`);
console.log('Slowest selected checks: ' + slowest.map((x) => `${x.test} ${(x.ms / 1000).toFixed(1)}s`).join(' | '));
if (failed.length) {
  console.error(`FAILED: ${failed.length}/${selected.length} selected mobile core checks:\n${failed.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: all ${selected.length}${filters.length ? `/${tests.length} selected` : ''} mobile core checks`);
}
