const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const art=read('apps/mobile/src/theme/dungeon-enemy-art.ts');
const trials=read('apps/mobile/src/theme/trial-enemy-portraits.ts');
const card=read('apps/mobile/src/components/coop/CombatantProfileCard.tsx');
const asterfall=read('backend/src/server/combat/content/asterfall-encounters.ts');
const sunscar=read('backend/src/server/combat/content/sunscar-encounters.ts');
const regional=read('backend/src/server/combat/content/regional-encounters.ts');

const trialNames=new Set([...trials.matchAll(/"([^"]+)":require\('/g)].map(match=>match[1]));
const aliasBody=art.split('DUNGEON_TRIAL_PORTRAIT_ALIASES:')[1]?.split('});')[0]??'';
const aliases=new Map([...aliasBody.matchAll(/'([^']+)':'([^']+)'/g)].map(match=>[match[1],match[2]]));
assert(aliases.size>=30,'Curated coverage of normal and elite dungeon humanoids must remain broad');
assert(trialNames.size>=18,'Companion Trial named portraits must exist');
for(const [name,trial] of aliases){
 assert(trialNames.has(trial),name+' must map to a real named Trial NPC, never generic fallback');
 assert.equal(name,name.toLowerCase(),'Dungeon aliases are normalized keys');
}
for(const creature of ['briar husk','sporeling','thornling','strangling vine','briar hound','echo bat','orrery scarab','mirage jackal','amberglass asp','rimewolf','icefang hound','blackglass beetle','crucible imp','ashen colossus']){
 assert(!aliases.has(creature),creature+' has no matching humanoid Trial portrait');
}
for(const [oldName,trialName] of [
 ['root warden','Runebound Bulwark'],['amberglass sentinel','Glasshide Warder'],
 ['permafrost warden','Rimeplate Guard'],['crucible warden','Forgeplate Custodian'],
 ['fen pyrecaller','Cinder Channeler']
])assert.equal(aliases.get(oldName),trialName,'Old saved runs must still render correct portraits');
assert(art.includes("DUNGEON_ENEMY_ART[key]??TRIAL_ART_BY_KEY[key]"),'Bespoke boss art takes priority over reused Trial artwork');
assert(art.includes("Object.entries(TRIAL_ENEMY_PORTRAITS)"),'Trial images are indexed once, not resolved by repeated iteration each combat frame');
assert(card.includes('dungeonEnemyPortraitSource(name)'),'Every combat enemy card uses the shared registry');
assert(asterfall.includes("enemy('ROOT_WARDEN','Runebound Bulwark'"),'Root elite uses matching NPC identity');
assert(sunscar.includes("'Glasshide Warder'],'arcane'")&&sunscar.includes("name==='Glasshide Warder'"),'Sunscar elite retains guardian role and matching NPC name');
assert(regional.includes("'Rimehorn Alpha','Choirbreaker','Rimeplate Guard'"),'Frost elite matched');
assert(regional.includes("'Cinder Channeler','Blackglass Devourer','Forgeplate Custodian'"),'Ash elites matched');
assert(regional.includes("name==='Rimeplate Guard'||name==='Forgeplate Custodian'"),'Renamed elites retain existing defensive ability profile');
assert(regional.includes("name==='Choirbreaker'||name==='Cinder Channeler'"),'Renamed caster keeps its existing combat archetype');
assert(!art.includes("'the buried heliarch':"),'Unrelated boss should not be assigned a generic NPC portrait');
console.log('PASS dungeon normal/elite NPC portrait mappings, preserved old aliases, creature safeguards and gameplay IDs');
