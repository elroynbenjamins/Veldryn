/**
 * Hidden V27 War Camp API boundary: authenticate on the server, then issue
 * one private DB transaction. No route, public RPC, game UI or real wallet.
 * Never accept item quantities, community thresholds, inventory or buffs
 * from clients. The DB is the sole authority for consumption and counts.
 */
import {itemDef} from '../../apps/mobile/src/content/items';
import {makeWorldBossWarCampSnapshotV11,
 deriveWorldBossWarCampEffectsV11,type WorldBossWarCampSnapshotV11}
 from '../src/server/combat/world-boss-war-camp-v11';
import type {WorldBossRulesSourceV20} from './world-boss-frozen-modifiers-v20';
import type {WorldBossPgExecutorV19} from './world-boss-private-pg-v19';

export const WORLD_BOSS_V27_WAR_CAMP_LIVE=false as const;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REQ=/^[A-Za-z0-9_-]{8,128}$/;
const RECIPE=/^[A-Z0-9_]{4,100}$/;
const validUuid=(x:unknown):x is string=>typeof x==='string'&&UUID.test(x);
export type WorldBossWarCampTrackV27='fortifications'|'fieldProvisions'|'siegecraft';
export interface WorldBossWarCampRecipeV27{
 id:string;tier:1|2|3|4;track:WorldBossWarCampTrackV27;
 materials:readonly {itemId:string;quantity:number}[];
}
/** Verified v3 resource recipes; no unique equipment, pets or rare binders. */
export const WORLD_BOSS_V27_RECIPES:readonly WorldBossWarCampRecipeV27[]=[
 {id:'T1_FORTIFICATIONS',tier:1,track:'fortifications',
  materials:[{itemId:'GREENWOOD_LOG',quantity:70},{itemId:'COPPER_INGOT',quantity:12}]},
 {id:'T1_FIELD_PROVISIONS',tier:1,track:'fieldProvisions',
  materials:[{itemId:'DEWLEAF',quantity:60},{itemId:'COOKED_MEADOW_PERCH',quantity:12}]},
 {id:'T1_SIEGECRAFT',tier:1,track:'siegecraft',
  materials:[{itemId:'COPPER_ORE',quantity:70},{itemId:'COPPER_INGOT',quantity:12}]},
 {id:'T2_FORTIFICATIONS',tier:2,track:'fortifications',
  materials:[{itemId:'IRONWOOD_LOG',quantity:60},{itemId:'ASTER_IRON_INGOT',quantity:10}]},
 {id:'T2_FIELD_PROVISIONS',tier:2,track:'fieldProvisions',
  materials:[{itemId:'IRONBLOOM',quantity:38},{itemId:'ROASTED_ROOTSTREAM_TROUT',quantity:8}]},
 {id:'T2_SIEGECRAFT',tier:2,track:'siegecraft',
  materials:[{itemId:'ASTER_IRON_ORE',quantity:55},{itemId:'REINFORCED_FITTING',quantity:4}]},
 {id:'T3_FORTIFICATIONS',tier:3,track:'fortifications',
  materials:[{itemId:'DUNEWOOD',quantity:20},{itemId:'SUNSTONE_INGOT',quantity:6}]},
 {id:'T3_FIELD_PROVISIONS',tier:3,track:'fieldProvisions',
  materials:[{itemId:'SUNSCALE',quantity:14},{itemId:'GRILLED_OASIS_CARP',quantity:8}]},
 {id:'T3_SIEGECRAFT',tier:3,track:'siegecraft',
  materials:[{itemId:'SUNSTONE_ORE',quantity:24},{itemId:'SUNSTONE_INGOT',quantity:4}]},
 {id:'T4_FORTIFICATIONS',tier:4,track:'fortifications',
  materials:[{itemId:'DUNEWOOD',quantity:23},{itemId:'SUNSTONE_INGOT',quantity:6}]},
 {id:'T4_FIELD_PROVISIONS',tier:4,track:'fieldProvisions',
  materials:[{itemId:'SUNSCALE',quantity:18},{itemId:'GRILLED_OASIS_CARP',quantity:8}]},
 {id:'T4_SIEGECRAFT',tier:4,track:'siegecraft',
  materials:[{itemId:'SUNSTONE_ORE',quantity:25},{itemId:'SUNSTONE_INGOT',quantity:5}]},
] as const;
export function validateWorldBossV27Recipes():number{
 if(WORLD_BOSS_V27_RECIPES.length!==12||
  new Set(WORLD_BOSS_V27_RECIPES.map(r=>r.id)).size!==12)
  throw Error('world_boss_v27_invalid_recipe_catalog');
 for(const recipe of WORLD_BOSS_V27_RECIPES){
  if(!RECIPE.test(recipe.id)||![1,2,3,4].includes(recipe.tier)||
   !['fortifications','fieldProvisions','siegecraft'].includes(recipe.track)||
   recipe.materials.length!==2||
   new Set(recipe.materials.map(m=>m.itemId)).size!==2)
   throw Error('world_boss_v27_invalid_recipe');
  for(const m of recipe.materials){
   if(!Number.isSafeInteger(m.quantity)||m.quantity<=0||
    m.quantity>1000000||itemDef(m.itemId).id!==m.itemId||
    !['material','food'].includes(itemDef(m.itemId).type))
    throw Error('world_boss_v27_unknown_or_unspendable_material');
  }
 }
 return WORLD_BOSS_V27_RECIPES.length;
}
export interface WorldBossWarCampDonateSelectionV27{
 eventId:string;characterId:string;requestId:string;recipeId:string;
}
export interface WorldBossWarCampDonationReceiptV27{
 eventId:string;accountId:string;requestId:string;recipeId:string;
 track:WorldBossWarCampTrackV27;ordinal:1|2;revision:number;
 paidMaterials:readonly {itemId:string;quantity:number}[];
 repeated:boolean;
}
export interface WorldBossWarCampProgressV27{
 eventId:string;revision:number;
 contributions:Record<WorldBossWarCampTrackV27,number>;
 goals:Record<WorldBossWarCampTrackV27,{tier1At:number;tier2At:number}>;
 frozen:boolean;snapshot:WorldBossWarCampSnapshotV11|null;
}
export function validateWorldBossWarCampProgressV27(
 row:WorldBossWarCampProgressV27,eventId:string,
):WorldBossWarCampProgressV27{
 if(!row||row.eventId!==eventId||
  !Number.isSafeInteger(row.revision)||row.revision<0||
  typeof row.frozen!=='boolean'||
  (row.frozen&&row.snapshot===null)||
  (!row.frozen&&row.snapshot!==null))
  throw Error('world_boss_v27_invalid_private_progress');
 const tracks:WorldBossWarCampTrackV27[]=[
  'fortifications','fieldProvisions','siegecraft'];
 for(const t of tracks){
  const c=row.contributions?.[t],g=row.goals?.[t];
  if(!Number.isSafeInteger(c)||c<0||!g||
   !Number.isSafeInteger(g.tier1At)||g.tier1At<1||
   !Number.isSafeInteger(g.tier2At)||g.tier2At<=g.tier1At||
   c>g.tier2At)
   throw Error('world_boss_v27_invalid_community_progress');
 }
 if(row.snapshot){
  if(row.snapshot.eventId!==eventId||row.snapshot.revision!==row.revision)
   throw Error('world_boss_v27_mismatched_frozen_progress');
  deriveWorldBossWarCampEffectsV11(row.snapshot);
 }
 return row;
}
export interface WorldBossWarCampPrivateRepositoryV27{
 donateAtomic(input:{
  eventId:string;accountId:string;characterId:string;requestId:string;
  recipeId:string;
 }):Promise<WorldBossWarCampDonationReceiptV27>;
 freeze(eventId:string):Promise<WorldBossWarCampSnapshotV11>;
 progress(eventId:string):Promise<WorldBossWarCampProgressV27>;
}
export interface WorldBossWarCampDepsV27{
 authenticate(token:string):Promise<string|null>;
 db:WorldBossWarCampPrivateRepositoryV27;
}
const validateReceipt=(r:WorldBossWarCampDonationReceiptV27,
 request:WorldBossWarCampDonateSelectionV27,accountId:string)=>{
 const recipe=WORLD_BOSS_V27_RECIPES.find(x=>x.id===request.recipeId);
 if(!r||r.eventId!==request.eventId||r.accountId!==accountId||
  r.requestId!==request.requestId||r.recipeId!==request.recipeId||
  r.track!==recipe?.track||![1,2].includes(r.ordinal)||
  !Number.isSafeInteger(r.revision)||r.revision<1||
  typeof r.repeated!=='boolean'||!Array.isArray(r.paidMaterials)||
  JSON.stringify(r.paidMaterials)!==JSON.stringify(recipe.materials))
  throw Error('world_boss_v27_untrusted_db_receipt');
 return r;
};
export async function donateAuthenticatedWorldBossV27(input:{
 token:string;selection:WorldBossWarCampDonateSelectionV27;
},deps:WorldBossWarCampDepsV27):Promise<WorldBossWarCampDonationReceiptV27>{
 if(!deps||typeof deps.authenticate!=='function'||!deps.db||
  typeof deps.db.donateAtomic!=='function'||
  typeof input?.token!=='string'||input.token.length<8||
  input.token.length>8192||!input.selection||
  Object.keys(input.selection).some(key=>
   !['eventId','characterId','requestId','recipeId'].includes(key)))
  throw Error('world_boss_v27_invalid_private_request');
 const {eventId,characterId,requestId,recipeId}=input.selection;
 if(!validUuid(eventId)||!validUuid(characterId)||
  !REQ.test(requestId)||!RECIPE.test(recipeId)||
  !WORLD_BOSS_V27_RECIPES.some(r=>r.id===recipeId))
  throw Error('world_boss_v27_invalid_donation_selection');
 const accountId=await deps.authenticate(input.token);
 if(!validUuid(accountId))throw Error('world_boss_v27_auth_required');
 // DB locks event + camp + owner save, validates actual server recipe,
 // atomically debits unslotted inventory stacks and writes one receipt.
 const result=await deps.db.donateAtomic({
  eventId,accountId,characterId,requestId,recipeId,
 });
 return validateReceipt(result,input.selection,accountId);
}
export async function readAuthenticatedWorldBossWarCampV27(
 input:{token:string;eventId:string},deps:WorldBossWarCampDepsV27,
):Promise<WorldBossWarCampProgressV27>{
 if(!deps||typeof deps.authenticate!=='function'||
  !deps.db||typeof deps.db.progress!=='function'||
  !input||typeof input.token!=='string'||
  input.token.length<8||input.token.length>8192||
  !validUuid(input.eventId))
  throw Error('world_boss_v27_progress_auth_required');
 const accountId=await deps.authenticate(input.token);
 if(!validUuid(accountId))throw Error('world_boss_v27_progress_auth_required');
 const progress=await deps.db.progress(input.eventId);
 return validateWorldBossWarCampProgressV27(progress,input.eventId);
}
export function createWorldBossWarCampPgV27(
 pg:WorldBossPgExecutorV19,
):WorldBossWarCampPrivateRepositoryV27{
 if(!pg||typeof pg.query!=='function')throw Error('world_boss_v27_pg_required');
 const one=<T extends object>(rows:readonly T[],code:string)=>{
  if(rows.length!==1)throw Error(code);
  return rows[0];
 };
 return {
  async donateAtomic(input){
   if(!validUuid(input.eventId)||!validUuid(input.accountId)||
    !validUuid(input.characterId)||!REQ.test(input.requestId)||
    !RECIPE.test(input.recipeId))
    throw Error('world_boss_v27_pg_identity_invalid');
   const q=await pg.query<{receipt:WorldBossWarCampDonationReceiptV27}>(
    'SELECT private.world_boss_v27_donate($1::uuid,$2::uuid,$3::uuid,$4::text,$5::text) AS receipt',
    [input.eventId,input.accountId,input.characterId,input.requestId,input.recipeId]);
   return one(q.rows,'world_boss_v27_missing_donation_receipt').receipt;
  },
  async progress(eventId){
   if(!validUuid(eventId))throw Error('world_boss_v27_pg_event_invalid');
   const q=await pg.query<{progress:WorldBossWarCampProgressV27}>(
    'SELECT private.world_boss_v27_progress($1::uuid) AS progress',[eventId]);
   return validateWorldBossWarCampProgressV27(
    one(q.rows,'world_boss_v27_missing_progress').progress,eventId);
  },
  async freeze(eventId){
   if(!validUuid(eventId))throw Error('world_boss_v27_pg_event_invalid');
   const q=await pg.query<{snapshot:WorldBossWarCampSnapshotV11}>(
    'SELECT private.world_boss_v27_freeze($1::uuid) AS snapshot',[eventId]);
   const snapshot=one(q.rows,'world_boss_v27_missing_snapshot').snapshot;
   if(snapshot.eventId!==eventId)throw Error('world_boss_v27_foreign_snapshot');
   deriveWorldBossWarCampEffectsV11(snapshot);
   // Canonical V11 digest must agree with the authoritative database.
   if(makeWorldBossWarCampSnapshotV11({
    eventId:snapshot.eventId,revision:snapshot.revision,levels:snapshot.levels,
   }).digest!==snapshot.digest)
    throw Error('world_boss_v27_freeze_digest_mismatch');
   return snapshot;
  },
 };
}
/** Inject into the existing V26 V20-frozen profile source. Calling
 * loadWarCamp after Saturday freezes the one durable event snapshot first.
 * This never trusts a client-side progress counter or inventory.
 */
export function withWorldBossFrozenWarCampV27(
 existing:WorldBossRulesSourceV20,
 repository:WorldBossWarCampPrivateRepositoryV27,
):WorldBossRulesSourceV20{
 if(!existing||!repository||typeof repository.freeze!=='function')
  throw Error('world_boss_v27_invalid_server_rule_source');
 return {...existing,loadWarCamp:(eventId:string)=>repository.freeze(eventId)};
}
