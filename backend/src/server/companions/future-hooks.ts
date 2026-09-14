import type {CompanionRarity,CompanionRole} from './policy';
import type {OwnedCompanionSnapshot} from './domain';
import {companionServerDefinition} from './content';
import {buildOwnedCompanionCombatant} from './combat-adapter';

/** Foundation only: these filters extend run-effect targeting without changing class filters. */
export interface CompanionRunEffectFilter{companionId?:string;companionRole?:CompanionRole;rarity?:CompanionRarity;originId?:string;tag?:string;}
export function companionMatchesRunEffectFilter(progress:OwnedCompanionSnapshot,filter:CompanionRunEffectFilter){const def=companionServerDefinition(progress.companionId);if(!def)return false;if(filter.companionId&&filter.companionId!==def.id)return false;if(filter.companionRole&&filter.companionRole!==def.role)return false;if(filter.rarity&&filter.rarity!==def.rarity)return false;if(filter.originId&&filter.originId!==def.originId)return false;if(filter.tag&&!def.tags.includes(filter.tag))return false;return true;}
export interface CompanionRunBoonDefinition{id:string;name:string;filter:CompanionRunEffectFilter;effects:Array<{kind:string;value:number}>;runOnly:true;}
export const FUTURE_COMPANION_RUN_BOONS:CompanionRunBoonDefinition[]=[
 {id:'SHARPENED_CLAWS',name:'Sharpened Claws',filter:{companionRole:'damage'},effects:[{kind:'attack_speed',value:.15}],runOnly:true},
 {id:'GUARDIAN_BOND',name:'Guardian Bond',filter:{companionRole:'tank'},effects:[{kind:'shield_strength',value:.20}],runOnly:true},
 {id:'SHARED_SPIRIT',name:'Shared Spirit',filter:{companionRole:'support'},effects:[{kind:'additional_ally_reduced',value:.50}],runOnly:true},
 {id:'QUICK_INSTINCT',name:'Quick Instinct',filter:{},effects:[{kind:'active_cooldown',value:-.10}],runOnly:true},
 {id:'LAST_STAND',name:'Last Stand',filter:{},effects:[{kind:'prevent_death_once',value:1}],runOnly:true},
];

/** Foundation only: future asynchronous Arena stores a frozen defender snapshot. */
export interface CompanionArenaSnapshot{accountId:string;createdAt:string;companionIds:[string,string,string];combatants:ReturnType<typeof buildOwnedCompanionCombatant>[];normalizationVersion:string;}
export function buildCompanionArenaSnapshot(accountId:string,team:[OwnedCompanionSnapshot,OwnedCompanionSnapshot,OwnedCompanionSnapshot],createdAt:string):CompanionArenaSnapshot{return {accountId,createdAt,companionIds:team.map(x=>x.companionId) as [string,string,string],combatants:team.map(x=>buildOwnedCompanionCombatant(x,{mode:'companion_arena'})),normalizationVersion:'raw_pve_identity_v1'};}
