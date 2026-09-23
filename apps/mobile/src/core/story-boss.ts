import {MONSTERS} from '../content/monsters';
import {random01} from './rng';
import {regionalEnemySecondaryStats} from './regional-enemy-stats';

export type StoryBossEventType=
  'battle_start'|'player_hit'|'player_miss'|'boss_hit'|'boss_miss'|'telegraph'|'phase'|'heal'|'victory'|'defeat';

export interface StoryBossEvent{
  atMs:number;
  type:StoryBossEventType;
  label:string;
  abilityId?:string;
  amount?:number;
  critical?:boolean;
  playerHp:number;
  bossHp:number;
  phase:1|2|3;
}

export interface FallenKnightPlayerSnapshot{
  name:string;
  classId:string;
  maxHp:number;
  currentHp:number;
  attack:number;
  defense:number;
  power:number;
  accuracy:number;
  evasion:number;
  critChance:number;
  critMultiplier:number;
  haste:number;
  damageMultiplier:number;
  actionSpeedMultiplier:number;
  incomingDamageMultiplier:number;
  foodHeal:number;
  foodQuantity:number;
  autoEatThresholdPct:number;
}

export interface FallenKnightBattleResult{
  bossId:'FALLEN_KNIGHT';
  bossName:'Fallen Knight';
  won:boolean;
  durationMs:number;
  bossMaxHp:number;
  playerMaxHp:number;
  finalBossHp:number;
  finalPlayerHp:number;
  foodConsumed:number;
  phasesReached:(1|2|3)[];
  events:StoryBossEvent[];
  player:{
    hitChance:number;
    critChance:number;
    attackIntervalMs:number;
  };
  boss:{
    accuracy:number;
    evasion:number;
    critChance:number;
    critMultiplier:number;
    haste:number;
  };
}

const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const FALLEN_KNIGHT_MAX_DURATION_MS=100_000;

function mitigation(defense:number){
  return clamp(defense/Math.max(1,defense+110),0,.72);
}

