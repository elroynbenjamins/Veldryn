import type {CharacterState,GameState,ItemStack} from './types';
import {newJournalState} from './adventurers-journal-v42';
import {routeRewards} from './game';

const RETIRED_CAPE='OATHGLASS_CAPE';
const FINALE_QUEST='QST_015';
const REPLACEMENT_SHARD='OATHGLASS_SHARD';
const SHARDS_PER_CAPE=8;

/**
 * One-way, idempotent compatibility migration for the retired Act III cape.
 * The old ID remains readable in the item catalog until old clients age out,
 * but cannot be earned by any new quest. Never overwrite other equipment.
 */
export function migrateRetiredStoryRewards(input:GameState,nowMs:number):GameState{
 let found=0;
 const strip=(rows:ItemStack[]):ItemStack[]=>rows.filter(row=>{
  if(row.itemId!==RETIRED_CAPE)return true;
  found+=Math.max(0,Number.isSafeInteger(row.quantity)?row.quantity:0);
  return false;
 });
 const stripCharacter=(character:CharacterState|null):CharacterState|null=>{
  if(!character)return null;
  const pouch=character.equipmentPouch;
  const pouchStacks=pouch?strip(pouch.stacks):undefined;
  const equipped=character.equipment.cape===RETIRED_CAPE;
  if(equipped)found+=1;
  if(!equipped&&pouchStacks?.length===pouch?.stacks.length)return character;
  const equipment={...character.equipment};
  const equipmentInstanceIds={...character.equipmentInstanceIds};
  if(equipped){delete equipment.cape;delete equipmentInstanceIds.cape}
  return {...character,equipment,...(equipped?{equipmentInstanceIds}:{}),
   ...(pouch?{equipmentPouch:{...pouch,stacks:pouchStacks??[]}}:{})};
 };
 const inventory={...input.inventory,stacks:strip(input.inventory.stacks)};
 const bank={...input.bank,stacks:strip(input.bank.stacks)};
 const overflowStacks=strip(input.overflow.stacks);
 const overflow={...input.overflow,stacks:overflowStacks,
  expiresAtMs:overflowStacks.length?input.overflow.expiresAtMs:null};
 const character=stripCharacter(input.character);
 const otherCharacters=input.otherCharacters?.map(entry=>{
  const inv=strip(entry.inventory.stacks),over=strip(entry.overflow.stacks),ch=stripCharacter(entry.character);
  return {...entry,inventory:{...entry.inventory,stacks:inv},
   overflow:{...entry.overflow,stacks:over,expiresAtMs:over.length?entry.overflow.expiresAtMs:null},
   character:ch!};
 });
 const claimed=input.quests.some(q=>q.questId===FINALE_QUEST&&q.status==='claimed')||
  (input.otherCharacters??[]).some(row=>row.quests.some(q=>q.questId===FINALE_QUEST&&q.status==='claimed'));
 const needsTitle=claimed&&input.account.journalState?.unlockedTitles.oathbreaker===undefined;
 if(!found&&!needsTitle)return input;
 const cleaned={...input,inventory,bank,overflow,character,otherCharacters} as GameState;
 // All existing physical copies are replaced exactly once, irrespective of storage.
 const routed=found?routeRewards(cleaned,[{itemId:REPLACEMENT_SHARD,quantity:found*SHARDS_PER_CAPE}],nowMs):{};
 const account={...cleaned.account,...routed.account};
 if(needsTitle){
  const journal=account.journalState??newJournalState(account.longTermAccountScopeId??`local-account:${input.createdAtMs}`);
  account.journalState={...journal,unlockedTitles:{...journal.unlockedTitles,oathbreaker:nowMs}};
 }
 return {...cleaned,...routed,account} as GameState;
}
