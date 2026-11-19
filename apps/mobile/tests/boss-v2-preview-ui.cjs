const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const content=read('src/content/boss-v2-preview-locales.ts');
const projection=read('src/content/boss-v2-replay-preview.ts');
const panel=read('src/components/BossV2CounterplayPreview.tsx');
const app=read('App.tsx');
const combat=read('src/screens/CombatScreen.tsx');
const worldBoss=read('src/components/WorldBossPanel.tsx');
assert.match(content,/BOSS_V2_PREVIEW_PUBLIC_ENABLED=false/);
for(const screen of [app,combat,worldBoss])
 assert.doesNotMatch(screen,/BossV2CounterplayPreview|boss-v2-replay-preview/,
  'Hidden Boss 2.0 preview must not enter production screens');
const ids=[
 'ROOT_V2_LIVING_BARK','BELL_V2_SOUL_CURSE','BELL_V2_VEIL_MIRROR',
 'SOLAR_V2_SUNFALL','SPHINX_V2_MIRAGE',
 'BELLBEAST_V2_SHATTER','CANTOR_V2_DISSONANCE',
];
for(const id of ids){
 assert.ok(content.split(id).length>=7,id+' needs each locale and base ID');
 assert.ok(projection.includes(id),id+' must be scoped to a recognized boss');
}
for(const lang of ['en','es','de','ru','tr']){
 assert.match(content,new RegExp('\\b'+lang+':\\{'),
  lang+' translations are required');
}
assert.match(content,/bossV2LocalizedCast/);
assert.match(content,/bossV2Locale/);
assert.match(projection,/projectBossV2Replay/);
assert.match(projection,/serverCursorMs/);
assert.match(projection,/event\.atMs<at/,'Out-of-order events must fail closed');
assert.match(projection,/events\.length>5000/);
assert.match(projection,/preview\.casts\.some/);
assert.match(projection,/event\.type==='interrupt'/);
assert.match(projection,/event\.type==='phase'/);
assert.match(projection,/BOSS_V2_PRESENTATION_IDS/);
assert.match(panel,/useWindowDimensions/);
assert.match(panel,/fontScale>=1\.3/,'Narrow-screen and font scaling must be respected');
assert.match(panel,/accessibilityRole="progressbar"/);
assert.match(panel,/accessibilityLiveRegion="polite"/);
assert.match(panel,/Preview only · server replay/);
assert.match(panel,/BOSS_V2_PREVIEW_PUBLIC_ENABLED/);
assert.match(panel,/bossV2LocalizedCast/,'Never print untrusted server guidance');
assert.doesNotMatch(panel,/preview\.bossName|cast\.tell|cast\.counter|cast\.fallback/,
 'Presentation must render only localized fixed-ID guidance');
assert.doesNotMatch(panel,/fetch\s*\(|setInterval|setTimeout|Date\.now|AsyncStorage|onCommand|supabase\./,
 'No local timers, live route access, combat mutations or API calls');
console.log('PASS: hidden Boss 2.0 previews, 5 languages, 7 localized tells, 6 scoped boss identities, accessibility, server-cursor replay and production isolation');
