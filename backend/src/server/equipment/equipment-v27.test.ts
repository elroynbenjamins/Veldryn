import {
  EXACT_PIECE_RECIPES_V27,COMPOSITE_COMPONENTS_V27,validateExactRecipeCatalogV27,exactRecipeV27,
  finalInventoryRequirementsV27,componentInventoryRequirementsV27,canStartExactPieceCraftV27,canCraftCompositeComponentV27
} from './equipment-exact-recipes-v27';
const ok=(v:unknown,m='assert')=>{if(!v)throw new Error(m)};
const eq=(a:unknown,b:unknown,m='assert')=>{if(a!==b)throw new Error(`${m}:${String(a)}!=${String(b)}`)};

ok(validateExactRecipeCatalogV27());
eq(EXACT_PIECE_RECIPES_V27.length,1701);eq(COMPOSITE_COMPONENTS_V27.length,33);
const t9=EXACT_PIECE_RECIPES_V27.filter(r=>r.tier==='T9');eq(t9.length,189);
ok(t9.every(r=>new Set(r.components.map(c=>c.skillId).filter(Boolean)).size>=3),'t9_should_use_multiple_professions');
ok(EXACT_PIECE_RECIPES_V27.filter(r=>r.components.some(c=>c.componentId==='COMP_T9_HEART')).every(r=>r.requiredLevel===70),'heart_only_at_70');

const weapon=EXACT_PIECE_RECIPES_V27.find(r=>r.tier==='T9'&&r.slot==='Weapon'&&r.className==='Ironwarden')!;
const req=finalInventoryRequirementsV27(weapon.pieceId);ok(Object.keys(req).length>=3,'weapon_multi_component');
let gate=canStartExactPieceCraftV27(weapon.pieceId,{'SKL_012':weapon.requiredLevel-1},{});ok(!gate.ok&&gate.errors.some(e=>e.startsWith('skill:SKL_012')),'final_skill_gate');
const inv=Object.fromEntries(Object.entries(req).map(([k,v])=>[k,v]));
gate=canStartExactPieceCraftV27(weapon.pieceId,{'SKL_012':weapon.requiredLevel},inv);ok(gate.ok,'final_craft_should_pass');

const frost=COMPOSITE_COMPONENTS_V27.find(c=>c.componentId==='COMP_T7_FRAME')!;
const componentReq:Record<string,number>={...componentInventoryRequirementsV27(frost.componentId)};
let cg=canCraftCompositeComponentV27(frost.componentId,{'SKL_012':frost.skillLevel-1},componentReq);ok(!cg.ok,'component_skill_gate');
cg=canCraftCompositeComponentV27(frost.componentId,{'SKL_012':frost.skillLevel},componentReq);ok(cg.ok,'component_should_pass');

const t1=exactRecipeV27('T1P_001')!;eq(t1.statGemSupported,false);eq(t1.effectGemSupported,false);
const t2=EXACT_PIECE_RECIPES_V27.find(r=>r.tier==='T2')!;eq(t2.statGemSupported,true);eq(t2.effectGemSupported,false);
const t3=EXACT_PIECE_RECIPES_V27.find(r=>r.tier==='T3')!;eq(t3.statGemSupported,true);eq(t3.effectGemSupported,true);
console.log('equipment-v27 exact recipe and multi-profession tests passed');
