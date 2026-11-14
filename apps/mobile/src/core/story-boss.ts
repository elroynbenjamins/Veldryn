import {MONSTERS} from '../content/monsters';
import {random01} from './rng';
import {regionalEnemySecondaryStats} from './regional-enemy-stats';
import {HUNT_CLASS_TECHNIQUES} from './hunt-active-abilities';
import type {ClassId} from './types';

export type StoryBossEventType=
  'battle_start'|'player_hit'|'player_miss'|'boss_hit'|'boss_miss'|'telegraph'|'phase'|'heal'|'class_skill'|'victory'|'defeat';

export interface StoryBossEvent{
  atMs:number;
  type:StoryBossEventType;
  label:string;
  abilityId?:string;
  /** True server-resolved player class skill outcome, never a cosmetic cast. */
  skillKind?:'damage'|'shield'|'heal';
  amount?:number;
  critical?:boolean;
  playerHp:number;
  bossHp:number;
  phase:1|2|3;
}

export interface FallenKnightPlayerSnapshot{
  name:string;
  classId:string;
  /** Primary combat class skill, as earned by the selected character. */
  classSkillLevel?:number;
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
  potionHeal:number;
  potionQuantity:number;
  autoEatThresholdPct:number;
}

export interface FallenKnightBattleResult{
  bossId:'FALLEN_KNIGHT';
  bossName:'Fallen Knight';
  mode:'story'|'rematch';
  won:boolean;
  durationMs:number;
  bossMaxHp:number;
  playerMaxHp:number;
  finalBossHp:number;
  finalPlayerHp:number;
  /** Compatibility field; food is never consumed by a boss encounter. */
  foodConsumed:number;
  potionConsumed:number;
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
/** Boss fights use limited Alchemy healing potions, never ordinary food. */
export const FALLEN_KNIGHT_MAX_POTION_UNITS=5;
/** Legacy compatibility: no food charges are permitted in boss encounters. */
export const FALLEN_KNIGHT_MAX_FOOD_UNITS=0;

function mitigation(defense:number){
  return clamp(defense/Math.max(1,defense+110),0,.72);
}

export function simulateFallenKnightStoryBattle(player:FallenKnightPlayerSnapshot,seed:string,mode:'story'|'rematch'='story'):FallenKnightBattleResult{
  const monster=MONSTERS.find(row=>row.id==='FALLEN_KNIGHT');
  if(!monster)throw new Error('fallen_knight_missing');
  const bossSecondary=regionalEnemySecondaryStats(monster);
  const bossMaxHp=monster.hp,playerMaxHp=Math.max(1,Math.round(player.maxHp));
  let bossHp=bossMaxHp,playerHp=clamp(Math.round(player.currentHp||playerMaxHp),1,playerMaxHp),potionLeft=clamp(Math.floor(player.potionQuantity),0,FALLEN_KNIGHT_MAX_POTION_UNITS),potionConsumed=0;
  let phase=1,phaseWardUntilMs=0,rngIndex=0,bossAttackCount=0;
  // Boss techniques use the same authored identities as ordinary hunts and
  // dungeons, but cooldowns are anchored to this encounter's own clock.
  const classId=Object.prototype.hasOwnProperty.call(HUNT_CLASS_TECHNIQUES,player.classId)?player.classId as ClassId:undefined;
  const classAbility=classId?HUNT_CLASS_TECHNIQUES[classId]:undefined;
  const classRank=Number.isFinite(player.classSkillLevel)?Math.max(1,Math.min(100,Math.floor(player.classSkillLevel!))):1;
  const classScale=1+.3*(classRank-1)/99;
  let nextClassReadyAtMs=0,fortressFollowup=false,hexMarkPending=false;
  const phasesReached:(1|2|3)[]=[1],events:StoryBossEvent[]=[];
  const playerHitChance=clamp(player.accuracy-bossSecondary.evasion,.55,.99);
  const playerAttackIntervalMs=clamp(Math.round(2350/Math.max(.65,(1+player.haste)*player.actionSpeedMultiplier)),900,3200);
  let nextPlayerAt=650,nextBossAt=1800;
  const push=(event:Omit<StoryBossEvent,'playerHp'|'bossHp'|'phase'>)=>events.push({...event,playerHp:Math.max(0,Math.round(playerHp)),bossHp:Math.max(0,Math.round(bossHp)),phase:phase as 1|2|3});
  push({atMs:0,type:'battle_start',label:'The Fallen Knight raises the oathglass blade.'});

  const maybePotion=(atMs:number)=>{
    const threshold=clamp(player.autoEatThresholdPct,10,90)/100;
    if(player.potionHeal<=0)return;
    // No more than one potion after a boss hit, with a strict fight-wide cap.
    if(playerHp>0&&playerHp/playerMaxHp<=threshold&&potionLeft>0){
      const healed=Math.min(playerMaxHp-playerHp,Math.max(1,Math.round(player.potionHeal)));
      if(healed>0){
        playerHp+=healed;potionLeft--;potionConsumed++;
        push({atMs:atMs+40,type:'heal',label:'Healing potion',amount:healed});
      }
    }
  };

  const enterPhase=(atMs:number,next:2|3)=>{
    phase=next;phasesReached.push(next);
    if(next===2){
      phaseWardUntilMs=atMs+7000;
      push({atMs:Math.max(0,atMs-220),type:'telegraph',label:'Oathglass Ward forming',abilityId:'OATHGLASS_WARD'});
      push({atMs:atMs+30,type:'phase',label:'PHASE II · Oathglass Ward'});
    }else{
      push({atMs:Math.max(0,atMs-220),type:'telegraph',label:'The Last Oath ignites',abilityId:'LAST_OATH'});
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
        const offensive=!!classAbility&&now>=nextClassReadyAtMs&&
          (classId==='WAYFINDER'||classId==='RAVAGER'||classId==='HEXWEAVER'||classId==='KNIFE_DANCER');
        // Offensive casts modify only landed, actually resolved player strikes.
        // Small gains (<=5% per cast) leave T1/T2 boss progression meaningful.
        const bonus=offensive
          ?classId==='WAYFINDER'?.025:classId==='RAVAGER'?.045:classId==='HEXWEAVER'?.020:.025:0;
        const markedBonus=hexMarkPending?.02:0;
        const rolledAmount=Math.max(1,Math.round(base*variance*player.damageMultiplier*bossWard*
          (critical?player.critMultiplier:1)*(1+bonus*classScale+markedBonus)));
        let nextBossHp=Math.max(0,bossHp-rolledAmount);
        if(mode==='story'&&phase===1&&nextBossHp<=bossMaxHp*.65)nextBossHp=Math.max(1,Math.ceil(bossMaxHp*.65));
        else if(mode==='story'&&phase===2&&nextBossHp<=bossMaxHp*.30)nextBossHp=Math.max(1,Math.ceil(bossMaxHp*.30));
        const amount=Math.max(1,bossHp-nextBossHp);
        bossHp=nextBossHp;
        const castName=offensive?classAbility!.name:undefined;
        push({atMs:now,type:'player_hit',label:castName??(critical?'Critical strike!':'Strike'),
          abilityId:offensive?classAbility!.id:'PLAYER_STRIKE',skillKind:offensive?'damage':undefined,amount,critical});
        // Black Thread leaves a short one-strike hex. Scarlet Loop shortens
        // only the *next* attack, not the boss's telegraphs or event clock.
        if(hexMarkPending)hexMarkPending=false;
        if(offensive){
          nextClassReadyAtMs=now+Math.round(classAbility!.cooldownSeconds*1000);
          if(classId==='HEXWEAVER')hexMarkPending=true;
          if(classId==='KNIFE_DANCER')nextPlayerAt-=Math.min(140,Math.round(playerAttackIntervalMs*.055));
        }
        const hpPct=bossHp/bossMaxHp;
        if(phase===1&&hpPct<=.65&&bossHp>0)enterPhase(now,2);
        else if(phase===2&&hpPct<=.30&&bossHp>0)enterPhase(now,3);
      }
      nextPlayerAt+=playerAttackIntervalMs;
      continue;
    }

    now=nextBossAt;bossAttackCount++;
    const phaseHaste=phase===3?.18:phase===2?.07:0;
    const attackInterval=clamp(Math.round(2850/(1+bossSecondary.haste+phaseHaste)),1450,3400);
    let abilityId='FALLEN_SLASH',label='Fallen Slash',coeff=1,telegraph=0;
    if(bossAttackCount%6===0){abilityId='OATHGLASS_COLLAPSE';label='Oathglass Collapse';coeff=1.38;telegraph=1250;}
    else if(bossAttackCount%3===0){abilityId='OATHBREAKER';label='Oathbreaker';coeff=1.62;telegraph=900;}
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
      const incoming=Math.max(1,Math.round(raw*(1-mitigation(player.defense))*coeff*phaseDamage*variance*player.incomingDamageMultiplier*(critical?bossSecondary.critMultiplier:1)));
      let amount=incoming,prevented=0,restored=0;
      const defensive=!!classAbility&&now>=nextClassReadyAtMs&&
        (classId==='IRONWARDEN'||classId==='BASTION'||classId==='DREADGUARD'||classId==='DAWNKEEPER'||classId==='STONECALLER');
      // Existing mitigation applies first; active class guards protect only
      // a single actual boss hit, with at most one small Bastion follow-up.
      if(defensive&&classId!=='DAWNKEEPER'){
        const guardPct=classId==='IRONWARDEN'?.055:classId==='BASTION'?.065:classId==='DREADGUARD'?.05:.06;
        amount=Math.max(1,incoming-Math.round(incoming*Math.min(.09,guardPct*classScale)));
        prevented=incoming-amount;
        if(classId==='BASTION')fortressFollowup=true;
      }else if(fortressFollowup&&classId==='BASTION'&&!defensive){
        amount=Math.max(1,incoming-Math.round(incoming*Math.min(.04,.025*classScale)));
        prevented=incoming-amount;
        fortressFollowup=false;
      }
      playerHp=Math.max(0,playerHp-amount);
      push({atMs:now,type:'boss_hit',label,abilityId,amount,critical});
      if(defensive){
        const restorationPct=classId==='DAWNKEEPER'?.12:classId==='DREADGUARD'?.3:classId==='STONECALLER'?.2:0;
        const restorationBase=classId==='DAWNKEEPER'?amount:prevented;
        if(playerHp>0&&restorationPct>0){
          const healBudget=Math.floor(restorationBase*restorationPct*classScale);
          restored=Math.max(0,Math.min(playerMaxHp-playerHp,healBudget));
          if(restored>0)playerHp+=restored;
        }
        if(prevented>0||restored>0){
          nextClassReadyAtMs=now+Math.round(classAbility!.cooldownSeconds*1000);
          push({atMs:now+1,type:'class_skill',label:classAbility!.name,
            abilityId:classAbility!.id,skillKind:prevented>0?'shield':'heal',
            amount:prevented>0?prevented:restored});
          // Shield and recovery are one real cast, not two cooldown uses.
          if(prevented>0&&restored>0)
            push({atMs:now+2,type:'class_skill',label:classAbility!.name,
              abilityId:classAbility!.id,skillKind:'heal',amount:restored});
        }
      }else if(prevented>0&&classId==='BASTION'){
        // A residual fortress layer is protective, not a second ability cast.
        push({atMs:now+1,type:'class_skill',label:classAbility!.name,
          abilityId:classAbility!.id,skillKind:'shield',amount:prevented});
      }
      maybePotion(now);
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
    bossId:'FALLEN_KNIGHT',bossName:'Fallen Knight',mode,won,
    durationMs:Math.min(FALLEN_KNIGHT_MAX_DURATION_MS,now+450),
    bossMaxHp,playerMaxHp,finalBossHp:Math.max(0,Math.round(bossHp)),finalPlayerHp:Math.max(0,Math.round(playerHp)),foodConsumed:0,potionConsumed,
    phasesReached,events,
    player:{hitChance:playerHitChance,critChance:clamp(player.critChance,0,.75),attackIntervalMs:playerAttackIntervalMs},
    boss:{accuracy:bossSecondary.accuracy,evasion:bossSecondary.evasion,critChance:bossSecondary.critChance,critMultiplier:bossSecondary.critMultiplier,haste:bossSecondary.haste},
  };
}
