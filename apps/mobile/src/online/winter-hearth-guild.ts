import {supabase} from './supabase';
import {WINTER_HEARTH_GUILD_RELEASED} from '../core/release-flags';

export interface WinterHearthGuildSnapshot {
 inGuild:boolean;eventId?:string;enabled?:boolean;active?:boolean;
 logs?:number;logsGoal?:25000;lights?:number;lightsGoal?:2500;
 memberLogsThisWeek?:number;memberLightsThisWeek?:number;
 memberLogsRemaining?:number;memberLightsRemaining?:number;
 weekStartUtc?:string;milestonePercent?:0|25|50|75|100;
 gatheringSpeedBps?:number;skillXpBps?:number;combatXpBps?:number;
 permanentColorEarned?:boolean;
}
export interface WinterHearthDonationReceipt {
 alreadyProcessed:boolean;guildId:string;itemId:string;track:'logs'|'lights';
 quantity:number;logs:number;lights:number;weekStartUtc:string;
 newMilestones:number[];newGuildGold:number;newPermanentColor:boolean;
}
const integers=(value:unknown,min:number,max:number):value is number=>
 Number.isSafeInteger(value)&&Number(value)>=min&&Number(value)<=max;
const stages=[0,25,50,75,100];

function parseSnapshot(input:unknown):WinterHearthGuildSnapshot {
 if(!input||typeof input!=='object')throw new Error('Unrecognized Winter Hearth response.');
 const row=input as Record<string,unknown>;
 if(row.inGuild===false)return {inGuild:false};
 if(row.inGuild!==true||row.eventId!=='EVT_ANNUAL_012_2026'
  ||typeof row.enabled!=='boolean'||typeof row.active!=='boolean'
  ||row.logsGoal!==25000||row.lightsGoal!==2500
  ||!integers(row.logs,0,25000)||!integers(row.lights,0,2500)
  ||!integers(row.memberLogsThisWeek,0,2500)
  ||!integers(row.memberLightsThisWeek,0,250)
  ||!integers(row.memberLogsRemaining,0,2500)
  ||!integers(row.memberLightsRemaining,0,250)
  ||row.memberLogsThisWeek+row.memberLogsRemaining!==2500
  ||row.memberLightsThisWeek+row.memberLightsRemaining!==250
  ||!stages.includes(Number(row.milestonePercent))
  ||typeof row.permanentColorEarned!=='boolean'
  ||typeof row.weekStartUtc!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(row.weekStartUtc)
  ||!integers(row.gatheringSpeedBps,0,1000)
  ||!integers(row.skillXpBps,0,1000)
  ||!integers(row.combatXpBps,0,1000))
  throw new Error('Invalid Winter Hearth progress. Refresh the Guild.');
 return row as unknown as WinterHearthGuildSnapshot;
}
function parseDonation(input:unknown):WinterHearthDonationReceipt {
 if(!input||typeof input!=='object')throw new Error('Unrecognized Winter Hearth donation.');
 const row=input as Record<string,unknown>;
 if(typeof row.alreadyProcessed!=='boolean'
  ||typeof row.guildId!=='string'||typeof row.itemId!=='string'
  ||!['logs','lights'].includes(String(row.track))
  ||!integers(row.quantity,1,2500)||!integers(row.logs,0,25000)
  ||!integers(row.lights,0,2500)||!integers(row.newGuildGold,0,110000)
  ||typeof row.newPermanentColor!=='boolean'
  ||typeof row.weekStartUtc!=='string'||!Array.isArray(row.newMilestones)
  ||row.newMilestones.some((percent:unknown)=>![25,50,75,100].includes(Number(percent))))
  throw new Error('Invalid Winter Hearth donation confirmation.');
 return row as unknown as WinterHearthDonationReceipt;
}
/** Read-only and fail-closed: the independent release flag blocks all live calls. */
export async function getWinterHearthGuildSnapshot():Promise<WinterHearthGuildSnapshot|null>{
 if(!WINTER_HEARTH_GUILD_RELEASED)return null;
 if(!supabase)throw new Error('Online services unavailable.');
 const {data,error}=await supabase.rpc('winter_hearth_2026_snapshot_v1');
 if(error)throw new Error(error.message);
 return parseSnapshot(data);
}
/** Sends only an exact item ID, integer quantity and stable nonce.
 * The server selects account/guild, debits inventory, enforces weekly caps,
 * settles milestones and returns the committed idempotent receipt.
 */
export async function donateWinterHearthGuild(itemId:string,quantity:number,requestKey:string):Promise<WinterHearthDonationReceipt>{
 if(!WINTER_HEARTH_GUILD_RELEASED)throw new Error('Winter Hearth is not released.');
 if(!supabase)throw new Error('Online services unavailable.');
 if(!integers(quantity,1,2500)||!/^[A-Za-z0-9_-]{8,96}$/.test(requestKey)
  ||!['GREENWOOD_LOG','IRONWOOD_LOG','CROWNWOOD_LOG','DUNEWOOD','WHITEPINE_LOG','CINDERWOOD_LOG',
    'FROSTFALL_CHRISTMAS_LIGHTS_2026'].includes(itemId))throw new Error('Invalid Winter Hearth donation.');
 const {data,error}=await supabase.rpc('winter_hearth_2026_donate_v1',{
  p_item_id:itemId,p_quantity:quantity,p_request_key:requestKey,
 });
 if(error)throw new Error(error.message);
 return parseDonation(data);
}
