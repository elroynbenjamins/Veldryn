import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const root=path.resolve(import.meta.dirname,'..'),require=createRequire(import.meta.url);
const load=p=>require(path.join(root,'.combat-balance-build/apps/mobile/src',p+'.js'));
const g=load('core/game'),f=load('core/regional-combat-fixtures'),{CLASSES}=load('content/classes');
const {COMBAT_COMPANIONS,COMPANION_RARITY_CONFIG}=load('content/combat-companions');
const {unlockCombatCompanion,equipCombatCompanion,companionCombatContribution}=load('core/combat-companions');
const T=Date.UTC(2026,9,1,12),H=3600000,rows=[];
function check(v,m){if(!v)throw Error(m);}
function fixture(region,cls,preparation,tactic){
 const s=f.regionalCombatFixture(region,preparation,cls.id);
 s.activity={kind:'combat',targetId:region.monsterId,combatTacticId:tactic,startedAtMs:T,lastClaimAtMs:T};
 s.character.currentHp=g.effectiveStats(s).hp;s.inventory.stacks=[];return s;
}
for(const region of f.REGIONAL_COMBAT_FIXTURES)for(const cls of CLASSES)
 for(const preparation of ['underprepared','prepared','optimized'])for(const tactic of ['assault','balanced','guarded']){
 const s=fixture(region,cls,preparation,tactic),p=g.combatSustainProjection(s,region.monsterId);
 const short=g.previewActivityReward(s,T+H/4),empty=g.previewActivityReward(s,T+8*H);
 check(short.endHp<s.character.currentHp,`No attrition: ${region.regionName}/${cls.id}`);
 check(p.netHpLossPerHour>0&&p.estimatedUnfedHours<=12.500001,'Unhealed survival must be finite');
 check(empty.stoppedReason,'Unfed regional fixture must eventually stop');
 const stocked=structuredClone(s);stocked.inventory.stacks=[{itemId:region.foodId,quantity:1000}];
 const fed=g.previewActivityReward(stocked,T+8*H);check(!fed.stoppedReason,'Stocked fixture died');
 rows.push({region:region.regionName,classId:cls.id,preparation,tactic,estimatedUnfedHours:p.estimatedUnfedHours,
  actualUnfedHours:empty.stoppedReason?empty.qualifyingActivitySeconds/3600:null,foodPerHour:p.foodPerHour,foodUsedEightHours:fed.foodConsumed});
 }
let companionCases=0;
for(const region of f.REGIONAL_COMBAT_FIXTURES)for(const cls of CLASSES)
 for(const def of COMBAT_COMPANIONS.filter(c=>c.role!==cls.role.toLowerCase()))for(const investment of ['new','max']){
 let s=unlockCombatCompanion(fixture(region,cls,'prepared','balanced'),def.id,T);
 if(investment==='max')s.account.combatCompanionProgress[def.id]={...s.account.combatCompanionProgress[def.id],level:COMPANION_RARITY_CONFIG[def.rarity].maxLevel,ascensionTier:3,bondLevel:10,bondXp:100000,bondTraitUnlocked:true};
 s=equipCombatCompanion(s,def.id);s.character.currentHp=g.effectiveStats(s).hp;
 const p=g.combatSustainProjection(s,region.monsterId),c=companionCombatContribution(s),r=g.previewActivityReward(s,T+H/4);
 check(p.foodPerHour>=0&&Number.isFinite(p.foodPerHour),'Invalid food forecast');
 check(r.endHp<=g.effectiveStats(s).hp,'Healing exceeded maximum HP');
 if(!c.directHealingPctPerHour)check(r.endHp<s.character.currentHp,'Non-healer prevents attrition');
 companionCases++;
 }
const report={generatedAt:new Date().toISOString(),ordinaryScenarios:rows.length,companionScenarios:companionCases,
 regions:f.REGIONAL_COMBAT_FIXTURES.map(r=>{const a=rows.filter(x=>x.region===r.regionName&&x.preparation==='prepared'&&x.tactic==='balanced');return {region:r.regionName,minUnfedMinutes:Math.min(...a.map(x=>x.actualUnfedHours))*60,maxUnfedMinutes:Math.max(...a.map(x=>x.actualUnfedHours))*60,minFoodPerHour:Math.min(...a.map(x=>x.foodPerHour)),maxFoodPerHour:Math.max(...a.map(x=>x.foodPerHour))};}),rows};
const dir=path.join(root,'artifacts/combat-sustain-pass');fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,rows:undefined},null,2));
