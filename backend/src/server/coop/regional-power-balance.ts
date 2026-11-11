/** New online dungeon runs only: retune older level-25/45 encounter
 * templates to the lower level-10/25 regional entry bands. Legacy saved
 * runs omit regionalBalanceVersion and keep their original tuning. */
export const REGIONAL_DUNGEON_BALANCE_VERSION='regional-tier-power-v1';
export const REGIONAL_DUNGEON_BALANCE=Object.freeze({
 EXP_001:{
  enemyLevel:10,
  attack:[.34,.41,.49],hp:[.45,.57,.72],defense:[.62,.75,.90],
 },
 EXP_003:{
  enemyLevel:25,
  attack:[.22,.26,.31],hp:[.52,.65,.81],defense:[.60,.74,.88],
 },
} as const);
export function regionalPowerMultipliers(expeditionId:string,tier:number,enabled:boolean){
 if(!enabled||![1,2,3].includes(tier))return undefined;
 const row=REGIONAL_DUNGEON_BALANCE[expeditionId as keyof typeof REGIONAL_DUNGEON_BALANCE];
 return row?{attack:row.attack[tier-1],hp:row.hp[tier-1],defense:row.defense[tier-1],enemyLevel:row.enemyLevel}:undefined;
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
