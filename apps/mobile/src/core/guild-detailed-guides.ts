/** Long-form help belongs in a reusable modal, not on the daily Guild boards. */
export type GuildGuideTopic={id:string;title:string;body:string};
export type GuildDetailedGuide={title:string;body:string;detail?:string;topics:readonly GuildGuideTopic[]};

export const GUILD_DETAILED_GUIDES:Readonly<Record<string,GuildDetailedGuide>>={
 'Progress/Projects':{
  title:'Guild Projects',body:'Complete shared weekly projects, qualify for rewards and vote on the next Guild challenge.',
  topics:[
   {id:'weekly',title:'Weekly projects and voting',body:"The standard project starts each Monday. At Guild Level 3, Guild's Choice voting opens on Thursday. Each member can vote once on a rotating project with its own difficulty and focus. If nobody votes, the Medium option is selected automatically."},
   {id:'effort',title:'How your contributions count',body:'Combat, gathering, crafting and eligible supply donations contribute when they match the active project. Where applicable, combat and gathering award 20 effort per minute and crafting awards 5 effort per item. Weekly effort projects can cap activity at 2,400 effort per day and limit one member to 50% of the target in Guilds of two or more. Some projects require several qualifying contributors.'},
   {id:'rewards',title:'Personal and Guild rewards',body:'Shared project completion is different from personal reward eligibility. Check your own effort target (often 300 effort), contribute before the weekly reset, and claim eligible completion rewards within seven days. Guild rewards can include XP, Hall Progress and Guild Bank Gold; the individual reward depends on the project.'},
  ],
 },
 'Progress/Skills':{
  title:'Guild Skills',body:'Use Guild levels and Skill Points to strengthen lasting bonuses for Guild members.',
  topics:[
   {id:'points',title:'Guild XP and Skill Points',body:'Guild experience advances your Guild level and awards shared Skill Points. Spend these points on released skill nodes; each node has a rank and a clearly displayed next bonus.'},
   {id:'branches',title:'Bonuses and specialization',body:'Skill branches support different activities, such as professions, Guild quests or Guild encounters. Select a node to compare its current bonus with the next rank before committing.'},
   {id:'costs',title:'Upgrade costs and permissions',body:'Only Guild Officers and Leaders can allocate Skill Points. Each upgrade may also consume Gold and materials already deposited in the shared Guild Bank. The server verifies costs and permissions; members can view the requirements and contribute eligible supplies.'},
  ],
 },
 'Hall/Bank':{
  title:'Guild Bank',body:'Collect shared materials for released Construction and Guild Skill upgrades.',
  topics:[
   {id:'deposit',title:'Deposit first, spend in the right screen',body:'Guild Bank materials are shared. Deposit resources needed by released Guild Construction or Guild Skills, then allocate them from the corresponding Construction or Skills screen. Depositing does not automatically finish an upgrade.'},
   {id:'requirements',title:'Needed now and upcoming',body:'Needed Now shows eligible, released upgrade materials still missing. Covered resources need no further deposit. Upcoming requirements indicate later upgrades and cannot necessarily be funded yet. Check your own inventory and the existing Bank stock before contributing.'},
   {id:'safety',title:'Permanent donations and confirmations',body:'Guild Bank donations cannot be withdrawn or transferred back to a character. Always review the item, amount and balance before confirming. If a receipt is pending after a connection error, retry that saved request instead of submitting a duplicate.'},
  ],
 },
 'Hall/Construction':{
  title:'Guild Construction',body:'Fund released building upgrades with shared supplies and unlock permanent Guild benefits.',
  topics:[
   {id:'systems',title:'Hall facilities versus Construction',body:'Guild Hall facilities advance automatically through Guild Projects. Construction is separate: choose a building and fund its released upgrade tiers. Guild Skills are another separate system that spends Skill Points and Bank resources.'},
   {id:'funding',title:'How construction funding works',body:'Open Guild Bank to deposit eligible resources, then return here to select a building and allocate the exact amount still needed. Costs may change with Guild size. A funding action is server-verified and cannot spend more than the Bank holds or the upgrade requires.'},
   {id:'benefits',title:'Released tiers and unlocks',body:'Only released upgrades accept funding. Completed tiers unlock lasting Guild benefits, including access to better Shop offers. They do not award free cosmetics or unlock unreleased Guild content.'},
  ],
 },
};

export function guildDetailedGuide(section:string):GuildDetailedGuide|undefined{
 return GUILD_DETAILED_GUIDES[section];
}
