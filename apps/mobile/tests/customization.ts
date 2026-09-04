import {createCharacter,newGame,updateCharacterCustomization} from '../src/core/game';
import {DEFAULT_CUSTOMIZATION,HAIR_STYLES,normalizeCustomization} from '../src/core/customization';
import {migrateSave} from '../src/core/save-migrations';
function ok(value:boolean,message:string){if(!value)throw new Error(message)}
const choices={skinTone:'deep',hairStyle:'braid',hairColor:'silver'} as const;
const initial=newGame(123);
const state=createCharacter(initial,'BASTION','Elora','female',choices);
ok(initial.character===null,'Creation does not mutate original save');
ok(JSON.stringify(state.character!.customization)===JSON.stringify(choices),'Creation stores choices');
const restored=migrateSave(JSON.parse(JSON.stringify(state)));
ok(JSON.stringify(restored.character!.customization)===JSON.stringify(choices),'Choices survive save round trip');
const old=JSON.parse(JSON.stringify(state));delete old.character.customization;
ok(JSON.stringify(migrateSave(old).character!.customization)===JSON.stringify(DEFAULT_CUSTOMIZATION),'Old saves receive defaults');
for(const invalid of [null,undefined,42,'braid',{skinTone:'invalid',hairStyle:'invalid',hairColor:'invalid'}]){
  ok(JSON.stringify(normalizeCustomization(invalid))===JSON.stringify(DEFAULT_CUSTOMIZATION),'Malformed choices safely normalized');
}
const baseline=createCharacter(newGame(123),'BASTION','Elora','female');
ok(JSON.stringify(baseline.character!.equipment)===JSON.stringify(state.character!.equipment),'Customization does not grant gear');
ok(baseline.character!.hp===state.character!.hp&&baseline.character!.attack===state.character!.attack,'Customization does not change stats');
for(const body of ['male','female'] as const)for(const style of HAIR_STYLES){
  ok(createCharacter(newGame(1),'IRONWARDEN','Test',body,{...choices,hairStyle:style.id}).character!.customization!.hairStyle===style.id,'Every style works with both bodies');
}
ok(migrateSave(newGame(1)).character===null,'Empty saves stay empty');
const editingSnapshot=JSON.stringify(state);
const edited=updateCharacterCustomization(state,{skinTone:'fair',hairStyle:'bun',hairColor:'auburn'});
ok(JSON.stringify(state)===editingSnapshot,'Appearance editing does not mutate original state');
ok(edited.character!.customization!.hairStyle==='bun','Appearance editing stores the selected style');
ok(JSON.stringify(edited.character!.equipment)===JSON.stringify(state.character!.equipment),'Appearance editing preserves equipment');
ok(edited.activity===state.activity&&edited.character!.hp===state.character!.hp&&edited.character!.xp===state.character!.xp,'Appearance editing preserves gameplay state');
let noCharacterRejected=false;try{updateCharacterCustomization(newGame(1),choices)}catch{noCharacterRejected=true}ok(noCharacterRejected,'Appearance editing requires a character');
console.log('PASS: customization persistence, old saves, invalid input, all styles and unchanged gameplay');
