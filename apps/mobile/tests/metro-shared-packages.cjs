// Prevent a green TypeScript check from hiding missing sources in release Metro.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const repo=path.resolve(__dirname,'../../..');
const mobile=path.join(repo,'apps/mobile');
const catalogue=path.join(repo,'packages/guild-shop/src/catalogue.ts');
assert.ok(fs.existsSync(catalogue),'The shared Guild Shop catalogue must be checked out for the Android bundle');
const ignore=fs.readFileSync(path.join(repo,'.easignore'),'utf8');
assert.ok(!/^packages\/\s*$/m.test(ignore),'EAS must not drop the shared runtime packages directory');
const workflow=fs.readFileSync(path.join(repo,'.github/workflows/android-native-validation.yml'),'utf8');
assert.ok(workflow.includes('            packages/guild-shop/src'),'Android sparse checkout must include the shared catalogue');
const metro=require(path.join(mobile,'metro.config.js'));
assert.ok((metro.watchFolders??[]).some(folder=>path.resolve(folder)===path.join(repo,'packages')),'Metro must watch shared packages for Android bundling');
console.log('PASS shared Guild Shop catalogue is available to EAS, Android CI and Metro');
