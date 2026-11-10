/**
 * Test-only Party Events v3 gear-informed calibration.
 *
 * Real equipment names, class restrictions, level gates, slot coverage and
 * effectiveStats ratios come from the mobile game. The deterministic backend
 * class kits remain the combat-ability baseline: THIS IS A PROXY, not the
 * authoritative equipment->snapshot bridge or proof of production balance.
 * No migrations, rewards, event claims or live routes are touched.
 */
import {createCharacter,effectiveStats,newGame} from '../apps/mobile/src/core/game';
import {characterTotalXpAtLevel} from '../apps/mobile/src/core/progression';
import {EQUIPMENT_ITEMS_V33} from '../apps/mobile/src/content/equipment-items-v33';
import {V33_EQUIPMENT_RECIPES} from '../apps/mobile/src/content/equipment-recipes-v33';
import type {ClassId,GameState} from '../apps/mobile/src/core/types';
import {launchPlayer} from '../backend/src/server/combat/content/launch-combat';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../backend/src/server/coop/loadout-snapshots';
import {freezePartyEventBossLoadout,resolvePartyEventDayEightBoss,PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,type FrozenPartyBossLoadout} from '../backend/src/server/party/weekly-party-boss-v2';
import {deriveRole} from '../backend/src/server/coop/role-readiness';
import {WEEKLY_PARTY_EVENT_FAMILIES,type WeeklyPartyDifficulty,type WeeklyPartyFamily} from '../backend/src/server/party/weekly-party-events-v2';

