const assert=require('node:assert/strict');
const fs=require('node:fs');
const read=path=>fs.readFileSync(path,'utf8');

const source=read('src/core/coop-presentation.ts');
const stage=read('src/components/coop/DungeonCombatStage.tsx');
const overview=read('src/components/coop/CoopRunOverview.tsx');
const portraits=read('src/components/coop/CombatantProfileCard.tsx');
const preload=read('src/core/dungeon-combat-preload.ts');
const server=read('../../backend/src/server/combat/pve-encounter-identity.ts');

assert.match(source,/enemies\?:Array<\{name:string;boss:boolean\}>/,'Older server previews must remain valid');
assert.match(source,/rawEnemies\?\.length\?\?0\)>4/,'The public roster stays capped at four visible enemies');
assert.match(server,/previewEnemies=enemies\.slice\(0,4\)/,'Only authored enemy identities are published');
assert.match(server,/name:enemy\.name,boss:enemy\.boss===true/,'No attack/HP information is published');
assert.match(overview,/preloadDungeonCombatArt\(run\.options,run\.roleSlots\)/,'Prewarm during the room decision, not when the modal opens');
assert.match(overview,/setEntryCombatEnemies\(option\?\.encounterPreview\?\.enemies\?\?\[\]\)/,'Selection keeps the selected enemy combination');
assert.match(overview,/setEnteringCombat\(true\);setTheaterOpen\(true\)/,'Start local battle animation synchronously with the choice');
assert.match(stage,/previewEnemyRoster\?\.length/,'Prefer the exact server-supplied lineup over generic archetypes');
assert.match(stage,/anticipation\?\(bossEncounter\?/,'The temporary roster is used during all pending battle phases');
assert.match(stage,/replay=anticipation\?undefined/,'Never replay the previous room during a new fight');
assert.match(portraits,/preview\?ui\("Preparing battle"\):st\("Syncing"\)/,'Unknown preview HP must use localized Preparing battle, never fake a value');
assert.match(read("src/i18n/dungeon-combat-ui.ts"),/"Preparing battle": \[/,'Pending preview copy must be localized for all eight languages');
assert.match(preload,/Image\.prefetch\(uri\)/,'Native images are prefetched without a gameplay request');
assert.doesNotMatch(preload,/supabase|\bfetch\(/,'Asset warming must never start server combat or precompute RNG');
console.log('PASS immediate dungeon preview, exact enemy compositions, and offline image warming');
