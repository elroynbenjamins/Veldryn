/**
 * Veldryn 2.0 — monthly event-resource economic review.
 * READ-ONLY scoring policy. Never imported by active Party Events, War Camp,
 * SQL, reward settlement or the mobile client.
 *
 * A single held-quantity snapshot establishes a WATCHLIST, NOT surplus growth.
 * Any promotion requires two consecutive month-end holdings and a verified
 * month of actual issuance/consumption, excluding internal bank/transfers.
 */
export const MONTHLY_EVENT_SINKS_REVIEW_VERSION = 'monthly-event-sinks-v1' as const;
export const MONTHLY_EVENT_SINKS_RELEASE_ENABLED = false as const;

export type MonthlySinkLane = 'party_wood'|'party_ore'|'party_herb'|
 'world_fortifications'|'world_provisions'|'world_siegecraft'|'requires_new_recipe';
export interface MonthlySinkMaterial {
 readonly itemId:string;
 readonly tier:1|2|3|4;
 readonly roles:readonly MonthlySinkLane[];
 readonly eligibleForExistingPartyCatalog:boolean;
 readonly eligibleForExistingWarCampRecipes:boolean;
 readonly requiredRecipeRegistration:boolean;
 readonly protectedFromAdaptivePressure:boolean;
}
export const MONTHLY_EVENT_SINK_MATERIALS: readonly MonthlySinkMaterial[] = Object.freeze([
 {itemId:'GREENWOOD_LOG',tier:1,roles:['party_wood','world_fortifications'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'IRONWOOD_LOG',tier:2,roles:['party_wood','world_fortifications'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'COPPER_ORE',tier:1,roles:['party_ore','world_siegecraft'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'ASTER_IRON_ORE',tier:2,roles:['party_ore','world_siegecraft'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'DEWLEAF',tier:1,roles:['party_herb','world_provisions'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'RIVER_MINT',tier:1,roles:['party_herb'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:false,protectedFromAdaptivePressure:false},
 {itemId:'MOSS_FIBER',tier:1,roles:['requires_new_recipe'],eligibleForExistingPartyCatalog:false,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:true,protectedFromAdaptivePressure:false},
 {itemId:'BOAR_HIDE',tier:1,roles:['requires_new_recipe'],eligibleForExistingPartyCatalog:false,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:true,protectedFromAdaptivePressure:false},
 {itemId:'MEADOW_PERCH',tier:1,roles:['requires_new_recipe'],eligibleForExistingPartyCatalog:false,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:true,protectedFromAdaptivePressure:false},
 {itemId:'HOLY_WATER',tier:1,roles:['requires_new_recipe'],eligibleForExistingPartyCatalog:false,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:true,protectedFromAdaptivePressure:false},
 {itemId:'DUNEWOOD',tier:3,roles:['world_fortifications'],eligibleForExistingPartyCatalog:false,eligibleForExistingWarCampRecipes:true,requiredRecipeRegistration:false,protectedFromAdaptivePressure:true},
 {itemId:'CROWNWOOD_LOG',tier:4,roles:['party_wood'],eligibleForExistingPartyCatalog:true,eligibleForExistingWarCampRecipes:false,requiredRecipeRegistration:false,protectedFromAdaptivePressure:true},
] as const);

export type MonthlySinkReviewStatus =
 'baseline_only'|'data_incomplete'|'protected_advanced_tier'|
 'concentrated_or_narrow_supply'|'not_a_growing_surplus'|
 'future_recipe_authoring_required'|'candidate_for_next_event_review';

export interface MonthlyItemSignal {
 readonly itemId:string;
 readonly month:string;
 /** Inventory + personal Bank + Guild Bank, with each ownership record counted once. */
 readonly totalHeld:number;
 /** Held by accounts active within last 30 days, from a defined nonoverlapping scope. */
 readonly activeHeld:number;
 readonly activeHolders:number;
 /** Share (0–10000 bps) held by top five eligible owners, if available. */
 readonly topFiveShareBps:number|null;
 /** True game-source awards only; trades/deposits are excluded. */
 readonly generatedUnits:number|null;
 /** True destructive consumption only; trades/deposits are excluded. */
 readonly consumedUnits:number|null;
 /** Source quantities, item identity and owner scope verified from authoritative reads. */
 readonly sourceVerified:boolean;
}
export interface MonthlyItemReview {
 readonly itemId:string;
 readonly month:string;
 readonly status:MonthlySinkReviewStatus;
 readonly held:number;
 readonly activeHeld:number;
 readonly monthlyNetFlow:number|null;
 readonly activeHeldChange:number|null;
 /** A ceiling for EXTRA voluntary material consumption, not an event requirement. */
 readonly maximumSuggestedAdditionalUnits:number;
 readonly lanes:readonly MonthlySinkLane[];
 readonly mayApplyAutomatically:false;
 readonly mustFreezeBeforeEventCreation:true;
}
export class MonthlySinkReviewError extends Error{
 constructor(readonly code:string){super(code);}
}
const fail=(code:string):never=>{throw new MonthlySinkReviewError(code);};
const int=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const month=(s:string)=>/^(20\d\d)-(0[1-9]|1[0-2])$/.test(s);
const nextMonth=(s:string)=>{
 const [y,m]=s.split('-').map(Number);
 return (m===12 ? y+1:y)+'-'+String(m===12?1:m+1).padStart(2,'0');
};
function valid(x:MonthlyItemSignal):boolean{
 return Boolean(x&&typeof x.itemId==='string'&&/^[A-Z0-9_]+$/.test(x.itemId)&&
 month(x.month)&&int(x.totalHeld)&&int(x.activeHeld)&&
 x.activeHeld<=x.totalHeld&&int(x.activeHolders)&&
 (x.topFiveShareBps===null||(int(x.topFiveShareBps)&&x.topFiveShareBps<=10000))&&
 (x.generatedUnits===null||int(x.generatedUnits))&&
 (x.consumedUnits===null||int(x.consumedUnits))&&typeof x.sourceVerified==='boolean');
}
export function reviewMonthlyEventMaterial(input:{
 current:MonthlyItemSignal;
 previous?:MonthlyItemSignal;
}):MonthlyItemReview {
 const {current,previous}=input;
 if(!valid(current)||previous&&!valid(previous))fail('invalid_monthly_inventory_source');
 if(previous&&(previous.itemId!==current.itemId||nextMonth(previous.month)!==current.month))
  fail('nonconsecutive_or_mismatched_months');
 const item=MONTHLY_EVENT_SINK_MATERIALS.find(x=>x.itemId===current.itemId);
 if(!item)throw new MonthlySinkReviewError('unregistered_monthly_review_material');
 const flowKnown=current.generatedUnits!==null && current.consumedUnits!==null;
 const change=previous?current.activeHeld-previous.activeHeld:null;
 const net=flowKnown?current.generatedUnits!-current.consumedUnits!:null;
 let status:MonthlySinkReviewStatus='baseline_only';
 if(item.protectedFromAdaptivePressure)status='protected_advanced_tier';
 else if(!previous)status='baseline_only';
 else if(!current.sourceVerified||!previous.sourceVerified||!flowKnown||
   current.topFiveShareBps===null)status='data_incomplete';
 else if(current.activeHolders<15||current.activeHeld<500||
   current.topFiveShareBps>6500)status='concentrated_or_narrow_supply';
 else if(change===null||change<=0||net===null||net<=0||
   change<Math.max(50,Math.ceil(previous.activeHeld*0.05))||
   current.generatedUnits! < Math.ceil((current.consumedUnits!+1)*1.20))
    status='not_a_growing_surplus';
 else if(item.requiredRecipeRegistration)status='future_recipe_authoring_required';
 else status='candidate_for_next_event_review';
 // Suggested additional monthly units are capped at 4% of active stock
 // and 20% of source production; never auto-populate event costs.
 const budget=(status==='candidate_for_next_event_review'||status==='future_recipe_authoring_required')?
  Math.max(0,Math.min(
   Math.floor(current.activeHeld*0.04),
   Math.floor(current.generatedUnits!*0.20),
   Math.max(0,net!)+Math.floor(current.activeHeld*0.02)
  )):0;
 return Object.freeze({
  itemId:current.itemId,month:current.month,status,
  held:current.totalHeld,activeHeld:current.activeHeld,
  monthlyNetFlow:net,activeHeldChange:change,
  maximumSuggestedAdditionalUnits:budget,
  lanes:Object.freeze([...item.roles]),
  mayApplyAutomatically:false as const,
  mustFreezeBeforeEventCreation:true as const,
 });
}
export function reviewMonthlyEventCatalog(input:{
 current:readonly MonthlyItemSignal[];
 previous?:readonly MonthlyItemSignal[];
}):readonly MonthlyItemReview[]{
 const ids=new Set<string>();
 for(const s of input.current){
  if(ids.has(s.itemId))fail('duplicate_monthly_item');
  ids.add(s.itemId);
 }
 const prior=new Map<string,MonthlyItemSignal>();
 for(const p of input.previous??[]){
  if(prior.has(p.itemId))fail('duplicate_previous_item');
  prior.set(p.itemId,p);
 }
 return Object.freeze(input.current.map(current=>reviewMonthlyEventMaterial({
  current,previous:prior.get(current.itemId)
 })).sort((a,b)=>
  b.maximumSuggestedAdditionalUnits-a.maximumSuggestedAdditionalUnits||
  b.activeHeld-a.activeHeld||a.itemId.localeCompare(b.itemId)
 ));
}
