import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../src/content/guild-construction-blueprints';
import {guildConstructionBenefits,GUILD_SHOP_ITEM_QUALITY,GUILD_SHOP_QUALITY_TIER,guildShopQualityUnlocked} from '../src/content/guild-construction-benefits';
export {};
const fs=require('fs') as {readFileSync:(path:string,enc:string)=>string};
function ok(value:unknown,message:string){if(!value)throw new Error(message);}
const levels:Record<string,number>={
 hall_1:1,hall_2:3,hall_3:6,hall_4:10,
 forge_1:2,forge_2:5,forge_3:10,library_1:2,library_2:5,library_3:10,
 treasury_1:3,treasury_2:7,war_room_1:3,war_room_2:7,war_room_3:15,
 expedition_1:4,expedition_2:8,
};
ok(GUILD_CONSTRUCTION_BLUEPRINTS.length===17,'Exactly 17 permanent construction tiers');
for(const row of GUILD_CONSTRUCTION_BLUEPRINTS){
 const id=row.id.replace('construction_','');
 ok(row.requiredGuildLevel===levels[id],'Wrong guild-level gate: '+id);
 ok(!/grants? (a |new )?(banner|color|border|pet|companion)/i.test(row.benefit),'Construction should unlock features, not cosmetics');
 ok(row.materials.length===2&&row.materials.every(m=>m.amount>=80),'The original 10x costs must be retained');
}
const completed=(...ids:string[])=>new Set(ids.map(id=>'construction_'+id));
const base=guildConstructionBenefits(completed());
ok(!base.canChangeGuildColors&&base.shopQuality==='standard'&&base.guildTokenWeeklyCap===250,'Default guild has no construction benefits');
const hall1=guildConstructionBenefits(completed('hall_1'));
ok(hall1.canChangeGuildColors&&hall1.shopQuality==='standard','Hall I only unlocks editing, not colors or shop quality');
ok(guildConstructionBenefits(completed('hall_2')).shopQuality==='standard','Later tier cannot skip previous construction tier');
ok(guildConstructionBenefits(completed('hall_1','hall_2')).shopQuality==='rare','Hall II Rare Shop');
ok(guildConstructionBenefits(completed('hall_1','hall_2','hall_3')).shopQuality==='epic','Hall III Epic Shop');
ok(guildShopQualityUnlocked(completed('hall_1','hall_2','hall_3','hall_4'),'prestige'),'Hall IV Prestige Shop');
for(const [building,field,values] of [
 ['forge','smithingTailoringSpeedBps',[0,500,800,1200]],
 ['library','nonCombatXpBps',[0,500,800,1200]],
 ['treasury','guildTokenBonusBps',[0,1000,2000]],
 ['war_room','guildBossDamageBps',[0,300,600,1000]],
 ['expedition','guildQuestGoldBps',[0,500,1000]],
] as const){
 for(let tier=0;tier<values.length;tier++){
  const result=guildConstructionBenefits(completed(...Array.from({length:tier},(_,i)=>building+'_'+(i+1))));
  ok(result[field]===values[tier],building+' tier '+tier+' should replace (not stack) previous');
 }
}
ok(guildConstructionBenefits(completed('treasury_1')).guildTokenWeeklyCap===275,'Treasury I cap');
ok(guildConstructionBenefits(completed('treasury_1','treasury_2')).guildTokenWeeklyCap===300,'Treasury II cap');
const sql=fs.readFileSync('../../backend/supabase/migrations/20261104000018_guild_construction_perks_authority.sql','utf8');
for(const [itemId,quality] of Object.entries(GUILD_SHOP_ITEM_QUALITY)){
 ok(GUILD_SHOP_QUALITY_TIER[quality]>=0,'Unknown Guild Shop quality '+itemId);
 ok(sql.includes("'"+itemId+"'"),'SQL quality map missing '+itemId);
}
for(const fragment of [
 'guild_construction_shop_tier_guard','guild_construction_color_edit_guard',
 'new.name_color_id is distinct from old.name_color_id',
 "template_id='construction_hall_1' and t.enabled",
 "new.reward_kind='standard'",
 "new.claim_key like 'guild-muster:%'",
 'guild_shop_weekly_earned_check check(earned between 0 and 300)',
 'public.guild_construction_token_weekly_cap_v1(p_account_id)',
 'new.reward_amount:=ceil(',
 'guild_construction_cosmetic_releases',
 'revoke all on function public.guild_construction_benefits_server_v1(uuid)',
])ok(sql.includes(fragment),'Missing authoritative SQL guard: '+fragment);
ok(!/grant execute on function public.guild_construction_benefits_server_v1\(uuid\) to authenticated/i.test(sql),
 'Guild perk read RPC must stay server only');
console.log('PASS: early Guild Construction tiers, cumulative tier guards, Guild Shop quality, owned-only colors, Treasury verified token caps and server guards');
