/**
 * Party Events v4 — real online loadout derivation, test-only.
 * Uses the SAME authenticated-state -> current equipment -> co-op record -> 
 * verified frozen combatant chain as deployed dungeons. No live route or DB.
 * All states below are synthetic fixtures; results are NOT player data.
 */
import {createCharacter,newGame} from '../apps/mobile/src/core/game';
import {characterTotalXpAtLevel,classCombatSkillTotalXpAtLevel} from '../apps/mobile/src/core/progression';
import {EQUIPMENT_ITEMS_V33} from '../apps/mobile/src/content/equipment-items-v33';
import {V33_EQUIPMENT_RECIPES} from '../apps/mobile/src/content/equipment-recipes-v33';
import {classCombatSkillLevelFromXp} from '../apps/mobile/src/core/progression';
import type {ClassId,GameState,GearSlot,CraftedGearInstance} from '../apps/mobile/src/core/types';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from '../backend/online/coop-loadout';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../backend/src/server/coop/loadout-snapshots';
import {freezePartyEventBossLoadout,resolvePartyEventDayEightBoss,PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,type FrozenPartyBossLoadout} from '../backend/src/server/party/weekly-party-boss-v2';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyDifficulty,type WeeklyPartyFamily} from '../backend/src/server/party/weekly-party-events-v2';
import {COMPANION_ROLE} from '../backend/src/server/companions/policy';
import {deriveRole} from '../backend/src/server/coop/role-readiness';

