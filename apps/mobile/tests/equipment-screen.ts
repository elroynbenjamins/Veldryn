import {createCharacter,newGame} from '../src/core/game';
import {EQUIPMENT_SLOT_ORDER,equipmentScreenModel} from '../src/core/equipment-screen';

const state=createCharacter(newGame(0),'IRONWARDEN','Equipment Test','female');
const model=equipmentScreenModel(state);
if(EQUIPMENT_SLOT_ORDER.length!==10||new Set(EQUIPMENT_SLOT_ORDER).size!==10)throw new Error('Equipment screen must expose ten unique canonical slots');
if(model.slots.length!==10||model.equippedCount!==1)throw new Error('Equipment screen model does not reflect live equipment state');
if(model.slots.find(slot=>slot.slot==='weapon')?.itemId!=='basic_sword')throw new Error('Equipment screen did not read the equipped weapon');
if(model.stats.maxHp!==155||model.stats.attack!==19||model.stats.defense!==19)throw new Error('Equipment screen stats must come from effectiveStats');
if(model.loadouts.map(loadout=>loadout.id).join(',')!=='LOAD_001,LOAD_002,LOAD_003')throw new Error('Ironwarden loadout guides must follow canonical order');
const enhancedState={...state,character:{...state.character!,gearEnhancements:{basic_sword:{rank:2,failures:1,gemIds:[]}}}};
const enhancedWeapon=equipmentScreenModel(enhancedState).slots.find(slot=>slot.slot==='weapon');
if(enhancedWeapon?.enhancement?.rank!==2||enhancedWeapon.enhancedStats?.attack!==5)throw new Error('Equipment tiles and inspector must expose the live enhanced rank and stats');
if(state.character?.bodyPresentation!=='female')throw new Error('Saved character presentation must remain authoritative');
console.log('PASS: equipment screen uses ten live slots, canonical stats, loadout guides and saved presentation');
