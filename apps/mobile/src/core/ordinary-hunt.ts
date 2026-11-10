import {random01} from './rng';

/** Only the launch regions are being rebalanced. Frostmarch and later retain
 * their authored timed encounters until their own balancing pass. */
const SEARCH_RANGES:Readonly<Record<string,readonly [number,number]>>={
  Greenfields:[5,8],
  Silverbrook:[5,8],
  'Ironwood Forest':[6,9],
  'Old Mines':[7,10],
  "King's Road":[7,10],
  Sunscar:[8,12],
};
export function usesDamageDrivenHunts(zone:string){return Object.prototype.hasOwnProperty.call(SEARCH_RANGES,zone);}

export interface RegionalHuntOptions {
  zone:string; monsterHp:number; playerHit:number; hitChance:number;
  critChance:number; critMultiplier:number; haste:number; tempo:number;
  enemyHaste:number; environmentTimeMultiplier:number; seed:string;
}
export interface RegionalHuntStrike {
  actor:'player'|'enemy'; atSeconds:number; damage:number; critical:boolean;
}
export interface RegionalHuntPlan {
  cycleSeconds:number; searchSeconds:number; fightSeconds:number;
  strikes:RegionalHuntStrike[]; enemyAttackCount:number;
}
const clamp=(v:number,low:number,high:number)=>Math.max(low,Math.min(high,Number.isFinite(v)?v:low));
const round=(v:number)=>Math.round(v*1000)/1000;

/** Encounter searching caps weak-area farming without making low-level enemies
 * absorb artificial damage. Every landed strike uses actual Attack, Defense,
 * accuracy and critical hits. Its final damage, not a timer, ends the fight. */
export function regionalHuntPlan(options:RegionalHuntOptions):RegionalHuntPlan{
  const range=SEARCH_RANGES[options.zone];
  if(!range)throw new Error('Damage-driven hunt is not enabled in this region');
  const seed=options.seed,monsterHp=Math.max(1,Math.ceil(options.monsterHp));
  const searchSeconds=round((range[0]+(range[1]-range[0])*random01(seed+':search',0))*clamp(options.environmentTimeMultiplier,.5,2));
  const interval=round(clamp(2.5/(clamp(options.tempo,.35,3)*clamp(1+options.haste,.65,2)),1,5));
  const enemyInterval=round(clamp(3.5/clamp(1+options.enemyHaste,.65,2),2,5));
  const strikes:RegionalHuntStrike[]=[];
  let enemyHp=monsterHp,finishSeconds=searchSeconds+interval;
  // A genuinely undergeared player keeps attacking for as long as needed.
  // The bound comfortably exceeds the maximum authored early-region HP even
  // with the minimum hit chance; there is never a fabricated killing strike.
  for(let i=0;i<10000;i++){
    const atSeconds=round(searchSeconds+(i+1)*interval);
    const landed=random01(seed+':accuracy',i)<clamp(options.hitChance,.55,.99);
    const critical=landed&&random01(seed+':critical',i)<clamp(options.critChance,0,.65);
    const spread=.9+random01(seed+':variance',i)*.2;
    const damage=landed?Math.min(enemyHp,Math.max(1,Math.round(options.playerHit*spread*(critical?clamp(options.critMultiplier,1,3):1)))):0;
    if(damage>0){strikes.push({actor:'player',atSeconds,damage,critical});enemyHp-=damage;}
    finishSeconds=atSeconds;
    if(enemyHp<=0)break;
  }
  if(enemyHp>0)throw new Error('Ordinary hunt exceeded the safe attack count');
  for(let i=1;searchSeconds+i*enemyInterval<finishSeconds-1e-6;i++){
    strikes.push({actor:'enemy',atSeconds:round(searchSeconds+i*enemyInterval),damage:0,critical:false});
  }
  strikes.sort((a,b)=>a.atSeconds-b.atSeconds||(a.actor==='enemy'?-1:1));
  return {cycleSeconds:finishSeconds,searchSeconds,fightSeconds:round(finishSeconds-searchSeconds),strikes,enemyAttackCount:strikes.filter(hit=>hit.actor==='enemy').length};
}
