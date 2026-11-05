import {GUILD_COMPONENT_ITEMS,GUILD_COMPONENT_RECIPES,GUILD_COMPONENT_CRAFTING_RELEASED} from '../src/content/guild-components';
import {GUILD_CONSTRUCTION_BLUEPRINTS} from '../src/content/guild-construction-blueprints';
import {ITEMS,itemDef} from '../src/content/items';
import {RECIPES} from '../src/content/skills';
export {};
const fs=require('fs') as {readFileSync:(p:string,e:string)=>string};
function check(condition:unknown,detail:string){if(!condition)throw new Error(detail);}
const ids=new Set(GUILD_COMPONENT_ITEMS.map(x=>x.id));
check(ids.size===8,'Eight illustrated guild component IDs required');
check(GUILD_COMPONENT_RECIPES.length===8,'Exactly eight authored guild profession recipes');
check(GUILD_COMPONENT_CRAFTING_RELEASED,'Guild components should be craftable now that released Guild Construction needs them');
// Guild-only Smithing/Tailoring recipes use five times the original ingredient
// and Gold costs, and twice the original XP. Gold includes the existing 20%
// crafting surcharge; crafting duration and output quantity stay unchanged.
const expectedGuildCraftingBalance:Record<string,{xp:number;gold:number;inputs:number[];seconds:number}>={
 GUILD_FORGE_TIMBER:{xp:220,gold:180,inputs:[15,10],seconds:75},
 GUILD_FORGE_KEYSTONE:{xp:560,gold:570,inputs:[10,15],seconds:140},
 GUILD_FORGE_RIVETS:{xp:1120,gold:1740,inputs:[10,5],seconds:260},
 GUILD_FORGE_HINGES:{xp:2900,gold:6000,inputs:[10,10],seconds:570},
 GUILD_TAILOR_BANNERWEAVE:{xp:200,gold:150,inputs:[25,10],seconds:75},
 GUILD_TAILOR_DYE:{xp:550,gold:540,inputs:[15,5],seconds:140},
 GUILD_TAILOR_WAX:{xp:1130,gold:1800,inputs:[5,10],seconds:260},
 GUILD_TAILOR_BEACON_OIL:{xp:2840,gold:5700,inputs:[10,10],seconds:570},
};
for(const recipe of GUILD_COMPONENT_RECIPES){
 const expected=expectedGuildCraftingBalance[recipe.id];
 check(!!expected,'Unexpected guild component recipe '+recipe.id);
 check(recipe.xp===expected.xp&&recipe.gold===expected.gold,'Guild component XP/Gold balance mismatch: '+recipe.id);
 check(recipe.inputs.map(input=>input.quantity).join(',')===expected.inputs.join(','),'Guild component ingredient cost mismatch: '+recipe.id);
 check(recipe.seconds===expected.seconds&&recipe.output.quantity===1,'Guild component time/output should remain unchanged: '+recipe.id);
}
check(Object.keys(expectedGuildCraftingBalance).length===GUILD_COMPONENT_RECIPES.length,'Guild crafting balance must cover all recipes');

const icons=fs.readFileSync('src/theme/guild-upgrade-component-art.ts','utf8');
const resourceIcons=fs.readFileSync('src/theme/resource-assets.ts','utf8');
const resourceRenderer=fs.readFileSync('src/components/ResourceArtwork.tsx','utf8');
const guildBank=fs.readFileSync('src/components/OnlineGuildBankPanel.tsx','utf8');
const guildConstruction=fs.readFileSync('src/components/OnlineGuildConstructionPanel.tsx','utf8');
const profession=fs.readFileSync('src/components/CraftingRecipeBrowser.tsx','utf8');
const upcomingMigration=fs.readFileSync('../../backend/supabase/migrations/20261104000500_guild_bank_upcoming_construction_stock.sql','utf8');
check(guildBank.includes("width:'23%'")&&guildBank.includes("type BankSection='inventory'|'needed'|'activity'")&&guildBank.includes('<GameModalSurface'),'Guild Bank must use a four-column inventory with dedicated Needed and Activity screens');
check(guildBank.includes("width:'31%'")&&guildBank.includes('fontScale>=1.35'),'Very small devices and large accessible fonts must receive readable slot geometry');
check(guildBank.includes('setSearch')&&guildBank.includes('visibleIds.map(inventoryCard)'),'Guild inventory must support client-side searching without changing server resources');
check(guildBank.includes('shortageNow')&&guildBank.includes('shortageUpcoming')&&guildBank.includes('neededRow(id,false)')&&guildBank.includes('neededRow(id,true)'),'Needed view must distinguish current and upcoming outstanding requirements');
check(guildBank.includes('snapshot.bank.activity.slice(0,20)')&&guildBank.includes('activityTime(item.createdAt)'),'Activity must use actual server ledger records and timestamps');
check(guildBank.includes('Keyboard.dismiss();setConfirming(true)')&&guildBank.includes('Confirm donation')&&guildBank.includes('onPress={()=>void deposit({resourceId:selected,amount})}'),'Donations must receive an in-theme second confirmation before the server transaction');
check(guildBank.includes('pendingGuildBankDeposit()')&&guildBank.includes('Retry saved deposit')&&guildBank.includes('depositOnlineGuildBank(input)'),'A pending deposit must remain idempotently recoverable');
check(guildBank.includes('The server checks your available unlocked items or Gold')&&!guildBank.includes('You own'),'Do not present fabricated personal balances: server verifies inventory and Gold before a donation');
check(guildBank.includes('loadOnlineGuildSkills()')&&guildBank.includes('skillSnapshot.skillPoints>0')
 &&guildBank.includes('if(!node.released||node.rank>=node.maxRank)continue')
 &&guildBank.includes('cost.rank!==node.rank+1'),
 'Guild Bank must surface ONLY released, unmaxed next-rank Skill requirements while points remain');
