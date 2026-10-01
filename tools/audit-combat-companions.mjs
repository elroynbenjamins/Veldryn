import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
const load=p=>require(path.join(root,'.combat-balance-build/apps/mobile/src',p+'.js'));
const game=load('core/game'),{REGIONAL_COMBAT_FIXTURES,regionalCombatFixture}=load('core/regional-combat-fixtures');
const {CLASSES}=load('content/classes'),{COMBAT_COMPANIONS,COMPANION_RARITY_CONFIG}=load('content/combat-companions');
const {unlockCombatCompanion,equipCombatCompanion,companionCombatContribution}=load('core/combat-companions');
const {totalXpAtLevel}=load('core/progression'),{COLLECTIBLES}=load('content/collectibles');
const {BUYABLE_PERMANENT_BOOSTS}=load('content/permanent-boosts');
const now=Date.UTC(2026,9,1,12),rows=[],hunts=[];
function companion(state,def,investment){
 if(!def)return state;
 let s=unlockCombatCompanion(state,def.id,now);
 if(investment==='max')s.account.combatCompanionProgress[def.id]={...s.account.combatCompanionProgress[def.id],level:COMPANION_RARITY_CONFIG[def.rarity].maxLevel,ascensionTier:3,bondLevel:10,bondXp:100000,bondTraitUnlocked:true};
 return equipCombatCompanion(s,def.id);
}
function buffs(s,kind){
 if(kind==='none')return s;
 const defensive=kind==='defense';
 s.character.faith={xp:totalXpAtLevel(100),selectedBlessingId:defensive?'ETERNAL_BASTION':'DAWN_COVENANT',favoriteBlessingIds:[],hideWeakerBlessings:true};
 s.character.preparation={itemId:defensive?'OATH_WARD_TONIC':'OATH_VIGOR_TONIC',remainingEncounters:60};
 if(kind==='ceiling'){
  s.character.ownedBoostIds=Object.keys(BUYABLE_PERMANENT_BOOSTS);
  for(const [type,key] of [['pet','unlockedCosmeticPetIds'],['background','unlockedProfileBackgroundIds'],['border','unlockedProfileBorderIds']])s.account[key]=COLLECTIBLES.filter(c=>c.kind===type).map(c=>c.id);
 }
 return s;
}
function fixture(region,cls,prep='prepared'){
 const s=regionalCombatFixture(region,prep,cls.id);
 s.inventory.stacks=[{itemId:region.foodId,quantity:10000}];
 s.character.currentHp=game.effectiveStats(s).hp;
 s.activity={kind:'combat',targetId:region.monsterId,combatTacticId:'balanced',startedAtMs:now,lastClaimAtMs:now};
 return s;
}
for(const region of REGIONAL_COMBAT_FIXTURES)for(const cls of CLASSES){
 const base=fixture(region,cls),baseline=game.combatSustainProjection(base,region.monsterId);
 for(const def of [null,...COMBAT_COMPANIONS.filter(c=>c.role!==cls.role.toLowerCase())])for(const investment of def?['new','max']:['none'])for(const buff of ['none','attack','defense','ceiling']){
  const s=buffs(companion(structuredClone(base),def,investment),buff),p=game.combatSustainProjection(s,region.monsterId),c=companionCombatContribution(s);
  if(!Number.isFinite(p.killsPerHour)||!Number.isFinite(p.foodPerHour)||p.foodPerHour<0||c.contributionPct>.120001)throw Error('Invalid combat budget');
  rows.push({region:region.regionName,classId:cls.id,companion:def?.name??'None',role:def?.role??'none',investment,buff,killsPerHour:p.killsPerHour,foodPerHour:p.foodPerHour,damagePerKill:p.damagePerKill,speedRatio:p.killsPerHour/baseline.killsPerHour,foodRatio:p.foodPerHour/baseline.foodPerHour,contribution:c.contributionPct});
 }
 for(const preparation of ['underprepared','prepared','optimized'])for(const tactic of ['assault','balanced','guarded'])for(const def of [null,...['tank','damage','support'].filter(role=>role!==cls.role.toLowerCase()).map(role=>COMBAT_COMPANIONS.find(c=>c.role===role))]){
  let s=companion(fixture(region,cls,preparation),def,'max');s.activity.combatTacticId=tactic;s.character.currentHp=game.effectiveStats(s).hp;
  const p=game.combatSustainProjection(s,region.monsterId,8),r=game.previewActivityReward(s,now+8*3600000);
  hunts.push({region:region.regionName,classId:cls.id,preparation,tactic,companion:def?.name??'None',kills:r.kills,food:r.foodConsumed??0,projectedFood:p.projectedFood,stopped:r.stoppedReason??null,endHp:r.endHp});
 }
 console.log(region.regionName+' / '+cls.id+' complete');
}
const expiry=[];
for(const region of [REGIONAL_COMBAT_FIXTURES[0],REGIONAL_COMBAT_FIXTURES.at(-1)])for(const potion of ['OATH_VIGOR_TONIC','OATH_WARD_TONIC']){
 const base=fixture(region,CLASSES[0]),short=structuredClone(base),full=structuredClone(base);
 short.character.preparation={itemId:potion,remainingEncounters:1};full.character.preparation={itemId:potion,remainingEncounters:60};
 const project=s=>{const r=game.previewActivityReward(s,now+8*3600000);return {kills:r.kills,food:r.foodConsumed,hp:r.endHp}};
 expiry.push({region:region.regionName,potion,noBuff:project(base),oneCharge:project(short),sixtyCharges:project(full)});
}
const range=xs=>({min:Math.min(...xs),max:Math.max(...xs),mean:xs.reduce((a,b)=>a+b,0)/xs.length});
const summary={generatedAt:new Date().toISOString(),projectionCases:rows.length,huntCases:hunts.length,scope:'Current ordinary-hunt runtime; 24 released companions, 9 classes, 8 regional fixtures. Max investment and ceiling buffs are synthetic stress cases, not normal early-game loadouts. No event companions, gem permutations, trial teams or co-op composition sweep.',companionOnly:{speedRatio:range(rows.filter(r=>r.buff==='none').map(r=>r.speedRatio)),foodRatio:range(rows.filter(r=>r.buff==='none').map(r=>r.foodRatio))},buffs:Object.fromEntries(['none','attack','defense','ceiling'].map(b=>[b,{speedRatio:range(rows.filter(r=>r.buff===b).map(r=>r.speedRatio)),foodRatio:range(rows.filter(r=>r.buff===b).map(r=>r.foodRatio))}])),stoppedHunts:hunts.filter(h=>h.stopped).length,byRegion:REGIONAL_COMBAT_FIXTURES.map(r=>({region:r.regionName,baselineFoodPerHour:range(rows.filter(x=>x.region===r.regionName&&x.companion==='None'&&x.buff==='none').map(x=>x.foodPerHour)),target:game.REGIONAL_FOOD_SUSTAIN_TARGETS[r.regionName],stops:hunts.filter(h=>h.region===r.regionName&&h.stopped).length})),expiry};
const out=path.resolve(root,process.env.COMBAT_AUDIT_OUTPUT||'artifacts/combat-companion-audit');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({summary,rows,hunts},null,2));fs.writeFileSync(path.join(out,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