export function simulateFallenKnightStoryBattle(player:FallenKnightPlayerSnapshot,seed:string):FallenKnightBattleResult{
  const monster=MONSTERS.find(row=>row.id==='FALLEN_KNIGHT');
  if(!monster)throw new Error('fallen_knight_missing');
  const bossSecondary=regionalEnemySecondaryStats(monster);
  const bossMaxHp=monster.hp,playerMaxHp=Math.max(1,Math.round(player.maxHp));
  let bossHp=bossMaxHp,playerHp=clamp(Math.round(player.currentHp||playerMaxHp),1,playerMaxHp),foodLeft=Math.max(0,Math.floor(player.foodQuantity)),foodConsumed=0;
  let phase=1,phaseWardUntilMs=0,rngIndex=0,bossAttackCount=0;
  const phasesReached:(1|2|3)[]=[1],events:StoryBossEvent[]=[];
  const playerHitChance=clamp(player.accuracy-bossSecondary.evasion,.55,.99);
  const playerAttackIntervalMs=clamp(Math.round(2350/Math.max(.65,(1+player.haste)*player.actionSpeedMultiplier)),900,3200);
  let nextPlayerAt=650,nextBossAt=1800;
  const push=(event:Omit<StoryBossEvent,'playerHp'|'bossHp'|'phase'>)=>events.push({...event,playerHp:Math.max(0,Math.round(playerHp)),bossHp:Math.max(0,Math.round(bossHp)),phase:phase as 1|2|3});
  push({atMs:0,type:'battle_start',label:'The Fallen Knight raises the oathglass blade.'});

  const maybeEat=(atMs:number)=>{
    const threshold=clamp(player.autoEatThresholdPct,10,90)/100;
    if(player.foodHeal<=0)return;
    while(playerHp>0&&playerHp/playerMaxHp<=threshold&&foodLeft>0){
      const healed=Math.min(playerMaxHp-playerHp,Math.max(1,Math.round(player.foodHeal)));
      if(healed<=0)break;
      playerHp+=healed;foodLeft--;foodConsumed++;
      push({atMs:atMs+40,type:'heal',label:'Auto-eat',amount:healed});
      if(playerHp/playerMaxHp>threshold)break;
    }
  };

  const enterPhase=(atMs:number,next:2|3)=>{
    phase=next;phasesReached.push(next);
    if(next===2){
      phaseWardUntilMs=atMs+7000;
      push({atMs:atMs+30,type:'phase',label:'PHASE II · Oathglass Ward'});
    }else{
      push({atMs:atMs+30,type:'phase',label:'PHASE III · Last Oath'});
    }
  };

  let now=0;
  while(now<FALLEN_KNIGHT_MAX_DURATION_MS&&bossHp>0&&playerHp>0){
    if(nextPlayerAt<=nextBossAt){
      now=nextPlayerAt;
      const hit=random01(seed,rngIndex++)<=playerHitChance;
      if(!hit){
        push({atMs:now,type:'player_miss',label:'Your strike misses.',abilityId:'PLAYER_STRIKE'});
      }else{
        const critical=random01(seed,rngIndex++)<clamp(player.critChance,0,.75);
        const variance=.94+random01(seed,rngIndex++)*.12;
        const bossWard=now<phaseWardUntilMs ? .86 : 1;
        const base=Math.max(1,player.power*38+player.attack*14-monster.defense*15);
        const amount=Math.max(1,Math.round(base*variance*player.damageMultiplier*bossWard*(critical?player.critMultiplier:1)));
        bossHp=Math.max(0,bossHp-amount);
        push({atMs:now,type:'player_hit',label:critical?'Critical strike!':'Strike',abilityId:'PLAYER_STRIKE',amount,critical});
        const hpPct=bossHp/bossMaxHp;
        if(phase===1&&hpPct<=.65&&bossHp>0)enterPhase(now,2);
        if(phase===2&&hpPct<=.30&&bossHp>0)enterPhase(now,3);
      }
      nextPlayerAt+=playerAttackIntervalMs;
      continue;
    }

    now=nextBossAt;bossAttackCount++;
    const phaseHaste=phase===3?.18:phase===2?.07:0;
    const attackInterval=clamp(Math.round(2850/(1+bossSecondary.haste+phaseHaste)),1450,3400);
    let abilityId='FALLEN_SLASH',label='Fallen Slash',coeff=1,telegraph=0;
    if(bossAttackCount%7===0){abilityId='OATHGLASS_COLLAPSE';label='Oathglass Collapse';coeff=1.38;telegraph=1250;}
    else if(bossAttackCount%4===0){abilityId='OATHBREAKER';label='Oathbreaker';coeff=1.62;telegraph=900;}
    if(telegraph)push({atMs:Math.max(0,now-telegraph),type:'telegraph',label:`${label} incoming`,abilityId});

    const bossAccuracy=clamp(bossSecondary.accuracy+(phase===3?.025:0),.55,.99);
    const bossHitChance=clamp(bossAccuracy-player.evasion,.55,.99);
    if(random01(seed,rngIndex++)>bossHitChance){
      push({atMs:now,type:'boss_miss',label:`${label} misses.`,abilityId});
    }else{
      const bossCritChance=clamp(bossSecondary.critChance+(phase===3?.08:0),0,.55);
      const critical=random01(seed,rngIndex++)<bossCritChance;
      const variance=.95+random01(seed,rngIndex++)*.10;
      const raw=monster.attack*.29+monster.level*.14;
      const phaseDamage=phase===3?1.18:phase===2?1.06:1;
      const amount=Math.max(1,Math.round(raw*(1-mitigation(player.defense))*coeff*phaseDamage*variance*player.incomingDamageMultiplier*(critical?bossSecondary.critMultiplier:1)));
      playerHp=Math.max(0,playerHp-amount);
      push({atMs:now,type:'boss_hit',label,abilityId,amount,critical});
      maybeEat(now);
    }
    nextBossAt+=attackInterval;
  }

  if(bossHp>0&&playerHp>0){
    now=FALLEN_KNIGHT_MAX_DURATION_MS;
    push({atMs:now-900,type:'telegraph',label:'The oathglass blade overloads.',abilityId:'OATHGLASS_ENRAGE'});
    const amount=Math.max(playerHp,Math.round(playerMaxHp*.75));
    playerHp=0;
    push({atMs:now,type:'boss_hit',label:'Oathglass Rupture',abilityId:'OATHGLASS_ENRAGE',amount});
  }

  const won=bossHp<=0&&playerHp>0;
  push({atMs:Math.min(FALLEN_KNIGHT_MAX_DURATION_MS,now+450),type:won?'victory':'defeat',label:won?'The Fallen Knight falls.':'You are forced back from the oathglass road.'});
  events.sort((a,b)=>a.atMs-b.atMs||a.type.localeCompare(b.type));
  return {
    bossId:'FALLEN_KNIGHT',bossName:'Fallen Knight',won,
    durationMs:Math.min(FALLEN_KNIGHT_MAX_DURATION_MS,now+450),
    bossMaxHp,playerMaxHp,finalBossHp:Math.max(0,Math.round(bossHp)),finalPlayerHp:Math.max(0,Math.round(playerHp)),foodConsumed,
    phasesReached,events,
    player:{hitChance:playerHitChance,critChance:clamp(player.critChance,0,.75),attackIntervalMs:playerAttackIntervalMs},
    boss:{accuracy:bossSecondary.accuracy,evasion:bossSecondary.evasion,critChance:bossSecondary.critChance,critMultiplier:bossSecondary.critMultiplier,haste:bossSecondary.haste},
  };
}
