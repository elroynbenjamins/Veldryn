import {createCharacter,newGame} from '../src/core/game';
import {localProfileGear,normalizeProfileGear,PROFILE_GEAR_SLOTS,profileGearColumnCount,profileGearItemStats} from '../src/core/profile-equipped-gear';

import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {itemDef} from '../src/content/items';
import {rollWeaponBonuses,WEAPON_BONUS_ROLL_VERSION} from '../src/core/weapon-bonus-rolls';
import {rollEquipmentBonuses,EQUIPMENT_BONUS_ROLL_VERSION} from '../src/core/equipment-bonus-rolls';
import {enhancedGearStatsAtRank} from '../src/core/equipment-enhancement';

function ok(value:unknown,message:string){if(!value)throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){
 if(actual!==expected)throw new Error(message+': expected '+String(expected)+', got '+String(actual));
}

equal(PROFILE_GEAR_SLOTS.length,10,'the profile has ten stable equipment slots');
equal(profileGearColumnCount(400,1),5,'normal mobile panel uses five columns');
equal(profileGearColumnCount(300,1),4,'narrow profile sheet uses four columns');
equal(profileGearColumnCount(240,1),3,'very narrow sheet uses three columns');
equal(profileGearColumnCount(400,1.5),3,'large accessibility text reduces columns');
const parsed=normalizeProfileGear([
 {slot:'weapon',itemId:'basic_sword',rarity:'epic',quality:88,rank:3,statGemId:'EMBER_SHARD',gemIds:['EMBER_SHARD','SWIFT_SIGIL','IGNORED']},
 {slot:'weapon',itemId:'forged_duplicate'},
 {slot:'unknown',itemId:'secret'},
 {slot:'ring',itemId:'basic_sword',rarity:'not_a_rarity',quality:101,rank:99},
 {slot:'helmet',itemId:''},
]);
ok(parsed,'array payload is accepted');
equal(parsed!.length,2,'invalid/duplicate slots are ignored');
equal(parsed![0].slot,'weapon','canonical order is retained');
equal(parsed![0].rarity,'epic','valid rarity is retained');
equal(parsed![0].quality,88,'valid quality is retained');
equal(parsed![0].gemIds?.join(','),'EMBER_SHARD,SWIFT_SIGIL','legacy gem arrays are bounded to two sockets');
equal(parsed![1].rarity,undefined,'invalid rarity is stripped');
equal(parsed![1].rank,undefined,'out-of-range rank is stripped');
equal(parsed![1].quality,undefined,'out-of-range quality is stripped');
equal(normalizeProfileGear({items:[]}),undefined,'malformed payload is rejected');

const active=createCharacter(newGame(1),'IRONWARDEN','Gear Active');
const other=createCharacter(newGame(2),'WAYFINDER','Gear Other');
const activeId=active.character!.id;
const otherId='profile-gear-second-character';
const state={
 ...active,
 character:{...active.character!,equipment:{weapon:'basic_sword'},equipmentInstanceIds:{weapon:'copy-active'}},
 otherCharacters:[{character:{...other.character!,id:otherId,equipment:{ring:'basic_sword'}},inventory:other.inventory,overflow:other.overflow,activity:other.activity,skills:other.skills,quests:other.quests,currentRegionId:other.currentRegionId}],
 account:{...active.account,craftedGearInstances:[{
  id:'copy-active',itemId:'basic_sword',ownerCharacterId:activeId,rarity:'rare' as const,quality:75,
  acquireSource:'craft' as const,sourceReceiptKey:'profile-test',createdAtMs:1,
  enhancement:{rank:2,failures:0,statGemId:'EMBER_SHARD',gemIds:['EMBER_SHARD']},
 }]},
};
const activeGear=localProfileGear(state);
equal(activeGear.length,1,'active loadout has one item');
equal(activeGear[0].slot,'weapon','active weapon shown');
equal(activeGear[0].rarity,'rare','exact crafted copy rarity shown');
equal(activeGear[0].quality,75,'exact crafted copy quality shown');
equal(activeGear[0].rank,2,'exact crafted copy upgrade shown');
equal(activeGear[0].gemIds?.join(','),'EMBER_SHARD','local legacy sockets remain visible');
const otherGear=localProfileGear(state,otherId);
equal(otherGear.length,1,'selected inactive character gets own loadout');
equal(otherGear[0].slot,'ring','selected inactive character does not leak active gear');
equal(otherGear[0].rarity,undefined,'no other character instance rarity inherited');
equal(localProfileGear(state,'unknown-character').length,0,'unknown selected character cannot fall back to active one');

