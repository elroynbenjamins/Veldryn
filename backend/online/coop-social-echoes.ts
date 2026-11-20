import type {GameState} from '../../apps/mobile/src/core/types';
import type {SocialEchoCandidate} from '../../apps/mobile/src/core/coop-social-echoes';
import {deriveOnlineCoopLoadout,assessOnlineCoopLoadout} from './coop-loadout';
import type {AuthoritativeLoadoutRecord} from '../src/server/coop/loadout-snapshots';
import type {GameplayServices} from './gameplay';

/** Raw contact game-state never leaves this service module. The SQL function is
 * restricted to service_role, verifies current relationships and blocks, and
 * returns current saved characters rather than requiring manual Echo sharing. */
interface ContactSource{
 accountId:string;characterId:string;revision:number;state:GameState;
 relationship:'friend'|'guild'|'both';
}
export interface SocialEchoPrepared{
 candidate:SocialEchoCandidate;
 record:AuthoritativeLoadoutRecord;
 readiness:ReturnType<typeof assessOnlineCoopLoadout>['readiness'];
}

export async function prepareSocialEchoCandidates(
 services:Pick<GameplayServices,'rpc'>,actorAccountId:string,minimumLevel:number,
):Promise<SocialEchoPrepared[]>{
 if(!Number.isSafeInteger(minimumLevel)||minimumLevel<1||minimumLevel>100)
  throw new Error('invalid_echo_level');
 const sources=await services.rpc<ContactSource[]>('coop_social_echo_sources_server_v1',{
  p_actor_account_id:actorAccountId,p_min_level:minimumLevel,
 });
 if(!Array.isArray(sources)||sources.length>64)throw new Error('invalid_social_echo_sources');
 const prepared:SocialEchoPrepared[]=[],seen=new Set<string>();
 for(const source of sources){
  if(!source||typeof source!=='object'||typeof source.accountId!=='string'
    ||typeof source.characterId!=='string'
    ||!Number.isSafeInteger(Number(source.revision))||Number(source.revision)<1
    ||!['friend','guild','both'].includes(source.relationship)
    ||source.accountId===actorAccountId||seen.has(source.characterId)
    ||source.state?.character?.id!==source.characterId)continue;
  seen.add(source.characterId);
  try{
   const record=deriveOnlineCoopLoadout(source.accountId,source.state,Number(source.revision));
   if(record.characterId!==source.characterId||record.characterLevel<minimumLevel
     ||!record.legalEquipment)continue;
   const {readiness}=assessOnlineCoopLoadout(record);
   if(!readiness.ready)continue;
   prepared.push({
    candidate:{
     // Stable opaque selection ID; not an Echo publication or consent token.
     characterId:record.characterId,
     accountId:source.accountId,name:record.stats.displayName??source.state.character!.name,
     classId:record.classId,role:readiness.role,
     level:record.characterLevel,combatPower:record.combatPower??0,
     relationship:source.relationship,
    },
    record,readiness,
   });
  }catch{/* An invalid donor loadout must never prevent other contacts loading. */}
 }
 return prepared;
}
