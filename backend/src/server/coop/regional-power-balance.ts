/** New online dungeon runs only: retune older level-25/45 encounter
 * templates to the lower level-10/25 regional entry bands. Legacy saved
 * runs omit regionalBalanceVersion and keep their original tuning. */
export const REGIONAL_DUNGEON_BALANCE_VERSION='regional-tier-power-v1';
/** Simulation-calibrated enemy stats at 105% of the required Combat Power.
 * Base multipliers increase at each tier. Historical runs do not pass enabled.
 * The two bosses remain mechanically different but their win rates are
 * normalized so a 50/50 boss roll is not an accidental difficulty lottery. */
export const REGIONAL_DUNGEON_BALANCE=Object.freeze({
 EXP_001:{
  enemyLevel:10,
  attack:[1.258,1.722,1.725],hp:[1.665,2.394,2.54],defense:[2.294,3.15,3.17],
 },
 EXP_003:{
  enemyLevel:25,
  attack:[1.045,1.066,1.0695],hp:[2.47,2.665,2.7945],defense:[2.85,3.034,3.036],
 },
} as const);
const LEGACY_ROOTBOUND_ATTACK_MULTIPLIER=2.9;
const ROOTBOUND_TIER_ATTACK=[1.2,.95,.94] as const;
export function regionalPowerMultipliers(expeditionId:string,tier:number,enabled:boolean,encounterId?:string){
 if(!enabled||![1,2,3].includes(tier))return undefined;
 const row=REGIONAL_DUNGEON_BALANCE[expeditionId as keyof typeof REGIONAL_DUNGEON_BALANCE];
 if(!row)return undefined;
 const rootbound=expeditionId==='EXP_001'&&(encounterId?.startsWith('ROOT')||encounterId==='BOSS_EXP_ROOT');
 // resolveCoopNode already multiplies Rootbound content by 2.9. Reconcile
 // that legacy-specific modifier only for new Asterfall regional runs.
 const rootAttack=encounterId==='BOSS_EXP_ROOT'&&tier===2 ? .92:
  encounterId==='BOSS_EXP_ROOT'&&tier===3 ? .88:ROOTBOUND_TIER_ATTACK[tier-1];
 const rootCorrection=rootbound?rootAttack/LEGACY_ROOTBOUND_ATTACK_MULTIPLIER:1;
 // Correct only the final bosses. Normal rooms retain monotonic regional
 // scaling and saved runs retain their original boss definitions.
 const bossCorrection=expeditionId==='EXP_003'&&encounterId==='BOSS_EXP_SOLAR'?(tier===3 ? .759:tier===2 ? .768:.77):
  expeditionId==='EXP_003'&&encounterId==='BOSS_EXP_SPHINX'?(tier===3?1.017:tier===2?1.015:1):
  expeditionId==='EXP_001'&&encounterId==='BOSS_EXP_BELL'?(tier===3?1.01:tier===2?1.06:1):1;
 return {attack:row.attack[tier-1]*rootCorrection*bossCorrection,
  hp:row.hp[tier-1]*bossCorrection,defense:row.defense[tier-1]*bossCorrection,enemyLevel:row.enemyLevel};
}

/** Power beyond each region's entry baseline retains a bounded, meaningful
 * contribution in co-op, despite the anti-overgearing normalization. Only
 * newly versioned regional runs receive it; saved characters/runs and event
 * expeditions keep their original stat rules. */
export function regionalCombatPowerBoost(expeditionId:string,combatPower:number|undefined,enabled:boolean):number{
 if(!enabled||!Number.isFinite(combatPower))return 1;
 const baseline=expeditionId==='EXP_001'?2500:expeditionId==='EXP_003'?6000:undefined;
 if(!baseline)return 1;
 return Math.min(1.4,Math.max(1,1+Math.log2(Math.max(1,combatPower!/baseline))*.18));
}
