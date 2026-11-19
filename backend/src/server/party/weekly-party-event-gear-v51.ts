/**
 * Party Events V51 — hidden Equipment 2.0 event-exclusive catalog.
 *
 * Two UNIVERSAL sets per event: a three-piece signature set and a
 * two-piece accessory set. Five earnable slots per event; 20 total.
 * Descriptors only: no live ItemDef, inventory grant or combat resolver.
 * Every effect requires server-authoritative Equipment 2.0 integration.
 */
import type {WeeklyPartyFamily} from './weekly-party-events-v2';

export const PARTY_EVENT_GEAR_V51_RELEASED=false;
export const PARTY_EVENT_GEAR_V51_CATALOG_VERSION='party-event-gear-v51' as const;

export type PartyGearSlotV51='boots'|'gloves'|'cape'|'ring'|'amulet';
export type PartyGearStatV51=
 'haste'|'ability_damage'|'critical_rate'|'critical_damage'|
 'penetration'|'maximum_hp'|'healing_power';
export type PartyGearEffectV51=
 |{kind:'stat';stat:PartyGearStatV51;valueBps:number}
 |{kind:'ability_momentum';abilityDamageBps:number;durationMs:number;internalCooldownMs:number}
 |{kind:'elite_execute';damageBps:number;enemyHpBelowBps:number}
 |{kind:'defensive_barrier';maxHpBps:number;hpBelowBps:number;durationMs:number;internalCooldownMs:number}
 |{kind:'echo_cooldown';procChanceBps:number;cooldownRefundBps:number;internalCooldownMs:number};

export interface PartyGearBonusV51{
 readonly threshold:2|3;
 readonly effects:readonly PartyGearEffectV51[];
}
export interface PartyGearPieceV51{
 readonly id:string;
 readonly name:string;
 readonly slot:PartyGearSlotV51;
 readonly setId:string;
 readonly family:WeeklyPartyFamily;
 readonly universal:true;
 readonly source:'party_event_chest_or_exchange';
}
export interface PartyGearSetV51{
 readonly id:string;
 readonly family:WeeklyPartyFamily;
 readonly name:string;
 readonly size:2|3;
 readonly slots:readonly PartyGearSlotV51[];
 readonly bonuses:readonly PartyGearBonusV51[];
}
const stat=(stat:PartyGearStatV51,valueBps:number):PartyGearEffectV51=>(
 {kind:'stat',stat,valueBps}
);
export const PARTY_EVENT_GEAR_SETS_V51:readonly PartyGearSetV51[]=[
 {
  id:'PE_WAYFARERS_PACT',family:'broken_caravan',name:"Wayfarer's Pact",
  size:3,slots:['boots','gloves','cape'],
  bonuses:[
   {threshold:2,effects:[stat('haste',150)]},
   {threshold:3,effects:[{kind:'ability_momentum',
    abilityDamageBps:300,durationMs:6000,internalCooldownMs:12000}]},
  ],
 },
 {
  id:'PE_SMUGGLERS_GUILE',family:'broken_caravan',name:"Smuggler's Guile",
  size:2,slots:['ring','amulet'],
  bonuses:[{threshold:2,effects:[
   stat('critical_rate',100),stat('penetration',150),
  ]}],
 },
 {
  id:'PE_MOONFANG_PURSUIT',family:'nightfall_hunt',name:'Moonfang Pursuit',
  size:3,slots:['boots','gloves','cape'],
  bonuses:[
   {threshold:2,effects:[stat('critical_damage',400)]},
   {threshold:3,effects:[{kind:'elite_execute',damageBps:300,
    enemyHpBelowBps:3000}]},
  ],
 },
 {
  id:'PE_PREDATORS_MARK',family:'nightfall_hunt',name:"Predator's Mark",
  size:2,slots:['ring','amulet'],
  bonuses:[{threshold:2,effects:[
   stat('ability_damage',250),stat('penetration',100),
  ]}],
 },
 {
  id:'PE_RUNEBOUND_VIGIL',family:'broken_wards',name:'Runebound Vigil',
  size:3,slots:['boots','gloves','cape'],
  bonuses:[
   {threshold:2,effects:[stat('maximum_hp',300)]},
   {threshold:3,effects:[{kind:'defensive_barrier',maxHpBps:200,hpBelowBps:4000,
    durationMs:6000,internalCooldownMs:20000}]},
  ],
 },
 {
  id:'PE_WARDENS_SEAL',family:'broken_wards',name:"Warden's Seal",
  size:2,slots:['ring','amulet'],
  bonuses:[{threshold:2,effects:[
   stat('healing_power',200),stat('maximum_hp',200),
  ]}],
 },
 {
  id:'PE_ECHOHEART_VESTMENT',family:'lost_reliquary',name:'Echoheart Vestment',
  size:3,slots:['boots','gloves','cape'],
  bonuses:[
   {threshold:2,effects:[stat('ability_damage',200)]},
   {threshold:3,effects:[{kind:'echo_cooldown',
    procChanceBps:800,cooldownRefundBps:1500,internalCooldownMs:18000}]},
  ],
 },
 {
  id:'PE_CURATORS_OATH',family:'lost_reliquary',name:"Curator's Oath",
  size:2,slots:['ring','amulet'],
  bonuses:[{threshold:2,effects:[
   stat('critical_rate',100),stat('ability_damage',200),
  ]}],
 },
];

