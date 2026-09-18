import {JOURNAL_ACHIEVEMENTS_V42,JOURNAL_TITLES_V42,applyJournalSnapshot,journalCompletionPercent,newJournalState,selectJournalTitle} from '../src/core/adventurers-journal-v42';
import {applyProfileExtensionEdit,canPublishWorldMilestone,canViewExtendedProfile,newProfileExtensionState} from '../src/core/profile-showcases-v43';
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)throw new Error(`${message}: expected ${String(expected)}, got ${String(actual)}`)}
function ok(value:unknown,message:string){if(!value)throw new Error(message)}
equal(JOURNAL_ACHIEVEMENTS_V42.length,40,'V42 achievement ladder count');
equal(JOURNAL_TITLES_V42.length,8,'V42 Grandmaster title count');
const journal=newJournalState('a');
const metrics=Object.fromEntries([...new Set(JOURNAL_ACHIEVEMENTS_V42.map(row=>row.metricKey))].map(key=>[key,Number.MAX_SAFE_INTEGER]));
const unlocked=applyJournalSnapshot(journal,{metrics},100);
equal(unlocked.newlyUnlockedAchievementIds.length,40,'All 40 achievements unlock from trusted complete snapshot');
equal(unlocked.newlyUnlockedTitleIds.length,8,'All 8 Grandmaster titles unlock');
equal(journalCompletionPercent(journal,{metrics}),100,'Journal completion reaches 100%');
selectJournalTitle(journal,'c1','the_unbroken');equal(journal.selectedTitleByCharacter.c1,'the_unbroken','Title selection is per character');

const profile=newProfileExtensionState('a',0);
const ownership={characterIds:['c1'],skillIds:['mining'],backgroundIds:['bg'],borderIds:['border'],petIds:['pet'],companionIds:['comp'],unlockedAchievementIds:['combatant_grandmaster'],personalRecordIds:['highest_single_hit'],ownedCollectionRefs:[{kind:'item' as const,id:'OATHSTONE_HELM'}]};
applyProfileExtensionEdit(profile,{visibility:'guild',selectedCharacterId:'c1',bio:'  Hello   Veldryn  ',favoriteSkillId:'mining',achievementShowcaseIds:['combatant_grandmaster'],recordShowcaseIds:['highest_single_hit'],collectionShowcase:[{kind:'item',id:'OATHSTONE_HELM'}]},ownership,10);
ok(canViewExtendedProfile(profile,{viewerAccountId:'b',sameGuild:true}),'Guild-only profile visible to same guild');
ok(!canViewExtendedProfile(profile,{viewerAccountId:'b',sameGuild:false}),'Guild-only profile hidden outside guild');
ok(!canPublishWorldMilestone(profile),'Guild-only profile does not publish world-feed cards');
equal(profile.bio,'Hello Veldryn','Bio normalization');
console.log('PASS: reconciled V42 Journal and V43 profile/showcase privacy rules');
