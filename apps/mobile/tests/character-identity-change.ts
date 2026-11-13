import {createCharacter,newGame} from '../src/core/game';
import {applyCharacterIdentityChange} from '../src/core/character-identity-change';
import {canUseProfileIcon} from '../src/core/profile-icons';
import type {GameState} from '../src/core/types';

let checks=0;
function ok(value:unknown,message:string){checks++;if(!value)throw new Error(message);}
function rejects(callback:()=>unknown,fragment:string){
 let message='';try{callback();}catch(error){message=String(error);}
 ok(message.includes(fragment),'expected '+fragment+'; got '+message);
}
const NOW=Date.UTC(2026,10,13);
const base=createCharacter(newGame(NOW),'DAWNKEEPER','Errapel');
const id=base.character!.id;
const copyId='test-craft-1';
const copy={id:copyId,itemId:'T1P_149',ownerCharacterId:id,rarity:'common' as const,quality:65,
  acquireSource:'craft' as const,sourceReceiptKey:'test-craft-1',createdAtMs:NOW,
  enhancement:{rank:0,failures:0,gemIds:[]}};
const state:GameState={
 ...base,
 character:{...base.character!,level:14,xp:317589,gold:5554,
   classSkills:[{skillId:'restoration',xp:180516,level:14},{skillId:'sanctity',xp:180516,level:14}],
   classSkillRemainders:{restoration:.5,sanctity:.25},
   equipment:{chest:'T1P_149'},equipmentInstanceIds:{chest:copyId},
   profileIconId:'class:DAWNKEEPER',equippedCombatCompanionId:'UNIT_001',
   equippedToolIds:{fishing:'REEDLINE_ROD'},
   savedLoadouts:[{id:'one',slotIndex:0,name:'Boss',classId:'DAWNKEEPER',
     equipment:{chest:'T1P_149'},equipmentInstanceIds:{chest:copyId},foodId:'TRAVEL_RATION',
     companionId:'UNIT_001',createdAtMs:NOW,updatedAtMs:NOW}]},
 account:{...base.account,unlockedCombatCompanionIds:['UNIT_001'],
   craftedGearInstances:[copy]},
 bank:{...base.bank,stacks:[{itemId:'COPPER_ORE',quantity:28}]},
};
const original=JSON.stringify(state);
const renamed=applyCharacterIdentityChange(state,{kind:'rename',characterId:id,newName:' Erebus '},NOW);
ok(renamed.state.character!.name==='Erebus','rename normalized');
ok(renamed.state.character!.equipment.chest==='T1P_149','rename leaves equipped gear');
ok(renamed.summary.destroyedEquipmentCopies===0,'rename does not destroy gear');
ok(JSON.stringify(state)===original,'rename does not mutate input');
rejects(()=>applyCharacterIdentityChange(state,{kind:'rename',characterId:id,newName:'Admin'},NOW),'reserved');
rejects(()=>applyCharacterIdentityChange(state,{kind:'rename',characterId:'another',newName:'Erebus'},NOW),'active_character_required');
rejects(()=>applyCharacterIdentityChange(state,{kind:'rename',characterId:id,newName:'Errapel'},NOW),'name_unchanged');

const changed=applyCharacterIdentityChange(state,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW+1);
const next=changed.state, c=next.character!;
ok(c.classId==='KNIFE_DANCER'&&c.name==='Errapel','changes class but not username');
ok(c.hp===106&&c.attack===22&&c.defense===10,'correct class base stats');
ok(c.level===14&&c.xp===317589&&c.gold===5554,'combat level xp and gold survive');
ok(c.classSkills?.[0].skillId==='blade_rhythm'&&c.classSkills[0].xp===180516,'first combat skill transfers');
ok(c.classSkills?.[1].skillId==='precision'&&c.classSkills[1].xp===180516,'second combat skill transfers');
ok(c.classSkillRemainders?.blade_rhythm===.5&&c.classSkillRemainders?.precision===.25,'fractional xp transfers');
ok(JSON.stringify(c.equipment)==='{}'&&JSON.stringify(c.equipmentInstanceIds)==='{}','equipped gear cleared');
ok(next.account.craftedGearInstances?.length===0,'only equipped crafted receipt destroyed');
ok(changed.summary.destroyedEquipmentCopies===1,'destroyed gear count precise');
ok(changed.summary.companionUnequipped&&c.equippedCombatCompanionId===undefined,'same-role damage companion unequipped');
ok(next.account.unlockedCombatCompanionIds?.includes('UNIT_001'),'ownership remains');
ok(c.profileIconId==='class:KNIFE_DANCER'&&canUseProfileIcon(next,'class:KNIFE_DANCER'),'new class portrait available');
ok(!canUseProfileIcon(next,'class:DAWNKEEPER'),'old class portrait not automatically usable');
ok(c.savedLoadouts?.[0].name==='Boss'&&Object.keys(c.savedLoadouts[0].equipment).length===0,'loadout name survives, gear removed');
ok(c.savedLoadouts?.[0].foodId==='TRAVEL_RATION'&&c.savedLoadouts[0].companionId===undefined,'food kept and incompatible preset companion removed');
ok(JSON.stringify(next.inventory)===JSON.stringify(state.inventory)&&JSON.stringify(next.bank)===JSON.stringify(state.bank),'inventory and bank untouched');
ok(JSON.stringify(next.skills)===JSON.stringify(state.skills),'profession xp untouched');
ok(c.equippedToolIds?.fishing==='REEDLINE_ROD','gathering tools remain');
ok(JSON.stringify(state)===original,'class switch does not mutate input');
const withCosmetic={...state,character:{...state.character!,profileIconId:'starter:hooded-ranger'}};
ok(applyCharacterIdentityChange(withCosmetic,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW).state.character?.profileIconId==='starter:hooded-ranger','non-class cosmetic preserved');
const withActivity={...state,activity:{kind:'combat' as const,targetId:'MOSS_RAT',startedAtMs:NOW,lastClaimAtMs:NOW}};
rejects(()=>applyCharacterIdentityChange(withActivity,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW),'stop_activity_before_class_change');
const withDrills={...state,character:{...state.character!,classTraining:{lastClaimAtMs:NOW,progressMs:0,focus:'balanced' as const,xpPerDrill:24}}};
rejects(()=>applyCharacterIdentityChange(withDrills,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW),'stop_activity_before_class_change');
const ambiguousCopies={...state,bank:{...state.bank,stacks:[...state.bank.stacks,{itemId:'T1P_149',quantity:1}]}};
rejects(()=>applyCharacterIdentityChange(ambiguousCopies,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW),'equipment_ownership_audit_failed');
rejects(()=>applyCharacterIdentityChange(state,{kind:'class',characterId:id,newClassId:'DAWNKEEPER'},NOW),'class_unchanged');
const corrupt={...state,character:{...state.character!,equipmentInstanceIds:{chest:'unrecognized'}}};
rejects(()=>applyCharacterIdentityChange(corrupt,{kind:'class',characterId:id,newClassId:'KNIFE_DANCER'},NOW),'equipment_ownership_audit_failed');
console.log(`PASS character identity changes: ${checks} checks`);