// Real catalog copies: public stat display must match the private exact-copy inspector.
for(const slot of ['weapon','chest'] as const){
 const itemId=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T1'&&row.classId==='IRONWARDEN'&&itemDef(row.output.itemId).slot===slot)!.output.itemId;
 const rarity='epic' as const;
 const rolls=slot==='weapon'?rollWeaponBonuses(itemId,rarity,'public-profile-fixture',.43)!:rollEquipmentBonuses(itemId,rarity,'public-profile-fixture',.43)!;
 ok(rolls.length,'Fixture must mint valid bonus rolls');
 const bonusFields=slot==='weapon'?{weaponBonuses:rolls,weaponBonusRollVersion:WEAPON_BONUS_ROLL_VERSION}:{equipmentBonuses:rolls,equipmentBonusRollVersion:EQUIPMENT_BONUS_ROLL_VERSION};
 const receipt={...state.account.craftedGearInstances[0],id:'verified-'+slot,itemId,rarity,quality:82,...bonusFields};
 const copyState={...state,character:{...state.character,equipment:{[slot]:itemId},equipmentInstanceIds:{[slot]:receipt.id}},account:{...state.account,craftedGearInstances:[receipt]}};
 const publicRow=normalizeProfileGear([{slot,itemId,rarity,quality:82,rank:2,...bonusFields,instanceId:'private',ownerCharacterId:'private'}])![0];
 equal(JSON.stringify(publicRow.bonusRolls),JSON.stringify(rolls),'Valid rolled stats are preserved');
 equal(JSON.stringify(localProfileGear(copyState)[0].bonusRolls),JSON.stringify(rolls),'Self preview preserves the same exact rolls');
 ok(!('instanceId' in publicRow)&&!('ownerCharacterId' in publicRow),'Private receipt identifiers must not be projected');
 const stats=profileGearItemStats(publicRow)!;
 const expected=enhancedGearStatsAtRank(copyState,itemId,2,receipt.id);
 for(const stat of ['attack','defense','hp'] as const)ok(Math.abs(stats[stat]-expected[stat])<1e-8,'Public item stat must match private inspector '+stat);
 const invalid=normalizeProfileGear([{slot,itemId,rarity,quality:82,rank:2,...bonusFields,...(slot==='weapon'?{weaponBonuses:[{stat:'critRate',basisPoints:999999}]}:{equipmentBonuses:[{stat:'critRate',basisPoints:999999}]})}])![0];
 equal(invalid.bonusRolls,undefined,'Malformed rolls fail closed');
}
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};
for(const file of ['src/screens/ProfileScreen.tsx','src/components/ChatPlayerSheet.tsx']){
 const source=fs.readFileSync(file,'utf8');
 const gearIndex=source.indexOf('<ProfileEquippedGearShowcase');
 const achievementIndex=source.indexOf('<ProfileShowcaseSection title={');
 ok(gearIndex>=0&&achievementIndex>gearIndex,file+' shows equipped gear before achievement cards');
}
ok(fs.readFileSync('src/components/ProfileAudiencePreviewModal.tsx','utf8').includes('gear={localProfileGear(state,character.id)}'),
 'audience preview shows the selected character loadout');
console.log('PASS: profile equipped gear parsing, character selection and showcase placement');
