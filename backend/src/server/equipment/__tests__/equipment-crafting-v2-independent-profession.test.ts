import assert from 'node:assert/strict';
import {V2_SERVER_RECIPES} from '../equipment-crafting-v2-manifest';
import {resolveEquipmentV2DraftCommand,V2DraftCraftError,type V2DraftSnapshot} from '../equipment-crafting-v2-transaction';
import {
  PROFESSION_TIER_LEVELS_V2,mayWorkProfessionTierV2,mayEquipCombatGearV2,
  projectTrustedProgressionV2,
} from '../../combat/v2/profession-progression';

/** Whole-manifest regression: NONE of the 338 pinned recipes may require
 * combat XP or an unrelated profession. This is a hidden rehearsal only.
 * Gold, real owned inputs, receipt/blueprint eligibility and production
 * level-cap rules still need their separate authoritative source gates.
 */
assert.equal(V2_SERVER_RECIPES.length,338);
const make=(recipe:typeof V2_SERVER_RECIPES[number],craftLevel:number):V2DraftSnapshot=>({
  accountId:'account-test',activeCharacterId:'character-smith',version:1,
  forgeSlotCapacity:3,
  characters:{
    'character-smith':{
      level:1,
      professionLevels:{
        smithing:recipe.profession==='smithing'?craftLevel:0,
        tailoring:recipe.profession==='tailoring'?craftLevel:0,
      },
      gold:Math.max(1_000_000,recipe.gold),
      inventory:Object.fromEntries(recipe.inputs.map(x=>[x.itemId,x.quantity])),
    },
  },
  bank:{},jobs:[],equipment:[],skillAwards:[],receipts:[],
});
const command=(recipeId:string)=>({
  kind:'start' as const,recipeId,requestId:'independent-001',expectedVersion:1,
});
let checked=0;
for(const recipe of V2_SERVER_RECIPES){
  const min=PROFESSION_TIER_LEVELS_V2[recipe.tier-1];
  assert.ok(min!==undefined,'only T1-T9 may issue profession licenses');
  assert.ok(recipe.professionLevel>=0&&recipe.professionLevel<=100,
    recipe.id+' must not require impossible own-skill level');
  const required=Math.max(min,recipe.professionLevel);
  const source={
    combatLevel:1,professionLevels:{
      smithing:recipe.profession==='smithing'?required:0,
      tailoring:recipe.profession==='tailoring'?required:0,
    },primaryFocus:null,
  } as const;
  assert.equal(mayWorkProfessionTierV2(source,recipe.profession,recipe.tier),true);
  assert.equal(mayEquipCombatGearV2(source,Math.max(2,recipe.characterLevel)),false,
    'A profession master may craft equipment without being allowed to wear it');
  assert.equal(projectTrustedProgressionV2(source).characterLevel,1);
  const fresh=make(recipe,required);
  const plan=resolveEquipmentV2DraftCommand(fresh,command(recipe.id),{
    accountId:fresh.accountId,characterId:fresh.activeCharacterId,
    nowMs:1_000_000,randomId:()=> 'job-unique-'+checked,
    randomInt:()=>0,
  });
  assert.equal(plan.response.kind,'started',recipe.id);
  assert.equal(plan.next.jobs[0].ownerCharacterId,'character-smith');
  assert.equal(plan.next.characters['character-smith'].level,1);
  assert.equal(plan.next.characters['character-smith'].gold,
    fresh.characters['character-smith'].gold-recipe.gold);
  assert.ok(plan.next.receipts.length===1);
  assert.equal(plan.next.equipment.length,0,'No item minted at start');
  const under=make(recipe,required-1);
  assert.throws(
    ()=>resolveEquipmentV2DraftCommand(under,command(recipe.id),{
      accountId:under.accountId,characterId:under.activeCharacterId,
      nowMs:1_000_000,randomId:()=> 'job-denied',randomInt:()=>0,
    }),
    (err:unknown)=>err instanceof V2DraftCraftError&&err.reason==='craft_requirement_locked',
    'a recipe requires its own skill level, not another profession or combat XP: '+recipe.id,
  );
  checked++;
}
assert.equal(checked,338);
console.log('PASS: all 338 Equipment V2 crafting routes accept combat Lv1 specialist with own-skill license, protect wearable level and reject undertrained specialists');
