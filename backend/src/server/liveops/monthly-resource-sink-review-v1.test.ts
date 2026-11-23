import {strict as assert} from 'node:assert';
import {
 MONTHLY_EVENT_SINKS_RELEASE_ENABLED,MONTHLY_EVENT_SINK_MATERIALS,
 MonthlySinkReviewError,reviewMonthlyEventMaterial,reviewMonthlyEventCatalog,
 type MonthlyItemSignal,
} from './monthly-resource-sink-review-v1';
const base=(itemId='GREENWOOD_LOG',month='2026-11'):MonthlyItemSignal=>({
 itemId,month,totalHeld:20000,activeHeld:10000,activeHolders:40,
 topFiveShareBps:3200,generatedUnits:5000,consumedUnits:1500,sourceVerified:true,
});
const prior=(itemId='GREENWOOD_LOG'):MonthlyItemSignal=>({
 ...base(itemId,'2026-10'),totalHeld:18000,activeHeld:8000,
 generatedUnits:null,consumedUnits:null,
});
const reject=(fn:()=>unknown,code:string)=>assert.throws(fn,(e:unknown)=>
 e instanceof MonthlySinkReviewError&&e.code===code,code);
assert.equal(MONTHLY_EVENT_SINKS_RELEASE_ENABLED,false);
assert.equal(MONTHLY_EVENT_SINK_MATERIALS.length,12);
assert.equal(new Set(MONTHLY_EVENT_SINK_MATERIALS.map(m=>m.itemId)).size,12);
for(const x of MONTHLY_EVENT_SINK_MATERIALS){
 assert(x.roles.length>0);
 assert(!x.eligibleForExistingPartyCatalog || x.roles.some(r=>r.startsWith('party_')));
 assert(!x.eligibleForExistingWarCampRecipes || x.roles.some(r=>r.startsWith('world_')));
 if(x.requiredRecipeRegistration){
  assert(!x.eligibleForExistingWarCampRecipes);
  assert(!x.eligibleForExistingPartyCatalog);
 }
}
const initial=reviewMonthlyEventMaterial({current:base()});
assert.equal(initial.status,'baseline_only');
assert.equal(initial.maximumSuggestedAdditionalUnits,0);
assert.equal(initial.mayApplyAutomatically,false);
const growing=reviewMonthlyEventMaterial({current:base(),previous:prior()});
assert.equal(growing.status,'candidate_for_next_event_review');
assert.equal(growing.maximumSuggestedAdditionalUnits,400);
assert.deepEqual([...growing.lanes],['party_wood','world_fortifications']);
assert.equal(growing.monthlyNetFlow,3500);
assert.equal(growing.activeHeldChange,2000);
assert.equal(growing.mustFreezeBeforeEventCreation,true);
for(const itemId of ['GREENWOOD_LOG','IRONWOOD_LOG','COPPER_ORE','ASTER_IRON_ORE','DEWLEAF','RIVER_MINT']){
 const x=reviewMonthlyEventMaterial({current:base(itemId),previous:prior(itemId)});
 assert.equal(x.status,'candidate_for_next_event_review',itemId);
}
for(const itemId of ['MOSS_FIBER','BOAR_HIDE','MEADOW_PERCH','HOLY_WATER']){
 const x=reviewMonthlyEventMaterial({current:base(itemId),previous:prior(itemId)});
 assert.equal(x.status,'future_recipe_authoring_required',itemId);
 assert.deepEqual([...x.lanes],['requires_new_recipe']);
 assert.equal(x.mayApplyAutomatically,false);
}
for(const itemId of ['DUNEWOOD','CROWNWOOD_LOG']){
 const x=reviewMonthlyEventMaterial({current:base(itemId),previous:prior(itemId)});
 assert.equal(x.status,'protected_advanced_tier',itemId);
 assert.equal(x.maximumSuggestedAdditionalUnits,0);
}
const cases:readonly [Partial<MonthlyItemSignal>,string][]=[
 [{sourceVerified:false},'data_incomplete'],
 [{generatedUnits:null},'data_incomplete'],
 [{consumedUnits:null},'data_incomplete'],
 [{topFiveShareBps:null},'data_incomplete'],
 [{activeHolders:4},'concentrated_or_narrow_supply'],
 [{topFiveShareBps:8000},'concentrated_or_narrow_supply'],
 [{activeHeld:400},'concentrated_or_narrow_supply'],
 [{generatedUnits:1800,consumedUnits:1600},'not_a_growing_surplus'],
 [{generatedUnits:0,consumedUnits:4000},'not_a_growing_surplus'],
 [{activeHeld:8050},'not_a_growing_surplus'],
];
for(const [changes,status] of cases){
 const x=reviewMonthlyEventMaterial({current:{...base(),...changes},previous:prior()});
 assert.equal(x.status,status,JSON.stringify(changes));
 assert.equal(x.maximumSuggestedAdditionalUnits,0);
}
const capped=reviewMonthlyEventMaterial({current:{...base(),generatedUnits:500,consumedUnits:0},
 previous:prior()});
assert.equal(capped.status,'candidate_for_next_event_review');
assert.equal(capped.maximumSuggestedAdditionalUnits,100); // 20% issuance ceiling
const rows=reviewMonthlyEventCatalog({
 current:[base('MOSS_FIBER'),base('COPPER_ORE'),base('GREENWOOD_LOG')],
 previous:[prior('MOSS_FIBER'),prior('COPPER_ORE'),prior('GREENWOOD_LOG')],
});
assert.equal(rows.length,3);
assert(rows.every(x=>x.maximumSuggestedAdditionalUnits===400));
assert.deepEqual(rows.map(x=>x.itemId),['COPPER_ORE','GREENWOOD_LOG','MOSS_FIBER']);
assert(rows.every(x=>x.mayApplyAutomatically===false));
reject(()=>reviewMonthlyEventMaterial({current:base(),previous:prior('DEWLEAF')}),
 'nonconsecutive_or_mismatched_months');
reject(()=>reviewMonthlyEventMaterial({current:base(),previous:{...prior(),month:'2026-09'}}),
 'nonconsecutive_or_mismatched_months');
reject(()=>reviewMonthlyEventMaterial({current:{...base(),totalHeld:9}}),
 'invalid_monthly_inventory_source');
reject(()=>reviewMonthlyEventMaterial({current:{...base(),generatedUnits:-1}}),
 'invalid_monthly_inventory_source');
reject(()=>reviewMonthlyEventMaterial({current:base('UNVERIFIED_ITEM')}),
 'unregistered_monthly_review_material');
reject(()=>reviewMonthlyEventCatalog({current:[base(),base()]}),'duplicate_monthly_item');
reject(()=>reviewMonthlyEventCatalog({current:[base()],previous:[prior(),prior()]}),'duplicate_previous_item');
console.log('PASS monthly sink review: no automatic changes, multi-month signal, rare-resource protection, concentration, source authorization, prospective lanes, quantity ceilings');
