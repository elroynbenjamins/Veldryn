import { autoStartVoteThreshold, buildGuildWeeklyProjectBoard, chooseVoteWinner, guildProjectBoardWindow } from './guild-project-board';

export interface GuildProjectWorkerGuild { guildId:string; guildName:string; guildLevel:number; activeMemberSnapshot:number; }
export interface GuildProjectWorkerRepo {
  listEligibleGuildsForBoard(cycleKey:string):Promise<GuildProjectWorkerGuild[]>;
  replaceWeeklyBoard(input:{guild:GuildProjectWorkerGuild;cycleKey:string;startsAt:string;endsAt:string;candidates:ReturnType<typeof buildGuildWeeklyProjectBoard>}):Promise<void>;
  listOpenBoardsForAutoStart(nowMs:number):Promise<{guildId:string;cycleKey:string;activeMemberSnapshot:number;openedAtMs:number;candidates:{templateId:string;votes:number}[]}[]>;
  startCandidateByTemplate(guildId:string,cycleKey:string,templateId:string,reason:'officer'|'auto_vote'):Promise<'started'|'already_active'|'not_available'>;
  expireDueProjects(nowMs:number):Promise<number>;
  finalizeCompletedProjects(nowMs:number):Promise<number>;
  expireBoardCandidates(nowMs:number):Promise<number>;
  resolveExpiredDecreeWindows(nowMs:number):Promise<number>;
  endExpiredDecrees(nowMs:number):Promise<number>;
  purgeExpiredFeed(nowMs:number):Promise<number>;
}

export async function generateGuildWeeklyBoards(repo:GuildProjectWorkerRepo,now=new Date()):Promise<{cycleKey:string;guilds:number}>{
  const window=guildProjectBoardWindow(now);
  const guilds=await repo.listEligibleGuildsForBoard(window.cycleKey);
  let count=0;
  for(const guild of guilds){
    const candidates=buildGuildWeeklyProjectBoard(guild.guildId,guild.guildLevel,now);
    if(candidates.length===0)continue;
    await repo.replaceWeeklyBoard({guild,cycleKey:window.cycleKey,startsAt:window.startsAt,endsAt:window.endsAt,candidates});
    count++;
  }
  return {cycleKey:window.cycleKey,guilds:count};
}

/**
 * Members can recommend candidates immediately. Authorized roles may start one at any time.
 * If no authorized member acts for 36h, a sufficiently supported top-voted project can auto-start.
 */
export async function autoStartGuildProjectBoards(repo:GuildProjectWorkerRepo,nowMs=Date.now()):Promise<number>{
  const boards=await repo.listOpenBoardsForAutoStart(nowMs);
  let started=0;
  for(const board of boards){
    if(nowMs-board.openedAtMs<36*3_600_000)continue;
    const threshold=autoStartVoteThreshold(board.activeMemberSnapshot);
    const topVotes=Math.max(0,...board.candidates.map(c=>c.votes));
    if(topVotes<threshold)continue;
    const winner=chooseVoteWinner(board.candidates,board.guildId,board.cycleKey);
    if(!winner)continue;
    if(await repo.startCandidateByTemplate(board.guildId,board.cycleKey,winner,'auto_vote')==='started')started++;
  }
  return started;
}

export async function runGuildProjectMaintenance(repo:GuildProjectWorkerRepo,nowMs=Date.now()){
  const [expiredProjects,finalizedProjects,expiredCandidates,resolvedDecrees,endedDecrees,purgedFeed]=await Promise.all([
    repo.expireDueProjects(nowMs),repo.finalizeCompletedProjects(nowMs),repo.expireBoardCandidates(nowMs),
    repo.resolveExpiredDecreeWindows(nowMs),repo.endExpiredDecrees(nowMs),repo.purgeExpiredFeed(nowMs),
  ]);
  const autoStarted=await autoStartGuildProjectBoards(repo,nowMs);
  return {expiredProjects,finalizedProjects,expiredCandidates,resolvedDecrees,endedDecrees,purgedFeed,autoStarted};
}
