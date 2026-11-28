// Private 2.0 release gate. Use the actual mobile tsconfig, not a grep of direct imports.
// Type-only imports can pull executable server modules into the mobile compiler graph.
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const app = path.resolve(__dirname, '..');
const repo = path.resolve(app, '../..');
const config = path.join(app, 'tsconfig.json');
const format = d => ts.flattenDiagnosticMessageText(d.messageText, '\n');
const read = ts.readConfigFile(config, ts.sys.readFile);
if (read.error) throw new Error(format(read.error));
const parsed = ts.parseJsonConfigFileContent(read.config, ts.sys, app, {}, config);
if (parsed.errors.length) throw new Error(parsed.errors.map(format).join('\n'));
const program = ts.createProgram(parsed.fileNames, parsed.options);
const key = p => path.resolve(p).replaceAll('\\', '/');
const rel = p => path.relative(repo,p).replaceAll('\\','/');
const inRepo = p => !rel(p).startsWith('../') && !path.isAbsolute(rel(p)) && !rel(p).split('/').includes('node_modules');
const sources = new Map(program.getSourceFiles().map(f => [key(f.fileName), f]));
const forbidden = new Set([
  'backend/src/server/equipment/equipment-crafting-v2-rolls.ts',
  'backend/src/server/equipment/equipment-crafting-v2-transaction.ts',
]);
const violations = [...sources.keys()].filter(p => inRepo(p) && forbidden.has(rel(p)));
if (!violations.length) {
  console.log('Mobile TypeScript graph excludes the two private Forge RNG/transaction modules.');
  process.exit(0);
}
// Resolve actual relative/aliased source imports using the same options as the app.
// Keep full TypeScript program membership as the gate; tracing is diagnostic only.
const cache = ts.createModuleResolutionCache(app, s => ts.sys.useCaseSensitiveFileNames ? s : s.toLowerCase(), parsed.options);
const parents = new Map();
const queue = [];
for (const root of parsed.fileNames.map(key)) {
  if (sources.has(root) && inRepo(root) && !parents.has(root)) {
    parents.set(root, null);
    queue.push(root);
  }
}
const incoming = new Map(violations.map(v => [v, []]));
for (let i=0; i<queue.length; i++) {
  const from = queue[i], src = sources.get(from);
  const imports = ts.preProcessFile(src.text, true, true).importedFiles;
  for (const spec of imports) {
    const resolved = ts.resolveModuleName(spec.fileName, from, parsed.options, ts.sys, cache).resolvedModule;
    if (!resolved) continue;
    const to = key(resolved.resolvedFileName);
    if (!sources.has(to) || !inRepo(to)) continue;
    if (incoming.has(to)) incoming.get(to).push({from:rel(from), specifier:spec.fileName});
    if (!parents.has(to)) { parents.set(to, {from, specifier:spec.fileName}); queue.push(to); }
  }
}
for (const v of violations) {
  console.error('FORBIDDEN MOBILE TYPE GRAPH: '+rel(v));
  console.error('Direct importers: '+JSON.stringify(incoming.get(v)));
  if (!parents.has(v)) {
    console.error('No local import chain reconstructed; inspect tsc --explainFiles for authoritative inclusion reason.');
    continue;
  }
  const chain = [];
  let at=v;
  while (parents.get(at)) {
    const edge=parents.get(at);
    chain.push(rel(edge.from)+' --'+edge.specifier+'--> '+rel(at));
    at=edge.from;
  }
  console.error(chain.reverse().join('\n'));
}
process.exitCode=1;
