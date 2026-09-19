import {GLOBAL_CRAFT_RARITY_V28,rarityChancesV26,rollCraftedRarityV26,nextArtisanInsightV26} from './equipment-craft-rarity-v26';
import {EXACT_PIECE_RECIPES_V27} from './equipment-exact-recipes-v27';
import {targetAcquisitionHoursV28,targetFinalCraftMinutesV28} from './equipment-acquisition-balance-v28';
import type {EquipmentTierId} from './equipment-types-v22';
const ok=(v:unknown,m='assert')=>{if(!v)throw new Error(m)};const eq=(a:unknown,b:unknown,m='assert')=>{if(a!==b)throw new Error(`${m}:${String(a)}!=${String(b)}`)};
const tiers:EquipmentTierId[]=['T1','T2','T3','T4','T5','T6','T7','T8','T9'];
for(const t of tiers){const c=rarityChancesV26(t,1,1,0);for(let i=0;i<GLOBAL_CRAFT_RARITY_V28.length;i++)ok(Math.abs(c[i].chance-GLOBAL_CRAFT_RARITY_V28[i].chance)<1e-12,`global_odds_${t}_${i}`);}
eq(GLOBAL_CRAFT_RARITY_V28.find(x=>x.rarity==='Mythic')?.chance,.001);eq(rollCraftedRarityV26({tier:'T9',professionLevel:70,recipeMinProfessionLevel:70,artisanInsight:0,randomUnit:.99975}),'Mythic');
const maxMastery=rarityChancesV26('T1',55,1,20);ok(Math.abs((maxMastery.find(x=>x.rarity==='Mythic')?.chance??0)-.001)<1e-12,'mythic_never_boosted');eq(nextArtisanInsightV26(19,'Rare'),20);eq(nextArtisanInsightV26(20,'Epic'),0);
for(const r of EXACT_PIECE_RECIPES_V27){eq(r.finalAssembly.craftMinutes,targetFinalCraftMinutesV28(r.tier as EquipmentTierId,r.slot as any),`timer_${r.pieceId}`);const b=targetAcquisitionHoursV28(r.tier as EquipmentTierId,r.path as any,r.slot as any);ok(b.total>b.finalCraft,'total_exceeds_timer');ok(Math.abs((b.skilling+b.combat+b.dungeon+b.finalCraft)-b.total)<1e-9,'split_sums');}
console.log('equipment-v28 global rarity and acquisition-time tests passed');
