import type {AbilityDefinition,BossPhaseDefinition,CombatantDefinition} from './types';
import {ENEMY_V2_RULESET} from './enemy-v2-prototype';

/**
 * First handcrafted Boss 2.0 pilot: existing Asterfall identities only.
 * Never change a live/legacy encounter snapshot. Call only when the server has
 * selected and persisted the versioned Enemy 2.0 ruleset for a NEW run.
 */
const V2_TAG='enemy-v2:boss-profile:asterfall-1';
export function prepareAsterfallBossV2(
  boss:CombatantDefinition,
  ruleset?:typeof ENEMY_V2_RULESET,
):CombatantDefinition {
  if(ruleset!==ENEMY_V2_RULESET||boss.team!=='enemies'||!boss.boss||
     (boss.tags??[]).includes(V2_TAG))return boss;

  let abilities:AbilityDefinition[];
  let phases:BossPhaseDefinition[];
  switch(boss.id) {
    case 'BOSS_EXP_ROOT':{
      // Defensive phases introduce short offensive windows without invulnerability.
      abilities=[...boss.abilities,{
        id:'ROOT_V2_LIVING_BARK',name:'Living Bark',cooldownMs:28000,
        castTimeMs:1300,target:'self',priority:76,interruptible:true,
        effects:[{kind:'shield',flat:Math.round(boss.stats.maxHp*.04)}],
      }];
      phases=[
        {id:'ROOT_V2_PHASE_70',name:'Bark Awakens',hpPct:.70,target:'self',
          effects:[{kind:'shield',flat:Math.round(boss.stats.maxHp*.04)}]},
        {id:'ROOT_V2_PHASE_35',name:'Heart Exposed',hpPct:.35,target:'self',
          effects:[
            {kind:'buff',tag:'damage_done',value:.10,durationMs:14000},
            {kind:'debuff',tag:'damage_taken',value:.12,durationMs:4000},
          ]},
      ];
      break;
    }
    case 'BOSS_EXP_BELL':{
      abilities=[...boss.abilities,{
        id:'BELL_V2_SOUL_CURSE',name:'Soul Curse',cooldownMs:14000,
        castTimeMs:1400,target:'current_target',priority:78,interruptible:true,
        effects:[
          {kind:'damage',coeff:.65,damageType:'shadow'},
          {kind:'debuff',tag:'damage_done',value:-.07,durationMs:4500},
        ],
      },{
        id:'BELL_V2_VEIL_MIRROR',name:'Veil Mirror',cooldownMs:22000,
        castTimeMs:1300,target:'self',priority:72,interruptible:true,
        effects:[{kind:'shield',flat:Math.round(boss.stats.maxHp*.035)}],
      }];
      phases=[
        {id:'BELL_V2_PHASE_70',name:'Echoing Toll',hpPct:.70,target:'all_enemies',
          effects:[{kind:'damage',coeff:.34,damageType:'shadow'}]},
        {id:'BELL_V2_PHASE_35',name:'Shattered Veil',hpPct:.35,target:'self',
          effects:[{kind:'debuff',tag:'damage_taken',value:.12,durationMs:4000}]},
      ];
      break;
    }
    default:return boss;
  }
  return {...boss,abilities,phases,tags:[...(boss.tags??[]),V2_TAG]};
}
