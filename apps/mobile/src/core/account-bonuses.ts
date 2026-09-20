import type {GameState} from './types';
import {characterPermanentMultipliers,type PermanentMultipliers} from './permanent-boosts';
import {collectionBonusBreakdown,collectibleJournal} from './collectibles';
import {COLLECTIBLE_TARGET_LABELS,type CollectibleTarget} from '../content/collectibles';
import {BUYABLE_PERMANENT_BOOSTS,SKIN_PERMANENT_BOOSTS} from '../content/permanent-boosts';
import {selectedFaithBlessing} from './faith';
import {dailySupplyActiveLabel} from './daily-supplies';
import {offlineCapBreakdown} from './game';

export interface EffectiveBonusRow{id:string;label:string;value:string;deltaPct:number}
export interface AccountCollectionBonusRow{target:CollectibleTarget;label:string;passivePct:number;activePct:number;totalPct:number;suppressedPct:number}
export interface BonusSourceRow{id:string;label:string;detail:string}
export interface AccountBonusOverview{
 collectionRows:AccountCollectionBonusRow[];
 effectiveRows:EffectiveBonusRow[];
 sourceRows:BonusSourceRow[];
 ownedCounts:{pets:number;backgrounds:number;borders:number};
 dailySupply?:{label:string;remainingSeconds:number;bonusPct:number};
 offline:{hours:number;maxHours:number;baseHours:number;sources:Array<{id:string;name:string;earned:boolean;hours:number}>};
}

const EFFECTIVE_LABELS:Array<{key:keyof PermanentMultipliers;label:string;inverse?:boolean}>=[
 {key:'combatPowerMultiplier',label:'Combat power'},
 {key:'combatSpeedMultiplier',label:'Combat speed'},
 {key:'gatheringSpeedMultiplier',label:'Gathering speed'},
 {key:'gatheringYieldMultiplier',label:'Gathering yield'},
 {key:'fishingSpeedMultiplier',label:'Fishing speed'},
 {key:'herbalismSpeedMultiplier',label:'Herbalism speed'},
 {key:'cookingSpeedMultiplier',label:'Cooking speed'},
 {key:'craftingSpeedMultiplier',label:'Crafting speed'},
 {key:'materialPreservationMultiplier',label:'Material preservation'},
 {key:'healingEffectivenessMultiplier',label:'Healing effectiveness'},
 {key:'dungeonRewardMultiplier',label:'Dungeon rewards'},
 {key:'guildContributionMultiplier',label:'Guild contribution'},
 {key:'skillXpMultiplier',label:'Skill XP'},
 {key:'characterXpMultiplier',label:'Combat XP'},
 {key:'goldMultiplier',label:'Combat Gold'},
 {key:'dropChanceMultiplier',label:'Drop chance'},
 {key:'incomingDamageMultiplier',label:'Damage taken',inverse:true},
];

function roundPct(value:number){return Math.round(value*100)/100}
function signed(value:number){const rounded=roundPct(value);return (rounded>0?'+':'')+rounded.toFixed(2)+'%'}
function hasMeaningfulBoost(def:any){return Object.entries(def??{}).some(([key,value])=>key.endsWith('Multiplier')&&typeof value==='number'&&Math.abs(value-1)>0.000001)}

export function accountBonusOverview(state:GameState,nowMs=Date.now()):AccountBonusOverview{
 const multipliers=characterPermanentMultipliers(state);
 const effectiveRows=EFFECTIVE_LABELS.flatMap(({key,label,inverse})=>{
  const multiplier=Number(multipliers[key]??1),delta=(inverse?1-multiplier:multiplier-1)*100;
  if(Math.abs(delta)<0.005)return [];
  return [{id:String(key),label,value:signed(delta),deltaPct:roundPct(delta)}];
 });
 const collectionRows=collectionBonusBreakdown(state).map(row=>({
  target:row.target,label:COLLECTIBLE_TARGET_LABELS[row.target],
  passivePct:roundPct(row.ownedAppliedBps/100),activePct:roundPct(row.activeAppliedBps/100),
  totalPct:roundPct(row.appliedBps/100),suppressedPct:roundPct(row.suppressedBps/100),
 }));
 const journal=collectibleJournal(state),ownedCounts={
  pets:journal.filter(row=>row.kind==='pet'&&row.owned).length,
  backgrounds:journal.filter(row=>row.kind==='background'&&row.owned).length,
  borders:journal.filter(row=>row.kind==='border'&&row.owned).length,
 };
 const sourceRows:BonusSourceRow[]=[];
 for(const row of journal.filter(row=>row.selected&&row.owned))sourceRows.push({id:'collectible:'+row.kind+':'+row.id,label:row.name,detail:'Selected '+row.kind+' · '+COLLECTIBLE_TARGET_LABELS[row.target]+' +'+(row.activeBps/100).toFixed(2)+'% active'});
 const blessing=selectedFaithBlessing(state);
 if(blessing)sourceRows.push({id:'faith:'+blessing.id,label:blessing.name,detail:'Faith blessing · '+blessing.family+' +'+(blessing.bonus*100).toFixed(2)+'%'});
 for(const id of new Set(state.character?.unlockedSkinIds??[])){const def=SKIN_PERMANENT_BOOSTS[id];if(def&&hasMeaningfulBoost(def))sourceRows.push({id:'skin:'+id,label:def.name,detail:'Character skin permanent bonus'});}
 for(const id of new Set(state.character?.ownedBoostIds??[])){const def=BUYABLE_PERMANENT_BOOSTS[id];if(def)sourceRows.push({id:'boost:'+id,label:def.name,detail:'Character permanent boost'});}
 const daily=dailySupplyActiveLabel(state.character),offline=offlineCapBreakdown(state);
 return {
  collectionRows,effectiveRows,sourceRows,ownedCounts,
  ...(daily?{dailySupply:{label:daily.label,remainingSeconds:daily.remainingSeconds,bonusPct:10}}:{}),
  offline:{hours:offline.hours,maxHours:offline.maxHours,baseHours:offline.baseHours,sources:offline.sources.map(source=>({id:source.id,name:source.name,earned:source.earned,hours:source.earned?2:0}))},
 };
}
