/**
 * Party Events V90 — review-only authored boss trait and phase kits.
 *
 * Source is V2's FROZEN, server-owned boss from tierBoss(), not an arbitrary
 * user-selected class, gem, trait roll, item, or encounter. This optional
 * compiler models proposed 2.0 mechanics with effects already understood by
 * the deterministic combat engine. No live Party, dungeon, World Boss or EQ2
 * encounter imports this file; the active Party boss still uses its old kit.
 *
 * The proposed 17 stat/28 signature trait catalogue and 5 implemented Combat
 * trait hooks are not yet integrated with the Party co-op boss loadout.
 * In particular, REFLECTION FROM BOSS CASTS AND PHASES IS FORBIDDEN until
 * the shared 0.1% boss HP/5s budget and source-tagged protection is available.
 */
import type {
 AbilityDefinition,BossPhaseDefinition,CombatantDefinition,
} from '../combat/types';
import type {WeeklyPartyFamily} from './weekly-party-events-v2';

export const PARTY_EVENT_BOSS_TRAITS_V90_RELEASED=false;
export const PARTY_EVENT_BOSS_TRAITS_V90_VERSION='party-event-boss-traits-v90' as const;
export type PartyBossTraitV90=
 'roadbreaker_rally'|'nightfall_rend'|'runebound_ward'|'reliquary_mirror';
export interface PartyBossTraitProfileV90 {
 readonly family:WeeklyPartyFamily;
 readonly trait:PartyBossTraitV90;
 readonly storyName:string;
 /** Normal equipment and support should be usable without mandatory traits. */
 readonly counterplay:readonly string[];
 /** This is a hidden balance intent, NOT measured production balance. */
 readonly intendedRolePressure:'physical'|'bleed'|'ward'|'sustain';
}
export const PARTY_EVENT_BOSS_TRAIT_PROFILES_V90:Readonly<
 Record<WeeklyPartyFamily,PartyBossTraitProfileV90>
>={
 broken_caravan:{
  family:'broken_caravan',trait:'roadbreaker_rally',
  storyName:'Roadbreaker Rally',
  counterplay:['physical_defense','shields','interrupts','healing'],
  intendedRolePressure:'physical',
 },
 nightfall_hunt:{
  family:'nightfall_hunt',trait:'nightfall_rend',
  storyName:'Nightfall Rend',
  counterplay:['physical_defense','eligible_cleanses','healing','tenacity_ordinary_only'],
  intendedRolePressure:'bleed',
 },
 broken_wards:{
  family:'broken_wards',trait:'runebound_ward',
  storyName:'Runebound Ward',
  counterplay:['elemental_ward','interrupts','direct_damage','shield_break'],
  intendedRolePressure:'ward',
 },
 lost_reliquary:{
  family:'lost_reliquary',trait:'reliquary_mirror',
  storyName:'Reliquary Mirror',
  counterplay:['elemental_ward','shields','healing','interrupts'],
  intendedRolePressure:'sustain',
 },
};
const bossNames:Readonly<Record<WeeklyPartyFamily,string>>={
 broken_caravan:'Roadbreaker Captain',
 nightfall_hunt:'Nightfall Alpha',
 broken_wards:'The Unbound Guardian',
 lost_reliquary:'Reliquary Sentinel',
};
const marker='party-event:boss-traits:v90';
const familyKey=(family:WeeklyPartyFamily)=>
  'party-event:boss-family:'+family;
const damage=(coeff:number,damageType:'physical'|'shadow'|'arcane')=>
 ({kind:'damage' as const,coeff,damageType});
const dot=(coeff:number,damageType:'physical'|'shadow')=>
 ({kind:'dot' as const,coeff,damageType,tag:damageType==='physical'?'bleed':'dissonance',
   durationMs:6000,tickMs:2000,removable:true});
const shield=(hp:number,pct:number)=>
 ({kind:'shield' as const,flat:Math.round(hp*pct)});

