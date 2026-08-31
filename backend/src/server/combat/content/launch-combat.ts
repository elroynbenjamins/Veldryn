import type { AbilityDefinition, CombatantDefinition, CombatRole } from '../types';

const stats=(maxHp:number,attackPower:number,healingPower:number,defense:number,accuracy:number,evasion:number,critChance=.08,haste=.05)=>({maxHp,attackPower,healingPower,defense,accuracy,evasion,critChance,critMultiplier:1.5,haste});
const dmg=(id:string,name:string,coeff:number,cooldownMs:number,priority:number,extra:Partial<AbilityDefinition>={}):AbilityDefinition=>({id,name,cooldownMs,castTimeMs:0,target:'current_target',priority,effects:[{kind:'damage',coeff,damageType:'physical'}],...extra});

export function launchPlayer(classId:string, level=25):CombatantDefinition {
  const scale=level/25;
  const common={team:'players' as const,level,basicAttackMs:2400,basicAttackCoeff:.70};
  const make=(name:string,role:CombatRole,s:ReturnType<typeof stats>,abilities:AbilityDefinition[]):CombatantDefinition=>({id:`P_${classId}`,name,...common,role,stats:s,abilities});
  switch(classId){
    case 'Ironwarden': return make('Ironwarden','tank',stats(5200*scale,420*scale,180*scale,1500*scale,680,180,.05,.03),[
      {id:'IW_TAUNT',name:'Rune Challenge',cooldownMs:9000,castTimeMs:0,target:'current_target',priority:95,effects:[{kind:'taunt',value:500},{kind:'damage',coeff:.55,threatMultiplier:4}]},
      {id:'IW_WARD',name:'Oathwall',cooldownMs:12000,castTimeMs:0,target:'self',priority:90,aiCondition:'self_below_50',effects:[{kind:'shield',coeff:2.4}]},
      dmg('IW_BASH','Rune Bash',1.05,6500,70,{effects:[{kind:'damage',coeff:1.05,threatMultiplier:2.2},{kind:'interrupt'}],aiCondition:'target_casting'})
    ]);
    case 'Dawnkeeper': return make('Dawnkeeper','support',stats(3600*scale,300*scale,720*scale,820*scale,720,230,.07,.08),[
      {id:'DK_HEAL',name:'Dawn Mend',cooldownMs:4200,castTimeMs:500,target:'lowest_hp_ally',priority:100,aiCondition:'ally_below_50',effects:[{kind:'heal',coeff:1.25}]},
      {id:'DK_HOT',name:'Sunthread',cooldownMs:8000,castTimeMs:0,target:'lowest_hp_ally',priority:80,effects:[{kind:'hot',coeff:.34,durationMs:6000,tickMs:2000}]},
      dmg('DK_SMITE','Sun Smite',.75,5500,40)
    ]);
    case 'Stonecaller': return make('Stonecaller','support',stats(4100*scale,340*scale,570*scale,1050*scale,690,190,.06,.04),[
      {id:'SC_SHIELD',name:'Resonant Armor',cooldownMs:7000,castTimeMs:0,target:'lowest_hp_ally',priority:90,effects:[{kind:'shield',coeff:1.1}]},
      {id:'SC_HEAL',name:'River Stone',cooldownMs:6500,castTimeMs:0,target:'lowest_hp_ally',priority:85,aiCondition:'ally_below_50',effects:[{kind:'heal',coeff:.8}]},
      dmg('SC_THUNDER','Thunder Totem',.95,6000,55,{effects:[{kind:'damage',coeff:.95,damageType:'nature'},{kind:'debuff',tag:'damage_taken',value:.05,durationMs:4000}]})
    ]);
    case 'Wayfinder': return make('Wayfinder','damage',stats(3300*scale,610*scale,100,700*scale,810,270,.15,.10),[dmg('WF_QUARRY','Perfect Quarry',1.75,7000,90),dmg('WF_SHOT','Windshot',1.10,4500,70)]);
    case 'Ravager': return make('Ravager','damage',stats(4000*scale,650*scale,80,900*scale,700,160,.12,.05),[dmg('RV_CRUSH','Crush Guard',1.60,6500,85,{effects:[{kind:'damage',coeff:1.6},{kind:'debuff',tag:'damage_taken',value:.08,durationMs:5000}]}),dmg('RV_SWING','Titan Swing',1.15,4200,65)]);
    case 'Hexweaver': return make('Hexweaver','damage',stats(3000*scale,620*scale,120,620*scale,790,250,.13,.09),[
      {id:'HX_CURSE',name:'Black Thread',cooldownMs:6500,castTimeMs:600,target:'current_target',priority:90,effects:[{kind:'damage',coeff:.65,damageType:'shadow'},{kind:'dot',coeff:.30,damageType:'shadow',durationMs:6000,tickMs:2000}]},
      dmg('HX_NULL','Null Script',1.25,7000,80,{effects:[{kind:'damage',coeff:1.25,damageType:'arcane'},{kind:'interrupt'}],aiCondition:'target_casting'})
    ]);
    case 'Knife Dancer': return make('Knife Dancer','damage',stats(3150*scale,640*scale,70,660*scale,800,330,.18,.14),[dmg('KD_LOOP','Scarlet Loop',1.35,5000,85),dmg('KD_FEINT','Feintstep',1.0,3800,75)]);
    default: throw new Error(`unknown_class:${classId}`);
  }
}

