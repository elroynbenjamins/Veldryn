import assert from 'node:assert/strict';
import {EQUIPMENT_API_NAMES_V33,dispatchEquipmentApiV33} from './equipment-api-contract-v33';
import {EQUIPMENT_PIECES_V33,EQUIPMENT_SETS_V33} from './equipment-catalog-v33';
import {validateV33RecipeMaterialBindings} from './equipment-recipe-materials-v33';
import {skinProgressV33} from './equipment-skin-progress-v33';

assert.deepEqual(EQUIPMENT_API_NAMES_V33,['get_equipment_set_detail_v33','get_equipment_crafting_detail_v33','get_equipment_loadout_summary_v33']);
const set=EQUIPMENT_SETS_V33[0],pieces=EQUIPMENT_PIECES_V33.filter(piece=>piece.setId===set.id);
assert.equal(dispatchEquipmentApiV33({name:'get_equipment_set_detail_v33',setId:set.id,craftedPieceIds:[]}).pieces.length,10);
assert.throws(()=>dispatchEquipmentApiV33({name:'get_equipment_set_detail_v33',setId:set.id,craftedPieceIds:[EQUIPMENT_PIECES_V33.find(piece=>piece.setId!==set.id)!.id]}),'cross-set crafted piece rejected');
assert.throws(()=>dispatchEquipmentApiV33({name:'get_equipment_set_detail_v33',setId:set.id,craftedPieceIds:[pieces[0].id,pieces[0].id]}),'duplicate crafted piece rejected');
assert.equal(dispatchEquipmentApiV33({name:'get_equipment_crafting_detail_v33',pieceId:pieces[0].id}).recipe.pieceId,pieces[0].id);
assert.equal(dispatchEquipmentApiV33({name:'get_equipment_loadout_summary_v33',equipped:pieces.map(piece=>({pieceId:piece.id,setId:piece.setId,slot:piece.slot}))}).activeSets[0].pieceCount,10);
assert.throws(()=>dispatchEquipmentApiV33({name:'get_equipment_loadout_summary_v33',equipped:[{pieceId:pieces[0].id,setId:set.id,slot:pieces[0].slot},{pieceId:pieces[1].id,setId:set.id,slot:pieces[0].slot}]}),'duplicate slots rejected');
assert.deepEqual(validateV33RecipeMaterialBindings(),[],'all recipe resources are bound');
assert.equal(skinProgressV33(set.id,pieces.map(piece=>piece.id),[set.id]).complete,true,'ten-piece skin completion');
assert.equal(skinProgressV33(set.id,pieces.slice(0,9).map(piece=>piece.id)).missingSlots.length,1,'incomplete skin progress');
console.log('v33 equipment API contract passed');
