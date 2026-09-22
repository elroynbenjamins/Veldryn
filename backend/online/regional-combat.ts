import type {GameState} from '../../apps/mobile/src/core/types';
import type {CombatantDefinition} from '../src/server/combat/types';
import {regionalCombatCatalogEntryV1,resolveRegionalCombatV1,startRegionalCombatV1,SUNSCAR_REGIONAL_COMBAT_CATALOG_V1,type RegionalCombatReservationV1,type RegionalCombatStoreV1,type RegionalCombatStoredResultV1} from '../src/server/combat/regional-combat-runtime-v1';
import {deriveOnlineCoopLoadout} from './coop-loadout';
import {deriveRole} from '../src/server/coop/role-readiness';
import {GameplayError,type GameplayServices} from './gameplay';

interface LoadedGame{state:GameState|null;version:number;serverNow:number;}
interface AccessResult{allowed:boolean;reason?:string;}
interface LoadedReceipt{reservation:RegionalCombatReservationV1;result?:RegionalCombatStoredResultV1|null;}
interface CadenceRowV1{cooldownSeconds:number;readyAtMs?:number|null;dailyWins?:number;dailyCap?:number|null;dailyResetAtMs?:number|null;}
interface PendingReceiptV1{receiptId:string;characterId:string;encounterId:string;zoneId:string;kind:string;contentId:string;createdAtMs:number;expiresAtMs:number;}

class RpcRegionalCombatStore implements RegionalCombatStoreV1{
 constructor(private services:Pick<GameplayServices,'rpc'>,private accountId:string){}
 reserve(input:RegionalCombatReservationV1){
  return this.services.rpc<RegionalCombatReservationV1>('reserve_regional_combat_server_v1',{
   p_account_id:this.accountId,p_character_id:input.characterId,p_request_id:input.requestId,p_request_hash:input.requestHash,
   p_receipt_id:input.receiptId,p_encounter_id:input.encounterId,p_zone_id:input.zoneId,p_encounter_kind:input.kind,p_content_id:input.contentId,
   p_server_seed:input.serverSeed,p_player_definition:input.player,
  });
 }
 async load(receiptId:string){const row=await this.services.rpc<LoadedReceipt>('load_regional_combat_server_v1',{p_account_id:this.accountId,p_receipt_id:receiptId});return row.reservation;}
 async readResult(receiptId:string){const row=await this.services.rpc<LoadedReceipt>('load_regional_combat_server_v1',{p_account_id:this.accountId,p_receipt_id:receiptId});return row.result??undefined;}
 async commitResult(input:RegionalCombatStoredResultV1){return this.services.rpc<{duplicate:boolean;result:RegionalCombatStoredResultV1}>('commit_regional_combat_result_server_v1',{p_account_id:this.accountId,p_receipt_id:input.receiptId,p_result:input});}
}

export interface RegionalCombatStartRequestV1{requestId:string;characterId:string;encounterId:string;}

function projection(reservation:RegionalCombatReservationV1){
 return {receiptId:reservation.receiptId,encounterId:reservation.encounterId,zoneId:reservation.zoneId,kind:reservation.kind,contentId:reservation.contentId,status:'ready_to_resolve' as const};
}

