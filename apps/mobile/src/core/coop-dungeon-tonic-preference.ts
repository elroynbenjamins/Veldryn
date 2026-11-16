import AsyncStorage from '@react-native-async-storage/async-storage';
import {POTIONS} from '../content/alchemy';
import type {GameState} from './types';
import type {CoopRunView} from './coop-presentation';

/** A per-character run selection. Choosing a tonic opts into first-room use; selection never reserves an item. */
export interface DungeonTonicPreference {
 potionId:string|null;
 autoUse:boolean;
}
export const DEFAULT_DUNGEON_TONIC_PREFERENCE:Readonly<DungeonTonicPreference>={potionId:null,autoUse:false};

const KEY='veldryn.coop.dungeon-tonic.v1.';
const preparationIds=new Set(POTIONS.filter(p=>p.effect.kind==='preparation').map(p=>p.id));
let lastWrite:Promise<void>=Promise.resolve();

export async function rememberedDungeonTonic(characterId:string|undefined):Promise<DungeonTonicPreference>{
 if(!characterId)return {...DEFAULT_DUNGEON_TONIC_PREFERENCE};
 try{
  const raw=await AsyncStorage.getItem(KEY+characterId);
  const value=raw?JSON.parse(raw) as Partial<DungeonTonicPreference>:null;
  const potionId=typeof value?.potionId==='string'&&preparationIds.has(value.potionId)?value.potionId:null;
  return {potionId,autoUse:Boolean(potionId)};
 }catch{return {...DEFAULT_DUNGEON_TONIC_PREFERENCE};}
}

export function rememberDungeonTonic(characterId:string|undefined,preference:DungeonTonicPreference):Promise<void>{
 if(!characterId)return Promise.resolve();
 const potionId=preference.potionId&&preparationIds.has(preference.potionId)?preference.potionId:null;
 const next={potionId,autoUse:Boolean(potionId)};
 const write=()=>AsyncStorage.setItem(KEY+characterId,JSON.stringify(next)).then(()=>{},()=>{});
 // Sequential writes prevent a quick toggle/select from persisting out of order.
 lastWrite=lastWrite.then(write,write);
 return lastWrite;
}

/** Advisory only. The existing authoritative server transaction rechecks run
 * phase, member, inventory, single-use restriction and the exact tonic ID. */
export function autoDungeonTonicForRun(run:CoopRunView|undefined,state:GameState,preference:DungeonTonicPreference):string|undefined{
 const characterId=state.character?.id,id=preference.potionId;
 if(!run||!characterId||!id||!preference.autoUse||!preparationIds.has(id))return undefined;
 if(run.phase!=='awaiting_choice'||run.potionPreparationOpen!==true||Boolean(run.pendingCombat))return undefined;
 if(run.preparedAlchemyPotionIdsByActor?.[characterId])return undefined;
 if(!run.roleSlots.some(member=>member.memberId===characterId))return undefined;
 const carried=state.inventory.stacks.some(stack=>stack.itemId===id&&Number.isFinite(stack.quantity)&&stack.quantity>0);
 return carried?id:undefined;
}
