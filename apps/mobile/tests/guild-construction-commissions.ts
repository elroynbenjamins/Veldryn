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
console.log('PASS: 8 illustrated guild materials, 8 released profession recipes, 17x 10x server project requirements');
