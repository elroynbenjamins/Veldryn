export type GuildTutorialDestination='Home'|'Chat'|'Muster'|'Quests'|'Projects'|'PvE'|'Hall';
export function guildTutorialContext(destination:GuildTutorialDestination,role:'member'|'officer'|'leader'){
 if(destination==='Home')return role==='member'?'You can read the notice. Leaders and officers manage guild announcements.':'Your role can manage announcements. Start by checking the current guild priority.';
 if(destination==='Chat')return 'Reading is enough for this step. Introduce yourself only when you want to.';
 if(destination==='Muster')return 'Starting at zero is normal. Everyday combat and skilling build your contribution.';
 if(destination==='Quests')return 'Pick a goal that fits your level. You do not need to finish a quest to continue this guide.';
 if(destination==='Projects')return role==='member'?'As a member, help with active projects. Leadership manages project selection and upgrades.':'Coordinate project choices with your guild. Check costs before committing shared resources.';
 if(destination==='PvE')return 'Joined recently? If the current boss excludes you, wait for the next encounter. No claim is required now.';
 return role==='member'?'You benefit from unlocked facilities without managing them. Guild Token purchases can wait until you earn enough.':'Review facilities and available funds before upgrading. Purchases are not part of this guide.';
}
export const GUILD_TUTORIAL_STEPS:readonly {destination:GuildTutorialDestination;title:string;body:string;tip:string;action:string}[]=[
 {destination:'Home',title:'Welcome to your guild',body:"Read the Notice Board for your guild’s current plans. If it is empty, check Guild Chat for priorities.",tip:'This tour shows you around. You can explore each section before continuing, or pause and resume later.',action:'Show Guild Home'},
 {destination:'Chat',title:'Meet your guildmates',body:"Guild Chat is for guildmates. Open Guild Home → Members to see the roster. Party Chat is separate.",tip:'Guild Chat stays available even if Parties are locked. You do not need to send a message.',action:'Open Guild Chat'},
 {destination:'Muster',title:'Make your everyday play count',body:"In Activities → Muster, see your daily contribution and weekly Rally progress.",tip:'You do not need to play at the same time as everyone else. Missing a day does not erase your qualifying days for the week.',action:'Show daily Muster'},
 {destination:'Quests',title:'Choose a shared goal',body:"Open Activities → Quests to see shared weekly goals and their remaining time.",tip:'Look at the objective and time remaining before deciding what to do. You do not have to complete every goal yourself.',action:'Show Guild Quests'},
 {destination:'Projects',title:'Help build something together',body:"Open Activities → Projects to see shared progress and contribution requirements.",tip:'Some actions need a leadership role. Review requirements before donating resources, and check completed projects for available rewards.',action:'Show Guild Projects'},
 {destination:'PvE',title:'Take part in guild bosses',body:"Open PvE to choose Weekly Boss or Event Boss, then check eligibility and reward deadlines.",tip:'New members may not be on the current encounter’s fixed roster. You can join the next encounter. Claim eligible milestone rewards before their deadline.',action:'Show guild bosses'},
 {destination:'Hall',title:'You are ready to get involved',body:"The Hall shows facilities and lasting bonuses. Your first routine: read the notice, play a useful activity, then check progress.",tip:'Hall → Shop uses Guild Tokens. Guild Hall construction unlocks benefits and shop access, not free cosmetics; only active projects can receive Bank donations. Replay this guide from Guild Home.',action:'Explore the Guild Hall'},
];
export interface GuildTutorialProgress{step:number;status:'active'|'paused'|'complete'}
export function normalizeGuildTutorialProgress(value:unknown):GuildTutorialProgress{
 const row=value&&typeof value==='object'?value as Partial<GuildTutorialProgress>:{};
 return {step:typeof row.step==='number'&&Number.isInteger(row.step)?Math.max(0,Math.min(GUILD_TUTORIAL_STEPS.length-1,row.step)):0,status:row.status==='paused'||row.status==='complete'?row.status:'active'};
}
export function advanceGuildTutorial(progress:GuildTutorialProgress):GuildTutorialProgress{
 const current=normalizeGuildTutorialProgress(progress);
 return current.step===GUILD_TUTORIAL_STEPS.length-1?{...current,status:'complete'}:{step:current.step+1,status:'active'};
}
/** Account-scoped presentation state, separate from gameplay and guild membership. */
export function createGuildTutorialStore(storage:{getItem(key:string):Promise<string|null>;setItem(key:string,value:string):Promise<void>}){
 const memory=new Map<string,GuildTutorialProgress>(),writes=new Map<string,Promise<void>>();
 const key=(accountId:string)=>'veldryn.guild-tutorial.v1:'+accountId;
 async function load(accountId:string){
  if(!accountId)return normalizeGuildTutorialProgress(null);
  if(memory.has(accountId))return {...memory.get(accountId)!};
  let value:unknown;try{const raw=await storage.getItem(key(accountId));value=raw?JSON.parse(raw):null}catch{/* Keep the guide usable if preferences are unavailable. */}
  const next=memory.get(accountId)??normalizeGuildTutorialProgress(value);memory.set(accountId,next);return {...next};
 }
 function save(accountId:string,progress:GuildTutorialProgress){
  if(!accountId)return Promise.resolve();
  const next=normalizeGuildTutorialProgress(progress);memory.set(accountId,next);
  const task=(writes.get(accountId)??Promise.resolve()).then(async()=>{try{await storage.setItem(key(accountId),JSON.stringify(next))}catch{/* Retry with the latest progress on the next action. */}});
  writes.set(accountId,task);
  return task.finally(()=>{if(writes.get(accountId)===task)writes.delete(accountId)});
 }
 return {load,save};
}
