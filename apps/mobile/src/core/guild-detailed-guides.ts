/** Long-form help belongs in a reusable modal, not on the daily Guild boards. */
export type GuildGuideTopic={id:string;title:string;body:string};
export type GuildDetailedGuide={title:string;body:string;detail?:string;topics:readonly GuildGuideTopic[]};

export const GUILD_DETAILED_GUIDES:Readonly<Record<string,GuildDetailedGuide>>={
 'Activities/Muster':{
  title:'Muster & Rally',body:'Your daily activity builds Rally Marks and helps unlock Guild-wide weekly benefits.',
  topics:[
   {id:'daily',title:'Daily points and Rally Marks',body:'Your first authenticated check-in adds 5 points. Verified combat, skilling, Guild Project and Guild Boss contributions can add points. Earn 25 points in one UTC day to contribute one Rally Mark to the Guild. The daily points cap is 100; extra points can still count toward your weekly contribution.'},
   {id:'weekly',title:'Your week and the Guild Rally',body:'Earn a Rally Mark on four qualifying days to reach your personal weekly goal. The days do not need to be consecutive. The Guild Rally target scales with membership, aiming for roughly 60% of members qualifying on four days. Rally tiers unlock at 35%, 70% and 100% of the shared target; they improve Hall Progress from completed Guild Projects. Rally resets on Monday at 00:00 UTC.'},
   {id:'activity',title:'Guild Activity and bonuses',body:'Guild Quests, Muster and completed Projects increase Guild Activity. Higher milestones grant gathering, production, skill experience, mastery experience and rare-material bonuses. Activity can decay without continued participation, but up to 10% reserve above 100% helps absorb future decay. Inspect the live milestone panel for your current bonuses.'},
  ],
 },
 'Activities/Quests':{
  title:'Guild Quests',body:'Complete shared weekly objectives to build Guild Activity and unlock better Guild benefits.',
  topics:[
   {id:'weekly',title:'Shared weekly quest board',body:'The Guild has five weekly quests with different categories, rarities and estimated effort. There are no rerolls. Every member helps the same shared objective; the board shows how much progress remains and when the current quests expire.'},
   {id:'verified',title:'Which contributions count?',body:'Only server-verified activities matching a quest objective advance that quest. Combat, skilling and crafting objectives can have different requirements and daily contribution caps. Check your individual recorded progress and expand Objective breakdown when an activity does not seem to count.'},
   {id:'activity',title:'Guild Activity rewards',body:'Completing a shared quest increases the Guild Activity meter; its milestones grant passive Guild bonuses. This is separate from personal Guild Token claims and project completion rewards. The board shows the Activity earned for each completed quest.'},
  ],
 },
 'PvE':{
  title:'The Raid Gate',body:'Join asynchronous Guild Boss encounters, contribute with your battle party and claim eligible milestone rewards.',
  topics:[
   {id:'attempts',title:'How boss attempts work',body:'Choose an active Weekly Boss or Event Boss and review your battle party before starting. An attempt lasts three minutes and is resolved by the server. You do not need to remain online with other members. The card shows your remaining attempts, Guild boss HP, your contribution and the encounter deadline.'},
   {id:'roles',title:'Boss roles and encounter rotation',body:'Guild Bosses can emphasize different roles. A role-focused encounter may count 65% general combat contribution and 35% role-focused performance, so Tank, Damage and Support strengths matter. The current encounter card explains its exact mechanic and difficulty bracket. The roster is fixed for an encounter; members who joined afterward can participate in the next one.'},
   {id:'claims',title:'Milestones and claims',body:'As Guild progress reaches milestones, shared rewards such as Gold, materials and Guild XP are added to the Guild Bank once. Eligible contributors may also receive personal or event rewards. Check the required contribution and claim buttons: you can still qualify while an encounter remains open even if the boss is defeated, and unclaimed rewards have their own deadlines.'},
  ],
 },
 'Hall/Shop':{
  title:'Guild Token Shop',body:'Earn Guild Tokens through participation and unlock permanent account rewards.',
  topics:[
   {id:'earn',title:'Earning Guild Tokens',body:'Daily participation and Activity claims are available on Guild Home. Additional weekly rewards can come from attendance, Guild Project contribution and Guild Bosses. Ordinary token earnings count toward the weekly cap shown next to your balance. Some event milestone bonuses are outside that cap.'},
   {id:'unlocks',title:'Levels, quality and reward ownership',body:'Browse categories and inspect a reward to see its price, Guild Level and unlock conditions. Guild Hall Construction can improve which shop offers are available; it does not give away cosmetics for free. Purchased rewards are permanent account unlocks rather than character-only items.'},
   {id:'changing',title:'Changing Guilds and claiming rewards',body:'Your Guild Token balance and previously purchased account rewards remain yours when changing Guilds. Claim ready rewards before their individual eligibility windows close, and check the weekly cap before claiming ordinary rewards. Guild Tokens are separate from Quartermaster Guild Marks.'},
  ],
 },
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
