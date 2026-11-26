// Run existing backend test scripts with identical assertions but compile each
// TypeScript project at most once per CI job. Ordinary pnpm test:* commands stay
// unchanged for independent local use.
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const backend = path.join(root, 'backend');
const packageScripts = JSON.parse(readFileSync(path.join(backend, 'package.json'), 'utf8')).scripts;
const argumentsList = process.argv.slice(2);
const listOnly = argumentsList.includes('--list');
const names = argumentsList.filter((name) => name !== '--list');

if (!names.length || names.includes('--help')) {
  console.log('Usage: node tools/run-backend-test-batch.mjs [--list] test:release-gate test:live-pacing ...');
  process.exit(names.includes('--help') ? 0 : 2);
}

const plans = [];
for (const name of names) {
  if (!/^test:[a-z0-9-]+$/.test(name) || typeof packageScripts[name] !== 'string') {
    console.error(`Unknown backend test script: ${name}`);
    process.exit(2);
  }
  // The supported commands are the existing, fail-fast "tsc && node && node"
  // scripts only. Refuse anything with shell effects, env changes or unknown
  // tools rather than silently skipping validation.
  const commands = packageScripts[name].split(/\s*&&\s*/);
  const compile = commands.shift()?.match(/^tsc(?: -p ([a-zA-Z0-9._-]+))?$/);
  if (!compile || !commands.length) {
    console.error(`Unsupported batch script (expected tsc && node): ${name}`);
    process.exit(2);
  }
  const config = compile[1] ?? 'tsconfig.json';
  const tests = [];
  for (const command of commands) {
    const match = command.match(/^node (dist(?:-[a-z0-9-]+|\/[a-z0-9-]+)*\/[a-zA-Z0-9_./-]+\.js)$/);
    if (!match || match[1].includes('..')) {
      console.error(`Unsupported test command in ${name}: ${command}`);
      process.exit(2);
    }
    tests.push(match[1]);
  }
  plans.push({name, config, tests});
}

const compileProjects = [...new Set(plans.map((plan) => plan.config))];
if (listOnly) {
  for (const plan of plans) {
    console.log(`${plan.name}: tsc -p ${plan.config}; ${plan.tests.length} tests`);
    for (const test of plan.tests) console.log(`  ${test}`);
  }
  console.log(`Planned: ${names.length} scripts, ${compileProjects.length} distinct TypeScript builds (instead of ${names.length}).`);
  process.exit(0);
}

const compiled = new Set();
const started = Date.now();
let ran = 0;

function runNode(args, label) {
  const startedStep = Date.now();
  console.log(`::group::${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: backend, stdio: 'inherit', windowsHide: true,
  });
  console.log(`::endgroup::`);
  console.log(`Elapsed: ${((Date.now() - startedStep) / 1000).toFixed(1)}s — ${label}`);
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

for (const plan of plans) {
  if (!compiled.has(plan.config)) {
    runNode([path.join(backend, 'node_modules/typescript/lib/tsc.js'), '-p', plan.config],
      `Compile backend ${plan.config}`);
    compiled.add(plan.config);
  }
  for (const test of plan.tests) {
    runNode([path.join(backend, test)], `${plan.name}: ${test}`);
    ran += 1;
  }
}
console.log(`PASS: ${names.length} scripts, ${ran} individual tests, ${compiled.size} builds (avoided ${names.length - compiled.size} repeated compiles) in ${((Date.now() - started) / 1000).toFixed(1)}s`);
