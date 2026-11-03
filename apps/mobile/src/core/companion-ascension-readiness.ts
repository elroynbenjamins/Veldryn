import type {GameState} from './types';
import {combatCompanionUiModel} from './combat-companions';
import {companionEconomy} from './companion-runtime';

/**
 * UI-only projection of the *same* progression, balance and activity gates
 * used by the authoritative companion_ascend game command.
 * Never deduct resources or mutate companion state here.
 */
export type CompanionAscensionBlocker=
 | 'unavailable'|'expedition'|'trial'|'mastery-chamber'
 | 'gold'|'essence'|'bondstones'|'material';

export interface CompanionAscensionReadiness{
 ready:boolean;
 tier?:1|2|3;
 blocker?:CompanionAscensionBlocker;
 resource?:string;
 owned?:number;
 required?:number;
}

export function companionAscensionReadiness(state:GameState,id:string):CompanionAscensionReadiness{
 const model=combatCompanionUiModel(state,id),cost=model?.nextAscensionCost,tier=model?.nextAscensionTier;
 if(!model?.owned||!cost||!tier)return {ready:false,blocker:'unavailable'};
 if((state.account.companionAssignments??[]).some(a=>a.status!=='claimed'&&a.status!=='cancelled'&&a.companionIds.includes(id)))return {ready:false,tier,blocker:'expedition'};
 if(state.account.companionTrialProgress?.season.activeRun?.teamCompanionIds.includes(id))return {ready:false,tier,blocker:'trial'};
 if(tier===3&&(state.account.companionSanctuary?.masteryChamberLevel??0)<1)return {ready:false,tier,blocker:'mastery-chamber'};
 const e=companionEconomy(state);
 if(e.gold<cost.gold)return {ready:false,tier,blocker:'gold',resource:'gold',owned:e.gold,required:cost.gold};
 if(e.companionEssence<cost.companionEssence)return {ready:false,tier,blocker:'essence',resource:'essence',owned:e.companionEssence,required:cost.companionEssence};
 if(e.bondstones<cost.bondstones)return {ready:false,tier,blocker:'bondstones',resource:'bondstones',owned:e.bondstones,required:cost.bondstones};
 if(cost.materialId&&(e.materials[cost.materialId]??0)<(cost.materialQuantity??0))return {ready:false,tier,blocker:'material',resource:cost.materialId,owned:e.materials[cost.materialId]??0,required:cost.materialQuantity??0};
 return {ready:true,tier};
}
