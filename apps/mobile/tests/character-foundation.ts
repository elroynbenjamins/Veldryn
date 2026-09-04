import {CLASSES} from '../src/content/classes';
import {itemDef} from '../src/content/items';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import {migrateSave} from '../src/core/save-migrations';
import {carouselIndex,characterNameError} from '../src/core/character-creation';

function ok(value:boolean,message:string){if(!value)throw new Error(message)}
for(const name of ['Éira','O\'Brien','Li','Anne-Marie','  Rowan  '])ok(characterNameError(name)==='',`Valid name: ${name}`);
for(const name of ['',' ','A','123','<script>','A'.repeat(21)]){
  ok(!!characterNameError(name),`Invalid name: ${name}`);
  if(name.trim()){
    let rejected=false;
    try{createCharacter(newGame(1000),'IRONWARDEN',name)}catch{rejected=true}
    ok(rejected,'Core rejects invalid names');
  }
}
for(const count of [2,3,4,9]){
  ok(carouselIndex(0,-1,count)===count-1,'Previous wraps');
  ok(carouselIndex(count-1,1,count)===0,'Next wraps');
}
ok(createCharacter(newGame(1000),'IRONWARDEN','  ').character?.name==='Adventurer','Empty API name retains legacy fallback');
for(const c of CLASSES){
  for(const body of ['male','female'] as const){
    const state=createCharacter(newGame(1000),c.id,'  Rowan  ',body);
    const character=state.character!;
    ok(character.name==='Rowan','Name is trimmed');
    ok(character.bodyPresentation===body,'Presentation is stored');
    ok(Object.keys(character.equipment).length===1,'Exactly one starting item');
    ok(character.equipment.weapon===c.starterEquipment.weapon,'Preview and equipped weapon agree');
    ok(itemDef(character.equipment.weapon!).slot==='weapon','Primary item occupies weapon slot');
    ok(character.currentHp===effectiveStats(state).hp,'Starting health matches equipment');
    const loaded=migrateSave(JSON.parse(JSON.stringify(state)));
    ok(loaded.character?.bodyPresentation===body,'Presentation survives save/load');
    let rejected=false;
    try{createCharacter(state,c.id,'Overwrite',body)}catch{rejected=true}
    ok(rejected,'Creation must not replace an existing character');
  }
}
const legacy=createCharacter(newGame(1000),'IRONWARDEN');
delete legacy.character!.bodyPresentation;
legacy.character!.equipment={weapon:'START_IRON_SWORD',offhand:'START_KITE_SHIELD'};
const migrated=migrateSave(JSON.parse(JSON.stringify(legacy)));
ok(migrated.character?.bodyPresentation==='male','Legacy presentation default');
ok(JSON.stringify(migrated.character?.equipment)===JSON.stringify(legacy.character!.equipment),'Migration preserves all legacy equipment');
console.log('PASS: 18 character variants, primary weapon contract, persistence and legacy equipment preservation');
