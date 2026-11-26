import {createCharacter,newGame} from '../src/core/game';
import {createAccountCharacter} from '../src/core/account-actions';
import {accountSkillLevel,CHARACTER_SLOT_THRESHOLDS,characterCreationError,recordAccountProgress,unlockedCharacterSlots} from '../src/core/account-roster';
import {totalXpAtLevel} from '../src/core/progression';
import {equal,throws,test} from './account-test-helpers';

// The gate is based on XP-derived levels, not unsaved visible level values.
// Distribute levels among actual counted professions to avoid levels above 100.
function reach(state:ReturnType<typeof createCharacter>,goal:number){
 let current=accountSkillLevel(state);
 for(let i=0;i<state.skills.length&&current<goal;i++){
  const original=state.skills[i];
  for(let level=2;level<=100&&current<goal;level++){
   const trial={...state,skills:state.skills.map((skill,index)=>index===i?{...skill,xp:totalXpAtLevel(level),level}:skill)};
   const value=accountSkillLevel(trial);
   if(value>goal)break;
   if(value>current){state=trial;current=value;}
  }
 }
 equal(accountSkillLevel(state),goal,'fixture reached exact account skill total');
 return state;
}
function twoCharacters(){
 const first=reach(createCharacter(newGame(1000),'IRONWARDEN','First'),250);
 return createAccountCharacter(first,'DAWNKEEPER','Second','female',1000);
}
test('third-character gate uses 800 combined skill levels, with second still at 250',()=>{
 equal(CHARACTER_SLOT_THRESHOLDS,[0,250,800],'slot thresholds');
 const second=twoCharacters();
 const below=reach(second,799);
 equal(unlockedCharacterSlots(below),2,'799 locked');
 equal(characterCreationError(below)?.includes('800'),true,'800 requirement communicated');
 throws(()=>createAccountCharacter(below,'HEXWEAVER','Third','male',1000),'799 cannot create third');
 const ready=reach(second,800);
 equal(unlockedCharacterSlots(ready),3,'800 unlocked');
 equal(characterCreationError(ready),undefined,'no unlock error at 800');
 equal(createAccountCharacter(ready,'HEXWEAVER','Third','male',1000).otherCharacters?.length,2,'third recruited');
});
test('third slot is permanently earned and previous third slot watermarks remain valid',()=>{
 const earned=recordAccountProgress(reach(twoCharacters(),800));
 equal(earned.account.unlockedCharacterSlots,3,'watermark saved');
 const older=reach(twoCharacters(),550);
 older.account.unlockedCharacterSlots=3; // previously-earned slot from the old requirement
 equal(unlockedCharacterSlots(older),3,'legacy slot preserved');
 equal(createAccountCharacter(older,'HEXWEAVER','Third','male',1000).otherCharacters?.length,2,'legacy third slot still usable');
});
