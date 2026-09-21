import type {GameState,ClassId,BodyPresentation,ItemStack,OverflowState} from './types';
import {itemDef} from '../content/items';
import {newGame,createCharacter} from './game';
import {accountCharacters,unlockedCharacterSlots} from './account-roster';
function snapshot(state:GameState){return {character:structuredClone(state.character!),inventory:structuredClone(state.inventory),overflow:structuredClone(state.overflow),activity:structuredClone(state.activity),skills:structuredClone(state.skills),quests:structuredClone(state.quests),currentRegionId:state.currentRegionId};}
export function createAccountCharacter(state:GameState,classId:ClassId,name:string,body:BodyPresentation,now:number){
 if(!state.character) return createCharacter(state,classId,name,body);
 if(accountCharacters(state).length>=unlockedCharacterSlots(state))throw new Error('Character slot is locked.');
 const next=createCharacter(newGame(now),classId,name,body);const active=snapshot(state);const id=`LOCAL_CHAR_${accountCharacters(state).length+1}`;next.character!.id=id;
 return {...next,version:state.version,createdAtMs:state.createdAtMs,settings:state.settings,bank:state.bank,account:{...state.account,createdCharacterCount:Math.max(state.account.createdCharacterCount,accountCharacters(state).length+1)},otherCharacters:[...(state.otherCharacters??[]),active]};
}
export function transitionAccountFaithPractice(state:GameState,now:number,tierId:string,count:number){const {reserveFaithPractice}=require('./faith') as typeof import('./faith');return {state:reserveFaithPractice(state,tierId,count,now)};}
export function setAccountFaithBlessing(state:GameState,id:string,now:number){const {updateFaithPreference}=require('./faith') as typeof import('./faith');return updateFaithPreference(state,'blessing',id);}
export function switchAccountCharacter(state:GameState,id:string,now:number){
 if(!state.character)return state;if(state.character.id===id)return state;const target=state.otherCharacters?.find(x=>x.character.id===id);if(!target)throw new Error('Character is not owned.');
 const remaining=(state.otherCharacters??[]).filter(x=>x.character.id!==id);const active=snapshot(state);
 return {...state,character:target.character,inventory:target.inventory,overflow:target.overflow,activity:target.activity,skills:target.skills,quests:target.quests,currentRegionId:target.currentRegionId,otherCharacters:[...remaining,active]};
}


type CharacterSnapshot=NonNullable<GameState['otherCharacters']>[number];