function authoredKit(family:WeeklyPartyFamily,tier:number,hp:number):{
 abilities:AbilityDefinition[];phases:BossPhaseDefinition[];
}{
 const phaseName=(id:string,hpPct:number,target:BossPhaseDefinition['target'],
  effects:BossPhaseDefinition['effects']):BossPhaseDefinition=>({
   id,name:id.replaceAll('_',' '),hpPct,target,effects,
  });
 const cast=(id:string,name:string,cooldownMs:number,castTimeMs:number,
  target:AbilityDefinition['target'],effects:AbilityDefinition['effects'],
  priority=84):AbilityDefinition=>({
   id,name,cooldownMs,castTimeMs,target,priority,interruptible:true,effects,
  });
 // Growth in existing V4 base HP/ATK/DEF remains unchanged; avoid multiplying
 // traits by a second tier growth factor. Higher tier modifies only phase
 // enrage + very slightly, capped at 10% for all difficulties.
 const enrage=Math.min(.10,.055+.004*tier);
 if(family==='broken_caravan')return {
  abilities:[
   cast('PE_V90_RALLY_CLEAVE','Rallying Cleave',14200,1400,'all_enemies',[
    damage(.32,'physical'),
    {kind:'debuff',tag:'damage_taken',value:.04,durationMs:4800,removable:true},
   ]),
   cast('PE_V90_REINFORCED_SWING','Reinforced Swing',11200,850,
    'current_target',[damage(.96,'physical')],75),
  ],
  phases:[
   phaseName('PE_V90_CARAVAN_FORMATION',.70,'self',[
    shield(hp,.028),
   ]),
   phaseName('PE_V90_CARAVAN_LAST_STAND',.35,'self',[
    {kind:'buff',tag:'damage_done',value:enrage,durationMs:16000},
   ]),
  ],
 };
 if(family==='nightfall_hunt')return {
  abilities:[
   cast('PE_V90_RENDING_HOWL','Rending Howl',15500,1500,'all_enemies',[
    damage(.22,'physical'),dot(.045,'physical'),
   ]),
   cast('PE_V90_HUNTER_LUNGE','Hunter Lunge',12000,1050,
    'current_target',[{
     ...damage(.90,'physical'),executeBelowHpPct:.30,executeBonus:.12,
    }],78),
  ],
  phases:[
   phaseName('PE_V90_NIGHTFALL_SHROUD',.70,'all_enemies',[
    {kind:'dot',coeff:.025,damageType:'physical',tag:'bleed',durationMs:4000,
     tickMs:2000,removable:true},
   ]),
   phaseName('PE_V90_NIGHTFALL_LAST_HUNT',.35,'self',[
    {kind:'buff',tag:'damage_done',value:enrage,durationMs:15000},
   ]),
  ],
 };
 if(family==='broken_wards')return {
  abilities:[
   cast('PE_V90_RUNE_STORM','Rune Storm',17500,1750,'all_enemies',[
    damage(.35,'arcane'),
    {kind:'debuff',tag:'damage_done',value:-.05,durationMs:5500,removable:true},
   ]),
   cast('PE_V90_STONE_HEART','Stone Heart',20000,1000,
    'self',[shield(hp,.025)],77),
  ],
  phases:[
   phaseName('PE_V90_WARD_IGNITION',.70,'self',[shield(hp,.035)]),
   phaseName('PE_V90_WARD_FRACTURE',.35,'self',[
    {kind:'debuff',tag:'damage_taken',value:.07,durationMs:6500},
   ]),
  ],
 };
 if(family==='lost_reliquary')return {
  abilities:[
   cast('PE_V90_SHADOW_ECHO','Shadow Echo',18000,1650,'all_enemies',[
    damage(.29,'shadow'),dot(.035,'shadow'),
   ]),
   cast('PE_V90_MIRROR_VEIL','Mirror Veil',23500,1250,
    'self',[shield(hp,.035)],72),
  ],
  phases:[
   phaseName('PE_V90_RELIQUARY_REFLECTION',.70,'self',[shield(hp,.035)]),
   phaseName('PE_V90_RELIQUARY_FRACTURED_MIRROR',.35,'self',[
    {kind:'buff',tag:'damage_done',value:.05,durationMs:11000},
    {kind:'debuff',tag:'damage_taken',value:.08,durationMs:6500},
   ]),
  ],
 };
 throw Error('party_event_v90_unknown_family');
}

/**
 * Test-only opt-in. Does not change the original live/hidden boss factory.
 * Rejects a custom enemy attempting to impersonate a trusted Party boss.
 * Replaces the generic V2 kit instead of layering a second Enrage and
 * duplicate all-party damage. Never composes normal Enemy 2.0 random traits.
 */
export function preparePartyEventBossTraitKitV90(
 boss:CombatantDefinition,
 family:WeeklyPartyFamily,
 tier:number,
 qaEnabled=false,
):CombatantDefinition{
 if(!qaEnabled)return boss;
 if(PARTY_EVENT_BOSS_TRAITS_V90_RELEASED||
  process.env.NODE_ENV==='production')
  throw Error('party_event_v90_unreleased');
 if(!boss||boss.id!=='PARTY_EVENT_BOSS'||boss.team!=='enemies'||
  boss.role!=='enemy'||boss.boss!==true||
  !Object.prototype.hasOwnProperty.call(bossNames,family)||
  boss.name!==bossNames[family]||
  !Number.isSafeInteger(tier)||tier<1||tier>12||
  !Number.isFinite(boss.stats?.maxHp)||boss.stats.maxHp<1||
  boss.tags?.some(t=>t===marker||t.startsWith('enemy-v2:'))||
  boss.abilities.length!==2||boss.phases?.length!==1||
  boss.abilities[0]?.id!=='PE_BOSS_SLAM'||
  boss.abilities[1]?.id!=='PE_BOSS_PULSE'||
  boss.phases?.[0]?.id!=='ENRAGE')
  throw Error('party_event_v90_untrusted_or_already_compiled_boss');
 const kit=authoredKit(family,tier,boss.stats.maxHp);
 const abilityIds=new Set(kit.abilities.map(a=>a.id));
 const phaseIds=new Set(kit.phases.map(p=>p.id));
 if(abilityIds.size!==2||phaseIds.size!==2||
  kit.abilities.some(a=>!a.interruptible||a.castTimeMs<800||
   a.effects.some(e=>e.kind==='damage'&&((e.coeff??0)>1.1||
    e.damageType==='true'))||
   a.effects.some(e=>e.kind==='shield'&&(e.shieldReflectPct??0)>0))||
  kit.phases.some(p=>p.effects.some(e=>
   e.kind==='shield'&&(e.flat??0)>Math.round(boss.stats.maxHp*.04))))
  throw Error('party_event_v90_unbounded_kit');
 return {
  ...boss,
  abilities:kit.abilities,
  phases:kit.phases,
  tags:[...(boss.tags??[]),marker,familyKey(family)],
 };
}

/** Show the design only, never a user-facing player profile or live preview. */
export function previewPartyEventBossTraitKitV90(family:WeeklyPartyFamily):PartyBossTraitProfileV90{
 const profile=PARTY_EVENT_BOSS_TRAIT_PROFILES_V90[family];
 if(!profile)throw Error('party_event_v90_unknown_family');
 return profile;
}
