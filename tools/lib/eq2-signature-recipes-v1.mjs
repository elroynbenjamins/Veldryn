/**
 * Offline, proposal-only six-piece signature recipe compiler.
 * Never imported by server Forge, client crafting, real drops or SQL.
 * Exact ingredient IDs come from the hidden 169/338 draft, not player state.
 */
const fail=reason=>{throw Error('eq2_signature_recipe_review:'+reason)};
const roundUpHundred=n=>Math.ceil(n/100)*100;
export function compileSignatureDraftRecipes({design,anchors,economy,ordinary,pieces}={}){
 if(!design||design.status!=='REVIEW_ONLY_NO_RUNTIME'
   ||!anchors||anchors.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME'
   ||!economy||economy.status!=='REVIEW_ONLY_NO_RUNTIME'
   ||!ordinary||ordinary.status!=='REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME'
   ||design.release==null||Object.values(design.release).some(x=>x!==false)
   ||anchors.noImplementationAuthorized!==true)fail('not_in_review_mode');
 if(design.items.length!==6||anchors.anchors.length!==6||
   pieces.length!==169||ordinary.recipes.length!==338)fail('catalog_counts');
 const rule=anchors.policy;
 if(!rule.oneFoundationRoutePerSignature||rule.refinedInputsFactor!==1.25
   ||rule.preserveCombatCommonAndRareCounts!==true
   ||rule.preserveBinderCount!==true||rule.signatureCatalystQty!==1
   ||rule.goldFactor!==1.5||rule.goldRoundUpTo!==100
   ||rule.durationFactor!==1.25||rule.xpFactor!==1
   ||rule.allItemSourceAndRuntimeFlagsOff!==true)fail('unsupported_cost_policy');
 const sourceById=new Map(pieces.map(p=>[p.id,p]));
 if(sourceById.size!==169)fail('duplicate_existing_pieces');
 const originalById=new Map(ordinary.recipes.map(x=>[x.id,x]));
 if(originalById.size!==338)fail('duplicate_original_recipes');
 const sigById=new Map(design.items.map(x=>[x.id,x]));
 if(sigById.size!==6)fail('duplicate_signature_pieces');
 const materialById=new Map(design.materials.map(x=>[x.id,x]));
 if(materialById.size!==6)fail('duplicate_special_materials');
 if(anchors.anchors.some(a=>!sigById.has(a.signatureItemId))
   ||new Set(anchors.anchors.map(a=>a.signatureItemId)).size!==6)fail('anchor_mismatch');
 const generated=[];
 for(const anchor of anchors.anchors){
  const item=sigById.get(anchor.signatureItemId);
  const sourcePiece=sourceById.get(anchor.pieceId),sourceRecipe=originalById.get(anchor.recipeId);
  const material=materialById.get(item.materialId);
  const tier=economy.tierSpecs.find(t=>t.tier===item.tier);
  if(!sourcePiece||!sourceRecipe||!tier||!material
    ||sourcePiece.tier!==item.tier||sourcePiece.role!==item.role
    ||sourcePiece.slot!==item.slot||sourceRecipe.pieceId!==sourcePiece.id
    ||sourceRecipe.tier!==tier.tier||sourceRecipe.route!=='foundation'
    ||sourceRecipe.reviewOnly!==true||item.materialQty!==1||
      material.tier!==item.tier)fail('invalid_source_anchor:'+item.id);
  const required=new Set([tier.items.common,tier.items.rare,tier.items.binder]);
  const refined=new Set([tier.items.metal,tier.items.timber,tier.items.leather,
    tier.items.cloth,tier.items.gem]);
  if([...refined].some(x=>required.has(x)))fail('refined_material_overlaps_reserved');
  if(sourceRecipe.inputs.some(x=>!Number.isSafeInteger(x.quantity)||x.quantity<1))
    fail('invalid_source_quantity');
  if(!sourceRecipe.inputs.some(x=>x.itemId===tier.items.common)
    ||!sourceRecipe.inputs.some(x=>x.itemId===tier.items.binder))
    fail('base_recipe_missing_required_material');
  const ids=new Set(sourceRecipe.inputs.map(x=>x.itemId));
  if(ids.size!==sourceRecipe.inputs.length||ids.has(item.materialId)
    ||sourceRecipe.inputs.some(x=>!required.has(x.itemId)&&!refined.has(x.itemId)))
    fail('unknown_base_ingredient');
  const inputs=[
    ...sourceRecipe.inputs.map(input=>({
      itemId:input.itemId,
      quantity:refined.has(input.itemId)
        ?Math.ceil(input.quantity*rule.refinedInputsFactor)
        :input.quantity
    })),
    {itemId:item.materialId,quantity:1}
  ];
  if(new Set(inputs.map(i=>i.itemId)).size!==inputs.length)fail('duplicate_signature_input');
  const recipe={
    id:item.id+'_SIGNATURE',
    pieceId:item.id,basePieceId:sourcePiece.id,baseRecipeId:sourceRecipe.id,
    name:item.name,traitId:item.traitId,materialOrigin:material.origin,
    tier:item.tier,slot:item.slot,role:item.role,profession:sourceRecipe.profession,
    route:'signature',
    inputs,characterLevel:sourceRecipe.characterLevel,
    professionLevel:sourceRecipe.professionLevel,
    gold:roundUpHundred(sourceRecipe.gold*rule.goldFactor),
    xp:sourceRecipe.xp,
    seconds:Math.ceil(sourceRecipe.seconds*rule.durationFactor),
    sourceReference:{gold:sourceRecipe.gold,xp:sourceRecipe.xp,seconds:sourceRecipe.seconds},
    ownership:item.origin==='dungeon_completion_material'?'account_bound':'tradeable_only_after_market_approval',
    previewOnly:true,usableInRealForge:false
  };
  if(sourceRecipe.gold<=0||sourceRecipe.xp<=0||sourceRecipe.seconds<=0
    ||!Number.isSafeInteger(recipe.gold)||recipe.gold<=sourceRecipe.gold
    ||recipe.seconds<=sourceRecipe.seconds||recipe.xp!==sourceRecipe.xp)
    fail('invalid_derived_cost');
  generated.push(recipe);
 }
 if(generated.length!==6||new Set(generated.map(x=>x.id)).size!==6
   ||generated.some(r=>sourceById.has(r.pieceId)))
   fail('generated_collision');
 return {
  schema:'eq2-signature-generated-review-v1',status:'REVIEW_ONLY_DO_NOT_IMPORT_TO_RUNTIME',
  warning:'Six proposal-only crafts, NOT registered in any item or Forge runtime. Ingredient costs assume the parent 338 ordinary route plan remains unresolved.',
  ordinaryItemsUnaffected:169,ordinaryRecipesUnaffected:338,
  signatureRecipes:generated,
  noActualSourceGrant:true,noRealItemMint:true,approvedForGameplay:false
 };
}
