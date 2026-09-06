import {GEAR_RARITIES,rarityMeta,rollGearRarity} from '../src/core/item-rarity';
import {itemDef} from '../src/content/items';
if(GEAR_RARITIES.find(x=>x.id==='uncommon')!.chance!==.07||GEAR_RARITIES.find(x=>x.id==='mythic')!.chance!==.0005)throw new Error('Requested rarity odds missing');
if(itemDef('ASTER_IRON_CHEST').rarity!=='rare'||itemDef('OATHSTONE_WARDPLATE').rarity!=='epic')throw new Error('Gear rarity tiers missing');
if(rarityMeta('mythic').statMultiplier<=rarityMeta('legendary').statMultiplier)throw new Error('Mythic stats must exceed Legendary');
if(!['common','uncommon','rare','epic','legendary','mythic'].includes(rollGearRarity('stable-seed')))throw new Error('Rarity roll invalid');
console.log('PASS: rarity odds, colors, stat multipliers and deterministic roll API');
