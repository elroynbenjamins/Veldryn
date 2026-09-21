import type {CombatantDefinition} from '../src/server/combat/types';
import {combatantFromVerifiedSnapshot} from '../src/server/combat/snapshot-adapter';
import {regionalCombatEncounterV1,resolveRegionalCombatV1} from '../src/server/combat/regional-combat-v1';
import {deriveRole} from '../src/server/coop/role-readiness';
import {deriveOnlineCoopLoadout,onlineCoopLoadoutHash} from './coop-loadout';
import {GameplayError,type GameplayServices} from './gameplay';
import {newGame} from '../../apps/mobile/src/core/game';
import type {GameState} from '../../apps/mobile/src/core/types';

interface LoadedGame{state:GameState|null;version:number;serverNow:number;characterId:string|null;walletGold:number|null;guildMember:boolean;communityProgress:Record<string,number>;}
interface RegionalCombatRunRecord{
  runId:string;status:'started'|'completed'|'failed'|'expired';encounterId:string;sourceId:string;kind:'enemy'|'elite'|'regional_boss';
  characterId:string;snapshotHash:string;serverSeed?:string;playerDefinition?:CombatantDefinition;expiresAtMs:number;
  result?:unknown;reward?:unknown;state?:GameState;version?:number;
}
const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const uuid='[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}';
const requestId=/^[a-zA-Z0-9_-]{8,128}$/;

function publicRun(run:RegionalCombatRunRecord){
  return {runId:run.runId,status:run.status,encounterId:run.encounterId,sourceId:run.sourceId,kind:run.kind,characterId:run.characterId,expiresAtMs:run.expiresAtMs,result:run.result,reward:run.reward,state:run.state,version:run.version};
}
async function authenticate(request:Request,services:GameplayServices){
  const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!bearer)throw new GameplayError('auth_required',401);
  const accountId=await services.authenticate(bearer);if(!accountId)throw new GameplayError('invalid_session',401);return accountId;
}
async function parseBody(request:Request,max=4096){
  const raw=await request.text();if(raw.length>max)throw new GameplayError('request_too_large',413);
  let value:unknown;try{value=JSON.parse(raw||'{}')}catch{throw new GameplayError('invalid_json');}
  if(!value||typeof value!=='object'||Array.isArray(value))throw new GameplayError('invalid_request');return value as Record<string,unknown>;
}
export function regionalCombatHandler(services:GameplayServices){return async(request:Request):Promise<Response>=>{
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 try{
  const accountId=await authenticate(request,services),path=new URL(request.url).pathname;
  const start=path.endsWith('/regional-combat/start'),run=path.match(new RegExp('/regional-combat/runs/('+uuid+')(?:/(resolve))?$'));
  if(!start&&!run)return json({error:'not_found'},404);
  if(start){
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    const body=await parseBody(request);
    if(Object.keys(body).some(key=>!['requestId','expectedVersion','encounterId'].includes(key))||typeof body.requestId!=='string'||!requestId.test(body.requestId)||!Number.isSafeInteger(body.expectedVersion)||typeof body.encounterId!=='string')throw new GameplayError('invalid_request');
    const encounter=regionalCombatEncounterV1(body.encounterId);if(!encounter)throw new GameplayError('unknown_regional_combat_encounter');
    const loaded=await services.rpc<LoadedGame>('load_online_game_server_v1',{p_account_id:accountId});
    if(loaded.version!==body.expectedVersion)throw new GameplayError('stale_state',409);
    const state=loaded.state??newGame(loaded.serverNow),character=state.character;if(!character)throw new GameplayError('character_required');
    if(state.currentRegionId!=='SUNSCAR')throw new GameplayError('regional_combat_wrong_region');
    if(character.level<encounter.minLevel)throw new GameplayError('regional_combat_level_requirement');
    const record=deriveOnlineCoopLoadout(accountId,state,loaded.version);if(!record.legalEquipment)throw new GameplayError('illegal_equipment');
    const role=deriveRole(record.classId),playerDefinition=combatantFromVerifiedSnapshot({...record.stats,role},record.abilities),snapshotHash=onlineCoopLoadoutHash(record);
    const stored=await services.rpc<RegionalCombatRunRecord>('start_regional_combat_run_server_v1',{
      p_run_id:services.randomId(),p_account_id:accountId,p_request_id:body.requestId,p_expected_revision:loaded.version,p_character_id:character.id,
      p_encounter_id:encounter.encounterId,p_source_id:encounter.sourceId,p_kind:encounter.kind,p_player_definition:playerDefinition,p_snapshot_hash:snapshotHash,p_server_seed:services.randomId(),
    });
    return json(publicRun(stored));
  }
  if(run&&!run[2]){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    const stored=await services.rpc<RegionalCombatRunRecord>('load_regional_combat_run_server_v1',{p_account_id:accountId,p_run_id:run[1]});
    return json(publicRun(stored));
  }
  if(request.method!=='POST')return json({error:'method_not_allowed'},405);
  const body=await parseBody(request,512);if(Object.keys(body).length)throw new GameplayError('invalid_request');
  const stored=await services.rpc<RegionalCombatRunRecord>('load_regional_combat_run_server_v1',{p_account_id:accountId,p_run_id:run![1]});
  if(stored.status!=='started')return json(publicRun(stored));
  if(!stored.playerDefinition||!stored.serverSeed)throw new Error('regional_combat_snapshot_missing');
  const result=resolveRegionalCombatV1({runId:stored.runId,serverSeed:stored.serverSeed,encounterId:stored.encounterId,player:stored.playerDefinition});
  const finished=await services.rpc<RegionalCombatRunRecord>('finish_regional_combat_run_server_v1',{p_account_id:accountId,p_run_id:stored.runId,p_snapshot_hash:stored.snapshotHash,p_result:result});
  return json(publicRun(finished));
 }catch(error){
  const message=error instanceof Error?error.message:'server_error',code=message.toLowerCase();
  const status=error instanceof GameplayError?error.status:/stale_state|regional_combat_already_resolved/.test(code)?409:/not_owned|owner_mismatch/.test(code)?403:/^(invalid_|unknown_|character_|regional_combat_|illegal_equipment)/.test(code)?400:503;
  return json({error:status===503?'Server temporarily unavailable. Retry the action.':code},status);
 }
};}