const classes = ['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','STONECALLER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER'] as const;
const displayNames:Record<string,string>={IRONWARDEN:'Ironwarden',BASTION:'Bastion',DREADGUARD:'Dreadguard',DAWNKEEPER:'Dawnkeeper',STONECALLER:'Stonecaller',WAYFINDER:'Wayfinder',RAVAGER:'Ravager',HEXWEAVER:'Hexweaver',KNIFE_DANCER:'Knife Dancer'};
const tiers=['T1','T2','T3','T4'] as const;
const difficulties=['standard','veteran','heroic'] as const;
const families=Object.keys(WEEKLY_PARTY_EVENT_FAMILIES) as WeeklyPartyFamily[];
const recipes=new Map(V33_EQUIPMENT_RECIPES.map(r=>[r.output.itemId,r.v33EquipmentTier]));
const WEEK=7*86_400_000;
const starts=Date.parse('2026-11-09T00:00:00Z');
function assert(x:unknown,msg:string):asserts x{if(!x)throw Error('party-calibration-v3: '+msg);}
function pickGear(classId:ClassId,tier:string){
 const selected=new Map<string,typeof EQUIPMENT_ITEMS_V33[number]>();
 const eligible=EQUIPMENT_ITEMS_V33.filter(item=>item.classRestriction===classId && recipes.get(item.id)===tier && item.slot);
 for(const item of eligible) {
  const previous=selected.get(item.slot!);
  if(!previous || (item.attack??0)+(item.defense??0)+(item.hp??0)>(previous.attack??0)+(previous.defense??0)+(previous.hp??0))selected.set(item.slot!,item);
 }
 assert(selected.size>=8,classId+' '+tier+' should have at least 8 legal equipment slots, got '+selected.size);
 const level=Math.max(1,...[...selected.values()].map(item=>item.requiredLevel??1));
 return {level,equipment:Object.fromEntries([...selected].map(([slot,item])=>[slot,item.id]))};
}
const cohort=new Map<string,{level:number;ratios:{hp:number;attack:number;defense:number};slots:number}>();
for(const classId of classes){
 for(const tier of tiers){
  const naked=createCharacter(newGame(0),classId,'Calibration');
  const baseline=effectiveStats(naked);
  const kit=pickGear(classId,tier);
  const base=naked.character!;
  const prepared={...naked,character:{...base,level:kit.level,xp:characterTotalXpAtLevel(kit.level),equipment:{...kit.equipment}}} as GameState;
  const stats=effectiveStats(prepared);
  cohort.set(classId+':'+tier,{level:kit.level,ratios:{hp:stats.hp/Math.max(1,baseline.hp),attack:stats.attack/Math.max(1,baseline.attack),defense:stats.defense/Math.max(1,baseline.defense)},slots:Object.keys(kit.equipment).length});
 }
}
function saved(classId:typeof classes[number],tier:typeof tiers[number],index:number,overrideLevel?:number):FrozenPartyBossLoadout {
 const c=cohort.get(classId+':'+tier)!;
 const level=overrideLevel??c.level;
 const base=launchPlayer(displayNames[classId],level);
 const accountId='acct-'+index,characterId='char-'+index;
 const record:AuthoritativeLoadoutRecord={
  accountId,characterId,classId,loadoutId:'gear-'+tier,revision:1,characterLevel:level,
  dungeonUnlocked:false,legalEquipment:true,capabilities:[],abilities:structuredClone(base.abilities),
  stats:{characterId,classId,level,
   maxHp:base.stats.maxHp*c.ratios.hp,attackPower:base.stats.attackPower*c.ratios.attack,
   healingPower:base.stats.healingPower*Math.sqrt(c.ratios.attack*c.ratios.hp),
   defense:base.stats.defense*c.ratios.defense,
   accuracy:base.stats.accuracy,evasion:base.stats.evasion,
   critChance:base.stats.critChance,critMultiplier:base.stats.critMultiplier,
   haste:base.stats.haste},
 };
 assert(deriveRole(classId)===base.role,'class role disagreement: '+classId);
 const source:LoadoutRepository={getOwnedLoadout:(a,c,id)=>a===accountId&&c===characterId&&id===record.loadoutId?record:undefined};
 return freezePartyEventBossLoadout({selection:{accountId,characterId,loadoutId:record.loadoutId,expectedRevision:1},repository:source,eventStartsAtMs:starts,eventEndsAtMs:starts+WEEK,nowMs:starts+1000});
}
function partyClasses(focus:typeof classes[number],partySize:number):typeof classes[number][] {
 const partners:typeof classes[number][]=['WAYFINDER','DAWNKEEPER','IRONWARDEN','RAVAGER'];
 return [focus,...partners.filter(x=>x!==focus)].slice(0,partySize);
}
const results:{classId:string;tier:string;partySize:number;difficulty:string;family:string;cleared:number;band:number;damage:number}[]=[];
for(let c=0;c<classes.length;c++){
 for(const tier of tiers){
  for(const partySize of [2,3,4]){
   for(const difficulty of difficulties) {
    const family=families[(c+partySize)%families.length]!;
    const roster=partyClasses(classes[c]!,partySize).map((id,index)=>saved(id,tier,index));
    const result=resolvePartyEventDayEightBoss({
     eventId:'v3-calibration:'+classes[c]+':'+tier+':'+partySize+':'+difficulty, family,
     difficulty,seed:100+c*20+partySize,eventStartsAtMs:starts,eventEndsAtMs:starts+WEEK,
     nowMs:starts+WEEK+PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,frozen:roster,orders:[],
    });
    assert(result.tiers.length>=1 && result.tiers.length<=12,'invalid tier count');
    assert(Number.isFinite(result.totalBossDamage)&&result.totalBossDamage>=0,'bad damage');
    results.push({classId:classes[c]!,tier,partySize,difficulty,family,cleared:result.tiersCleared,band:result.rewardBand,damage:result.totalBossDamage});
   }
  }
 }
}
const groups=new Map<string,typeof results>();
for(const row of results){const key=row.tier+'/'+row.partySize+'/'+row.difficulty;groups.set(key,[...(groups.get(key)??[]),row]);}
console.log('PARTY_EVENTS_GEAR_PROXY_V3 rows='+results.length+' classes='+classes.length+' gearTiers='+tiers.join(','));
console.log('Source: actual mobile equipment catalog/effectiveStats gear multipliers + backend 9 class combat kits; not production loadouts');
for(const [key,rows] of groups){
 const mean=(rows.reduce((s,r)=>s+r.cleared,0)/rows.length).toFixed(2);
 const min=Math.min(...rows.map(r=>r.cleared)),max=Math.max(...rows.map(r=>r.cleared));
 const first=(rows.filter(r=>r.cleared>=1).length/rows.length*100).toFixed(0);
 console.log(key+' mean='+mean+' range='+min+'-'+max+' tier1Clear='+first+'%');
}
for(const tier of tiers){
 const t=results.filter(r=>r.tier===tier&&r.partySize===2&&r.difficulty==='standard');
 console.log('DUO '+tier+' '+t.map(r=>r.classId+':'+r.cleared).join(' '));
}
console.log('Model limitations: no true server equipment snapshot bridge, quality/enchant/companion/food or complete family hazards; no balance changes were applied.');
