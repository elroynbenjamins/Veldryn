/**
 * Combat 2.0 build HTTP security boundary. NOT MOUNTED IN EDGE ROUTER.
 *
 * Auth identity is resolved by a trusted Supabase /auth/v1/user verification
 * service, never from the request body, query, JWT payload or character ID.
 * Live transport is hard-disabled, independent of client or remote config.
 */
import type {BuildSelectionV2,GearSlotV2} from '../src/server/combat/v2/build-contract';
import type {BuildMutationV2} from '../src/server/combat/v2/build-mutations';

export const COMBAT_V2_BUILDS_TRANSPORT_RELEASED = false as const;
export interface V2BuildAuthServices {
  authenticate(token:string):Promise<string|null>;
}
export type BoundBuildActionV2=
  |{kind:'read'}
  |{kind:'mutate';mutation:BuildMutationV2};
export interface BoundBuildRequestV2 {
  trustedAccountId:string;characterId:string;action:BoundBuildActionV2;
}
export class BuildRequestErrorV2 extends Error{
  constructor(readonly code:string,readonly status:number){super(code);}
}
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const object=(value:unknown):value is Record<string,unknown>=>
  !!value&&typeof value==='object'&&!Array.isArray(value);
const id=(value:unknown):value is string=>typeof value==='string'&&UUID.test(value);
const numeric=(v:unknown,min=0,max=2**31-1):v is number=>
  typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