function stackCap(itemId:string){
 try{const item=itemDef(itemId);return item.type==='gear'||item.type==='tool'?1:9999}catch{return 9999}
}
function mergeStacks(stacks:ItemStack[]){
 const merged:ItemStack[]=[];
 for(const stack of stacks){
  if(!stack||typeof stack.itemId!=='string'||!Number.isFinite(stack.quantity)||stack.quantity<=0)continue;
  const cap=stackCap(stack.itemId);let remaining=Math.floor(stack.quantity);
  while(remaining>0){
   const existing=merged.find(row=>row.itemId===stack.itemId&&row.quantity<cap);
   if(existing){const moved=Math.min(cap-existing.quantity,remaining);existing.quantity+=moved;remaining-=moved;continue;}
   const moved=Math.min(cap,remaining);merged.push({itemId:stack.itemId,quantity:moved});remaining-=moved;
  }
 }
 return merged;
}
function routeToBank(bank:GameState['bank'],baseOverflow:OverflowState,incoming:ItemStack[],now:number){
 const stacks=bank.stacks.map(row=>({...row})),overflow=baseOverflow.stacks.map(row=>({...row}));
 for(const incomingStack of mergeStacks(incoming)){
  let remaining=incomingStack.quantity,cap=stackCap(incomingStack.itemId);
  for(const existing of stacks.filter(row=>row.itemId===incomingStack.itemId)){
   if(remaining<=0)break;const room=Math.max(0,cap-existing.quantity),moved=Math.min(room,remaining);existing.quantity+=moved;remaining-=moved;
  }
  while(remaining>0&&stacks.length<bank.capacity){const moved=Math.min(cap,remaining);stacks.push({itemId:incomingStack.itemId,quantity:moved});remaining-=moved;}
  if(remaining>0)overflow.push({itemId:incomingStack.itemId,quantity:remaining});
 }
 const overflowStacks=mergeStacks(overflow);
 return {bank:{...bank,stacks},overflow:{stacks:overflowStacks,expiresAtMs:overflowStacks.length?Math.max(baseOverflow.expiresAtMs??0,now+72*60*60*1000):null}};
}
function deletionRecoveryItems(entry:CharacterSnapshot,sharedBank:GameState['bank']){
 const equipped=[...new Set(Object.values(entry.character.equipment).filter((id):id is string=>typeof id==='string'&&!!id))];
 const tools=[...new Set(Object.values(entry.character.equippedToolIds??{}).filter((id):id is string=>typeof id==='string'&&!!id))];
 const held=[...equipped,...tools];
 const ownedGearIds=new Set<string>([
  ...equipped,
  ...entry.inventory.stacks.map(row=>row.itemId),
  ...entry.overflow.stacks.map(row=>row.itemId),
  ...sharedBank.stacks.map(row=>row.itemId),
 ]);
 const socketed=Object.entries(entry.character.gearEnhancements??{}).flatMap(([itemId,enhancement])=>ownedGearIds.has(itemId)?[enhancement.statGemId,enhancement.effectGemId].filter((id):id is string=>Boolean(id)):[]);
 return [...entry.inventory.stacks,...entry.overflow.stacks,...held.map(itemId=>({itemId,quantity:1})),...socketed.map(itemId=>({itemId,quantity:1}))];
}
function accountAfterCharacterDelete(state:GameState,characterId:string){
 const arena=state.account.arenaSquadCharacterIds?.filter(id=>id!==characterId);
 return {...state.account,...(state.account.arenaSquadCharacterIds?{arenaSquadCharacterIds:arena}: {})};
}
export function characterDeleteConfirmation(name:string){return `DELETE ${name}`;}
export function deleteAccountCharacter(state:GameState,id:string,confirmation:string,now:number){
 if(!state.character)throw new Error('Create a character first.');
 const active=state.character.id===id;
 const stored=active?snapshot(state):(state.otherCharacters??[]).find(entry=>entry.character.id===id);
 if(!stored)throw new Error('Character is not owned.');
 if(confirmation.trim()!==characterDeleteConfirmation(stored.character.name))throw new Error(`Type "${characterDeleteConfirmation(stored.character.name)}" to confirm.`);
 if(!active&&stored.activity)throw new Error('This character has an active activity. Switch to it and stop or claim the activity before deleting.');
 const other=(state.otherCharacters??[]).filter(entry=>entry.character.id!==id);
 const account=accountAfterCharacterDelete(state,id);
 if(!active){
  const recovery=routeToBank(state.bank,state.overflow,deletionRecoveryItems(stored,state.bank),now);
  return {...state,bank:recovery.bank,overflow:recovery.overflow,otherCharacters:other,account};
 }
 const replacement=other[0],remaining=replacement?other.slice(1):[];
 const baseOverflow=replacement?.overflow??{stacks:[],expiresAtMs:null};
 const recovery=routeToBank(state.bank,baseOverflow,deletionRecoveryItems(stored,state.bank),now);
 if(replacement)return {...state,character:replacement.character,inventory:replacement.inventory,overflow:recovery.overflow,activity:replacement.activity,skills:replacement.skills,quests:replacement.quests,currentRegionId:replacement.currentRegionId,bank:recovery.bank,otherCharacters:remaining,account};
 const fresh=newGame(now);
 return {...state,character:null,inventory:fresh.inventory,overflow:recovery.overflow,activity:null,skills:fresh.skills,quests:fresh.quests,currentRegionId:fresh.currentRegionId,bank:recovery.bank,otherCharacters:[],account};
}
