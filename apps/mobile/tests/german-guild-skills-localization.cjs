const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const ts=require('../node_modules/typescript');

require.extensions['.ts']=function(mod,filename){
 const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}
 }).outputText;
 mod._compile(compiled,filename);
};

const {GERMAN_SHARED_WORLD_AUTHORED_COPY}=require('../src/i18n/shared-world-authored-de.ts');
const {germanCoverageText}=require('../src/i18n/german-coverage.ts');
const {GUILD_MAJOR_BRANCHES,GUILD_SKILL_NODES}=require('../src/content/guild-skill-paths.ts');
const source=file=>fs.readFileSync(path.resolve(__dirname,'..',file),'utf8');
const tree=source('src/components/GuildSpecializationPaths.tsx');
const online=source('src/components/OnlineGuildSkillsPanel.tsx');
assert.equal(GUILD_MAJOR_BRANCHES.length,3,'Changed guild branch count');
assert.equal(GUILD_SKILL_NODES.length,9,'Changed guild skill catalog node count');

function isGerman(sourceText,context){
 const translated=germanCoverageText(sourceText);
 assert.ok(translated!==undefined && translated!==sourceText,'Missing German '+context+': '+sourceText);
}
for(const branch of GUILD_MAJOR_BRANCHES)isGerman(branch,'branch');
for(const node of GUILD_SKILL_NODES){
 for(const key of ['name','scope','summary','label'])isGerman(node[key],node.id+' '+key);
 assert.ok(node.id.startsWith('professions_')||node.id.startsWith('fellowship_')||node.id.startsWith('vanguard_'),'Unexpected skill ID '+node.id);
}
for(const key of [
 'PERMANENT GUILD BONUSES','Shared guild progression','Skill points','Active skills',
 'Guild Skill branches','3 ranks','NOT RELEASED','Bonuses apply only in Guild encounters.',
 'CURRENT BONUS','MAX RANK','NEXT RANK','UPGRADE COST','1 Skill Point',
 'The Guild Bank upgrade costs are unavailable. Refresh Guild Skills before upgrading.',
 'This bonus has not been released yet. You can review it but cannot upgrade it.',
 'Only Guild Officers and Leaders may allocate skill points.',
 'Earn Guild XP to receive more skill points.',
 'Deposit the missing materials or Gold into the Guild Bank before upgrading.',
 'Upgrade · Review cost','Maximum rank reached.',
 'Live skill ranks and bank materials are unavailable in this preview.',
 'Open Guild Bank','Dismiss upgrade confirmation','CONFIRM GUILD UPGRADE','BEFORE','AFTER',
 'BANK MATERIALS & GOLD · 1 SKILL POINT',
 'This permanently spends 1 Guild Skill point, materials and Guild Bank Gold shown above. The server will recheck permissions and balances.',
 'Confirm upgrade'
])isGerman(key,'tree UI');

for(const callsite of [
 'de(n.label)','label:de(id)','de(n.name)','de(node.scope)','de(node.name)',
 'de(node.summary)',"de('Guild Skill branches')","de('Confirm upgrade')",
 "de('Dismiss upgrade confirmation')","de('BANK MATERIALS & GOLD · 1 SKILL POINT')",
 "language==='de'?' Mitglieder':' members'",
 "de('Missing')+' '+missing.toLocaleString()"
])assert.ok(tree.includes(callsite),'Missing localized tree callsite: '+callsite);
for(const unchanged of [
 "const currentPublishedCosts=nodeCosts?.[node.id]?.filter(row=>row.rank===level+1)??[]",
 "const ready=known&&released&&canUpgrade&&!!onSpend",
 "onSpend?.(node.id)","setReview(false);","guildSkillArtwork(n.id)",
 "metrics?.[`guild_bank_${id}`]"
])assert.ok(tree.includes(unchanged),'Guild upgrade control boundary changed: '+unchanged);

for(const key of [
 'Loading Guild Skills…','Reading authoritative skill points, ranks and Guild Bank materials.',
 'Unable to load Guild Skills.',
 'A newer version of VELDRYN is needed to view Guild Skills. Your other Guild activities are still available.',
 'Check Google Play for update','Check again',
 'Join a Guild to shape shared Skill Trees.','BONUSES ACTIVATING SOON',
 'Skill ranks and materials can be reviewed. Upgrades remain disabled until released.',
 'Processing upgrade…','Refreshing…','Refresh Guild Skills',
 'This bonus is being finalised and cannot be purchased yet.',
 'Only Officers and Leaders can allocate Guild Skills.',
 'That skill is already at its maximum rank.','No Guild Skill points remaining.',
 'The Guild Bank is missing required materials.','Join a Guild to allocate Guild Skills.',
 'That upgrade is already being processed. Refresh to confirm.',
 'Already applied. Synced your ranks.','Could not complete the upgrade. Try again.'
])isGerman(key,'online Guild Skills');

for(const callsite of [
 "setNotice(de(upgradeError.guild_skill_not_released))",
 "setNotice(de(upgradeError[code]??'Could not complete the upgrade. Try again.'))",
 "setNoticeSuccess(true)","color:noticeSuccess?C.good:C.warning",
 "de('Loading Guild Skills…')","de('Refresh Guild Skills')"
]){
 if(callsite==="de('Refresh Guild Skills')"){
  assert.ok(online.includes("'Refresh Guild Skills'"),'Online refresh string disconnected');
 }else assert.ok(online.includes(callsite),'Unlocalized online callsite: '+callsite);
}
assert.ok(online.includes('upgradeOnlineGuildSkill(skillId,requestKey)'),'Upgrade request must remain authoritative');
assert.ok(online.includes("const requestKey=`${skillId}-r${node.rank+1}`"),'Idempotent upgrade key changed');
assert.ok(online.includes("metrics={metrics}"),'Server snapshot metrics disconnected');
assert.equal(typeof GERMAN_SHARED_WORLD_AUTHORED_COPY,'object','Other authored translations missing');
console.log('PASS: German Guild Skills: 3 branches, 9 nodes and complete upgrade/release copy');
