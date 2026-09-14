import {newGame,createCharacter} from '../src/core/game';
import {arenaSquadIds,arenaSquadStatus,setArenaSquadSlot} from '../src/core/arena-squad';

const ok=(value:unknown,message:string)=>{if(!value)throw new Error(message)};
const state=()=>createCharacter(newGame(0),'IRONWARDEN','Front');
const withRoster=()=>{const first=state();const second=createCharacter({...first,character:null},'WAYFINDER','Middle');const third=createCharacter({...second,character:null},'DAWNKEEPER','Back');second.character!.id='LOCAL_CHAR_2';third.character!.id='LOCAL_CHAR_3';return {...third,character:first.character,otherCharacters:[{character:second.character!,inventory:second.inventory,overflow:second.overflow,activity:null,skills:second.skills,quests:second.quests,currentRegionId:second.currentRegionId},{character:third.character!,inventory:third.inventory,overflow:third.overflow,activity:null,skills:third.skills,quests:third.quests,currentRegionId:third.currentRegionId}],account:{...third.account,createdCharacterCount:3}}};
const base=withRoster();
base.character!.level=15;base.otherCharacters!.forEach(entry=>{entry.character.level=15});
const chosen=setArenaSquadSlot(setArenaSquadSlot(setArenaSquadSlot(base,0,base.character!.id),1,base.otherCharacters![0].character.id),2,base.otherCharacters![1].character.id);
ok(arenaSquadIds(chosen).length===3,'Arena must expose three stable slots');
ok(arenaSquadStatus(chosen).ready,'Level-one fixtures should be promoted for readiness test');
const moved=setArenaSquadSlot(chosen,0,base.otherCharacters![0].character.id);
ok(arenaSquadIds(moved)[0]===base.otherCharacters![0].character.id&&arenaSquadIds(moved)[1]==='', 'Moving a character must clear its prior slot');
const normalized={...chosen,account:{...chosen.account,arenaSquadCharacterIds:['missing',base.character!.id,base.character!.id]}};
ok(arenaSquadIds(normalized)[0]===''&&arenaSquadIds(normalized)[1]===base.character!.id,'Invalid and duplicate saved IDs must be ignored');
console.log('arena squad tests passed');
