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
assert(art.includes('DUNGEON_ENEMY_ART[key]??DUNGEON_ENEMY_ART[base]'),'Bespoke dungeon art must win over all shared assets');
assert(art.includes('??monsterImageForKey(key)??monsterImageForKey(base)'),'Reused overworld portraits must precede unrelated humanoid Trial fallbacks');
assert(art.includes('??TRIAL_ART_BY_KEY[key]??TRIAL_ART_BY_KEY[base]'),'Missing monsters must still resolve named Trial NPCs when appropriate');
assert(art.includes("Object.entries(TRIAL_ENEMY_PORTRAITS)"),'Trial images are indexed once, not resolved by repeated iteration each combat frame');
assert(card.includes('dungeonEnemyPortraitSource(name)'),'Every combat enemy card uses the shared registry');
assert(asterfall.includes("enemy('ROOT_WARDEN','Runebound Bulwark'"),'Root elite uses matching NPC identity');
assert(sunscar.includes("'Glasshide Warder'],'arcane'")&&sunscar.includes("name==='Glasshide Warder'"),'Sunscar elite retains guardian role and matching NPC name');
assert(regional.includes("'Rimehorn Alpha','Choirbreaker','Rimeplate Guard'"),'Frost elite matched');
assert(regional.includes("'Cinder Channeler','Blackglass Devourer','Forgeplate Custodian'"),'Ash elites matched');
assert(regional.includes("name==='Rimeplate Guard'||name==='Forgeplate Custodian'"),'Renamed elites retain existing defensive ability profile');
assert(regional.includes("name==='Choirbreaker'||name==='Cinder Channeler'"),'Renamed caster keeps its existing combat archetype');
assert(art.includes("'the buried heliarch':'GLASSBOUND_SENTINEL'"),'Buried Heliarch must use the already bundled Sunscar guardian sprite, not a new asset or unrelated NPC');

const monsters=read('apps/mobile/src/theme/monster-assets.ts');
const monsterDefs=read('apps/mobile/src/content/monsters.ts');
const reused=art.split('DUNGEON_MONSTER_PORTRAIT_ALIASES:')[1]?.split('});')[0]??'';
const mapped=new Map([...reused.matchAll(/'([^']+)':'([^']+)'/g)].map(match=>[match[1],match[2]]));
const direct=new Set([...monsters.matchAll(/([A-Z_]+):require\('\.\.\/\.\.\/assets\/monsters\/([^']+)\.webp'\)/g)].map(match=>match[1]));
const atlas=new Set([...monsters.matchAll(/([A-Z_]+):\{column:\d+,row:\d+\}/g)].map(match=>match[1]));
assert(direct.size>=23,'Existing overworld monster portraits must be referenced, not copied');
assert.equal(atlas.size,9,'The shared 3x3 regional atlas already supplies nine independent sprites');
for(const [name,id] of mapped){
 assert(direct.has(id)||atlas.has(id),name+' must point to an existing monster or existing atlas cell');
 assert(name===name.toLowerCase(),name+' must use a normalized lookup key');
}
for(const [enemy,monsterId] of [
 ['sporeling','GLOAM_MITE'],['strangling vine','THORNLING'],['briar hound','IRONWOOD_WOLF'],
 ['orrery scarab','SUNSCAR_SCORPION'],['the buried heliarch','GLASSBOUND_SENTINEL'],
 ['rimewolf','FROSTWOLF'],['icefang hound','FROSTWOLF'],['choir wisp','BELLWRAITH'],
 ['blackglass beetle','GLOAM_MITE'],['the blackglass fen prime','BLACKGLASS_MIRELING'],
 ['the crucible prime','CINDER_TITAN'],['the thornheart ancient','ANCIENT_TREANT']
])assert.equal(mapped.get(enemy),monsterId,enemy+' must reuse the intended canonical source');
for(const exact of ['briar husk','thornling','echo bat','lantern wretch','drowned pilgrim','banner shade']){
 assert(monsterDefs.includes("name:'"+exact.replace(/\b\w/g,letter=>letter.toUpperCase())+"'")||exact==='echo bat','Existing monster names must resolve directly from canonical IDs: '+exact);
}
const eventAliases=art.split('DUNGEON_EVENT_TRIAL_PORTRAIT_ALIASES:')[1]?.split('});')[0]??'';
assert(eventAliases.includes("'aureon, first champion':'Runebound Colossus'"),'Event champions must reuse an existing suitable Trial boss sprite');
assert(art.includes("key.endsWith(' echo')"),'Event Echo adds no new art assets, reusing the named original portrait');
assert(card.includes('dungeonEnemyRegionalPortraitCell(name)')&&card.includes('regionalMonsterPortraitAtlas'),'The combat scene must render actual crops of the original atlas');
assert(card.includes('left:-enemyAtlasCell.column*enemyAtlasSize')&&card.includes('top:-enemyAtlasCell.row*enemyAtlasSize'),'Atlas must crop to the correct individual creature cell');
assert(art.includes('The two Sphinx encounters intentionally await Sphinx art'),'A Sphinx must not be passed off as an unrelated humanoid or beast');
assert(sunscar.includes("'Glassbound Sentinel'],'fire'")||sunscar.includes("'Glassbound Sentinel'"),'Renamed Wellbound elite must use the canonical Sunscar species name');
assert(sunscar.includes("name==='Glassbound Sentinel'"),'Reused Sunscar guardian must preserve its barrier combat archetype');
assert(regional.includes("'Blackglass Mireling'].includes(name)"),'Renamed Ashlands swarm must retain swarm mechanics');
assert(regional.includes("'Cinder Titan'].includes(name)"),'Renamed Ashlands guardian must retain guard mechanics');
assert(regional.includes("'Fen Reaver','Ashen Revenant'"),'Renamed Scoria executioner must retain execute mechanics');

console.log('PASS dungeon Trial/monster atlas artwork reuse, legacy names, zero asset duplication and preserved enemy roles');
