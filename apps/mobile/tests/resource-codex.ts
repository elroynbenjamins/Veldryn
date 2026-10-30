import {createCharacter,newGame} from '../src/core/game';
import {resourceCodexEntries,resourceCodexCategoryEntries,resourceCodexMatchesCategory,resourceCodexQuantity,resourceCodexSources,RESOURCE_CATEGORIES} from '../src/core/resource-codex';
import {COMPANION_MISSIONS} from '../../../backend/src/server/companions/content';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';

function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
const entries=resourceCodexEntries();
assert(entries.length>40,'Codex should include the full materials catalog');
assert(entries===resourceCodexEntries(),'Catalog should be created just once, not rebuilt on every screen entry');
assert(resourceCodexCategoryEntries('All')===resourceCodexCategoryEntries('All'),'Cached category should remain referentially stable');
assert(entries.every(row=>Boolean(row.id)&&Boolean(row.name)),'Codex entries must have IDs and names');
assert(new Set(entries.map(row=>row.id)).size===entries.length,'Codex IDs must not duplicate');
assert(RESOURCE_CATEGORIES.includes('Companions'),'Companion filter must exist');
const byId=(id:string)=>entries.find(row=>row.id===id);
for(const id of ['essence','bondstones','TRIAL_SANCTUARY_MATERIAL','COPPER_ORE','IRONWOOD_LOG']){
 assert(byId(id),'Required codex entry missing: '+id);
}
const companionMaterials=new Set(COMBAT_COMPANIONS.flatMap(def=>[def.ascensionMaterialId,...(def.ascensionMaterialCosts??[]).map(row=>row.itemId)].filter((id):id is string=>!!id)));
for(const id of companionMaterials)assert(!!byId(id)&&resourceCodexMatchesCategory(byId(id)!,'Companions'),'Ascension material not in companion filter: '+id);
assert(resourceCodexCategoryEntries('Companions').every(row=>row.companionRelated),'Companion category must contain only related materials');
assert(resourceCodexCategoryEntries('Mining').every(row=>row.category==='Mining'),'Mining filter must not pick unrelated resources');
assert(resourceCodexCategoryEntries('All').length===entries.length,'All filter should retain entire catalog');
for(const mission of COMPANION_MISSIONS){
 for(const id of Object.keys(mission.baseRewards.materials??{}))assert(byId(id)?.companionRelated,'Expedition reward material missing: '+id);
}
const state=createCharacter(newGame(Date.UTC(2026,9,30)),'IRONWARDEN','Codex Tester');
const bondstones=byId('bondstones')!;
const bondSources=resourceCodexSources(state,bondstones);
assert(bondSources.some(source=>source.title==='Companion Trial bosses'),'Bondstones must list trial bosses');
assert(bondSources.some(source=>source.title==='Fallen Knight weekly rematch'),'Bondstones must list weekly boss rematch');
assert(bondSources.some(source=>source.title==='Monthly Trial completion'),'Bondstones must list monthly completion');
assert(bondSources.every(source=>source.kind==='companion'),'Companion currency sources should not navigate to inventory');
assert(resourceCodexQuantity(state,bondstones)===(state.account.bondstones??0),'Bondstones quantity should use account wallet');
assert(resourceCodexSources(state,byId('TRIAL_SANCTUARY_MATERIAL')!).length>0,'Trial Sanctuary Material should show confirmed sources');
const oreSources=resourceCodexSources(state,byId('COPPER_ORE')!);
assert(oreSources.some(source=>source.kind==='item'&&source.destination?.kind==='skills'),'Gathering materials should link to an actual gathering source');
assert(oreSources.every(source=>!source.availabilityDetail||source.status!=='ready'),'Availability copy should not display for ready sources');
const updatedState={...state,account:{...state.account,bondstones:5}};
assert(resourceCodexQuantity(updatedState,bondstones)===5,'Live wallet balances must not be cached across state updates');
assert(resourceCodexCategoryEntries('Companions').includes(bondstones),'Bondstones must appear under companion filter');
console.log('PASS: Account Resource Codex cached catalog, companion categories, responsive sources and live balances');