export class OnlineRegionalCombatRuntimeV1{
 constructor(private services:GameplayServices){}
 async start(accountId:string,request:RegionalCombatStartRequestV1){
  const encounter=regionalCombatCatalogEntryV1(request.encounterId);if(!encounter)throw new GameplayError('unknown_regional_encounter');
  const game=await this.services.rpc<LoadedGame>('load_online_game_server_v1',{p_account_id:accountId});
  if(!game.state?.character)throw new GameplayError('character_required');
  if(game.state.character.id!==request.characterId)throw new GameplayError('character_not_owned',403);
  const loadout=deriveOnlineCoopLoadout(accountId,game.state,game.version);
  if(!loadout.legalEquipment)throw new GameplayError('illegal_equipment');
  const access=await this.services.rpc<AccessResult>('regional_combat_access_server_v1',{p_account_id:accountId,p_character_id:request.characterId,p_zone_id:encounter.zoneId,p_content_id:encounter.contentId,p_required_level:encounter.level});
  if(!access.allowed)throw new GameplayError(access.reason??'regional_encounter_locked',403);
  const role=deriveRole(loadout.classId),snapshot={...loadout.stats,role};
  const store=new RpcRegionalCombatStore(this.services,accountId);
  const reservation=await startRegionalCombatV1({
   store,
   authorizer:{
    async assertEncounterUnlocked(){},
    async loadVerifiedPlayer(){return {snapshot,abilities:structuredClone(loadout.abilities)};},
   },
   rewards:this.services,
   randomId:()=>this.services.randomId(),
   randomSeed:()=>this.services.randomId()+this.services.randomId(),
   nowMs:()=>game.serverNow,
  },{accountId,characterId:request.characterId,encounterId:request.encounterId,requestId:request.requestId});
  return projection(reservation);
 }
 async cadence(accountId:string){
  const game=await this.services.rpc<LoadedGame>('load_online_game_server_v1',{p_account_id:accountId});
  const pending=await this.services.rpc<PendingReceiptV1[]>('pending_regional_combat_server_v1',{p_account_id:accountId});
  const encounters=await Promise.all(SUNSCAR_REGIONAL_COMBAT_CATALOG_V1.map(async encounter=>{
   const row=await this.services.rpc<CadenceRowV1>('regional_combat_cadence_server_v1',{p_account_id:accountId,p_encounter_id:encounter.encounterId,p_encounter_kind:encounter.kind});
   return {encounterId:encounter.encounterId,cooldownSeconds:row.cooldownSeconds,readyAtMs:row.readyAtMs??null,dailyWins:Math.max(0,Math.floor(row.dailyWins??0)),dailyCap:row.dailyCap??null,dailyResetAtMs:row.dailyResetAtMs??null};
  }));
  return {serverNow:game.serverNow,encounters,pending};
 }
 async resolve(accountId:string,receiptId:string){
  const store=new RpcRegionalCombatStore(this.services,accountId);
  const resolution=await resolveRegionalCombatV1({
   store,
   authorizer:{async assertEncounterUnlocked(){throw new Error('not_used');},async loadVerifiedPlayer(){throw new Error('not_used');}},
   rewards:this.services,
   randomId:()=>this.services.randomId(),randomSeed:()=>this.services.randomId(),nowMs:()=>Date.now(),
  },{accountId,receiptId});
  return {receiptId,result:resolution.result,reward:resolution.reward??null,duplicate:resolution.duplicate};
 }
}

const headers={'Content-Type':'application/json','Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
const uuid=/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export function regionalCombatHandlerV1(services:GameplayServices){
 const runtime=new OnlineRegionalCombatRuntimeV1(services);
 return async(request:Request):Promise<Response>=>{
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  try{
   const bearer=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];if(!bearer)return json({error:'auth_required'},401);
   const accountId=await services.authenticate(bearer);if(!accountId)return json({error:'invalid_session'},401);
   const path=new URL(request.url).pathname;
   if(path.endsWith('/regional-combat/status')){
    if(request.method!=='GET')return json({error:'method_not_allowed'},405);
    return json(await runtime.cadence(accountId));
   }
   const match=path.match(/\/regional-combat\/([0-9a-fA-F-]+)$/);
   if(match){
    if(!uuid.test(match[1]))return json({error:'invalid_request'},400);
    if(request.method!=='POST')return json({error:'method_not_allowed'},405);
    return json(await runtime.resolve(accountId,match[1]));
   }
   if(!path.endsWith('/regional-combat'))return json({error:'not_found'},404);
   if(request.method!=='POST')return json({error:'method_not_allowed'},405);
   const raw=await request.text();if(raw.length>2048)return json({error:'request_too_large'},413);
   let body:unknown;try{body=JSON.parse(raw);}catch{throw new GameplayError('invalid_json');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new GameplayError('invalid_request');
   const row=body as Record<string,unknown>;
   if(Object.keys(row).some(key=>!['requestId','characterId','encounterId'].includes(key))||typeof row.requestId!=='string'||typeof row.characterId!=='string'||typeof row.encounterId!=='string')throw new GameplayError('invalid_request');
   return json(await runtime.start(accountId,row as unknown as RegionalCombatStartRequestV1));
  }catch(error){
   const message=error instanceof Error?error.message:'server_error';
   const status=error instanceof GameplayError?error.status:/owner_mismatch|not_owned/.test(message)?403:/cooldown|daily_cap|regional_combat_pending/.test(message)?429:/receipt_expired|invalid_|unknown_|locked|below_level|not_active/.test(message)?400:503;
   return json({error:status===503?'Server temporarily unavailable. Retry the pending action.':message},status);
  }
 };
}