export function rootboundHeartBoss(level=25):CombatantDefinition {
  return {id:'BOSS_EXP_ROOT',name:'Rootbound Heart',team:'enemies',role:'enemy',level,boss:true,basicAttackMs:2700,basicAttackCoeff:.82,stats:stats(42000,520,0,1000,720,120,.05,.02),abilities:[
    {id:'ROOT_SLAM',name:'Root Slam',cooldownMs:8000,castTimeMs:1000,target:'current_target',priority:80,interruptible:false,effects:[{kind:'damage',coeff:1.5,damageType:'nature'}]},
    {id:'BRIAR_PULSE',name:'Briar Pulse',cooldownMs:11000,castTimeMs:1400,target:'all_enemies',priority:90,interruptible:true,effects:[{kind:'damage',coeff:.78,damageType:'nature'},{kind:'dot',coeff:.16,damageType:'nature',durationMs:6000,tickMs:2000}]},
    {id:'THORN_RAGE',name:'Thorn Rage',cooldownMs:18000,castTimeMs:0,target:'self',priority:70,effects:[{kind:'buff',tag:'damage_done',value:.12,durationMs:7000}]}
  ],phases:[
    {id:'ROOT_PHASE_60',hpPct:.60,target:'all_enemies',effects:[{kind:'damage',coeff:.38,damageType:'nature'},{kind:'dot',coeff:.10,damageType:'nature',durationMs:6000,tickMs:2000}]},
    {id:'ROOT_PHASE_30',hpPct:.30,target:'self',effects:[{kind:'buff',tag:'damage_done',value:.20,durationMs:30000}]}
  ]};
}

export function bellWardenBoss(level=25):CombatantDefinition {
  return {id:'BOSS_EXP_BELL',name:'Bell-Warden',team:'enemies',role:'enemy',level,boss:true,basicAttackMs:2500,basicAttackCoeff:.78,stats:stats(39000,500,0,960,740,150,.06,.03),abilities:[
    {id:'BELL_TOLL',name:'Funeral Toll',cooldownMs:9500,castTimeMs:1600,target:'all_enemies',priority:95,interruptible:true,effects:[{kind:'damage',coeff:.88,damageType:'shadow'}]},
    {id:'WARDEN_STRIKE',name:'Warden Strike',cooldownMs:6500,castTimeMs:500,target:'current_target',priority:75,effects:[{kind:'damage',coeff:1.42,damageType:'physical'}]},
  ],phases:[
    {id:'BELL_PHASE_50',hpPct:.50,target:'all_enemies',effects:[{kind:'damage',coeff:.52,damageType:'shadow'},{kind:'debuff',tag:'damage_taken',value:.08,durationMs:8000}]}
  ]};
}
