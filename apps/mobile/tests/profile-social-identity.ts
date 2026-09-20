import {createCharacter,newGame} from '../src/core/game';
import {
 formatProfileRecordValue,localProfileSummary,profileAchievementLabel,profileAchievementShowcase,
 profileCollectionLabel,profileCollectionShowcase,profileRecordShowcase,
} from '../src/core/profile-presentation';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

let state=createCharacter(newGame(0),'IRONWARDEN','Profile Test');
state={...state,
 defeatedBossIds:['FALLEN_KNIGHT'],
 account:{...state.account,
  unlockedCombatCompanionIds:['UNIT_001'],
  unlockedCosmeticPetIds:['pet_test'],
  unlockedProfileBackgroundIds:['bg_test'],
  unlockedProfileBorderIds:['frame_test'],
  longTermMetrics:{'combat.total_kills':1234},
  journalState:{
   schemaVersion:42,accountId:'profile-test',revision:1,
   unlockedAchievements:{combatant_novice:1000,well_rounded_novice:2000},
   unlockedTitles:{},selectedTitleByCharacter:{},
   records:{highest_single_hit:{recordId:'highest_single_hit',value:456,achievedAtMs:3000,characterId:state.character!.id},fastest_boss_kill_ms:{recordId:'fastest_boss_kill_ms',value:12345,achievedAtMs:4000,characterId:state.character!.id}},
  },
 },
 character:{...state.character!,selectedCosmeticPetId:'pet_test',profileBackgroundId:'bg_test',profileBorderId:'frame_test',equippedCombatCompanionId:'UNIT_001'},
};

const summary=localProfileSummary(state);
equal(summary.totalKills,1234,'profile summary uses authoritative lifetime kill metric');
equal(summary.bossesDefeated,1,'profile summary counts defeated bosses');
equal(summary.companionOwned,1,'profile summary counts owned combat companions');
equal(summary.collectionOwned,3,'profile summary counts owned profile collectibles');
equal(summary.achievementCount,2,'profile summary counts journal achievements');
equal(summary.recordCount,2,'profile summary counts personal records');

equal(profileAchievementLabel('combatant_novice'),'Combatant — Novice','achievement label resolves authored title');
equal(formatProfileRecordValue('highest_single_hit',456),'456','numeric record formatting is readable');
ok(formatProfileRecordValue('fastest_boss_kill_ms',12345).includes('s'),'millisecond record formatting uses time');
equal(profileCollectionLabel({kind:'companion',id:'UNIT_001'}),'Ironwood Hound','companion showcase resolves canonical name');

const achievementFallback=profileAchievementShowcase(state,null);
equal(achievementFallback[0],'well_rounded_novice','offline profile uses most recent unlocked achievements');
const recordFallback=profileRecordShowcase(state,null);
equal(recordFallback[0],'fastest_boss_kill_ms','offline profile uses most recent personal records');
const collectionFallback=profileCollectionShowcase(state,null);
equal(collectionFallback.length,3,'offline profile fills up to three collection showcase slots');
ok(collectionFallback.some(row=>row.kind==='pet'&&row.id==='pet_test'),'offline profile features selected pet');

console.log('PASS: unified profile presentation and offline fallback');
