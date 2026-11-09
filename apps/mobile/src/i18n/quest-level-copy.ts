import {QUESTS} from '../content/quests';

type EightLanguages=readonly [string,string,string,string,string,string,string,string];
type StoryField='name'|'description'|'story';
type QuestCopy=Record<string,Record<StoryField,EightLanguages>>;

const liveQuest=new Map(QUESTS.map(quest=>[quest.id,quest] as const));

/** Re-point one reviewed row at the live number, and only when that number is
 * the single difference: any real copy change still falls through to the
 * source-match guard, which is what keeps stale prose from being served. */
function rebasedRow(row:EightLanguages,english:string):EightLanguages{
  const live=english.match(/\d+/)?.[0],stored=row[0].match(/\d+/)?.[0];
  if(!live||!stored||live===stored)return row;
  if(row[0].replace(/\d+/,live)!==english)return row;
  return row.map(text=>text.replace(/\d+/,live)) as unknown as EightLanguages;
}

/**
 * Quest level requirements are rebased onto the current combat curve when
 * QUESTS is built (see rebasedCombatLevelFromLegacyLevel), which rewrites the
 * number inside the English description. Reviewed translations are stored with
 * the number they were written against, so without this pass row[0] no longer
 * matches the live English text: localizedQuestStoryText drops all eight
 * languages back to English, and still shows a requirement the quest does not
 * enforce.
 */
export function withRebasedLevels<T extends QuestCopy>(copy:T):T{
  const synced:QuestCopy={};
  for(const [id,fields] of Object.entries(copy as QuestCopy)){
    const quest=liveQuest.get(id);
    const next={} as Record<StoryField,EightLanguages>;
    for(const field of Object.keys(fields) as StoryField[]){
      next[field]=quest?rebasedRow(fields[field],quest[field]):fields[field];
    }
    synced[id]=next;
  }
  return synced as T;
}
