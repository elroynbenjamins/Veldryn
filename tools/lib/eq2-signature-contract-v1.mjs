/**
 * REVIEW ONLY: validates the proposed six signature crafts and their source /
 * Combat 2.0 trait contracts. No runtime imports, combat execution, rewards or SQL.
 */
const fail=reason=>{throw Error('eq2_signature_review_invalid:'+reason);};
const whole=(n,label)=>Number.isSafeInteger(n)&&n>=1||fail(label);
const unique=(values,label)=>new Set(values).size===values.length||fail('duplicate_'+label);
const requireTrue=(p,reason)=>p||fail(reason);
const allowed=new Set(['fishing_secondary_catch','dungeon_completion_material']);
export function validateSignatureReview(config,{tierSpecs,fishingNodes,ordinaryItemIds,rareBlueprintItemIds}={}){
  requireTrue(config?.status==='REVIEW_ONLY_NO_RUNTIME','not_review_only');
  requireTrue(config?.release&&Object.values(config.release).every(x=>x===false),'release_flag_enabled');
  requireTrue(config.scope.existingOrdinaryItemsUntouched===169&&config.scope.existingOrdinaryRecipesUntouched===338
    &&config.scope.existingRareBlueprintsUntouched===6,'source_counts');
  requireTrue(config.policy?.gearAcquisition?.includes('never convert chest/drop-exclusive'),'reward_gear_not_exclusive');
  requireTrue(config.policy?.baseStatBudgetMultiplier===1,'flat_power_creep');
  requireTrue(config.policy?.trade?.dungeonSignatureGear?.includes('account_bound'),'dungeon_gear_binding');
  requireTrue(config.policy?.trade?.dungeonMaterial?.includes('account_bound'),'dungeon_material_binding');
  requireTrue(config.policy?.rareBlueprints?.includes('cannot unlock'),'blueprint_bypass');
  requireTrue(config.combatContract?.maxSignatureTraitsEquipped===2,'signature_trait_count_cap');
  requireTrue(config.combatContract?.familyCaps?.offensive===1&&config.combatContract?.familyCaps?.defensive_or_support===1,'family_caps');
  requireTrue(config.combatContract?.procsNotProccingProcs===true&&config.combatContract?.oneRollPerAbilityUse===true,'proc_recursion');
  requireTrue(config.combatContract?.bleed?.bossRule?.includes('50%'),'boss_bleed_cap');
  requireTrue(config.combatContract?.mitigation?.unconditionalSignatureCapFraction===0.03,'mitigation_cap');
  requireTrue(Array.isArray(config.materials)&&config.materials.length===6,'six_materials');
  requireTrue(Array.isArray(config.items)&&config.items.length===6,'six_items');
  unique(config.materials.map(x=>x.id),'materials');
  unique(config.items.map(x=>x.id),'items');
  unique(config.items.map(x=>x.traitId),'traits');
  const sourceById=new Map(config.materials.map(x=>[x.id,x]));
  const nodes=new Map(fishingNodes.map(x=>[x.id,x]));
  const ordinary=new Set(ordinaryItemIds);
  const rare=new Set(rareBlueprintItemIds);
  requireTrue(ordinary.size===169&&rare.size===6,'canonical_manifests');
  for(const m of config.materials){
    const tier=tierSpecs.find(t=>t.tier===m.tier);
    requireTrue(tier&&tier.tier>=2&&tier.tier<=4,'tier_material');
    requireTrue(allowed.has(m.origin),'material_origin');
    whole(m.unitsPerProc,'material_units');
    requireTrue(m.unitsPerProc===1,'no_multiple_material_grants');
    requireTrue(Number.isFinite(m.baseFinalChance)&&m.baseFinalChance>0&&m.baseFinalChance<=0.25,'source_chance');
    requireTrue(m.requiredCharacterLevel===tier.levels.character,'material_tier_entry');
    if(m.origin==='fishing_secondary_catch'){
      const node=nodes.get(m.fishingNodeId);
      requireTrue(node&&node.skillId==='fishing'&&node.unlockLevel<=m.requiredFishingSkill,'fishing_node_or_skill');
      requireTrue(m.tradeMode==='proposed_market_tradeable'&&m.doNotReplaceFishCatch===true,'fishing_source_policy');
      requireTrue(!m.region&&!m.dungeonDifficulty,'fishing_misclassified');
      requireTrue(m.requiredFishingSkill>0,'fishing_unlock_level');
    }else{
      requireTrue((m.region==='ASTERFALL'||m.region==='SUNSCAR')
        &&Number.isSafeInteger(m.dungeonDifficulty)&&m.dungeonDifficulty>=1&&m.dungeonDifficulty<=3,'dungeon_region_or_tier');
      requireTrue(m.binding==='account'&&m.tradeMode==='non_tradeable','dungeon_bound_material');
      requireTrue(m.acceptedSource?.includes('completed authenticated regional dungeon reward claim'),'dungeon_verified_completion');
      requireTrue(m.fishingNodeId===undefined,'dungeon_misclassified');
    }
  }
  const observed=new Set();
  for(const item of config.items){
    const material=sourceById.get(item.materialId);
    requireTrue(material&&material.origin===item.origin&&material.tier===item.tier,'item_material_mismatch');
    requireTrue(!ordinary.has(item.id)&&!rare.has(item.id),'existing_item_id_collision');
    requireTrue(item.materialQty===1,'item_material_quantity');
    const tier=tierSpecs.find(t=>t.tier===item.tier);
    requireTrue(!!tier&&[2,3,4].includes(item.tier),'item_tier');
    requireTrue(['ring','cape','amulet','gloves'].includes(item.slot),'signature_slot');
    requireTrue(['tank','damage','support'].includes(item.role),'signature_role');
    const p=item.trait;
    requireTrue(p&&['offensive','defensive_or_support'].includes(p.family),'trait_family');
    requireTrue(typeof p.description==='string'&&p.description.length>30,'trait_description');
    requireTrue(Number.isInteger(p.cooldownSeconds)&&p.cooldownSeconds>=0,'trait_cooldown');
    if(p.family==='offensive'){
      requireTrue((p.trigger==='direct_physical_hit'||p.trigger==='direct_physical_skill_hit'),'bleed_trigger');
      requireTrue(Number.isFinite(p.chance)&&p.chance>0&&p.chance<=0.10,'bleed_chance_cap');
      requireTrue(Number.isFinite(p.physicalBleedShareOfHit)
        &&p.physicalBleedShareOfHit>0&&p.physicalBleedShareOfHit<=0.24,'bleed_damage_cap');
      requireTrue(p.durationSeconds===4&&p.cooldownSeconds>=10,'bleed_duration_or_cooldown');
    }else if(p.trigger==='passive_equipped'){
      requireTrue(p.damageReductionFraction===0.03&&p.cooldownSeconds===0,'passive_mitigation_cap');
    }else if(p.trigger==='positive_heal_or_shield_ally'){
      requireTrue(p.shieldFractionOfTargetMaxHp<=0.02&&p.shieldFractionOfTargetMaxHp>0
        &&p.cooldownSeconds>=18,'support_shield_cap');
    }else{
      requireTrue(p.trigger==='damage_taken_direct_enemy_hit_at_least_15pct_max_hp'
        &&p.damageReductionFraction===0.02&&p.durationSeconds===5&&p.cooldownSeconds>=18,'active_guard_cap');
    }
    observed.add(item.tier+':'+item.origin);
  }
  requireTrue(observed.size===6,'tier_origin_coverage');
  for(const tier of [2,3,4]){
    for(const origin of allowed)requireTrue(observed.has(tier+':'+origin),'tier_missing_origin');
  }
  requireTrue(config.policy.frequency.includes('one server-authoritative roll'),'receipt_roll_authority');
  requireTrue(config.policy.failedDungeon.includes('no rare completion material'),'failed_dungeon_reward');
  requireTrue(config.release.readyToMerge===false,'accidental_release');
  return {status:'REVIEW_ONLY_NO_RUNTIME',validatedItems:config.items.length,
    validatedMaterials:config.materials.length,tiers:[2,3,4],
    fishingVariants:config.items.filter(x=>x.origin==='fishing_secondary_catch').length,
    dungeonVariants:config.items.filter(x=>x.origin==='dungeon_completion_material').length,
    combatTraits:config.items.map(x=>x.traitId)};
}
export function geometricSuccessQuantiles(chance,quantity=1){
  requireTrue(Number.isFinite(chance)&&chance>0&&chance<=1,'probability');
  whole(quantity,'quantity');
  if(quantity!==1)fail('multi_drop_requires_seeded_simulation');
  const quantile=p=>Math.ceil(Math.log1p(-p)/Math.log1p(-chance));
  return {p50:quantile(.5),p90:quantile(.9),p95:quantile(.95),
    expected:Math.round((1/chance)*100)/100};
}
