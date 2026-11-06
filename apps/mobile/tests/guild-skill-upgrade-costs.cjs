const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'../../..');
const file=relative=>fs.readFileSync(path.join(root,relative),'utf8');

const foundation=file('backend/supabase/migrations/20261104000025_guild_skill_trees_authoritative_foundation.sql');
const update=file('backend/supabase/migrations/20261106125500_guild_skill_doubled_resources_tiered_herbs_ores_v2.sql');
const priorGold=file('backend/supabase/migrations/20261106091500_guild_weekly_midweek_bank_gold_v3.sql');
const catalogue=file('apps/mobile/src/content/guild-skill-paths.ts');
const skillUi=file('apps/mobile/src/components/GuildSpecializationPaths.tsx');
const liveUi=file('apps/mobile/src/components/OnlineGuildSkillsPanel.tsx');
const bankUi=file('apps/mobile/src/components/OnlineGuildBankPanel.tsx');
const herbs=file('apps/mobile/src/content/herbalism.ts');
const mining=file('apps/mobile/src/content/skills.ts');

function costRows(content){
 return [...content.matchAll(/\('([a-z]+_[a-z_]+)',([123]),'([A-Z_]+)',(\d+)\)/g)]
  .map(([,skill,rank,material,amount])=>({skill,rank:Number(rank),material,amount:Number(amount)}));
}
const original=costRows(foundation),added=costRows(update);
assert.equal(original.length,54,'Original 9 skill × 3 ranks × 2 materials must be intact');
assert.equal(added.length,108,'Repriced 9 skill × 3 ranks × 4 materials, excluding unchanged Gold');
const key=row=>[row.skill,row.rank,row.material].join(':');
const costMap=new Map(added.map(row=>[key(row),row.amount]));
assert.equal(costMap.size,108,'Every rank and resource must have exactly one declared amount');
for(const old of original)assert.equal(costMap.get(key(old)),old.amount*2,'Double original material exactly: '+key(old));

const standardHerbs=new Set(['DEWLEAF','RIVER_MINT','IRONBLOOM','CAVELICHEN']);
const ores=new Set(['COPPER_ORE','ASTER_IRON_ORE','OATHSTONE_ORE']);
const defaultIds=[['DEWLEAF','COPPER_ORE'],['RIVER_MINT','ASTER_IRON_ORE'],['IRONBLOOM','OATHSTONE_ORE']];
const vanguardIds=[['RIVER_MINT','ASTER_IRON_ORE'],['IRONBLOOM','OATHSTONE_ORE'],['CAVELICHEN','OATHSTONE_ORE']];
const nodeLines=catalogue.split('\n').filter(line=>/^\s*\{id:'(?:professions|fellowship|vanguard)_/.test(line));
assert.equal(nodeLines.length,9,'All 9 existing Guild Skills must retain their authored progression');
for(const line of nodeLines){
 const match=line.match(/^\s*\{id:'([^']+)'.*\bcosts:\[(.*)\]\},?$/);
 assert.ok(match,'Guild Skill cost declaration is malformed');
 const skill=match[1],vanguard=skill.startsWith('vanguard_');
 const rankBodies=[...match[2].matchAll(/\{([^}]+)\}/g)].map(m=>m[1]);
 assert.equal(rankBodies.length,3,'Every Guild Skill must have 3 ranks: '+skill);
 for(const [idx,body] of rankBodies.entries()){
  const rank=idx+1,sourceEntries=[...body.matchAll(/([A-Z_]+|gold):(\d+)/g)];
  const current=new Map(sourceEntries.map(([,id,amount])=>[id,Number(amount)]));
  const matches=added.filter(row=>row.skill===skill&&row.rank===rank);
  assert.equal(current.size,5,'Each rank needs 2 original materials, 1 herb, 1 ore and Gold: '+skill+':'+rank);
  assert.equal(matches.length,4,'Database migration needs exactly 4 non-Gold inputs per rank: '+skill+':'+rank);
  for(const row of matches)assert.equal(current.get(row.material),row.amount,'Mobile and authoritative SQL must agree: '+key(row));
  const expected=(vanguard?vanguardIds:defaultIds)[idx];
  assert.deepEqual([...current.keys()].filter(id=>standardHerbs.has(id)||ores.has(id)).sort(),expected.slice().sort(),'Progression appropriate Herb/Ore: '+skill+':'+rank);
  assert.equal(current.get('gold'),[5000,15000,30000][idx],'Gold cost unchanged: '+skill+':'+rank);
  for(const resource of expected){
   assert.ok(resource.endsWith('_ORE')?mining.includes("itemId:'"+resource+"'"):herbs.includes("id:'"+resource+"'"),'New materials must be obtainable in normal gathering: '+resource);
  }
 }
}
assert.match(priorGold,/CASE steps\.rank WHEN 1 THEN 5000 WHEN 2 THEN 15000 WHEN 3 THEN 30000/,'Prior migration already establishes rank Gold costs');
assert.doesNotMatch(update,/\('[a-z]+_[a-z_]+',[123],'gold',/,'New migration must not reprice Gold');
assert.match(update,/ON CONFLICT\(skill_id,rank,resource_id\) DO UPDATE SET amount=excluded\.amount/,'Repricing must be idempotent, never multiply amounts repeatedly');
assert.match(update,/FROM public\.guild_skill_catalogue_v1 s[\s\S]*CROSS JOIN generate_series\(1,3\) AS r\(rank\)[\s\S]*ON CONFLICT\(skill_id,rank,resource_id\) DO NOTHING/,'The migration must seed Gold only where production still lacks the staging cost');
assert.match(update,/guild_skill_gold_costs_must_exist_before_repricing/,'Repricing requires existing Gold sink');
assert.match(update,/count\(c\.resource_id\)<>5/,'Every rank must retain five inputs');
assert.doesNotMatch(update,/DELETE FROM|UPDATE public\.guild_skill_allocations|UPDATE public\.guild_skill_upgrade_receipts_v1/i,'Already purchased ranks and receipts must not be touched');
assert.match(liveUi,/nodeCosts=\{Object\.fromEntries\(snapshot\.nodes\.map\(node=>\[node\.id,node\.costs\]\)\)\}/,'Live Guild UI must pass server-authoritative costs');
assert.match(skillUi,/const cost=nodeCosts[\s\S]*?Object\.fromEntries\(currentPublishedCosts/,'Live Guild UI must not silently use stale local prices');
assert.match(skillUi,/id==='gold'\?'Gold':itemDef\(id\)\.name/,'Gold must be renderable, never sent through itemDef');
assert.match(skillUi,/ResourceIcon resourceId=\{id\}/,'Upgrade preview must include the shared Gold icon');
assert.match(skillUi,/costsKnown&&Object\.entries\(cost\)\.length>0/,'No zero-cost upgrade if the server lacks costs');
assert.match(bankUi,/node\.costs/,'Guild Bank donation needs derive from server-published rank costs');
console.log('PASS: 9 Guild Skills × 3 ranks × doubled originals + tiered herbs/ores + unchanged server Gold; live bank, safe migration, UI parity');
