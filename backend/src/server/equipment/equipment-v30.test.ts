import {COMBAT_SOURCES_V30,TOKEN_SOURCES_V30,rollGuaranteedTokenRewardV30,validateCombatDropV30,validatePveSourceCatalogV30} from './equipment-pve-rewards-v30';
import {PVE_REQUIREMENTS_BY_PIECE_V30,validateExactPveCatalogV30} from './equipment-pve-requirements-v30';
function assert(x:boolean,m:string){if(!x)throw new Error(m)}
assert(validatePveSourceCatalogV30(),'source catalog');
assert(validateExactPveCatalogV30(),'exact pve catalog');
assert(Object.keys(PVE_REQUIREMENTS_BY_PIECE_V30).length===1701,'1701 requirements');
assert(Object.values(TOKEN_SOURCES_V30).every(x=>x.randomDrop==='No'),'guaranteed tokens');
assert(Math.min(...Object.values(COMBAT_SOURCES_V30).map(x=>x.dropChance))>=.10,'no mandatory low-percent mats');
assert(rollGuaranteedTokenRewardV30('TOK_FROST_WYRM',0,false)>=7,'frost wyrm minimum');
assert(rollGuaranteedTokenRewardV30('TOK_FROST_WYRM',.999,true)===12,'frost wyrm max + first clear');
assert(validateCombatDropV30('AST_OATHGLASS',.99,14),'soft pity works');
for(const r of Object.values(PVE_REQUIREMENTS_BY_PIECE_V30)){
  assert(r.frozenHeartRequirement===0||r.requiredLevel>=70,`heart gate ${r.pieceId}`);
}
