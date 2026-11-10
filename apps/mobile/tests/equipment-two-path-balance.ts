import {CLASSES} from '../src/content/classes';
import {EQUIPMENT_SETS} from '../src/content/equipment-sets';
import {EQUIPMENT_ITEMS_V33} from '../src/content/equipment-items-v33';
import {itemDef} from '../src/content/items';
import {EQUIPMENT_PATH_HP_PER_POINT,equipmentStatsForSetPath} from '../src/content/equipment-path-stats';
import {createCharacter,effectiveStats,newGame} from '../src/core/game';
import type {ClassId,GearSlot,GameState} from '../src/core/types';

function check(condition:unknown,message:string){if(!condition)throw new Error(message)}
function close(actual:number,expected:number,message:string,tolerance=.0002){
  if(Math.abs(actual-expected)>tolerance)throw new Error(message+': expected '+expected+', got '+actual);
}
const weights:Record<GearSlot,{attack:number;defense:number;hp:number}>={
  helmet:{attack:0,defense:4,hp:8},chest:{attack:0,defense:7,hp:16},
  gloves:{attack:1,defense:3,hp:6},legs:{attack:0,defense:5,hp:12},
  boots:{attack:1,defense:3,hp:7},weapon:{attack:9,defense:0,hp:0},
  offhand:{attack:3,defense:6,hp:4},cape:{attack:1,defense:3,hp:9},
  amulet:{attack:3,defense:1,hp:8},ring:{attack:3,defense:1,hp:6},
};
const slots=Object.keys(weights) as GearSlot[];
const budget=(row:{attack?:number;defense?:number;hp?:number})=>
  (row.attack??0)+(row.defense??0)+(row.hp??0)/EQUIPMENT_PATH_HP_PER_POINT;
const totals=(ids:readonly string[])=>ids.reduce((sum,id)=>{
  const item=itemDef(id);
  return {attack:sum.attack+(item.attack??0),defense:sum.defense+(item.defense??0),hp:sum.hp+(item.hp??0)};
},{attack:0,defense:0,hp:0});
const offense=new Set<ClassId>(['IRONWARDEN','DREADGUARD','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER']);
const defense=new Set<ClassId>(['DAWNKEEPER','STONECALLER']);
check(EQUIPMENT_ITEMS_V33.length===1620,'Exactly the existing 1620 items are supported');
check(EQUIPMENT_SETS.length===162,'Exactly the existing 162 sets are supported');
check(EQUIPMENT_PATH_HP_PER_POINT===4,'Flat stat budget retains its original HP exchange ratio');
for(const cls of CLASSES){
  for(let tier=1;tier<=9;tier++){
    const pair=EQUIPMENT_SETS.filter(row=>row.classId===cls.id&&row.tier==='T'+tier);
    check(pair.length===2,cls.id+' T'+tier+' must retain exactly two equipment sets');
    const foundation=pair.find(set=>set.path==='Foundation');
    const alternate=pair.find(set=>set.path==='Alternate');
    check(!!foundation&&!!alternate,cls.id+' T'+tier+' must keep both paths');
    const f=foundation!,a=alternate!;
    check(f.itemIds.length===10&&a.itemIds.length===10,cls.id+' T'+tier+' must retain all slots');
    const totalF=totals(f.itemIds),totalA=totals(a.itemIds);
    for(const slot of slots){
      const ff=f.itemIds.filter(id=>itemDef(id).slot===slot);
      const aa=a.itemIds.filter(id=>itemDef(id).slot===slot);
      check(ff.length===1&&aa.length===1,cls.id+' T'+tier+' '+slot+' must appear once in each path');
      const foundationPiece=itemDef(ff[0]),alternatePiece=itemDef(aa[0]),base=weights[slot];
      const originalBudget=budget({attack:base.attack*tier,defense:base.defense*tier,hp:base.hp*tier});
      close(budget(foundationPiece),originalBudget,cls.id+' T'+tier+' '+slot+' Foundation budget');
      close(budget(alternatePiece),originalBudget,cls.id+' T'+tier+' '+slot+' Alternate budget');
      for(const piece of [foundationPiece,alternatePiece]){
        check((piece.attack??-1)>0&&(piece.defense??-1)>0&&(piece.hp??-1)>0,
          cls.id+' T'+tier+' '+slot+' must have positive, usable stats');
        check(piece.classRestriction===cls.id,cls.id+' T'+tier+' '+slot+' class restriction must remain intact');
      }
    }
    // The two-path average equals the previous full-set baseline exactly:
    // specialization is a redistribution, not a hidden buff to either tier.
    close((totalF.attack+totalA.attack)/2,21*tier,cls.id+' T'+tier+' average Attack');
    close((totalF.defense+totalA.defense)/2,33*tier,cls.id+' T'+tier+' average Defense');
    close((totalF.hp+totalA.hp)/2,76*tier,cls.id+' T'+tier+' average HP');
    close(budget(totalF),73*tier,cls.id+' T'+tier+' Foundation full budget');
    close(budget(totalA),73*tier,cls.id+' T'+tier+' Alternate full budget');
    if(offense.has(cls.id)){
      check(totalA.attack>totalF.attack,cls.id+' T'+tier+' Alternate must have stronger offensive stats');
      check(totalF.defense>totalA.defense&&totalF.hp>totalA.hp,
        cls.id+' T'+tier+' Foundation must retain greater survivability');
    }else if(cls.id==='BASTION'){
      close(totalA.attack,totalF.attack,cls.id+' T'+tier+' Bastion Attack stays budget-neutral');
      check(totalF.defense>totalA.defense&&totalA.hp>totalF.hp,
        cls.id+' T'+tier+' Bastion selects between mitigation and health');
    }else if(defense.has(cls.id)){
      check(totalF.attack>totalA.attack&&totalA.defense>totalF.defense,
        cls.id+' T'+tier+' support selects active throughput vs protection');
    }
    if(tier===2){
      const starter=createCharacter(newGame(0),cls.id,'Two-Path Balance');
      const state:GameState={...starter,character:{...starter.character!,level:999}};
      const equipped=(ids:readonly string[]):GameState=>({...state,character:{...state.character!,equipment:Object.fromEntries(
        ids.map(id=>[itemDef(id).slot,id]))}});
      const actualF=effectiveStats(equipped(f.itemIds)),actualA=effectiveStats(equipped(a.itemIds));
      if(offense.has(cls.id))check(actualA.attack>actualF.attack,
        cls.id+' live equipment stats must retain Alternate offensive strength');
      if(cls.id==='BASTION')check(actualA.hp>actualF.hp,
        'Bastion Alternate max HP must reach effective stats');
      if(defense.has(cls.id))check(actualA.defense>actualF.defense,
        cls.id+' Alternate mitigation must reach effective stats');
      check(actualF.hp>0&&actualA.hp>0&&actualF.attack>0&&actualA.attack>0,
        cls.id+' must retain healthy combat stats');
    }
  }
}
let invalidPath=false;try{equipmentStatsForSetPath('IRONWARDEN','Third',{attack:2,defense:6,hp:14})}catch{invalidPath=true}
check(invalidPath,'A third path must not be silently accepted');
console.log('PASS: all 81 class/tier pairs have two stat-distinct, budget-conserved sets with real combat stats');