const pieceName:Readonly<Record<PartyGearSlotV51,string>>={
 boots:'Boots',gloves:'Gloves',cape:'Cape',ring:'Ring',amulet:'Amulet',
};
export const PARTY_EVENT_GEAR_PIECES_V51:readonly PartyGearPieceV51[]=
 PARTY_EVENT_GEAR_SETS_V51.flatMap(set=>set.slots.map(slot=>({
  id:set.id+'_'+slot.toUpperCase(),
  name:set.name+' '+pieceName[slot],
  slot,setId:set.id,family:set.family,universal:true as const,
  source:'party_event_chest_or_exchange' as const,
 })));
export const PARTY_EVENT_GEAR_FAMILIES_V51:readonly WeeklyPartyFamily[]=[
 'broken_caravan','nightfall_hunt','broken_wards','lost_reliquary',
];
export function partyEventSetsForFamilyV51(family:WeeklyPartyFamily):readonly PartyGearSetV51[]{
 return PARTY_EVENT_GEAR_SETS_V51.filter(set=>set.family===family);
}
export function partyEventGearForFamilyV51(family:WeeklyPartyFamily):readonly PartyGearPieceV51[]{
 return PARTY_EVENT_GEAR_PIECES_V51.filter(piece=>piece.family===family);
}
export function partyEventGearPieceV51(id:string):PartyGearPieceV51|undefined{
 return PARTY_EVENT_GEAR_PIECES_V51.find(piece=>piece.id===id);
}
/** Includes no weapon or class-bound item; intended as a 2.0 addon. */
export function assertPartyEventGearCatalogV51():true{
 if(PARTY_EVENT_GEAR_SETS_V51.length!==8||PARTY_EVENT_GEAR_PIECES_V51.length!==20)
  throw Error('party_event_v51_wrong_catalog_size');
 const setIds=new Set<string>(),pieceIds=new Set<string>();
 for(const family of PARTY_EVENT_GEAR_FAMILIES_V51){
  const sets=partyEventSetsForFamilyV51(family);
  const pieces=partyEventGearForFamilyV51(family);
  if(sets.length!==2||pieces.length!==5||
   sets.filter(x=>x.size===3).length!==1||
   sets.filter(x=>x.size===2).length!==1||
   new Set(pieces.map(p=>p.slot)).size!==5)
   throw Error('party_event_v51_uneven_family_gear');
 }
 for(const set of PARTY_EVENT_GEAR_SETS_V51){
  if(setIds.has(set.id))throw Error('party_event_v51_duplicate_set');
  setIds.add(set.id);
  if(set.slots.length!==set.size||
   set.bonuses.length!==(set.size===3?2:1)||
   set.bonuses.some((bonus,i)=>bonus.threshold!==i+2||!bonus.effects.length))
   throw Error('party_event_v51_invalid_set_threshold');
 }
 for(const piece of PARTY_EVENT_GEAR_PIECES_V51){
  if(pieceIds.has(piece.id)||!setIds.has(piece.setId)||
   !piece.universal)throw Error('party_event_v51_invalid_piece');
  pieceIds.add(piece.id);
 }
 return true;
}
