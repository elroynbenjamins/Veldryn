import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {NOVICE_SETS,noviceItemId} from '../src/content/novice-sets';
import {CHARACTER_SKIN_SETS} from '../src/content/character-skin-sets';
import {characterSkinCollection,discoverCharacterSkins,equipmentSetSkinId,selectCharacterSkin} from '../src/core/character-skins';
import {createCharacter,newGame,sellItem} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';
import type {GameState} from '../src/core/types';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const set=EQUIPMENT_SETS.find(candidate=>candidate.id==='rimewall_oath')!;
let state=createCharacter(newGame(1_000),'IRONWARDEN','SkinTester');
state={...state,
  inventory:{...state.inventory,stacks:[set.itemIds[0],...set.itemIds.slice(4)].map(itemId=>({itemId,quantity:1}))},
  bank:{...state.bank,stacks:[{itemId:set.itemIds[1],quantity:1}]},
  overflow:{stacks:[{itemId:set.itemIds[2],quantity:1}],expiresAtMs:10_000},
  character:{...state.character!,equipment:{...state.character!.equipment,ring:set.itemIds[3]}},
};

const complete=characterSkinCollection(state).find(skin=>skin.setId===set.id)!;
ok(complete.ownedPieces===set.itemIds.length&&complete.unlocked,'Every ownership location must count toward a complete set');
state=discoverCharacterSkins(state);
const skinId=equipmentSetSkinId(set.id);
ok(state.character!.unlockedSkinIds!.includes(skinId),'Complete-set ownership must be recorded');
ok(state.character!.selectedSkinId==='starting','Discovering a skin must not equip or select it');
ok(selectCharacterSkin(state,skinId).character!.selectedSkinId===skinId,'Approved progression artwork must be selectable');
ok(selectCharacterSkin(state,'starting').character!.selectedSkinId==='starting','The starting skin must remain selectable');

const emptied={...state,inventory:{...state.inventory,stacks:[]},bank:{...state.bank,stacks:[]},overflow:{stacks:[],expiresAtMs:null},character:{...state.character!,equipment:{}}} as GameState;
ok(characterSkinCollection(emptied).find(skin=>skin.id===skinId)!.unlocked,'The skin must survive losing every set piece');
ok(migrateSave(JSON.parse(JSON.stringify(emptied))).character!.unlockedSkinIds!.includes(skinId),'The skin must survive save migration');

const allCarried={...createCharacter(newGame(2_000),'IRONWARDEN','Seller'),inventory:{stacks:set.itemIds.map(itemId=>({itemId,quantity:1})),capacity:30}};
const sold=sellItem(allCarried,set.itemIds[0]);
ok(sold.character!.unlockedSkinIds!.includes(skinId),'Selling a piece must first capture simultaneous full-set ownership');
ok(!characterSkinCollection(createCharacter(newGame(3_000),'BASTION','OtherClass')).some(skin=>skin.id===skinId),'Collections must remain character-class scoped');

ok(NOVICE_SETS.length===9&&NOVICE_SETS.every(candidate=>candidate.slots.length===10&&!!candidate.appearanceId),'Every class must have an artwork-ready ten-piece beginner set');
const novice=NOVICE_SETS.find(candidate=>candidate.classId==='IRONWARDEN')!;
let noviceState=createCharacter(newGame(4_000),'IRONWARDEN','BeginnerSkinTester');
noviceState={...noviceState,inventory:{...noviceState.inventory,stacks:novice.slots.map(slot=>({itemId:noviceItemId(novice.classId,slot),quantity:1}))}};
noviceState=discoverCharacterSkins(noviceState);
const noviceSkinId=equipmentSetSkinId(novice.id);
ok(noviceState.character!.unlockedSkinIds!.includes(noviceSkinId),'A complete beginner set must unlock its matching skin');
ok(selectCharacterSkin(noviceState,noviceSkinId).character!.selectedSkinId===noviceSkinId,'An approved beginner skin must be selectable');
ok(EQUIPMENT_SETS.length===27&&EQUIPMENT_SETS.every(candidate=>!!candidate.appearanceId),'Every accepted regional set must expose its front skin');
ok(CHARACTER_SKIN_SETS.some(candidate=>candidate.id==='aster_iron'&&candidate.itemIds.length===10),'The accepted Aster Iron set must participate in skin discovery');

console.log('PASS: accepted front skins, progression sets, Aster Iron and beginner set ownership unlock class-bound appearances');
