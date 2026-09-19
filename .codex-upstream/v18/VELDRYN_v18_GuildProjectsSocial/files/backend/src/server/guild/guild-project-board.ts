import { GUILD_WEEKLY_PROJECT_POOL, type GuildProjectDefinition, type GuildProjectFocus } from './guild-projects';

export interface GuildProjectBoardCandidate {
  cycleKey: string;
  templateId: string;
  focus: Exclude<GuildProjectFocus,'development'>;
  definition: GuildProjectDefinition;
}

function mondayUtcStart(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const daysSinceMonday = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceMonday);
  return d;
}

export function guildProjectWeekKey(date = new Date()): string {
  return mondayUtcStart(date).toISOString().slice(0, 10);
}

function stableHash(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick(
  guildId: string,
  cycleKey: string,
  focus: Exclude<GuildProjectFocus,'development'>,
  guildLevel: number,
): GuildProjectDefinition {
  const options = GUILD_WEEKLY_PROJECT_POOL.filter((d) => d.focus === focus && d.minGuildLevel <= guildLevel);
  if (options.length === 0) throw new Error(`no_guild_project_candidate:${focus}`);
  return options[stableHash(`${guildId}:${cycleKey}:${focus}`) % options.length];
}

export function buildGuildWeeklyProjectBoard(guildId: string, guildLevel: number, date = new Date()): GuildProjectBoardCandidate[] {
  if (guildLevel < 10) return [];
  const cycleKey = guildProjectWeekKey(date);
  const focuses = ['combat','skilling','mixed'] as const;
  return focuses.map((focus) => {
    const definition = pick(guildId, cycleKey, focus, guildLevel);
    return { cycleKey, templateId: definition.id, focus, definition };
  });
}

export function guildProjectBoardWindow(date = new Date()): { cycleKey:string; startsAt:string; endsAt:string } {
  const start = mondayUtcStart(date);
  const end = new Date(start.getTime() + 7 * 86_400_000);
  return { cycleKey:start.toISOString().slice(0,10), startsAt:start.toISOString(), endsAt:end.toISOString() };
}

export function autoStartVoteThreshold(activeMemberSnapshot: number): number {
  return Math.min(6, Math.max(2, Math.ceil(Math.max(1, activeMemberSnapshot) * 0.10)));
}

export function chooseVoteWinner(
  candidates: readonly { templateId:string; votes:number }[],
  guildId: string,
  cycleKey: string,
): string | undefined {
  if (candidates.length === 0) return undefined;
  const maxVotes = Math.max(...candidates.map((c) => Math.max(0,c.votes)));
  const tied = candidates.filter((c) => c.votes === maxVotes).sort((a,b) => a.templateId.localeCompare(b.templateId));
  if (tied.length === 1) return tied[0].templateId;
  return tied[stableHash(`${guildId}:${cycleKey}:vote-tie`) % tied.length]?.templateId;
}
