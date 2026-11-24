import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {proposeComponentEconomy} from './component-economy-review-v9.mjs';
import {processingRegistry} from './unified-economy-review-v12.mjs';
import {balancePolicy,refiningPlan,finalBill,sourceRateStress,gatheringPlan,raritySupply,candidateCosts,progressionAccess,summary} from './economy-balance-review-v13.mjs';
const rows=proposeComponentEconomy(),first=rows.find(r=>r.sourceId==='EQ2_FIELDBORN_GUARD_HELMET_FOUNDATION');
const deny=x=>{for(const k of ['mayCraft','mayMint','mayTrade','mayDrop','mayEquip','releaseApproved'])assert.equal(x[k],false);};
test('29 unique processing outputs; batch ratios and XP retained; no extra new processing fee',()=>{
 const source=new Map(processingRegistry('reuse_candidate','pending1693').map(p=>[p.output,p])),a=refiningPlan();
 assert.equal(a.length,29);assert.equal(new Set(a.map(x=>x.output)).size,29);
 for(const r of a){deny(r);const p=source.get(r.output);assert.equal(r.xp/r.quantity,p.xp/p.quantity);
 for(const [id,q] of Object.entries(r.inputs))assert.equal(q/r.quantity,p.inputs[id]/p.quantity);
 if(r.referenceOnly){assert.equal(r.quantity,p.quantity);assert.equal(r.seconds,p.seconds);assert.equal(r.xp,p.xp);}
 else {assert.equal(r.chargedGoldCandidate,0);assert(r.xpPerHour<=p.xp/p.seconds*3600*1.2+1e-7);}
 }
 for(const [id,fee] of Object.entries({COPPER_INGOT:30,ASTER_IRON_INGOT:50,SUNSTONE_INGOT:290,FROSTIRON_INGOT:730}))assert.equal(a.find(x=>x.output===id).chargedGoldCandidate,fee);
 assert.throws(()=>refiningPlan('production'));
});
test('T1 reference scenario, direct forge fee preserved, batches rounded only once',()=>{
 const b=finalBill(first);deny(b);assert.equal(b.raw.COPPER_ORE,60);assert.equal(b.raw.GREENWOOD_LOG,47);
 assert.equal(b.leftovers.COPPER_INGOT,4);assert.equal(b.processingGold,142);
 assert.equal(b.totalGold,342);assert.equal(b.finalForgeGold,200);assert.equal(b.processingSeconds,454);
 const a=finalBill(first,'snapshot');assert.equal(a.raw.COPPER_ORE,40);assert.equal(a.finalForgeGold,b.finalForgeGold);
 assert.equal(a.processingGold,166);assert.equal(a.totalGold,366);
 for(const r of rows){const b=finalBill(r);deny(b);assert.equal(b.finalForgeGold,r.candidateGold);assert.equal(b.forgeSeconds,r.seconds);assert.equal(b.forgeXp,r.xp);
 assert(b.totalGold===b.processingGold+b.finalForgeGold);assert(Object.values(b.raw).every(q=>Number.isSafeInteger(q)&&q>0));}
});
test('all 50 combined bills preserve final fee and use existing scaled input proposal once',()=>{
 const c=candidateCosts();assert.equal(c.normal.length,928);assert.equal(c.combined.length,50);
 for(const b of c.combined){deny(b);const base=c.normal.find(x=>x.sourceId===b.sourceId);assert(base);assert.equal(b.finalForgeGold,base.finalForgeGold);assert(b.processingGold>=base.processingGold);assert(b.processingSeconds>=base.processingSeconds);assert.equal(b.laneXp,null);}
});
test('source rates and gathering yields explicit candidate only, no secondary find XP duplication',()=>{
 const g=gatheringPlan(),s=sourceRateStress();assert.equal(g.length,8);assert.equal(s.length,75);
 for(const x of g){deny(x);assert.equal(x.sourceRegistered,false);assert(x.expectedUnitsPerHour>0);
 if(x.acquisition==='SECONDARY_FIND_ON_ELIGIBLE_EXISTING_ACTION'){assert.equal(x.secondaryFindExtraXp,0);assert.equal(x.xpPerHour,null);}}
 for(const x of s){deny(x);assert(x.p>0&&x.p<1);assert(x.hours90AtLeastOne>0);assert.equal(x.sourceRegistered,false);}
});
test('rarity mass and independent receipt expectations, no market or combat authority',()=>{
 const r=raritySupply();assert.equal(r.length,6);assert.equal(r.reduce((n,x)=>n+x.expectedPer1000,0),1000);
 const m=r.find(x=>x.rarity==='mythic');assert.equal(m.expectedAttemptsExact,1000);assert.equal(m.attempts90Exact,2302);assert.equal(m.independentTwoLaneExpectedAttempts,2000);
 for(const x of r)deny(x);
 const a=progressionAccess();assert.equal(a.length,928);for(const x of a){deny(x);assert.equal(x.combatLevelRequired,0);assert.equal(x.secondaryProfessionRequired,false);assert.equal(x.soloSelfSupplyGuaranteed,false);}
});
test('structural boundary only: frozen Forge, Skills tactics and universal mint gate remain review-only',()=>{
 const file=p=>readFileSync(new URL('../../../'+p,import.meta.url),'utf8');
 assert.match(file('backend/src/server/equipment/equipment-crafting-v2-gate.ts'),/EQUIPMENT_CRAFTING_V2_SERVER_RELEASED=false/);
 assert.match(file('backend/src/server/combat/v2/equipment-frozen-forge-handoff-audit.ts'),/EQ2_FROZEN_FORGE_PRE_SCALED_NO_DOUBLE_MULTIPLIER/);
 assert.match(file('backend/src/server/combat/v2/ability-counterplay-strategies.ts'),/compileServerSkillBuildV2/);
 assert.match(file('backend/src/server/equipment/equipment-crafting-v2-universal-mint-gate-review.ts'),/canMintUniversalFromPreview:false/);
 const s=summary();deny(s);assert.equal(s.routes,928);assert.equal(s.materials,75);assert.equal(s.combined,50);assert.equal(s.combatIntegration,'STRUCTURAL_HANDOFF_ONLY_NO_MINT_CP_OR_SET_APPROVAL');
 console.log('EQ2_ECONOMY_V13 '+JSON.stringify(s));
});