check(guildBank.includes('(row?.skills??0)')&&guildBank.includes('Guild Skills draw from the same Bank'),
 'Guild Bank must count Skill materials together with current/upcoming Construction capacity');
const guildShop=fs.readFileSync('src/online/guild-token-shop.ts','utf8');
check(guildShop.includes("'construction'|'skill_upgrade'")&&guildShop.includes("'deposit','construction','skill_upgrade'"),
 'Guild Bank validation must accept the server ledger skill-upgrade spend entries');
const hallNav=fs.readFileSync('src/components/OnlineGuildHallPanel.tsx','utf8');
check(hallNav.includes('onOpenConstruction={()=>{setBankFocus(null);navigate(\'Construction\')}}'),'Guild Bank Needed view must link directly to Construction without duplicate bottom action');
check(guildBank.includes('Math.max(0,totalNeed(id)-balance(id))'),'Donatable capacity must subtract Guild Bank holdings from remaining requirements');
check(guildBank.includes('if(!template.enabled)continue')&&guildBank.includes('if(progress?.completed)continue'),'Guild Bank must exclude unreleased and completed upgrades');
check(profession.includes('guildMaterialsOnly')&&profession.includes("itemDef(recipe.output.itemId).guildOnly"),'Smithing and Tailoring must expose a Guild materials recipe filter');
check(upcomingMigration.includes('guild_bank_deposit_server_v1')&&upcomingMigration.includes('guild_bank_required_resources_guard_v1'),'Both independent server donation guards must support upcoming upgrades');
check(!upcomingMigration.includes('t.required_guild_level<=v_level')&&!upcomingMigration.includes('and t.required_guild_level <= g.level'),'Published upcoming projects should not require the guild to have already reached their level');
check(upcomingMigration.includes('p.completed_at is null')&&upcomingMigration.includes('v_bank > v_need')&&upcomingMigration.includes('skill.is_released'),'Do not accept completed, overfunded or unreleased Guild Skill stock');
check(upcomingMigration.includes('guild_construction_scaled_amount_v1(req.required_amount,public.guild_construction_project_member_count_v1(v_guild,t.template_id))'),
 'Published upcoming Guild deposits must respect the member-scaled construction cost');
check(upcomingMigration.includes('guild_construction_scaled_amount_v1(r.required_amount,public.guild_construction_project_member_count_v1(new.guild_id,r.template_id))'),
 'The post-deposit bank guard must retain the +20%-per-member scaled allocation cap');

const roadmap=fs.readFileSync('src/components/GuildConstructionRoadmapPanel.tsx','utf8');
check(resourceIcons.includes('guildUpgradeComponentArtwork(itemId)'),
 'Guild PNGs must be resolved through canonical shared resource artwork');
check(resourceRenderer.includes('resourceIconSource(itemId)'),
 'Inventory and crafting artwork must use the shared source resolver');
check(guildBank.includes('<ResourceArtwork itemId={id}'),
 'Guild Bank slots must render the same Guild component images as inventory');
check(guildConstruction.includes('guildUpgradeComponentArtwork(res.key)'),
 'Construction allocations must show Guild component artwork');
check(roadmap.includes('<ResourceArtwork itemId={material.id}'),
 'The construction roadmap must show the illustrated component requirements');

