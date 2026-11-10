const assert=require('node:assert/strict');
const {readFileSync}=require('node:fs');
const read=path=>readFileSync(path,'utf8');
const browser=read('src/dev/BrowserReview.tsx');
const extra=read('src/dev/AdditionalScreensReview.tsx');
const entry=read('index.js');
const workflow=read('../../.github/workflows/deploy-browser-review.yml');
assert.match(entry,/Platform\.OS==='web'&&process\.env\.EXPO_PUBLIC_BROWSER_REVIEW==='1'/,
 'Browser review must never replace the Android/iOS entrypoint');
assert.match(browser,/AdditionalScreensReview/, 'Account and progression screens must be reachable');
assert.match(browser,/NativeVisualReview/, 'Native game fixtures must be reachable');
assert.match(browser,/CompanionScreenReview/, 'Companion fixtures must be reachable');
assert.match(browser,/GuildPveReview/, 'Guild boss fixtures must be reachable');
const routes=[...browser.matchAll(/\{id:'[a-z0-9-]+',label:/g)];
assert.ok(routes.length>=50,'Review should expose at least 50 named screen/flow entries');
assert.match(browser,/window\.history\.pushState/, 'Selections must have shareable deep links');
assert.match(browser,/window\.addEventListener\('popstate'/, 'Browser history must work');
assert.doesNotMatch(extra,/AuthSessionProvider|useOnlineGame|supabase\.[a-z]/,
 'Extra fixtures must not mount real-account authentication or gameplay');
assert.match(extra,/buildAdminQaState\(undefined,'IRONWARDEN'\)/,
 'Review fixtures must be initialized locally');
assert.match(workflow,/EXPO_PUBLIC_BROWSER_REVIEW:\s*'1'/, 'Deploy explicit browser review entry');
assert.match(workflow,/EXPO_PUBLIC_SUPABASE_URL:\s*''/, 'Prevent the release fallback to production Supabase URL');
assert.match(workflow,/EXPO_PUBLIC_SUPABASE_ANON_KEY:\s*''/, 'Prevent production Supabase client creation');
assert.match(workflow,/CLOUDFLARE_API_TOKEN/, 'Deploy should use CI-only secrets');
assert.match(workflow,/veldryn-review/, 'Use separate review host, never control center');
console.log('PASS: isolated hosted review has '+routes.length+' deep-linkable screens and no production account entry');
