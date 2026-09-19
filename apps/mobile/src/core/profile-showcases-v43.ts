export type ExtendedProfileVisibility='public'|'guild'|'private';
export type ProfileCollectionKind='item'|'pet'|'companion'|'skin'|'background'|'border';
export interface ProfileCollectionRef{kind:ProfileCollectionKind;id:string}
export interface ProfileExtensionState{schemaVersion:43;accountId:string;revision:number;visibility:ExtendedProfileVisibility;worldFeedOptOut:boolean;selectedCharacterId?:string;bio:string;favoriteSkillId?:string;backgroundId?:string;borderId?:string;activePetId?:string;favoriteCompanionId?:string;achievementShowcaseIds:string[];collectionShowcase:ProfileCollectionRef[];recordShowcaseIds:string[];updatedAtMs:number}
export interface ProfileOwnershipSnapshot{characterIds:string[];skillIds:string[];backgroundIds:string[];borderIds:string[];petIds:string[];companionIds:string[];unlockedAchievementIds:string[];personalRecordIds:string[];ownedCollectionRefs:ProfileCollectionRef[]}
export interface ProfileExtensionEdit{visibility?:ExtendedProfileVisibility;worldFeedOptOut?:boolean;selectedCharacterId?:string|null;bio?:string;favoriteSkillId?:string|null;backgroundId?:string|null;borderId?:string|null;activePetId?:string|null;favoriteCompanionId?:string|null;achievementShowcaseIds?:string[];collectionShowcase?:ProfileCollectionRef[];recordShowcaseIds?:string[]}
export interface ProfileViewerContext{viewerAccountId?:string;sameGuild?:boolean}
const MAX_SHOWCASE=3,MAX_BIO=160,key=(ref:ProfileCollectionRef)=>`${ref.kind}:${ref.id}`,unique=(xs:string[])=>[...new Set(xs)];
const cleanBio=(value:string)=>value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/\s+/g,' ').trim().slice(0,MAX_BIO);
export function newProfileExtensionState(accountId:string,nowMs:number):ProfileExtensionState{if(!accountId)throw new Error('account_required');return {schemaVersion:43,accountId,revision:0,visibility:'public',worldFeedOptOut:false,bio:'',achievementShowcaseIds:[],collectionShowcase:[],recordShowcaseIds:[],updatedAtMs:nowMs}}
export function canViewExtendedProfile(state:ProfileExtensionState,viewer:ProfileViewerContext={}){if(viewer.viewerAccountId===state.accountId)return true;if(state.visibility==='public')return true;if(state.visibility==='guild')return !!viewer.sameGuild;return false}
export function canPublishWorldMilestone(state:ProfileExtensionState){return state.visibility==='public'&&!state.worldFeedOptOut}
function has(list:string[],value?:string){return !value||list.includes(value)}
function assertOwned(state:ProfileExtensionState,ownership:ProfileOwnershipSnapshot){
 if(!has(ownership.characterIds,state.selectedCharacterId))throw new Error('character_not_owned');
 if(!has(ownership.skillIds,state.favoriteSkillId))throw new Error('skill_unavailable');
 if(!has(ownership.backgroundIds,state.backgroundId))throw new Error('background_not_owned');
 if(!has(ownership.borderIds,state.borderId))throw new Error('border_not_owned');
 if(!has(ownership.petIds,state.activePetId))throw new Error('pet_not_owned');
 if(!has(ownership.companionIds,state.favoriteCompanionId))throw new Error('companion_not_owned');
 if(state.achievementShowcaseIds.some(id=>!ownership.unlockedAchievementIds.includes(id)))throw new Error('achievement_locked');
 if(state.recordShowcaseIds.some(id=>!ownership.personalRecordIds.includes(id)))throw new Error('record_unavailable');
 const refs=new Set(ownership.ownedCollectionRefs.map(key));if(state.collectionShowcase.some(ref=>!refs.has(key(ref))))throw new Error('collection_not_owned');
}
export function applyProfileExtensionEdit(state:ProfileExtensionState,edit:ProfileExtensionEdit,ownership:ProfileOwnershipSnapshot,nowMs:number){
 if(edit.visibility!==undefined)state.visibility=edit.visibility;if(edit.worldFeedOptOut!==undefined)state.worldFeedOptOut=edit.worldFeedOptOut;
 if(edit.selectedCharacterId!==undefined)state.selectedCharacterId=edit.selectedCharacterId??undefined;if(edit.bio!==undefined)state.bio=cleanBio(edit.bio);
 if(edit.favoriteSkillId!==undefined)state.favoriteSkillId=edit.favoriteSkillId??undefined;if(edit.backgroundId!==undefined)state.backgroundId=edit.backgroundId??undefined;if(edit.borderId!==undefined)state.borderId=edit.borderId??undefined;
 if(edit.activePetId!==undefined)state.activePetId=edit.activePetId??undefined;if(edit.favoriteCompanionId!==undefined)state.favoriteCompanionId=edit.favoriteCompanionId??undefined;
 if(edit.achievementShowcaseIds!==undefined){const rows=unique(edit.achievementShowcaseIds);if(rows.length>MAX_SHOWCASE)throw new Error('too_many_achievements');state.achievementShowcaseIds=rows}
 if(edit.recordShowcaseIds!==undefined){const rows=unique(edit.recordShowcaseIds);if(rows.length>MAX_SHOWCASE)throw new Error('too_many_records');state.recordShowcaseIds=rows}
 if(edit.collectionShowcase!==undefined){const seen=new Set<string>(),rows:ProfileCollectionRef[]=[];for(const ref of edit.collectionShowcase){const k=key(ref);if(!seen.has(k)){seen.add(k);rows.push(ref)}}if(rows.length>MAX_SHOWCASE)throw new Error('too_many_collections');state.collectionShowcase=rows}
 assertOwned(state,ownership);state.updatedAtMs=nowMs;return state;
}
