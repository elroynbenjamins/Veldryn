/**
 * Hidden Enemies & Bosses 2.0 adapter: server-side authored abilities only.
 *
 * Does not touch live dungeon definitions. Existing encounters pass through
 * unchanged unless a server-controlled full-2.0 gate enables the adapter.
 */
import type {AbilityDefinition,CombatantDefinition,DamageType} from '../types';
import type {PveArchetype} from '../pve-encounter-identity';

export const ENEMY_ARCHETYPES_V2:readonly PveArchetype[]=[
 'bruiser','assassin','caster','swarm','guardian','hexer','executioner','support',
];
function identity(enemy:CombatantDefinition):PveArchetype{
 const tag=enemy.tags?.find(x=>x.startsWith('pve:archetype:'));
 const candidate=tag?.slice('pve:archetype:'.length) as PveArchetype|undefined;
 return candidate&&ENEMY_ARCHETYPES_V2.includes(candidate)?candidate:'bruiser';
}
function ability(enemy:CombatantDefinition,archetype:PveArchetype):AbilityDefinition{
 const id='V2_ENEMY_'+enemy.id.replace(/[^A-Za-z0-9_]/g,'_').slice(0,64);
 const amount=Math.max(40,Math.round(enemy.stats.maxHp*.025));
 const common={id,cooldownMs:12500,priority:63,castTimeMs:850};
 switch(archetype){
  case 'bruiser':return {...common,name:'Crushing Tell',target:'current_target',castTimeMs:1100,
    effects:[{kind:'damage',coeff:1.15,damageType:'physical'}]};
  case 'assassin':return {...common,name:'Marked Ambush',target:'random_enemy',
    effects:[{kind:'damage',coeff:.90,damageType:'physical'},
      {kind:'debuff',tag:'damage_taken',value:.03,durationMs:4500}]};
  case 'caster':return {...common,name:'Disruptible Channel',target:'all_enemies',castTimeMs:1350,
    interruptible:true,effects:[{kind:'damage',coeff:.66,damageType:'arcane'}]};
  case 'swarm':return {...common,name:'Serrated Pack',target:'all_enemies',castTimeMs:1100,
    effects:[{kind:'dot',coeff:.12,damageType:'physical',durationMs:5000,tickMs:1000}]};
  case 'guardian':return {...common,name:'Guarding Shell',target:'self',castTimeMs:400,
    effects:[{kind:'shield',flat:amount}]};
  case 'hexer':return {...common,name:'Withering Seal',target:'current_target',
    effects:[{kind:'damage',coeff:.48,damageType:'shadow'},
      {kind:'debuff',tag:'healing_received',value:-.15,durationMs:5000}]};
  case 'executioner':return {...common,name:'Final Pressure',target:'current_target',
    effects:[{kind:'damage',coeff:1.05,damageType:'physical',executeBelowHpPct:.30,executeBonus:.2}]};
  case 'support':return {...common,name:'Battle Rally',target:'all_allies',castTimeMs:700,
    effects:[{kind:'buff',tag:'damage_done',value:.04,durationMs:6000}]};
 }
}
export interface EnemyV2BridgeResult{
 readonly enemies:readonly CombatantDefinition[];
 readonly mechanicLabels:readonly string[];
}
/**
 * The boss phases below are optional 2.0 concepts, once per transition. They
 * add a readable counter window; no compulsory class interrupt is required.
 */
export function compileEnemiesForCombatV2(
 enemies:readonly CombatantDefinition[],serverEnabled=false,
):EnemyV2BridgeResult{
 if(!serverEnabled)return {enemies,mechanicLabels:[]};
 const labels:string[]=[];
 const converted=enemies.map(enemy=>{
   if(enemy.team!=='enemies')throw Error('combat_v2_invalid_enemy_team');
   if(enemy.tags?.includes('combat-v2-enemy'))return enemy;
   const archetype=identity(enemy);
   const extra=ability(enemy,archetype);
   if(enemy.abilities.some(x=>x.id===extra.id))
     throw Error('combat_v2_duplicate_enemy_ability_id');
   labels.push(enemy.name+': '+extra.name);
   const phases=enemy.phases?.map(p=>({...p,effects:p.effects.map(e=>({...e}))}))??[];
   if(enemy.boss){
     const id='V2_BOSS_PRESSURE_'+enemy.id;
     if(phases.some(p=>p.id===id))throw Error('combat_v2_duplicate_boss_phase_id');
     phases.push({id,name:'Pressure Shift',hpPct:.45,target:'self',
       effects:[{kind:'buff',tag:'damage_done',value:.08,durationMs:7000}]});
   }
   return {
     ...enemy,tags:[...(enemy.tags??[]),'combat-v2-enemy'],
     abilities:[...enemy.abilities.map(x=>({...x,effects:x.effects.map(e=>({...e}))})),extra],
     ...(enemy.boss?{phases}:{}),
   };
 });
 return {enemies:converted,mechanicLabels:labels};
}
