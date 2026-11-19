/**
 * Party Events V62 client-side defensive reader. QA-only transport decoder.
 * It accepts an account-bound, event-bound, short-leased private READ response
 * but has no request, store, claim, reward or exchange implementation.
 */
export const PARTY_EVENT_REWARD_MOBILE_V62_RELEASED=false;
type Family='broken_caravan'|'nightfall_hunt'|'broken_wards'|'lost_reliquary';
type Kind='participation'|'preparation'|'finale';
export type RewardChestStateV62='locked'|'earned'|'claimed';
export interface PartyRewardMobileV62{
 readonly family:Family;readonly difficulty:'standard'|'veteran'|'heroic';
 readonly chests:readonly {kind:Kind;title:string;state:RewardChestStateV62;
  gearChancePercent:number;unlockHint:string}[];
 readonly sets:readonly {id:string;name:string;size:2|3;collected:number;
  pieces:readonly {id:string;slot:string;owned:boolean}[]}[];
 readonly partySigilsBalance:number;
 readonly exchangeCost:60;
 readonly settledReadOnly:true;
}
const kinds=['participation','preparation','finale'] as const;
const slots=['boots','gloves','cape','ring','amulet'] as const;
const familyCatalog:Readonly<Record<Family,readonly [string,string]>>={
 broken_caravan:['PE_WAYFARERS_PACT','PE_SMUGGLERS_GUILE'],
 nightfall_hunt:['PE_MOONFANG_PURSUIT','PE_PREDATORS_MARK'],
 broken_wards:['PE_RUNEBOUND_VIGIL','PE_WARDENS_SEAL'],
 lost_reliquary:['PE_ECHOHEART_VESTMENT','PE_CURATORS_OATH'],
};
const chances:Readonly<Record<Kind,readonly [number,number,number]>>={
 participation:[1200,1400,1600],
 preparation:[1600,1800,2000],
 finale:[2400,2700,2900],
};
const record=(v:unknown):v is Record<string,unknown>=>
 !!v&&typeof v==='object'&&!Array.isArray(v);
const whole=(v:unknown,min:number,max:number):v is number=>
 typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const string=(v:unknown,min:number,max:number):v is string=>
 typeof v==='string'&&v.length>=min&&v.length<=max;
const oneOf=(v:unknown,choices:readonly string[]):v is string=>
 typeof v==='string'&&choices.includes(v);
export function decodePartyEventRewardReadOnlyV62(
 raw:unknown,expectedAccountId:string,expectedEventStartMs:number,
 nowMs:number=Date.now(),
):PartyRewardMobileV62|null{
 if(!record(raw)||raw.schema!=='party-event-reward-readonly-v62'||
  !string(expectedAccountId,36,36)||
  !/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(expectedAccountId)||
  raw.accountId!==expectedAccountId.toLowerCase()||
  !whole(expectedEventStartMs,0,8640000000000000)||
  raw.eventStartsAtUtcMs!==expectedEventStartMs||
  !whole(nowMs,0,8640000000000000)||
  !whole(raw.serverTimeUtcMs,0,8640000000000000)||
  nowMs-(raw.serverTimeUtcMs as number)>120000||
  (raw.serverTimeUtcMs as number)-nowMs>30000||
  !oneOf(raw.family,Object.keys(familyCatalog))||
  !oneOf(raw.difficulty,['standard','veteran','heroic'])||
  raw.exchangeAvailable!==false||raw.settlementClaimAvailable!==false||
  raw.previewOnly!==true||raw.rewardsGrantedByThisRead!==0||
  raw.exchangeCost!==60||
  !whole(raw.partySigilsBalance,0,Number.MAX_SAFE_INTEGER)||
  !Array.isArray(raw.chests)||raw.chests.length!==3||
  !Array.isArray(raw.sets)||raw.sets.length!==2)return null;
 const family=raw.family as Family,difficulty=raw.difficulty as 'standard'|'veteran'|'heroic';
 const tierIndex=['standard','veteran','heroic'].indexOf(difficulty);
 const cards:PartyRewardMobileV62['chests'][number][]=[];
 for(let i=0;i<3;i++){
  const row=raw.chests[i],kind=kinds[i]!;
  if(!record(row)||row.kind!==kind||!string(row.title,3,70)||
   !oneOf(row.state,['locked','earned','claimed'])||
   !string(row.unlockHint,8,180)||
   row.canClaim!==false||row.canOpen!==false||
   row.gearChanceBps!==chances[kind][tierIndex])return null;
  cards.push({kind,title:row.title,state:row.state as RewardChestStateV62,
   gearChancePercent:(row.gearChanceBps as number)/100,unlockHint:row.unlockHint});
 }
 const selected=familyCatalog[family],found=new Set<string>();
 const sets:PartyRewardMobileV62['sets'][number][]=[];
 for(let i=0;i<2;i++){
  const row=raw.sets[i],id=selected[i],size=i===0?3:2;
  if(!record(row)||row.id!==id||!string(row.name,3,80)||
   row.size!==size||!whole(row.collected,0,size)||
   !Array.isArray(row.pieces)||row.pieces.length!==size)return null;
  let owned=0;
  const pieces:PartyRewardMobileV62['sets'][number]['pieces'][number][]=[];
  for(let j=0;j<size;j++){
   const piece=row.pieces[j],slot=slots[i===0?j:j+3];
   if(!record(piece)||piece.id!==id+'_'+slot!.toUpperCase()||
    piece.slot!==slot||typeof piece.owned!=='boolean'||found.has(piece.id as string))
    return null;
   found.add(piece.id as string);
   if(piece.owned)owned++;
   pieces.push({id:piece.id as string,slot,owned:piece.owned as boolean});
  }
  if(row.collected!==owned)return null;
  sets.push({id,name:row.name as string,size,collected:owned,pieces});
 }
 return {
  family,difficulty,chests:cards,sets,
  partySigilsBalance:raw.partySigilsBalance as number,exchangeCost:60,
  settledReadOnly:true,
 };
}