const cleanId=(v:unknown):v is string=>typeof v==='string'&&v.length>=3&&v.length<=128&&/^[A-Za-z0-9:_-]+$/.test(v);
const error=(code:string,status=400):never=>{throw new BuildRequestErrorV2(code,status);};
function keys(value:Record<string,unknown>,allowed:readonly string[],required=allowed){
 const actual=Object.keys(value);
 if(actual.some(k=>!allowed.includes(k))||required.some(k=>!Object.prototype.hasOwnProperty.call(value,k)))
   error('build_invalid_fields');
}
const SLOTS:ReadonlySet<string>=new Set([
 'helmet','chest','gloves','legs','boots','weapon','offhand','cape','amulet','ring',
]);
function parseSelection(input:unknown):BuildSelectionV2{
 if(!object(input))error('build_invalid_selection');
 const x=input as Record<string,unknown>;
 keys(x,['specializationId','equipment','activeSkills','talentRanks','signaturePassiveIds','capstoneId']);
 if(!(x.specializationId===null||cleanId(x.specializationId))||
   !(x.capstoneId===null||cleanId(x.capstoneId))||
   !object(x.equipment)||!Array.isArray(x.activeSkills)||!object(x.talentRanks)||
   !Array.isArray(x.signaturePassiveIds)||x.activeSkills.length>3||x.signaturePassiveIds.length>2)
   error('build_invalid_selection');
 const equipment:Partial<Record<GearSlotV2,string>>={};
 for(const [slot,itemId] of Object.entries(x.equipment)){
   if(!SLOTS.has(slot)||!cleanId(itemId))error('build_invalid_equipment');
   equipment[slot as GearSlotV2]=itemId;
 }
 const activeSkills: {skillId:string;variantId:string}[]=[];
 for(const selected of x.activeSkills){
   if(!object(selected))error('build_invalid_skill');
   keys(selected,['skillId','variantId']);
   if(!cleanId(selected.skillId)||!cleanId(selected.variantId))error('build_invalid_skill');
   activeSkills.push({skillId:selected.skillId,variantId:selected.variantId});
 }
 const talentRanks:Record<string,number>={};
 if(Object.keys(x.talentRanks).length>9)error('build_invalid_talents');
 for(const [passive,rank] of Object.entries(x.talentRanks)){
   if(!cleanId(passive)||!numeric(rank,1,3))error('build_invalid_talents');
   talentRanks[passive]=rank;
 }
 if(!x.signaturePassiveIds.every(cleanId))error('build_invalid_signatures');
 return {
   specializationId:x.specializationId as string|null,
   equipment,activeSkills,talentRanks,
   signaturePassiveIds:[...x.signaturePassiveIds] as string[],
   capstoneId:x.capstoneId as string|null,
 };
}
export async function bindAuthenticatedBuildRequestV2(
  request:Request,services:V2BuildAuthServices,
):Promise<BoundBuildRequestV2>{
 const url=new URL(request.url);
 if(url.searchParams.size!==2||url.searchParams.getAll('view').length!==1||
   url.searchParams.get('view')!=='combat_v2_builds'||
   url.searchParams.getAll('action').length!==1)
   error('build_invalid_route');
 const action=url.searchParams.get('action');
 if(!['read','save','activate','delete'].includes(action??''))error('build_invalid_action');
 const token=request.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
 if(!token)error('auth_required',401);
 const actor=await services.authenticate(token);
 if(!id(actor))error('invalid_session',401);
 const method=request.method.toUpperCase();
 if((action==='read'&&method!=='GET')||(action!=='read'&&method!=='POST'))
   error('method_not_allowed',405);
 let value:Record<string,unknown>;
 if(method==='GET'){
   const characterId=request.headers.get('x-veldryn-character-id');
   if(!id(characterId))error('build_invalid_character');
   return {trustedAccountId:actor!.toLowerCase(),characterId:characterId!.toLowerCase(),action:{kind:'read'}};
 }
 const len=request.headers.get('content-length');
 if(len!==null&&(!/^\d+$/.test(len)||Number(len)>8192))
   error('build_request_too_large',413);
 const text=await request.text();
 if(text.length>8192)error('build_request_too_large',413);
 try{value=JSON.parse(text)}catch{return error('build_invalid_json');}
 if(!object(value))error('build_invalid_payload');
 const common=['characterId','slot','expectedRevision'] as const;
 const required=action==='save'?[...common,'name','selected']:common;
 keys(value,required);
 if(!id(value.characterId)||!numeric(value.slot,0,1)||
   !numeric(value.expectedRevision,0))
   error('build_invalid_payload');
 const selected=action==='save'?parseSelection(value.selected):undefined;
 if(action==='save'&&(typeof value.name!=='string'||!value.name.trim()||
   value.name.trim().length>28||/[\x00-\x1F\x7F]/.test(value.name)))
   error('build_invalid_name');
 const mutation:BuildMutationV2=action==='save'?
   {action:'save',slot:value.slot as 0|1,expectedRevision:value.expectedRevision as number,
     name:(value.name as string).trim(),selected:selected!}:
   {action:action as 'activate'|'delete',slot:value.slot as 0|1,
     expectedRevision:value.expectedRevision as number};
 return {trustedAccountId:actor!.toLowerCase(),
   characterId:(value.characterId as string).toLowerCase(),
   action:{kind:'mutate',mutation}};
}
/**
 * Internal-only dispatch after authenticate() has independently verified the
 * bearer token. The edge router NEVER mounts this while transport is disabled.
 * Build-service featureEnabled requires a server-controlled rollout approval.
 */
export async function dispatchVerifiedBuildRequestV2(
 bound:BoundBuildRequestV2,
 service:{
   read(accountId:string,characterId:string,serverEnabled:boolean):Promise<unknown>;
   mutate(accountId:string,characterId:string,mutation:BuildMutationV2,serverEnabled:boolean):Promise<unknown>;
 },
 serverEnabled=false,
):Promise<unknown>{
 if(!serverEnabled)throw new BuildRequestErrorV2('feature_disabled',404);
 if(bound.action.kind==='read')
   return service.read(bound.trustedAccountId,bound.characterId,true);
 return service.mutate(bound.trustedAccountId,bound.characterId,bound.action.mutation,true);
}
/** Transport remains 404 even when called directly; no auth/RPC side effects. */
export function createHiddenCombatV2BuildHandler(_services:V2BuildAuthServices){
 return async(_request:Request):Promise<Response>=>
   new Response(JSON.stringify({error:'not_found'}),{
     status:404,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
   });
}
