import {createCharacter,newGame} from '../src/core/game';
import {applyLocalBalanceSnapshot,BALANCE_METRIC_KEYS} from '../src/core/balance-telemetry';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(`${message}: expected ${String(expected)}, got ${String(actual)}`)}

let state=createCharacter(newGame(0),'IRONWARDEN','Balance Tester');
state={
  ...state,
  character:{
    ...state.character!,
    level:10,
    equipment:{
      weapon:'A',offhand:'B',helmet:'C',chest:'D',legs:'E',boots:'F',gloves:'G',cape:'H',amulet:'I',ring:'J',
    },
  },
  quests:state.quests.map((row,index)=>index===0?{...row,status:'claimed' as const}:row),
  account:{
    ...state.account,
    unlockedCosmeticPetIds:['PET_001'],
    unlockedCombatCompanionIds:['UNIT_001','UNIT_012','EVT_UNIT_001'],
    companionEssence:123,
    bondstones:7,
    combatCompanionProgress:{UNIT_001:{level:20,xp:0,ascensionTier:2,bondLevel:10,bondXp:2520,bondTraitUnlocked:true,obtainedAtMs:1}},
  },
};

state=applyLocalBalanceSnapshot(state,120_000);
const first=state.account.longTermMetrics!;

equal(first[BALANCE_METRIC_KEYS.characterLevel],10,'current character level');
equal(first[BALANCE_METRIC_KEYS.campaignClaimed],1,'claimed campaign chapters');
equal(first[BALANCE_METRIC_KEYS.equippedGear],10,'equipped gear count');
equal(first[BALANCE_METRIC_KEYS.petsOwned],1,'owned pet count');
equal(first[BALANCE_METRIC_KEYS.companionsOwned],3,'owned companion count');
equal(first[BALANCE_METRIC_KEYS.companionEssenceBalance],123,'companion Essence balance');
equal(first[BALANCE_METRIC_KEYS.bondstoneBalance],7,'Bondstone balance');
equal(first[BALANCE_METRIC_KEYS.companionBond6Count],1,'Bond 6 companion count');
equal(first[BALANCE_METRIC_KEYS.companionBond10Count],1,'Bond 10 companion count');
equal(first[BALANCE_METRIC_KEYS.companionMasteredCount],1,'Mastered companion count');
equal(first[BALANCE_METRIC_KEYS.companionPrestigeOwned],1,'Prestige companion ownership count');
equal(first[BALANCE_METRIC_KEYS.companionEventOwned],1,'Event companion ownership count');
equal(first[BALANCE_METRIC_KEYS.companionTrialRolesReady],0,'Trial role readiness remains false without a Tank');
equal(first[BALANCE_METRIC_KEYS.accountAgeMinutes],2,'account age minutes');
equal(first[BALANCE_METRIC_KEYS.firstQuestClaimAt],120_000,'first quest milestone timestamp');
equal(first[BALANCE_METRIC_KEYS.level10At],120_000,'level 10 milestone timestamp');
equal(first[BALANCE_METRIC_KEYS.firstPetAt],120_000,'first pet milestone timestamp');
equal(first[BALANCE_METRIC_KEYS.firstCompanionAt],120_000,'first companion milestone timestamp');
equal(first[BALANCE_METRIC_KEYS.fullEquipmentAt],120_000,'full equipment milestone timestamp');

state={...state,account:{...state.account,unlockedCombatCompanionIds:[...state.account.unlockedCombatCompanionIds!,'UNIT_002']}};
state=applyLocalBalanceSnapshot(state,240_000);
equal(state.account.longTermMetrics![BALANCE_METRIC_KEYS.companionTrialRolesReady],1,'Trial role readiness records Tank/Damage/Support coverage');
equal(state.account.longTermMetrics![BALANCE_METRIC_KEYS.firstTrialTeamReadyAt],240_000,'first Trial team milestone timestamp');

state={...state,character:{...state.character!,level:20}};
state=applyLocalBalanceSnapshot(state,300_000);
const second=state.account.longTermMetrics!;

equal(second[BALANCE_METRIC_KEYS.characterLevel],20,'current level updates');
equal(second[BALANCE_METRIC_KEYS.level10At],120_000,'level 10 milestone is write-once');
equal(second[BALANCE_METRIC_KEYS.firstTrialTeamReadyAt],240_000,'first Trial team milestone is write-once');
equal(second[BALANCE_METRIC_KEYS.level20At],300_000,'level 20 milestone is recorded when first observed');

state={...state,defeatedBossIds:[...state.defeatedBossIds,'FALLEN_KNIGHT'],character:{...state.character!,level:25}};
state=applyLocalBalanceSnapshot(state,600_000);
const third=state.account.longTermMetrics!;
equal(third[BALANCE_METRIC_KEYS.fallenKnightDefeated],1,'Fallen Knight completion snapshot');
equal(third[BALANCE_METRIC_KEYS.fallenKnightAt],600_000,'Fallen Knight milestone timestamp');
equal(third[BALANCE_METRIC_KEYS.level25At],600_000,'level 25 milestone timestamp');

state=applyLocalBalanceSnapshot(state,900_000);
equal(state.account.longTermMetrics![BALANCE_METRIC_KEYS.fallenKnightAt],600_000,'Fallen Knight milestone remains write-once');

console.log('PASS: local balance telemetry snapshots validate');