const classes:ClassId[]=['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','STONECALLER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER'];
const tiers=['T1','T2','T3','T4'] as const;
type Tier=typeof tiers[number];
type Profile='plain'|'prepared';
const difficulties=['standard','veteran','heroic'] as const;
const families=Object.keys(WEEKLY_PARTY_EVENT_FAMILIES) as WeeklyPartyFamily[];
const now=Date.parse('2026-11-09T00:00:00.000Z')+1000;
const week=7*86400000;
const recipeTier=new Map(V33_EQUIPMENT_RECIPES.map(r=>[r.output.itemId,r.v33EquipmentTier]));
function assert(value:unknown,reason:string):asserts value {if(!value)throw Error('party_v4_authoritative: '+reason);}
function ownedGear(classId:ClassId,tier:Tier){
 const sorted=EQUIPMENT_ITEMS_V33.filter(i=>i.classRestriction===classId&&recipeTier.get(i.id)===tier&&i.slot);
 const bySlot=new Map<GearSlot,typeof sorted[number]>();
 for(const item of sorted){
  const slot=item.slot!;
  const old=bySlot.get(slot);
  if(!old||((item.attack??0)+(item.defense??0)+(item.hp??0))>((old.attack??0)+(old.defense??0)+(old.hp??0)))bySlot.set(slot,item);
 }
 assert(bySlot.size>=8,'incomplete authored '+classId+':'+tier+' slots: '+bySlot.size);
 return [...bySlot.entries()];
}
function buildTrustedSyntheticState(classId:ClassId,tier:Tier,profile:Profile,memberIndex:number):GameState{
 const state=createCharacter(newGame(0),classId,'Party Calibration');
 const char=state.character!;
 const chosen=ownedGear(classId,tier);
 const level=Math.max(1,...chosen.map(([,item])=>item.requiredLevel??1));
 char.id='v4-calibration-character-'+memberIndex;
 char.xp=characterTotalXpAtLevel(level);
 char.level=level;
 const enhanced=profile==='prepared';
 char.equipment=Object.fromEntries(chosen.map(([slot,item])=>[slot,item.id]));
 char.equipmentInstanceIds={};
 const instances:CraftedGearInstance[]=[];
 for(const [slot,item] of chosen){
  const id='v4:'+memberIndex+':'+slot+':'+item.id;
  char.equipmentInstanceIds[slot]=id;
  instances.push({
   id,itemId:item.id,ownerCharacterId:char.id,
   rarity:enhanced?'rare':'common',
   quality:enhanced?85:50,
   acquireSource:'craft',sourceReceiptKey:'v4-calibration-fixture:'+memberIndex+':'+slot,
   createdAtMs:1,
   enhancement:enhanced?{
    rank:4,failures:0,
    ...(slot==='ring'?{statGemId:'gem:stat_precision:g5',effectGemId:'gem:effect_predator:g5',statGemRollPercent:110,effectGemRollPercent:110}:{}),
    gemIds:slot==='ring'?['gem:stat_precision:g5','gem:effect_predator:g5']:[],
   }:{rank:0,failures:0,gemIds:[]},
  });
 }
 state.account.craftedGearInstances=instances;
 if(enhanced){
  const boostedXp=classCombatSkillTotalXpAtLevel(30);
  char.classSkills=(char.classSkills??[]).map(s=>({...s,xp:boostedXp,level:classCombatSkillLevelFromXp(boostedXp)}));
  const role=deriveRole(classId);
  const companionId=role==='damage'?'UNIT_002':'UNIT_001';
  assert(COMPANION_ROLE[companionId]!==role,'companion role must differ');
  char.equippedCombatCompanionId=companionId;
  state.account.unlockedCombatCompanionIds=[companionId];
  state.account.combatCompanionProgress={
   ...state.account.combatCompanionProgress,
   [companionId]:{level:10,xp:0,ascensionTier:0,bondLevel:1,bondXp:0,bondTraitUnlocked:false},
  };
 }
 return state;
}
function freezeVerified(classId:ClassId,tier:Tier,profile:Profile,index:number){
 const state=buildTrustedSyntheticState(classId,tier,profile,index);
 const accountId='v4-trusted-account-'+index;
 const initial=JSON.stringify(state);
 const record=deriveOnlineCoopLoadout(accountId,state,71);
 assert(JSON.stringify(state)===initial,'derived co-op record must never modify saved state');
 assert(record.accountId===accountId && record.characterId===state.character!.id,'authoritative ownership');
 assert(record.legalEquipment,'legal class-specific equipped kit');
 assert(record.characterLevel===state.character!.level,'verified character level');
 if(profile==='prepared'){
  assert((record.stats.effectGems?.length??0)>0,'real equipped predator effect gem must reach server record');
  assert(!!record.stats.combatCompanion,'owned, idle, different-role companion must reach server record');
 }
 const repository:LoadoutRepository={getOwnedLoadout:(a,c,id)=>a===accountId&&c===record.characterId&&id==='current'?record:undefined};
 const frozen=freezePartyEventBossLoadout({
  selection:{accountId,characterId:record.characterId,loadoutId:'current',expectedRevision:71},
  repository,eventStartsAtMs:now-1000,eventEndsAtMs:now-1000+week,nowMs:now,
 });
 assert(frozen.actor.id===record.characterId,'real actor id');
 assert(frozen.actor.role===deriveRole(classId),'real class role');
 if(profile==='prepared'){
  assert((frozen.actor.effectGems?.length??0)>0,'frozen actor retains equipped Effect Gem');
  assert(frozen.actor.abilities.some(a=>a.tags?.includes('combat_companion')),'frozen actor retains validated companion assist');
 }
 return {state,record,frozen,hash:onlineCoopLoadoutHash(record)};
}
const memo=new Map<string,ReturnType<typeof freezeVerified>>();
function get(classId:ClassId,tier:Tier,profile:Profile,index:number){
 const key=[classId,tier,profile,index].join(':');
 if(!memo.has(key))memo.set(key,freezeVerified(classId,tier,profile,index));
 return memo.get(key)!;
}
for(const classId of classes){
 for(const tier of tiers){
  const plain=get(classId,tier,'plain',0);
  const prepared=get(classId,tier,'prepared',0);
  assert(prepared.record.stats.attackPower>=plain.record.stats.attackPower,'better gear/class training must not lower attack '+classId+':'+tier);
  assert(prepared.record.stats.maxHp>=plain.record.stats.maxHp,'upgraded HP must not regress');
  assert(prepared.hash!==plain.hash,'quality, rarity, upgrades, gems, skills and companion must affect signed online record');
  assert(prepared.frozen.snapshotHash!==plain.frozen.snapshotHash,'frozen hash changes with trusted loadout');
 }
}
const testCase=get('IRONWARDEN','T2','prepared',0);
const fromWrongOwner=structuredClone(testCase.state);
const ringId=fromWrongOwner.character!.equipmentInstanceIds!.ring!;
const ring=fromWrongOwner.account.craftedGearInstances!.find(x=>x.id===ringId)!;
ring.ownerCharacterId='another-character';
const wrong=deriveOnlineCoopLoadout('v4-trusted-account-0',fromWrongOwner,71);
assert(!wrong.stats.effectGems?.length,'foreign forged gems must not credit the owner's dungeon/Party loadout');
const forged=structuredClone(testCase.frozen);
forged.actor.stats.attackPower*=100;
let denied=false;
try{resolvePartyEventDayEightBoss({eventId:'v4-tamper',family:'broken_caravan',difficulty:'standard',seed:1,
 eventStartsAtMs:now-1000,eventEndsAtMs:now-1000+week,
 nowMs:now-1000+week+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
 frozen:[forged,get('WAYFINDER','T2','plain',1).frozen],orders:[]});}
catch(e){denied=String(e).includes('party_boss_invalid_frozen_loadout');}
assert(denied,'tampered frozen actor must fail boss hash verification');
function roster(focus:ClassId,size:number):ClassId[]{
 const support:ClassId[]=['WAYFINDER','DAWNKEEPER','IRONWARDEN','RAVAGER'];
 return [focus,...support.filter(x=>x!==focus)].slice(0,size);
}
const results:Array<{tier:Tier;size:number;difficulty:WeeklyPartyDifficulty;profile:Profile;
 cleared:number;band:number;family:WeeklyPartyFamily;focus:ClassId;damage:number}>=[];
for(const profile of ['plain','prepared'] as const){
 for(let c=0;c<classes.length;c++){
  for(const tier of tiers){
   for(const size of [2,3,4]){
    for(const difficulty of difficulties){
     // Prepared run exercises the same full matrix, not merely one hand-picked showcase.
     const family=families[(c+size)%families.length]!;
     const frozen=roster(classes[c]!,size).map((classId,index)=>get(classId,tier,profile,index).frozen);
     const result=resolvePartyEventDayEightBoss({
      eventId:'v4:'+profile+':'+c+':'+tier+':'+size+':'+difficulty,
      family,difficulty,seed:4700+c*31+size,
      eventStartsAtMs:now-1000,eventEndsAtMs:now-1000+week,
      nowMs:now-1000+week+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,
      frozen,orders:[],
     });
     assert(result.tiers.length>=1&&result.tiers.length<=12,'bounded tier count');
     assert(Number.isFinite(result.totalBossDamage)&&result.rewardBand>=1&&result.rewardBand<=6,'real bounded engine outputs');
     results.push({tier,size,difficulty,profile,focus:classes[c]!,family,cleared:result.tiersCleared,band:result.rewardBand,damage:result.totalBossDamage});
    }
   }
  }
 }
}
function summary(rows:typeof results){
 return {mean:rows.reduce((s,v)=>s+v.cleared,0)/Math.max(1,rows.length),
  min:Math.min(...rows.map(x=>x.cleared)),max:Math.max(...rows.map(x=>x.cleared)),
  tier1Pct:100*rows.filter(x=>x.cleared>=1).length/Math.max(1,rows.length)};
}
console.log('PARTY_V4_AUTHENTIC_DUNGEON_LOADOUTS rows='+results.length+' 9 classes x 4 tiers x 3 sizes x 3 difficulties x 2 profiles');
console.log('Input: synthetic 10-slot owned crafted copies, Q50/common/rank0 plain vs Q85/rare/rank4/G5 Precision+Predator/level10 other-role companion/level30 class skills prepared');
console.log('Calculations: live deriveOnlineCoopLoadout -> source verification -> Party freeze hash -> deterministic backend boss; no dungeon downsync or user player stats');
for(const profile of ['plain','prepared'] as const){
 for(const tier of tiers){
  for(const size of [2,3,4]){
   for(const difficulty of difficulties){
    const selection=results.filter(x=>x.profile===profile&&x.tier===tier&&x.size===size&&x.difficulty===difficulty);
    const v=summary(selection);
    console.log('V4_METRIC,'+[profile,tier,size,difficulty,v.mean.toFixed(2),v.min,v.max,v.tier1Pct.toFixed(0)].join(','));
   }
  }
 }
}
const byTier=(tier:Tier,profile:Profile)=>results.filter(r=>r.tier===tier&&r.profile===profile&&r.size===2&&r.difficulty==='standard');
for(const tier of tiers){
 const x=byTier(tier,'plain'),y=byTier(tier,'prepared');
 const a=summary(x),b=summary(y);
 console.log('V4_DUO_STANDARD '+tier+' plain='+a.mean.toFixed(2)+' prepared='+b.mean.toFixed(2)+' tier1Plain='+a.tier1Pct.toFixed(0)+' tier1Prepared='+b.tier1Pct.toFixed(0));
}
console.log('LIMITS: Synthetic saved characters, not actual players; one seed/focus/family per matrix cell; no supplies, guild buffs, prepared potion, boss family hazards, or item resource economies. No live balance changed.');
