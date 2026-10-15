import {readFileSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const repoRoot=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const companionContent=[
  readFileSync(resolve(repoRoot,'apps/mobile/src/content/combat-companions.ts'),'utf8'),
  readFileSync(resolve(repoRoot,'apps/mobile/src/content/event-companions-v2.ts'),'utf8'),
].join('\n');
const masterRegistry=readFileSync(resolve(repoRoot,'apps/mobile/src/theme/master-roster-assets.ts'),'utf8');
const eventRegistry=readFileSync(resolve(repoRoot,'apps/mobile/src/theme/event-collectible-assets-active.ts'),'utf8');
const resolver=readFileSync(resolve(repoRoot,'apps/mobile/src/theme/companion-art.ts'),'utf8');

const fail=(message)=>{throw new Error(message)};
// Permanent regional companions are data-generated with regional('UNIT_013', ...),
// while Asterfall and event entries use object literals/seeds. Accept both forms
// so this validator checks the authored catalog rather than one syntax variant.
const ids=[...companionContent.matchAll(/(?:id:|regional\()\s*'((?:EVT_)?UNIT_\d{3})'/g)].map(match=>match[1]);
const unique=[...new Set(ids)].sort();

// Future authored companions do not ship until released. Every released mapping
// and every companion in the current event must have a definition and portrait.
const eventIds=[...eventRegistry.matchAll(/\['(EVT_UNIT_\d{3})'/g)].map(match=>match[1]);
const activeEvent=readFileSync(resolve(repoRoot,'apps/mobile/src/content/veilbreak-event.ts'),'utf8').split('export const FROSTFALL_EVENT')[0];
for(const id of new Set(activeEvent.match(/EVT_UNIT_\d{3}/g)??[])){
  if(!eventIds.includes(id))fail(`active Veilbreak reward has no portrait: ${id}`);
}

for(const id of unique.filter(id=>!id.startsWith('EVT_')).concat(eventIds)){
  const masterCount=(masterRegistry.match(new RegExp(`\\['${id}'`,'g'))??[]).length;
  const eventCount=(eventRegistry.match(new RegExp(`\\['${id}'`,'g'))??[]).length;
  const total=masterCount+eventCount;
  if(total!==1)fail(`${id} must resolve to exactly one canonical portrait mapping, found ${total}`);
}
for(let i=1;i<=24;i++){
  const id=`UNIT_${String(i).padStart(3,'0')}`;
  if(!unique.includes(id))fail(`missing permanent companion ${id}`);
}
for(const id of eventIds){
  if(!unique.includes(id))fail(`missing event companion ${id}`);
}
if(!resolver.includes('masterCompanionSourceById.get(id)')||!resolver.includes('eventCompanionSourceById.get(id)'))fail('companion resolver is missing canonical registries');

console.log(`PASS: companion art coverage validated (24 permanent + ${eventIds.length} released event portraits)`);
