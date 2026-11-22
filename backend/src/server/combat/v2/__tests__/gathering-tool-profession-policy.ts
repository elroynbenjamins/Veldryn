import {strict as assert} from 'node:assert';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {
 GATHERING_TOOL_TEMPLATES_V2,gatheringToolTemplateV2,
 planGatheringToolCraftV2,planGatheringToolEquipV2,
 type TrustedToolCraftPreflightV2,type TrustedToolEquipPreflightV2,
 type TrustedGatheringToolCopyV2,
} from '../gathering-tool-profession-policy';
import {
 mayWorkProfessionTierV2,minimumLevelForTierV2,
 type ProfessionIdV2,type TrustedProgressionV2,
} from '../profession-progression';

const progression=(levels:Partial<Record<ProfessionIdV2,number>>={},combatLevel=1):TrustedProgressionV2=>({
 combatLevel,professionLevels:levels,primaryFocus:null,
});
const craftContext=(levels:Partial<Record<ProfessionIdV2,number>>={},
 learnedBlueprintKnowledgeIds:string[]=[],carriedBlueprintItemIds:string[]=[]):
 TrustedToolCraftPreflightV2=>({
 progression:progression(levels),learnedBlueprintKnowledgeIds,carriedBlueprintItemIds,
});
const copy=(itemId:string,ownerCharacterId='buyer',instanceId='real-copy-1',
 location:TrustedGatheringToolCopyV2['location']='inventory'):TrustedGatheringToolCopyV2=>({
 instanceId,itemId,ownerCharacterId,location,
});
const equipContext=(itemId:string,levels:Partial<Record<ProfessionIdV2,number>>,
 overrides:Partial<TrustedToolEquipPreflightV2>={}):TrustedToolEquipPreflightV2=>({
 progression:progression(levels),characterId:'buyer',
 instances:[copy(itemId)],equippedBySkillAndTier:{},...overrides,
});

// Keep the hidden server item/skill/tier/blueprint allowlist aligned with the
// actual authored T1–T4 mobile catalogue; neither a stale duplicated list nor
// arbitrary client item IDs may authorize a non-existent tool.
const mobileCatalogue=readFileSync(resolve(
 __dirname,'../../../../../../apps/mobile/src/content/gathering-tools.ts',
),'utf8');
const authored=[...mobileCatalogue.matchAll(
 /tool\(\{id:'([^']+)',name:'[^']+',skillId:'([^']+)',tier:(\d)\b/g,
)].map(match=>({itemId:match[1],gatheringSkill:match[2],tier:Number(match[3])}));
assert.equal(authored.length,12,'Exactly twelve reviewed, authored T1–T4 mobile tools');
assert.deepEqual(
 GATHERING_TOOL_TEMPLATES_V2.map(({itemId,gatheringSkill,tier})=>({itemId,gatheringSkill,tier}))
  .sort((a,b)=>a.itemId.localeCompare(b.itemId)),
 authored.sort((a,b)=>a.itemId.localeCompare(b.itemId)),
 'The server must never invent a tool identity, profession or tier');
for(const t of GATHERING_TOOL_TEMPLATES_V2){
 assert.equal(t.blueprintKnowledgeId===null,t.tier===1,
  'Only beginner tools are blueprint-free');
 if(t.blueprintKnowledgeId)
  assert.ok(mobileCatalogue.includes("'"+t.blueprintKnowledgeId+"'"),
   t.itemId+' must use the already-authored physical blueprint knowledge');
}

