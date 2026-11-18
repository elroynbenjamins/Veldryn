import assert from 'node:assert/strict';
import {V2_SERVER_PIECES,V2_SERVER_RECIPES,v2ServerRecipeAndPiece} from '../equipment-crafting-v2-manifest';
import {draftEquipmentV2Outcome} from '../equipment-crafting-v2-rolls';
import {
 v2ServerBaseStatProjection,v2ServerCreateExactTemplate,v2ServerExactTemplateConsistent,
 v2ServerEquipPreview,v2ServerWeightedBaseBudget,V2_SERVER_SLOT_BUDGET,
 type V2ExactEquipmentTemplate,
} from '../equipment-crafting-v2-instances';

assert.equal(V2_SERVER_PIECES.length,118,'118 exact V2 equipment templates expected');
assert.equal(V2_SERVER_RECIPES.length,236,'236 canonical methods must be retained');
const pieceById=new Map(V2_SERVER_PIECES.map(piece=>[piece.id,piece]));
const recipeByPiece=new Map(V2_SERVER_RECIPES.filter(r=>r.route==='foundation').map(r=>[r.pieceId,r]));
assert.equal(recipeByPiece.size,118);
const exactByPiece=new Map<string,V2ExactEquipmentTemplate>();
for(const piece of V2_SERVER_PIECES){
 const recipe=recipeByPiece.get(piece.id);
 assert.ok(recipe);
 const canonical=v2ServerRecipeAndPiece(recipe.id);
 assert.ok(canonical&&canonical.piece===piece);
 const roll=draftEquipmentV2Outcome({
  recipeId:recipe.id,pieceId:piece.id,tier:piece.tier,slot:piece.slot,role:piece.role,
 },()=>0);
 const exact=v2ServerCreateExactTemplate(piece,roll);
 assert.ok(v2ServerExactTemplateConsistent(exact),piece.id+' exact copy is canonical');
 assert.equal(exact.name,piece.name);assert.equal(exact.slot,piece.slot);
 assert.equal(exact.classRestriction,piece.classRestriction);
 assert.equal(exact.hands,piece.hands);
 assert.equal(exact.quality,0);
 assert.equal(exact.rarity,'mythic');
 assert.equal(exact.enhancementRank,0);
 assert.deepEqual(exact.gemSlots,[]);
 assert.equal(new Set(exact.affixes.map(a=>a.stat)).size,exact.affixes.length);
 const expectedPoints=(V2_SERVER_SLOT_BUDGET[piece.slot]
  +(piece.slot==='weapon'&&piece.hands!=='one'?V2_SERVER_SLOT_BUDGET.offhand:0))
  *piece.tier*1.08*.75*1.85;
 assert.ok(Math.abs(v2ServerWeightedBaseBudget(exact.baseStats)-expectedPoints)<.008,
  piece.id+' stat budget must include tier/rarity/quality and the offhand allowance');
 const neutral=v2ServerBaseStatProjection(piece,1);
 assert.ok(Math.abs(v2ServerWeightedBaseBudget(neutral)
  -expectedPoints/(.75*1.85))<.008,
  'Neutral weighted stat budget must not depend on how many base stats the slot uses');
 exactByPiece.set(piece.id,exact);
}
const wayfinder=exactByPiece.get('EQ2_WEAPON_T2_WAYFINDER');
const ironShield=exactByPiece.get('EQ2_OFFHAND_T2_IRONWARDEN');
const ironSword=exactByPiece.get('EQ2_WEAPON_T2_IRONWARDEN');
const fieldHelmet=exactByPiece.get('EQ2_FIELDBORN_GUARD_HELMET');
assert.ok(wayfinder&&ironShield&&ironSword&&fieldHelmet);
assert.equal(v2ServerEquipPreview({newItem:wayfinder,characterClass:'IRONWARDEN',
 characterLevel:30,equipped:[]}).reason,'wrong_class',
 'Crafting is unrestricted but equipping the wrong class weapon is blocked');
assert.equal(v2ServerEquipPreview({newItem:wayfinder,characterClass:'WAYFINDER',
 characterLevel:11,equipped:[]}).reason,'level_locked');
assert.equal(v2ServerEquipPreview({newItem:wayfinder,characterClass:'WAYFINDER',
 characterLevel:30,equipped:[{instanceId:'old-offhand',item:ironShield}]}).replace[0],
 'old-offhand','Equipping a two-handed bow requires explicit offhand removal');
assert.equal(v2ServerEquipPreview({newItem:ironShield,characterClass:'IRONWARDEN',
 characterLevel:30,equipped:[{instanceId:'old-twohand',item:wayfinder}]}).replace[0],
 'old-twohand','Equipping an offhand must not silently keep a two-handed weapon');
assert.ok(v2ServerEquipPreview({newItem:ironSword,characterClass:'IRONWARDEN',
 characterLevel:30,equipped:[{instanceId:'old-shield',item:ironShield}]}).replace.length===0,
 'A one-handed weapon may coexist with an offhand');
assert.equal(v2ServerEquipPreview({newItem:fieldHelmet,characterClass:'HEXWEAVER',
 characterLevel:12,equipped:[]}).allowed,true,
 'Role recommendations on generic armor must not become class restrictions');
assert.equal(v2ServerEquipPreview({newItem:ironShield,characterClass:'IRONWARDEN',
 characterLevel:30,equipped:[{instanceId:'old-shield',item:ironShield}]}).replace[0],
 'old-shield','Replacing a worn item should identify the actual displaced instance');
assert.equal(v2ServerEquipPreview({newItem:ironShield,characterClass:'IRONWARDEN',
 characterLevel:0,equipped:[]}).reason,'invalid_character_level');

const invalid=[
 {...ironSword,baseStats:{...ironSword.baseStats,attack:10000}},
 {...ironSword,quality:101},
 {...ironSword,slot:'ring'},
 {...ironSword,classRestriction:'ANY_CLASS'},
 {...ironSword,affixes:[ironSword.affixes[0],ironSword.affixes[0]]},
 {...ironSword,manifestVersion:'old'},
 {...ironSword,hands:'two'},
];
for(const forged of invalid){
 assert.equal(v2ServerExactTemplateConsistent(forged as never),false,
  'No modified canonical template may pass server preflight');
 assert.equal(v2ServerEquipPreview({newItem:forged as never,characterClass:'IRONWARDEN',
  characterLevel:30,equipped:[]}).reason,'unverified_template');
}
assert.throws(()=>v2ServerCreateExactTemplate({...pieceById.get(ironSword.pieceId)!} as never,
 draftEquipmentV2Outcome({recipeId:recipeByPiece.get(ironSword.pieceId)!.id,
 pieceId:ironSword.pieceId,tier:2,slot:'weapon',role:'tank'},()=>0)),
 /uncanonical_v2_item_template/,'A forged copy of a canonical piece must not be treated as authority');
console.log('PASS: 118 immutable Equipment V2 exact templates, stats, class/hand equip preflight and tamper rejection');
