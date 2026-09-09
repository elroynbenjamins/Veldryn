import {supabase} from './supabase';

export interface OnlineBankItem{id:string;item_id:string;quantity:number;stackable:boolean;bound:boolean;upgrade_rank:number;enchant_rank:number;rarity:'common'|'uncommon'|'rare'|'epic'|'legendary'|'mythic';source_character_id:string|null;}
function client(){if(!supabase)throw new Error('Online services are not configured in this build.');return supabase}

export async function loadOnlineBank(){
  const {data,error}=await client().from('account_bank_items').select('id,item_id,quantity,stackable,bound,upgrade_rank,enchant_rank,rarity,source_character_id').order('item_id');
  if(error)throw error;return (data??[]) as OnlineBankItem[];
}
export async function transferOnlineStorage(input:{characterId:string;itemRowId:string;quantity:number;direction:'deposit'|'withdraw';idempotencyKey:string}){
  const {data,error}=await client().rpc('transfer_storage_item',{p_character_id:input.characterId,p_item_row_id:input.itemRowId,p_quantity:input.quantity,p_direction:input.direction,p_idempotency_key:input.idempotencyKey});
  if(error)throw error;return data;
}
export async function upgradeOnlineStorage(input:{characterId:string;location:'inventory'|'bank';idempotencyKey:string}){
  const {data,error}=await client().rpc('upgrade_storage_capacity',{p_character_id:input.characterId,p_location:input.location,p_idempotency_key:input.idempotencyKey});
  if(error)throw error;return data;
}