assert.equal(GATHERING_TOOL_TEMPLATES_V2.length,12);
assert.equal(new Set(GATHERING_TOOL_TEMPLATES_V2.map(x=>x.itemId)).size,12);
assert.equal(GATHERING_TOOL_TEMPLATES_V2.filter(x=>!!x.blueprintKnowledgeId).length,9);
assert.equal(gatheringToolTemplateV2('NOT_A_TOOL'),undefined);
for(const skill of ['mining','woodcutting','fishing']){
 assert.equal(GATHERING_TOOL_TEMPLATES_V2.filter(t=>t.gatheringSkill===skill).length,4,
  skill+' must have one T1–T4 tool');
}
const runCounts={craft:0,equip:0};
for(const tool of GATHERING_TOOL_TEMPLATES_V2){
 const level=minimumLevelForTierV2(tool.tier);
 const blueprintId='BP_'+tool.itemId;
 const smith=craftContext({smithing:level},[],[blueprintId]);
 const approved=planGatheringToolCraftV2(smith,tool.itemId);
 assert.equal(approved.permitted,true,'Smithing-only maker must be allowed for '+tool.itemId);
 if(approved.permitted){
  assert.equal(approved.tool.itemId,tool.itemId);
  assert.equal(approved.blueprintItemToConsume,tool.blueprintKnowledgeId?blueprintId:null);
  assert.equal(approved.knowledgeToUnlock,tool.blueprintKnowledgeId);
 }
 // Not one XP from combat or the tool's gathering skill was required to make it.
 assert.equal(smith.progression.combatLevel,1);
 assert.equal(smith.progression.professionLevels[tool.gatheringSkill]??0,0);
 assert.equal(smith.progression.professionLevels.forge??0,0);
 assert.deepEqual(planGatheringToolCraftV2(craftContext({smithing:level-1},
  [],[blueprintId]),tool.itemId),{permitted:false,reason:'smithing_tier_locked'});
 if(tool.blueprintKnowledgeId){
  assert.deepEqual(planGatheringToolCraftV2(craftContext({smithing:level}),tool.itemId),
   {permitted:false,reason:'blueprint_locked'});
  const known=planGatheringToolCraftV2(craftContext({smithing:level},
   [tool.blueprintKnowledgeId]),tool.itemId);
  assert.equal(known.permitted,true);
  if(known.permitted){
   assert.equal(known.blueprintItemToConsume,null,
    'Permanent recipe knowledge must not consume a second blueprint');
   assert.equal(known.knowledgeToUnlock,null);
  }
 }else{
  assert.equal(approved.permitted,true,'T1 must not require RNG blueprint');
 }
 const buyer=equipContext(tool.itemId,{[tool.gatheringSkill]:level});
 const allowedEquip=planGatheringToolEquipV2(buyer,'real-copy-1');
 assert.equal(allowedEquip.permitted,true,tool.itemId+' buyer must equip without Smithing');
 if(allowedEquip.permitted){
  assert.deepEqual(allowedEquip.slot,{skill:tool.gatheringSkill,tier:tool.tier});
  assert.equal(allowedEquip.noChange,false);
  assert.equal(allowedEquip.replacedInstanceId,null);
 }
 assert.equal(buyer.progression.combatLevel,1);
 assert.equal(buyer.progression.professionLevels.smithing??0,0);
 assert.deepEqual(planGatheringToolEquipV2(equipContext(tool.itemId,{
   [tool.gatheringSkill]:level-1,smithing:100,
 },{progression:progression({[tool.gatheringSkill]:level-1,smithing:100},100)}),'real-copy-1'),
  {permitted:false,reason:'gathering_tier_locked'},
  'Combat 100 + Smithing 100 cannot bypass the recipient gathering-skill license');
 assert.deepEqual(planGatheringToolEquipV2(equipContext(tool.itemId,{
   [tool.gatheringSkill]:level,
 },{instances:[copy(tool.itemId,'seller')]}),'real-copy-1'),
  {permitted:false,reason:'copy_not_owned'});
 for(const location of ['bank','market_escrow'] as const){
  assert.deepEqual(planGatheringToolEquipV2(equipContext(tool.itemId,{
   [tool.gatheringSkill]:level,
  },{instances:[copy(tool.itemId,'buyer','real-copy-1',location)]}),'real-copy-1'),
   {permitted:false,reason:'copy_not_in_inventory'});
 }
 runCounts.craft++;runCounts.equip++;
}
assert.deepEqual(runCounts,{craft:12,equip:12});
assert.deepEqual(planGatheringToolCraftV2(craftContext({smithing:100}), 'FAKE_T9_TOOL'),
 {permitted:false,reason:'unknown_tool'});
