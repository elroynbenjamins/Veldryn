import {readFileSync} from 'node:fs';
import {inspectReviewLoadout,capChannel} from './universal-affix-overlap-review-v4.mjs';
const data=JSON.parse(readFileSync(new URL('../../../docs/2-0/eq2-innate-and-set-budget-review-v7.json',import.meta.url),'utf8'));
const byItem=new Map(data.entries.map(x=>[x.itemId,x]));
/** Nonissuable full-loadout candidate. Innates come ONLY from pinned catalogue,
 * never a client field, rarity/quality multiplier or extra random roll slot. */
export function inspectInnateAndRandomLoadoutV2(rows){
 const random=inspectReviewLoadout(rows);
 const sourceRows=[],unresolved=[],conditional=[];
 const sums=new Map(random.channels.map(x=>[x.channel,0]));
 for(const row of rows){
  const authored=byItem.get(row.itemId);
  if(!authored)continue;
  if(authored.tier!==row.tier||authored.slot!==row.slot||authored.mayApply!==false)
   throw Error('eq2_innate_source_identity_mismatch');
  for(const innate of authored.innates){
   // Same critical chance percentage-point mechanic, different authored ID.
   // Preserve source spelling and frozen V7 record; explicit candidate alias.
   const alias=innate.canonicalChannel===null&&innate.stat==='crit_chance_pp'&&
     innate.unit==='percentage_points'?'crit_rate_pp':null;
   const candidateChannel=innate.canonicalChannel??alias;
   const entry={itemId:row.itemId,...innate,candidateChannel,
     candidateAlias:alias!==null};
   sourceRows.push(entry);
   if(candidateChannel===null){unresolved.push(entry);continue;}
   const channel=random.channels.find(x=>x.channel===candidateChannel);
   if(!channel||channel.unit!==innate.unit||!Number.isSafeInteger(innate.centipercent)||innate.centipercent<0)
    throw Error('eq2_innate_channel_mismatch');
   sums.set(channel.channel,sums.get(channel.channel)+innate.centipercent);
  }
  if(authored.trait)conditional.push({itemId:row.itemId,trait:authored.trait});
 }
 const channels=random.channels.map(row=>{
  const innateCentipercent=sums.get(row.channel),rawCentipercent=row.rawCentipercent+innateCentipercent;
  const effectiveCentipercent=capChannel(row.channel,rawCentipercent);
  return {channel:row.channel,unit:row.unit,randomCentipercent:row.rawCentipercent,
   innateCentipercent,rawCentipercent,effectiveCentipercent,excessCentipercent:rawCentipercent-effectiveCentipercent};
 });
 return {scope:'GEAR_RANDOM_AND_EXACT_INNATE_REVIEW_ONLY',channels,sourceRows,unresolved,conditional,
  complete:unresolved.length===0,mayApplyEffects:false,mayMint:false,mayTrade:false,cpApproved:false,releaseApproved:false};
}