for(const component of GUILD_COMPONENT_ITEMS){
 check(ITEMS.includes(component)&&itemDef(component.id)===component,'Component must exist in canonical item catalog');
 check(component.guildOnly&&component.value===0&&component.type==='material','No guild component can be sold');
 check(icons.includes(component.id),'Every commission must have existing illustrated resource icon');
}
for(const recipe of GUILD_COMPONENT_RECIPES){
 check(ids.has(recipe.output.itemId),'Every commission output must be guild-only');
 check(recipe.inputs.length>0&&recipe.inputs.every(x=>x.quantity>0&&itemDef(x.itemId)),'Every input must exist');
 check(recipe.repeatableTraining&&(recipe.skillId==='smithing'||recipe.skillId==='tailoring'),'Guild craft must use a profession');
 check(RECIPES.some(x=>x.id===recipe.id),'Released guild commission must be in the Smithing/Tailoring catalogue');
}
const sql=fs.readFileSync('../../backend/supabase/migrations/20261104000017_guild_construction_10x_commissions.sql','utf8');
for(const row of GUILD_CONSTRUCTION_BLUEPRINTS){
 check(row.materials.every(x=>ids.has(x.itemId)),'Construction uses only illustrated guild components');
 for(const material of row.materials)
  check(sql.includes("('"+row.id+"','"+material.itemId+"',"+material.amount+")"),
   'SQL cost mismatch on '+row.id);
 check(sql.includes("('"+row.id+"',"+row.requiredGuildLevel+",'guild_"+row.id+"',false)"),
  'Construction guild-level requirement mismatch on '+row.id);
}
const shared=fs.readFileSync('../../packages/guild-shop/src/catalogue.ts','utf8');
for(const row of GUILD_CONSTRUCTION_BLUEPRINTS)check(shared.includes('id:"'+row.id+'"'),'Server catalogue missing '+row.id);
check(sql.includes('set enabled=false'),'New construction cannot accept live donations until release gates pass');
// Four Guild Skill release gates: consumers must exist before any purchase flag opens.
const questConsumer=fs.readFileSync('../../backend/supabase/migrations/20261104000600_fellowship_quest_reward_consumer_v1.sql','utf8');
const bossConsumer=fs.readFileSync('../../backend/supabase/migrations/20261104000610_vanguard_boss_support_attempt_consumer_v1.sql','utf8');
const defenceConsumer=fs.readFileSync('../../backend/supabase/migrations/20261104000611_vanguard_defence_raid_endurance_consumer_v1.sql','utf8');
const questReturnFix=fs.readFileSync('../../backend/supabase/migrations/20261104000602_guild_quest_completion_return_qualification_v1.sql','utf8');
const capFix=fs.readFileSync('../../backend/supabase/migrations/20261104000612_vanguard_attempt_cap_and_support_snapshot_v1.sql','utf8');
const guildSkills=fs.readFileSync('src/content/guild-skill-paths.ts','utf8');
check(questConsumer.includes('guild_quest_reward_units_server_v1')&&questConsumer.includes('guild_quest_state_v1')&&questConsumer.includes('guild_quest_completions'),
 'Fellowship Quest skill must change immutable server award records, not visual rewards');
check(questConsumer.includes('guild_quest_bonus_rounding_contract_failed')&&questConsumer.includes('guild_quest_objective_return_pattern_missing'),
 'Fellowship Quest reward calculation must have rank-math and settlement-patch contracts');
check(questConsumer.includes('c.is_released')&&questConsumer.includes('fellowship_quests_must_stay_locked'),
 'Fellowship Quest bonuses must be gated behind a verified DB release');
check(bossConsumer.includes('guild_skill_effects_server_v1(uid)')&&bossConsumer.includes("v_skill_effects->>'guildId'=e.guild_id::text"),
 'Vanguard attempts must use server guild-scoped, released-skill projections');
check(bossConsumer.includes("v_skill_effects->>'guildBossDamageBps'")&&bossConsumer.includes("v_skill_effects->>'guildSupportBps'"),
 'Guild Boss and Battle Support must affect server-recorded attempt damage');
check(bossConsumer.includes('ceil(e.max_hp*.11)')&&bossConsumer.includes('v_companion_damage:=least(v_companion_damage,v_damage)'),
 'Vanguard effects must retain the authored per-attempt cap and consistent damage partition');
check(bossConsumer.includes('guild_boss_bonus_bps')&&bossConsumer.includes('guild_support_bonus_bps'),
 'Guild Boss and Support bonuses must snapshot percentages on committed attempts');
check(defenceConsumer.includes("v_skill_effects->>'guildDefenceBps'")&&defenceConsumer.includes('v_defense*35+v_hp*2'),
 'Defensive Doctrine must improve authoritative defensive raid stat contribution');
check(defenceConsumer.includes('guild_defence_bonus_bps')&&defenceConsumer.includes('guildDefenceBps'),
 'Defensive Doctrine must snapshot its effective rank in the owner-only attempt timeline');
check(questReturnFix.includes('returning public.guild_quest_completions.quest_key into inserted_key;'),
 'Completed Guild Quests must qualify RETURNING to avoid PL/pgSQL output-variable ambiguity');
check(capFix.includes('PERSONAL_DAMAGE_CAP_REACHED')&&capFix.includes('if v_companion_id is null then v_guild_support_bps:=0;end if;'),
 'Raid attempt cap must reject already-full players and zero out support without a companion');
check(guildSkills.includes('Does not reduce overworld or dungeon damage taken.'),
 'UI must not claim Defensive Doctrine mitigates damage outside the raid calculation');
check(!questConsumer.includes('update public.guild_skill_catalogue_v1 set is_released=true')
 &&!bossConsumer.includes('update public.guild_skill_catalogue_v1 set is_released=true')
 &&!defenceConsumer.includes('update public.guild_skill_catalogue_v1 set is_released=true'),
 'No consumer migration may prematurely unlock a Guild Skill for spending');

console.log('PASS: 8 illustrated guild materials, 8 released profession recipes, 17x 10x server project requirements');