assert.deepEqual(planGatheringToolEquipV2(equipContext('NOT_A_TOOL',{mining:100}), 'real-copy-1'),
 {permitted:false,reason:'unknown_tool'});
assert.deepEqual(planGatheringToolEquipV2(equipContext('COPPER_PICKAXE',{mining:100}), 'missing'),
 {permitted:false,reason:'missing_copy'});
for(let tier=5;tier<=9;tier++){
 // Training to T9 is independent now; inventing T5–T9 tool item IDs is not.
 assert.equal(mayWorkProfessionTierV2(progression({smithing:100}),'smithing',tier),true);
 assert.equal(GATHERING_TOOL_TEMPLATES_V2.filter(t=>t.tier===tier).length,0);
}

// Four independent slots per gathering skill, each backed by one exact copy.
const equipped=copy('ASTER_IRON_PICKAXE','buyer','equip-2','equipped');
const inventory=copy('ASTER_IRON_PICKAXE','buyer','replace-2','inventory');
const context:TrustedToolEquipPreflightV2={
 progression:progression({mining:10}),characterId:'buyer',
 instances:[equipped,inventory],
 equippedBySkillAndTier:{mining:{2:'equip-2'}},
};
assert.deepEqual(planGatheringToolEquipV2(context,'replace-2'),{
 permitted:true,slot:{skill:'mining',tier:2},equipInstanceId:'replace-2',
 replacedInstanceId:'equip-2',noChange:false,
},'Swap must return the exact previously-equipped physical copy');
assert.deepEqual(planGatheringToolEquipV2(context,'equip-2'),{
 permitted:true,slot:{skill:'mining',tier:2},equipInstanceId:'equip-2',
 replacedInstanceId:null,noChange:true,
},'Idempotent re-equip cannot duplicate a tool or bonus');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,instances:[equipped,equipped],
},'equip-2'),/invalid_instance_ledger/,'Repeated copy IDs must fail closed');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{mining:{1:'equip-2'}},
},'replace-2'),/invalid_equipped_custody/,'Tier swap spoofing must fail closed');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{fishing:{2:'equip-2'}},
},'replace-2'),/invalid_equipped_custody/,'Wrong gathering skill must fail closed');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{mining:{2:'replace-2'}},
},'replace-2'),/invalid_equipped_custody/,'Inventory copy cannot masquerade as equipped');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{},
},'replace-2'),/orphan_equipped_copy/,'Equipped copy without slot must fail closed');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{mining:{2:'equip-2'},woodcutting:{2:'equip-2'}},
},'replace-2'),/invalid_slots/,'Same physical copy cannot equip twice');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,characterId:'other',
},'replace-2'),/invalid_equipped_custody/,'Cross-character equipped copy must fail closed');
assert.throws(()=>planGatheringToolEquipV2({
 ...context,equippedBySkillAndTier:{mining:{2:'equip-2',10:'replace-2'}},
},'replace-2'),/invalid_slots/,'Unsupported tiers cannot be smuggled into slots');

// Never authorize tools from caller-forged skill maps or optional focus.
assert.throws(()=>planGatheringToolCraftV2(craftContext({smithing:101}), 'COPPER_PICKAXE'),
 /invalid_profession_level/);
assert.throws(()=>planGatheringToolEquipV2(equipContext('COPPER_PICKAXE',{mining:101}),
 'real-copy-1'),/invalid_profession_level/);
assert.throws(()=>planGatheringToolEquipV2({
 ...equipContext('COPPER_PICKAXE',{mining:1}),
 progression:{combatLevel:1,professionLevels:{mining:25},primaryFocus:'smithing'},
},'real-copy-1'),/focus_locked/);
console.log('PASS: 12/12 independent Smithing craft / gathering-only equip tier licenses; nine blueprint gates; exact-copy inventory, market escrow, cross-character and per-tier swap safety; T5-T9 unminted');
