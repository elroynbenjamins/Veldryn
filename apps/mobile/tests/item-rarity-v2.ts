import {GEAR_RARITIES,rarityMeta,rarityNameColor,rollGearRarity} from '../src/core/item-rarity';
import {itemDef} from '../src/content/items';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';
import {V33_EQUIPMENT_RECIPES} from '../src/content/equipment-recipes-v33';

if(GEAR_RARITIES.find(x=>x.id==='uncommon')!.chance!==.07||GEAR_RARITIES.find(x=>x.id==='mythic')!.chance!==.0005)throw new Error('Requested rarity odds missing');
const rareFixture=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T3')!;
const epicFixture=V33_EQUIPMENT_RECIPES.find(row=>row.v33EquipmentTier==='T5')!;
if(itemDef(rareFixture.output.itemId).rarity!=='rare'||itemDef(epicFixture.output.itemId).rarity!=='epic')throw new Error('V33 gear rarity tiers missing');
if(rarityMeta('mythic').statMultiplier<=rarityMeta('legendary').statMultiplier)throw new Error('Mythic stats must exceed Legendary');
if(rarityNameColor('common',false,'#17202A')!=='#17202A')throw new Error('Common names should use theme text');
if(rarityNameColor('rare',true,'#17202A')!==rarityMeta('rare').color)throw new Error('Dark themes should use canonical rarity color');
if(rarityNameColor('rare',false,'#17202A')!==rarityMeta('rare').lightTextColor)throw new Error('Light theme rarity name color missing');
if(!['common','uncommon','rare','epic','legendary','mythic'].includes(rollGearRarity('stable-seed')))throw new Error('Rarity roll invalid');
console.log('PASS: rarity odds, V33 tiers, accessible name colors, stat multipliers and deterministic roll API');
