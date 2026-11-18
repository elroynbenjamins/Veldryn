import type {AbilityDefinition,BossPhaseDefinition,CombatantDefinition,DamageType} from './types';
import {ENEMY_V2_RULESET} from './enemy-v2-prototype';

/**
 * Development-only, opt-in regional boss kits. No current dungeon calls this.
 * Preserve the published encounter ID, name, level, stats and legacy skills.
 * The authoritative server must select a ruleset for a NEW, frozen encounter.
 */
const MARK='enemy-v2:boss-profile:regional-1';
type AuthoredBoss = { id:string; name:string; abilities:AbilityDefinition[]; phases:BossPhaseDefinition[] };

const cast=(id:string,name:string,cooldownMs:number,castTimeMs:number,priority:number,
  target:'current_target'|'all_enemies'|'self',effects:AbilityDefinition['effects'],interruptible=false):AbilityDefinition=>({
  id,name,cooldownMs,castTimeMs,priority,target,effects,interruptible,
});
function ward(boss:CombatantDefinition,pct:number){return Math.round(boss.stats.maxHp*pct);}
const v2Phase=(id:string,name:string,hpPct:number,target:'all_enemies'|'self',
  effects:BossPhaseDefinition['effects']):BossPhaseDefinition=>({id,name,hpPct,target,effects});

function authored(boss:CombatantDefinition):AuthoredBoss|undefined{
  switch(boss.id){
    case 'BOSS_EXP_SOLAR':return {
      id:boss.id,name:'The Buried Heliarch',
      abilities:[
        cast('SOLAR_V2_PRISM_WARD','Prism Ward',24000,700,75,'self',[{kind:'shield',flat:ward(boss,.035)}]),
        cast('SOLAR_V2_SUNFALL','Sunfall',19000,1800,91,'all_enemies',[{kind:'damage',coeff:.66,damageType:'fire'}],true),
      ],
      phases:[
        v2Phase('SOLAR_V2_PHASE_70','Solar Ascendance',.70,'self',[{kind:'shield',flat:ward(boss,.04)}]),
        v2Phase('SOLAR_V2_PHASE_35','Cracked Corona',.35,'self',[
          {kind:'buff',tag:'damage_done',value:.08,durationMs:18000},
          {kind:'debuff',tag:'damage_taken',value:.12,durationMs:4500},
        ]),
      ],
    };
    case 'BOSS_EXP_SPHINX':return{
      id:boss.id,name:'The Veiled Sphinx',
      abilities:[
        cast('SPHINX_V2_MIRAGE','Mirage Veil',23000,650,74,'self',[{kind:'shield',flat:ward(boss,.035)}]),
        cast('SPHINX_V2_RIDDLE','Sphinx Riddle',18000,1250,90,'current_target',[
          {kind:'damage',coeff:.70,damageType:'arcane'},
          {kind:'debuff',tag:'damage_done',value:-.07,durationMs:5000},
        ],true),
      ],
      phases:[
        v2Phase('SPHINX_V2_PHASE_70','Three Reflections',.70,'self',[{kind:'shield',flat:ward(boss,.03)}]),
        v2Phase('SPHINX_V2_PHASE_35','True Reflection',.35,'self',[
          {kind:'debuff',tag:'damage_taken',value:.12,durationMs:5000},
        ]),
      ],
    };
    case 'BOSS_EXP_BELLBEAST':return{
      id:boss.id,name:'The Bellbeast of Shiverlake',
      abilities:[
        cast('BELLBEAST_V2_FROST_HIDE','Rimeplate Hide',24500,650,73,'self',[{kind:'shield',flat:ward(boss,.035)}]),
        cast('BELLBEAST_V2_SHATTER','Glacial Shatter',20000,2000,92,'current_target',[
          {kind:'damage',coeff:1.38,damageType:'ice'},
        ],true),
      ],
      phases:[
        v2Phase('BELLBEAST_V2_PHASE_70','Resonant Ice',.70,'self',[{kind:'shield',flat:ward(boss,.04)}]),
        v2Phase('BELLBEAST_V2_PHASE_35','Shattered Horn',.35,'self',[
          {kind:'buff',tag:'damage_done',value:.09,durationMs:18000},
          {kind:'debuff',tag:'damage_taken',value:.10,durationMs:4500},
        ]),
      ],
    };
    case 'BOSS_EXP_CANTOR':return{
      id:boss.id,name:'The Frozen Cantor',
      abilities:[
        cast('CANTOR_V2_DISSONANCE','Deep Dissonance',18000,1500,91,'all_enemies',[
          {kind:'damage',coeff:.56,damageType:'ice'},
          {kind:'debuff',tag:'damage_done',value:-.07,durationMs:4500},
        ],true),
        cast('CANTOR_V2_RESONANCE','Resonance Ward',25000,600,72,'self',[
          {kind:'shield',flat:ward(boss,.03)},
        ]),
      ],
      phases:[
        v2Phase('CANTOR_V2_PHASE_70','Broken Harmony',.70,'all_enemies',[
          {kind:'dot',coeff:.08,damageType:'ice',durationMs:6000,tickMs:2000,tag:'dissonance'},
        ]),
        v2Phase('CANTOR_V2_PHASE_35','Final Echo',.35,'self',[
          {kind:'debuff',tag:'damage_taken',value:.12,durationMs:4500},
        ]),
      ],
    };
    default:return undefined;
  }
}

export function prepareRegionalBossV2(
  boss:CombatantDefinition,
  ruleset?:typeof ENEMY_V2_RULESET,
):CombatantDefinition{
  if(ruleset!==ENEMY_V2_RULESET||boss.team!=='enemies'||!boss.boss||(boss.tags??[]).includes(MARK))return boss;
  const profile=authored(boss);
  if(!profile||boss.name!==profile.name)return boss;
  // No silent replacement of existing kit: preserve its identity and only add
  // experimental actions/phases for explicit 2.0-only test snapshots.
  return {...boss,abilities:[...boss.abilities,...profile.abilities],
    phases:profile.phases,tags:[...(boss.tags??[]),MARK]};
}
