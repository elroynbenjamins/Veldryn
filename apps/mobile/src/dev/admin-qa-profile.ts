import {CLASSES} from '../content/classes';
import {ITEMS} from '../content/items';
import {MONSTERS} from '../content/monsters';
import {RECIPES} from '../content/skills';
import {classSkillsFor} from '../content/class-skills';
import {newGame} from '../core/game';
import {totalXpAtLevel} from '../core/progression';
import type {ClassId,GameState,ItemStack,SkillId} from '../core/types';

export const ADMIN_QA_CLASSES:ClassId[]=['IRONWARDEN','BASTION','DREADGUARD','DAWNKEEPER','WAYFINDER','RAVAGER','HEXWEAVER','KNIFE_DANCER','STONECALLER'];

function aggregate(stacks:ItemStack[]):ItemStack[]{
  const map=new Map<string,number>();
  for(const row of stacks)map.set(row.itemId,(map.get(row.itemId)??0)+row.quantity);
  return [...map.entries()].map(([itemId,quantity])=>({itemId,quantity}));
}

function qaMaterials():ItemStack[]{
  const recipeInputs=RECIPES.flatMap(recipe=>recipe.inputs.map(input=>input.itemId));
  const supportItems=ITEMS.filter(item=>item.type==='material'||item.type==='gem'||item.type==='food'||item.type==='potion').map(item=>item.id);
  return aggregate([...new Set([...recipeInputs,...supportItems])].map(itemId=>({itemId,quantity:9999})));
}

export function buildAdminQaState(current:GameState|undefined|null,classId:ClassId='IRONWARDEN',nowMs=Date.now()):GameState{
  const base=newGame(nowMs);
  const cls=CLASSES.find(row=>row.id===classId);
  if(!cls)throw new Error('Unknown QA class');
  const previous=current?.character;
  const characterId=previous?.id??'ADMIN_QA_CHARACTER';
  const level=100;
  const allSkills:SkillId[]=['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'];
  const character={
    id:characterId,
    name:previous?.name?.startsWith('[QA]')?previous.name:'[QA] Veldryn Admin',
    classId,
    bodyPresentation:previous?.bodyPresentation??'male' as const,
    classSkills:classSkillsFor(classId).map(skill=>({skillId:skill.id,xp:9_999_999,level:99})),
    trainingFocus:'balanced' as const,
    profileTitle:'QA Administrator',
    profileBackgroundId:'asterfall-night',
    unlockedEventSkinIds:[],
    unlockedSkinIds:['starting'],
    ownedPetIds:[],
    ownedBoostIds:[],
    selectedSkinId:'starting',
    faith:{favoriteBlessingIds:[],hideWeakerBlessings:true},
    level,
    xp:totalXpAtLevel(level),
    gold:99_999_999,
    hp:cls.hp,
    currentHp:cls.hp,
    attack:cls.attack,
    defense:cls.defense,
    equipment:{weapon:cls.starterEquipment.weapon},
    equippedFoodId:'TRAVEL_RATION',
  };
  return {
    ...base,
    ...(current??{}),
    version:base.version,
    character,
    activity:null,
    currentRegionId:'GREENFIELDS',
    inventory:{stacks:[{itemId:'TRAVEL_RATION',quantity:9999}],capacity:250},
    bank:{stacks:qaMaterials(),capacity:5000},
    overflow:{stacks:[],expiresAtMs:null},
    quests:(current?.quests?.length?current.quests:base.quests).map(row=>({...row,status:'claimed',progress:999999})),
    unlockedMonsterIds:MONSTERS.map(row=>row.id),
    defeatedBossIds:MONSTERS.filter(row=>row.boss).map(row=>row.id),
    skills:allSkills.map(skillId=>({skillId,xp:9_999_999,level:99})),
    account:{
      ...base.account,
      ...(current?.account??{}),
      createdCharacterCount:5,
      unlockedCharacterSlots:5,
      entitlements:{...(current?.account.entitlements??{}),supporter:true,supporter_subscription:true,vip:true,vip_plus:true},
      premiumCurrencyBalance:999_999,
      equipmentCraftingQueue:[],
      guildMember:true,
      patronTier:'crown',
    },
    settings:{...base.settings,...(current?.settings??{})},
  };
}

export function refillAdminQaResources(state:GameState):GameState{
  if(!state.character)throw new Error('QA profile needs an active character.');
  return {
    ...state,
    character:{...state.character,gold:99_999_999,currentHp:state.character.hp},
    bank:{...state.bank,capacity:Math.max(5000,state.bank.capacity),stacks:qaMaterials()},
    inventory:{...state.inventory,capacity:Math.max(250,state.inventory.capacity)},
    account:{...state.account,premiumCurrencyBalance:999_999,entitlements:{...(state.account.entitlements??{}),supporter:true,supporter_subscription:true,vip:true,vip_plus:true}},
  };
}

export function isAdminQaState(state:GameState|undefined|null):boolean{
  return !!state?.character?.name?.startsWith('[QA]');
}
