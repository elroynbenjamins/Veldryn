import {createCharacter,newGame} from '../src/core/game';
import {resourceCodexEntries,resourceCodexQuantity,resourceCodexSources,RESOURCE_CATEGORIES} from '../src/core/resource-codex';
import {COMPANION_MISSIONS} from '../../../backend/src/server/companions/content';
import {COMBAT_COMPANIONS} from '../src/content/combat-companions';

function assert(condition:unknown,message:string):asserts condition{if(!condition)throw new Error(message)}
const entries=resourceCodexEntries();
assert(entries.length>40,'Codex should include the full materials catalog');
assert(entries.every(row=>Boolean(row.id)&&Boolean(row.name)),'Codex entries must have IDs and names');
assert(new Set(entries.map(row=>row.id)).size===entries.length,'Codex IDs must not duplicate');
assert(RESOURCE_CATEGORIES.includes('Companions'),'Companion filter must exist');
const byId=(id:string)=>entries.find(row=>row.id===id);
for(const id of ['essence','bondstones','TRIAL_SANCTUARY_MATERIAL','COPPER_ORE','IRONWOOD_LOG']){
 assert(byId(id),'Required codex entry missing: '+id);
}
const companionMaterials=new Set(COMBAT_COMPANIONS.flatMap(def=>[def.ascensionMaterialId,...(def.ascensionMaterialCosts??[]).map(row=>row.itemId)].filter((id):id is string=>!!id)));
for(const id of companionMaterials)assert(byId(id)?.category==='Companions','Ascension material not labeled as companion resource: '+id);
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
console.log('PASS: Account Resource Codex catalog, companion materials, sources and balances');
