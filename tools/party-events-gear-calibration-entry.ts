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
import {simulateCombat} from '../backend/src/server/combat/engine';
import type {CombatantDefinition} from '../backend/src/server/combat/types';
import type {AuthoritativeLoadoutRecord,LoadoutRepository} from '../backend/src/server/coop/loadout-snapshots';
import {freezePartyEventBossLoadout,resolvePartyEventDayEightBoss,PARTY_EVENT_BOSS_SETTLEMENT_GRACE_MS,partyEventRosterMedianLevel,type FrozenPartyBossLoadout} from '../backend/src/server/party/weekly-party-boss-v2';
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

// Candidate pressure curves are test-only and NEVER passed to the live Day 8 resolver.
// Copy the baseline spell kit so comparisons isolate only HP/attack/defense curves.
const proposals=[
 {name:'A_gradual',hpGrowth:1.35,attackGrowth:1.17,defenseGrowth:1.14},
 {name:'B_medium',hpGrowth:1.42,attackGrowth:1.20,defenseGrowth:1.16},
 {name:'C_steep',hpGrowth:1.50,attackGrowth:1.23,defenseGrowth:1.18},
] as const;
function candidateTierClear(players:CombatantDefinition[],family:WeeklyPartyFamily,
 difficulty:WeeklyPartyDifficulty,seed:string,profile:typeof proposals[number]):number{
 const center=partyEventRosterMedianLevel(players.map(a=>a.level)),levelScale=Math.max(.045,center/25);
 const ds={standard:1,veteran:1.20,heroic:1.40}[difficulty];
 let tiersCleared=0;
 for(let tier=1;tier<=12;tier++){
  const enemy:CombatantDefinition={id:'PARTY_EVENT_BOSS',name:family,team:'enemies',role:'enemy',boss:true,
   level:Math.max(1,Math.min(100,center+2*(tier-1))),
   stats:{maxHp:Math.round(players.length*5400*levelScale*Math.pow(profile.hpGrowth,tier-1)*ds),
    attackPower:Math.round(355*levelScale*Math.pow(profile.attackGrowth,tier-1)*ds),
    healingPower:0,defense:Math.round(520*levelScale*Math.pow(profile.defenseGrowth,tier-1)*ds),
    accuracy:750,evasion:110,critChance:.045,critMultiplier:1.4,haste:.03},
   basicAttackMs:2700,basicAttackCoeff:.8,
   abilities:[
    {id:'PE_BOSS_SLAM',name:'Overwhelming Strike',cooldownMs:6900,castTimeMs:400,target:'current_target',
     priority:80,effects:[{kind:'damage',coeff:1.15}]},
    {id:'PE_BOSS_PULSE',name:'Rising Threat',cooldownMs:12000,castTimeMs:900,
     target:'all_enemies',priority:85,interruptible:true,
     effects:[{kind:'damage',coeff:.38+Math.min(.3,.03*tier)}]}],
   phases:[{id:'ENRAGE',hpPct:.35,target:'self',effects:[{kind:'buff',tag:'damage_done',
     value:Math.min(.35,.07+.015*tier),durationMs:90000}]}],
  };
  const result=simulateCombat({seed:seed+':'+tier,players,enemies:[enemy],maxDurationMs:90000});
  if(!result.victory)break;
  tiersCleared++;
 }
 return tiersCleared;
}
for(const proposal of proposals){
 for(const tier of tiers){
  for(const size of [2,4]){
   const clears:number[]=[];
   for(let i=0;i<classes.length;i++){
    const party=partyClasses(classes[i]!,size).map((id,index)=>saved(id,tier,index).actor);
    clears.push(candidateTierClear(party,families[i%families.length]!,'standard',
     'v3-curve:'+proposal.name+':'+tier+':'+size+':'+i,proposal));
   }
   console.log('EXPERIMENT '+proposal.name+' '+tier+'/'+size+'/standard mean='+
    (clears.reduce((a,b)=>a+b,0)/clears.length).toFixed(2)+
    ' range='+Math.min(...clears)+'-'+Math.max(...clears));
  }
 }
}
console.log('Candidate curves are experiments only. Do not switch production/hidden boss tuning without a full cross-engine snapshot and rewards review.');

console.log('Model limitations: no true server equipment snapshot bridge, quality/enchant/companion/food or complete family hazards; no balance changes were applied.');
