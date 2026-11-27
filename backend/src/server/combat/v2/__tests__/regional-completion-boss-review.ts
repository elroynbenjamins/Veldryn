/** Private regional COMPLETION boss review, separate from dungeon BOSS_EXP.
 * Source identities only; level and mechanics are candidate 2.0 authoring.
 * No gameplay callers, persisted grant, or region unlock authority. */
import type {AbilityDefinition,BossPhaseDefinition,CombatantDefinition,CombatStats} from '../../types';
import {SUNSCAR_BOSSES_V20} from '../../../content/sunscar-region-v20';
import {FROSTMARCH_BOSSES_V21} from '../../../content/frostmarch-region-v21';
import {regionalProgressionAtV2} from './regional-progression-review';
export const COMPLETION_BOSSES_REVIEW_V2=[
 {id:'FALLEN_KNIGHT',name:'Fallen Knight',region:'asterfall',sourceLevel:25,level:25,tier:2,nextRegion:'sunscar'},
 {id:'BOSS_002',name:'The Sand Tyrant',region:'sunscar',sourceLevel:45,level:50,tier:3,nextRegion:'frostmarch'},
 {id:'BOSS_003',name:'Frost Wyrm',region:'frostmarch',sourceLevel:70,level:75,tier:4,nextRegion:'region4'},
] as const;
export type CompletionBossIdV2=typeof COMPLETION_BOSSES_REVIEW_V2[number]['id'];
export type CompletionBossArmV2='reference'|'mechanics'|'mixed';
const cast=(id:string,name:string,cooldownMs:number,castTimeMs:number,priority:number,target:AbilityDefinition['target'],effects:AbilityDefinition['effects']):AbilityDefinition=>({id,name,cooldownMs,castTimeMs,priority,target,effects,interruptible:true});
const phase=(id:string,name:string,hpPct:number,target:BossPhaseDefinition['target'],effects:BossPhaseDefinition['effects']):BossPhaseDefinition=>({id,name,hpPct,target,effects});
export function createCompletionBossReviewV2(id:CompletionBossIdV2,reference:CombatStats,arm:CompletionBossArmV2){
 const p=COMPLETION_BOSSES_REVIEW_V2.find(b=>b.id===id);
 if(!p||!['reference','mechanics','mixed'].includes(arm)||!Object.values(reference).every(Number.isFinite)||reference.maxHp<=0||reference.attackPower<=0||reference.defense<0)throw Error('invalid_completion_boss_review');
 const band=regionalProgressionAtV2(p.level);
 if(!band.regionLaunchEligible||band.stage!=='boss_checkpoint'||band.expectedTier!==p.tier)throw Error('invalid_completion_boss_checkpoint');
 if(id!=='FALLEN_KNIGHT'){
  const source=id==='BOSS_002'?SUNSCAR_BOSSES_V20.find(b=>b.id===id):FROSTMARCH_BOSSES_V21.find(b=>b.id===id);
  if(!source||source.name!==p.name||source.level!==p.sourceLevel||source.equipmentRewardsFinalized!==false)throw Error('completion_boss_source_mismatch');
 }
 const enhanced=arm!=='reference';
 const stats={...reference,maxHp:Math.round(reference.maxHp*(arm==='mixed'?1.08:1)),attackPower:Math.round(reference.attackPower*(arm==='mixed'?1.06:1)),defense:Math.round(reference.defense*(arm==='mixed'?1.04:1))};
 const ward=(n:number)=>Math.round(stats.maxHp*n);
 let abilities:AbilityDefinition[],phases:BossPhaseDefinition[];
 switch(id){
 case 'FALLEN_KNIGHT':
  abilities=[cast('RC_KNIGHT_CLEAVE','Oathbreaker Cleave',8500,1400,90,'current_target',[{kind:'damage',coeff:enhanced?1.35:1,damageType:'physical'}]),
   ...(enhanced?[cast('RC_KNIGHT_BLEED','Broken Oath',15500,1100,75,'current_target',[{kind:'damage',coeff:.60,damageType:'physical'},{kind:'dot',coeff:.12,tag:'bleed',durationMs:6000,tickMs:2000,damageType:'physical'}])]:[])];
  phases=enhanced?[phase('RC_KNIGHT_65','Last Stand',.65,'self',[{kind:'shield',flat:ward(.05)}]),phase('RC_KNIGHT_30','Shattered Oath',.30,'self',[{kind:'buff',tag:'damage_done',value:.10,durationMs:20000},{kind:'debuff',tag:'damage_taken',value:.08,durationMs:6000}])]:[];
  break;
 case 'BOSS_002':
  abilities=[cast('RC_TYRANT_CHARGE','Tyrant Charge',9000,1600,90,'current_target',[{kind:'damage',coeff:enhanced?1.50:1,damageType:'physical'}]),
   ...(enhanced?[cast('RC_TYRANT_PILLAR','Solar Pillar',13000,1500,85,'current_target',[{kind:'damage',coeff:.70,damageType:'fire'},{kind:'dot',coeff:.13,damageType:'fire',tag:'burn',durationMs:6000,tickMs:2000}])]:[])];
  phases=enhanced?[phase('RC_TYRANT_66','Crown of Pillars',.66,'self',[{kind:'shield',flat:ward(.07)}]),phase('RC_TYRANT_33','Tyrant Sandstorm',.33,'current_target',[{kind:'dot',coeff:.14,damageType:'fire',tag:'burn',durationMs:6000,tickMs:2000},{kind:'debuff',tag:'damage_taken',value:.08,durationMs:6000,removable:true}])]:[];
  break;
 case 'BOSS_003':
  abilities=[cast('RC_WYRM_BREATH','Frost Breath',9500,1800,90,'current_target',[{kind:'damage',coeff:enhanced?1.65:1,damageType:'ice'}]),
   ...(enhanced?[cast('RC_WYRM_DIVE','Wyrm Dive',14500,1700,85,'current_target',[{kind:'damage',coeff:1.10,damageType:'physical'},{kind:'debuff',tag:'damage_taken',value:.09,durationMs:5000,removable:true}]),cast('RC_WYRM_PRISON','Ice Prison Collapse',21000,2000,88,'current_target',[{kind:'damage',coeff:.75,damageType:'ice'},{kind:'dot',coeff:.15,damageType:'ice',tag:'frostbite',durationMs:6000,tickMs:2000}])]:[])];
  phases=enhanced?[phase('RC_WYRM_68','Airborne Hunt',.68,'self',[{kind:'shield',flat:ward(.08)}]),phase('RC_WYRM_32','Wyrmstorm',.32,'self',[{kind:'buff',tag:'damage_done',value:.15,durationMs:25000},{kind:'debuff',tag:'damage_taken',value:.10,durationMs:6000}])]:[];
  break;
 }
 const enemy:CombatantDefinition={id:p.id,name:p.name,team:'enemies',role:'enemy',boss:true,level:p.level,
  stats,basicAttackMs:2800,basicAttackCoeff:.75,abilities,phases,tags:['qa:regional-completion-boss']};
 return {profile:p,enemy,releaseEnabled:false as const,rewardEnabled:false as const,unlockEnabled:false as const};
}
