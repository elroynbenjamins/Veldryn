export type CombatTacticId='assault'|'balanced'|'guarded';
export interface CombatTacticDef{
 id:CombatTacticId;
 name:string;
 summary:string;
 speedMultiplier:number;
 damageTakenMultiplier:number;
 recoveryMultiplier:number;
}
export const COMBAT_TACTIC_IDS:readonly CombatTacticId[]=['assault','balanced','guarded'];
export const COMBAT_TACTICS:Record<CombatTacticId,CombatTacticDef>={
 assault:{id:'assault',name:'Assault',summary:'+12% hunt speed · +12% damage taken · -15% post-kill recovery',speedMultiplier:1.12,damageTakenMultiplier:1.12,recoveryMultiplier:.85},
 balanced:{id:'balanced',name:'Balanced',summary:'Standard hunt speed, defense and recovery.',speedMultiplier:1,damageTakenMultiplier:1,recoveryMultiplier:1},
 guarded:{id:'guarded',name:'Guarded',summary:'-10% hunt speed · -18% damage taken · +25% post-kill recovery',speedMultiplier:.90,damageTakenMultiplier:.82,recoveryMultiplier:1.25},
};
export const normalizeCombatTactic=(value:unknown):CombatTacticId=>value==='assault'||value==='guarded'?value:'balanced';
export const combatTactic=(value:unknown)=>COMBAT_TACTICS[normalizeCombatTactic(value)];
