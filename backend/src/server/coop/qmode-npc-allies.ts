import {launchPlayer} from '../combat/content/launch-combat';
import {resolveAndFreezeLoadout,type AuthoritativeLoadoutRecord,type FrozenLoadoutSnapshot} from './loadout-snapshots';
import {ROOTBOUND_ROLE_REFERENCES} from './normalization';
import {deriveRole,type ClassId} from './role-readiness';

/** Server-owned NPCs fill only vacant Q-Mode seats. No player account or Echo profile is created. */
const CLASSES:readonly {id:ClassId;className:string;name:string}[]=[
 {id:'IRONWARDEN',className:'Ironwarden',name:'NPC · Iron Sentinel'},
 {id:'BASTION',className:'Bastion',name:'NPC · Shieldbearer'},
 {id:'DREADGUARD',className:'Dreadguard',name:'NPC · Dread Guardian'},
 {id:'WAYFINDER',className:'Wayfinder',name:'NPC · Trail Ranger'},
 {id:'RAVAGER',className:'Ravager',name:'NPC · Riftblade'},
 {id:'HEXWEAVER',className:'Hexweaver',name:'NPC · Rune Adept'},
 {id:'KNIFE_DANCER',className:'Knife Dancer',name:'NPC · Shadow Dancer'},
 {id:'DAWNKEEPER',className:'Dawnkeeper',name:'NPC · Dawn Medic'},
 {id:'STONECALLER',className:'Stonecaller',name:'NPC · Stone Sage'},
];
export function createQModeNpcAllies({minimumLevel,syncLevel,controllerLevel}:{minimumLevel:number;syncLevel:number;controllerLevel:number}):FrozenLoadoutSnapshot[]{
 if(![minimumLevel,syncLevel,controllerLevel].every(n=>Number.isInteger(n)&&n>=1&&n<=100))throw new Error('invalid_npc_level');
 if(controllerLevel<minimumLevel)throw new Error('character_below_tier_level');
 const level=Math.max(minimumLevel,Math.min(syncLevel,controllerLevel));
 return CLASSES.map(({id,className,name})=>{
  const role=deriveRole(id),ref=ROOTBOUND_ROLE_REFERENCES[role],kit=launchPlayer(className,level);
  const scale=level/ref.level*.9,accountId=`npc:qmode:${id}`,characterId=accountId;
  const capabilities=role==='tank'?['threat','defense']:role==='support'?['restore','mitigate','utility']:['damage'];
  const record:AuthoritativeLoadoutRecord={accountId,characterId,classId:id,loadoutId:'npc-kit',revision:1,
   characterLevel:level,dungeonUnlocked:true,legalEquipment:true,capabilities:capabilities as AuthoritativeLoadoutRecord['capabilities'],
   abilities:structuredClone(kit.abilities),
   stats:{characterId,classId:id,displayName:name,bodyPresentation:'male',level,
    maxHp:ref.maxHp*scale,attackPower:ref.attackPower*scale,healingPower:ref.healingPower*scale,
    defense:ref.defense*scale,accuracy:ref.accuracy*scale,evasion:ref.evasion*scale,
    critChance:kit.stats.critChance,haste:kit.stats.haste}};
  return resolveAndFreezeLoadout({accountId,characterId,loadoutId:record.loadoutId,expectedRevision:1,
   minLevel:minimumLevel,syncLevel,repository:{getOwnedLoadout:()=>record}});
 });
}
