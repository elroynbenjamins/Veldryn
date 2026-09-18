import {QUESTS} from '../content/quests';
import {GameState} from './types';
import {CLASSES} from '../content/classes';
import {characterSkinSetsFor} from '../content/character-skin-sets';
import {discoverCharacterSkins,equipmentSetSkinId} from './character-skins';
import {isSupportedLanguage} from '../i18n/languages';
import {normalizeQuickNavDestinations} from './quick-navigation';
import {WORLD_ZONES} from '../content/world-map';
import {ITEMS} from '../content/items';
import {migrateLegacyCombatCompanionAccount,reconcileCombatCompanionUnlocks} from './combat-companions';
import {normalizeCompanionRuntimeSave} from './companion-save';
import {normalizeMonsterMastery} from './monster-mastery';
import {normalizeClassSkills,normalizeTrainingFocus,normalizeClassDrills} from './class-skills';
import {normalizeFaith} from './faith';
import {normalizeAlchemyBatch} from './alchemy';
import {normalizeCollectionPreferences} from './collection-preferences';
import {normalizeCharacterLoadouts} from './character-loadouts';
import {normalizeOnboardingGuideState} from './onboarding';
import {normalizeGuildBannerId,normalizeGuildFrameId,normalizeGuildMotto,normalizeGuildNameplateId} from './guild-customization';

export function normalizeSave(input:any):GameState{
  if(!input || ![4,5,6,7,8,9,10,11].includes(input.version)) throw new Error('Unsupported VELDRYN save version');
  const existing=new Map<string,any>((input.quests||[]).map((q:any)=>[q.questId,q]));
  let priorClaimed=true;
  const quests=QUESTS.map((def,index)=>{
    const old=existing.get(def.id);
    if(old){priorClaimed=old.status==='claimed';return old;}
    const status=index===0?'active':priorClaimed?'active':'locked';
    priorClaimed=false;
    return {questId:def.id,status,progress:0};
  });
  const classDef=input.character?CLASSES.find(c=>c.id===input.character.classId):undefined;
  const legacyCosmeticPets=[...new Set([
    ...(Array.isArray(input.account?.unlockedCosmeticPetIds)?input.account.unlockedCosmeticPetIds:[]),
    ...(Array.isArray(input.character?.ownedPetIds)?input.character.ownedPetIds:[]),
  ].filter((id:unknown)=>typeof id==='string'))];
  const legacyOwnedBoostIds=[...new Set([
    ...(Array.isArray(input.account?.ownedBoostIds)?input.account.ownedBoostIds:[]),
    ...(Array.isArray(input.character?.ownedBoostIds)?input.character.ownedBoostIds:[]),
  ].filter((id:unknown)=>typeof id==='string'))];
  const legacyPetOwnership= input.version===6 && !Array.isArray(input.otherCharacters)
    && ((input.character?.ownedPetIds?.length??0)>0 || (input.character?.ownedBoostIds?.length??0)>0);
  const character=input.character?(()=>{
    const {customization:_legacyCustomization,profileAppearanceMode:_legacyProfileMode,profileEquipmentSnapshot:_legacyEquipmentSnapshot,...savedCharacter}=input.character;
    const classSkinSets=characterSkinSetsFor(input.character.classId);
    const validSkinIds=new Set(['starting',...classSkinSets.map(set=>equipmentSetSkinId(set.id))]);
    const eventSkinIds=new Set(Array.isArray(input.account?.unlockedEventSkinIds)?input.account.unlockedEventSkinIds.filter((id:unknown)=>typeof id==='string'):[]);
    const earnedEventSetIds=classSkinSets.filter(set=>set.unlockEventSkinId&&eventSkinIds.has(set.unlockEventSkinId)).map(set=>equipmentSetSkinId(set.id));
    const unlockedSkinIds=['starting',...(Array.isArray(input.character.unlockedSkinIds)?input.character.unlockedSkinIds.filter((id:unknown)=>typeof id==='string'&&validSkinIds.has(id)):[]),...earnedEventSetIds];
    const ownedPetIds=Array.isArray(input.character.ownedPetIds)?[...new Set([...input.character.ownedPetIds.filter((id:unknown)=>typeof id==='string'),...legacyCosmeticPets])]:[...new Set(legacyCosmeticPets)];
    const gearIds=new Set(ITEMS.filter(item=>item.type==='gear').map(item=>item.id)),gemIds=new Set(ITEMS.filter(item=>item.type==='gem').map(item=>item.id));
    const gearEnhancements=Object.fromEntries(Object.entries(input.character.gearEnhancements??{}).filter(([id,value])=>gearIds.has(id)&&value&&typeof value==='object').map(([id,value]:[string,any])=>[id,{rank:Math.max(0,Math.min(10,Math.floor(Number(value.rank)||0))),failures:Math.max(0,Math.floor(Number(value.failures)||0)),gemIds:Array.isArray(value.gemIds)?value.gemIds.filter((gemId:unknown)=>typeof gemId==='string'&&gemIds.has(gemId)).slice(0,3):[]}])) as any;
    return {
    ...savedCharacter,
    monsterMasteryPoints:normalizeMonsterMastery(savedCharacter.monsterMasteryPoints),
    masteryMaterialRemainders:Object.fromEntries(Object.entries(savedCharacter.masteryMaterialRemainders??{}).filter(([id,v])=>ITEMS.some(i=>i.id===id&&i.type==='material')&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<1)),
    classSkills:normalizeClassSkills(savedCharacter.classId,savedCharacter.classSkills),
    faith:normalizeFaith(savedCharacter.faith),
    trainingFocus:normalizeTrainingFocus(savedCharacter.trainingFocus),
    classTraining:input.activity?undefined:normalizeClassDrills(savedCharacter.classTraining),
    classSkillRemainders:Object.fromEntries(Object.entries(savedCharacter.classSkillRemainders??{}).filter(([id,v])=>normalizeClassSkills(savedCharacter.classId,[]).some(s=>s.skillId===id)&&typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<1)),
    bodyPresentation:input.character.bodyPresentation==='female'?'female':'male',
    unlockedEventSkinIds:[...new Set([
      ...(Array.isArray(input.character.unlockedEventSkinIds)?input.character.unlockedEventSkinIds:[]),
      ...eventSkinIds,
    ].filter((id:unknown)=>typeof id==='string'))],
    craftedNoviceItemIds:Array.isArray(input.character.craftedNoviceItemIds)?[...new Set(input.character.craftedNoviceItemIds.filter((id:unknown)=>typeof id==='string'))]:[],
    ownedPetIds:legacyPetOwnership?undefined:ownedPetIds,
    ownedBoostIds:legacyPetOwnership?undefined:Array.isArray(input.character.ownedBoostIds)?[...new Set(input.character.ownedBoostIds.filter((id:unknown)=>typeof id==='string'))]:[],
    gearEnhancements,
    currentHp:Math.max(1,Number(input.character.currentHp ?? input.character.hp ?? classDef?.hp ?? 100)),
    equippedFoodId:input.character.equippedFoodId
    ,profileTitle:typeof input.character.profileTitle==='string'&&input.character.profileTitle.trim()?input.character.profileTitle.trim():'New Adventurer'
    ,profileBackgroundId:typeof input.character.profileBackgroundId==='string'&&input.character.profileBackgroundId.trim()?input.character.profileBackgroundId:'asterfall-night'
    ,profileBorderId:typeof input.character.profileBorderId==='string'&&input.character.profileBorderId.trim()?input.character.profileBorderId:undefined
    ,selectedCosmeticPetId:typeof input.character.selectedCosmeticPetId==='string'&&input.character.selectedCosmeticPetId.trim()?input.character.selectedCosmeticPetId:undefined
    ,unlockedSkinIds:[...new Set(unlockedSkinIds)]
    ,selectedSkinId:classSkinSets.some(set=>set.appearanceId&&equipmentSetSkinId(set.id)===input.character.selectedSkinId)&&unlockedSkinIds.includes(input.character.selectedSkinId)?input.character.selectedSkinId:'starting'
    ,savedLoadouts:normalizeCharacterLoadouts(input.character.savedLoadouts,input.character.classId)
  };})():null;
  const seasonIds=['spring','summer','autumn','winter'],weatherIds=['clear','rain','mist','storm','bloomwind','heatwave','harvest_wind','snow','frost'];
  const rawEnvironment=input.activity?.environment;
  if(input.activity?.brew!==undefined && input.activity?.kind!=='alchemy')throw new Error('Invalid orphaned alchemy reservation.');
  if(input.activity && input.activity.progressFraction!==undefined && (!Number.isFinite(input.activity.progressFraction)||input.activity.progressFraction<0||input.activity.progressFraction>=1))throw new Error('Invalid activity progress.');
  if(input.activity && (!Number.isSafeInteger(input.activity.lastClaimAtMs)||input.activity.lastClaimAtMs<input.activity.startedAtMs))throw new Error('Invalid activity timeline.');
  const environment=rawEnvironment&&seasonIds.includes(rawEnvironment.seasonId)&&weatherIds.includes(rawEnvironment.weatherId)&&typeof rawEnvironment.zoneId==='string'&&Number.isFinite(rawEnvironment.capturedAtMs)?{seasonId:rawEnvironment.seasonId,weatherId:rawEnvironment.weatherId,zoneId:rawEnvironment.zoneId,capturedAtMs:rawEnvironment.capturedAtMs}:undefined;
  const activity=input.activity?{...input.activity,environment,brew:input.activity.kind==='alchemy'?normalizeAlchemyBatch(input.activity.brew,input.activity.targetId):undefined}:null;
  const savedRegionId=typeof input.currentRegionId==='string'?input.currentRegionId:environment?.zoneId;
  const currentRegionId=WORLD_ZONES.some(zone=>zone.id===savedRegionId&&(character?.level??1)>=zone.minLevel)?savedRegionId:'GREENFIELDS';
  const rawLiveEvent=input.account?.liveEvent;
  const skillIds=['mining','woodcutting','fishing','smithing','cooking','herbalism','alchemy','hunting','exploration','tailoring','enchanting','faith'];
  const skills=skillIds.map(skillId=>{const raw=(input.skills??[]).find((entry:any)=>entry?.skillId===skillId);const xp=Number.isFinite(Number(raw?.xp))?Math.max(0,Math.floor(Number(raw.xp))):0;return {skillId,xp,level:Math.max(1,Math.min(100,Number.isFinite(Number(raw?.level))?Math.floor(Number(raw.level)):1))};});
  const liveEvent=rawLiveEvent&&typeof rawLiveEvent.eventId==='string'&&typeof rawLiveEvent.enabled==='boolean'&&Number.isFinite(rawLiveEvent.startsAtMs)&&Number.isFinite(rawLiveEvent.endsAtMs)&&rawLiveEvent.endsAtMs>rawLiveEvent.startsAtMs?{eventId:rawLiveEvent.eventId,enabled:rawLiveEvent.enabled,startsAtMs:Number(rawLiveEvent.startsAtMs),endsAtMs:Number(rawLiveEvent.endsAtMs)}:undefined;
  const stringList=(value:unknown,limit=160)=>Array.isArray(value)?[...new Set(value.filter((id:unknown)=>typeof id==='string'))].slice(-limit):[];
  const numberRecord=(value:unknown,limit=240)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([id,amount])=>typeof id==='string'&&Number.isFinite(Number(amount))).slice(-limit).map(([id,amount])=>[id,Math.max(0,Math.floor(Number(amount)))]));
  const stringRecord=(value:unknown,limit=24)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([id,entry])=>typeof id==='string'&&typeof entry==='string').slice(-limit));
  const regionalProgressById=Object.fromEntries(Object.entries(input.regionalProgressById&&typeof input.regionalProgressById==='object'?input.regionalProgressById:{}).filter(([id,entry])=>typeof id==='string'&&entry&&typeof entry==='object').slice(-16).map(([id,entry])=>[id,Object.fromEntries(Object.entries(entry as Record<string,unknown>).filter(([key,value])=>['storyCompleted','sideQuestsCompleted','echoesCompleted','dungeonsCompleted','collectionEntries','bossMasteryTier'].includes(key)&&Number.isFinite(Number(value))).map(([key,value])=>[key,Math.max(0,Math.floor(Number(value)))]))]));
  const eventProgressById=numberRecord(input.account?.eventProgressById,12);
  const eventCurrencyBalanceById=numberRecord(input.account?.eventCurrencyBalanceById??eventProgressById,12);
  const eventActivityById=Object.fromEntries(Object.entries(input.account?.eventActivityById??{}).filter(([,entry])=>entry&&typeof entry==='object').slice(-12).map(([id,entry])=>[id,numberRecord(entry,4)]));
  const eventPeriodActivityById=Object.fromEntries(Object.entries(input.account?.eventPeriodActivityById??{}).filter(([,entry])=>entry&&typeof entry==='object').slice(-90).map(([id,entry])=>[id,numberRecord(entry,4)]));
  const normalized={
    ...input,
    version:6,
    character,
    activity,
    skills,
    currentRegionId,
    regionalProgressById,
    inventory:{stacks:Array.isArray(input.inventory?.stacks)?input.inventory.stacks:[],capacity:Number(input.inventory?.capacity ?? 30)},
    bank:{stacks:Array.isArray(input.bank?.stacks)?input.bank.stacks:[],capacity:Number(input.bank?.capacity ?? 120)},
    overflow:{stacks:Array.isArray(input.overflow?.stacks)?input.overflow.stacks:[],expiresAtMs:input.overflow?.expiresAtMs ?? null},
    quests,
    unlockedMonsterIds:Array.isArray(input.unlockedMonsterIds)?input.unlockedMonsterIds:['MOSS_RAT'],
    defeatedBossIds:Array.isArray(input.defeatedBossIds)?input.defeatedBossIds:[],
    account:{createdCharacterCount:Math.max(1,Number(input.account?.createdCharacterCount??1)),guildMember:!!input.account?.guildMember,patronTier:['bloom','crown'].includes(input.account?.patronTier)?input.account.patronTier:'none',guildBannerId:normalizeGuildBannerId(input.account?.guildBannerId),guildProfileFrameId:normalizeGuildFrameId(input.account?.guildProfileFrameId),guildNameplateId:normalizeGuildNameplateId(input.account?.guildNameplateId),guildMotto:normalizeGuildMotto(input.account?.guildMotto),guildContribution:Math.max(0,Number(input.account?.guildContribution??0)),guildProjectProgress:Math.max(0,Number(input.account?.guildProjectProgress??0)),guildBossHp:Math.max(0,Number(input.account?.guildBossHp??100000)),guildProjectClaimed:!!input.account?.guildProjectClaimed,guildJoinPolicy:['open','apply','invite'].includes(input.account?.guildJoinPolicy)?input.account.guildJoinPolicy:'open',guildMinimumLevel:Math.max(1,Number(input.account?.guildMinimumLevel??10)),guildApplicationStatus:['pending','accepted','declined'].includes(input.account?.guildApplicationStatus)?input.account.guildApplicationStatus:'none',seasonalContractClaimIds:stringList(input.account?.seasonalContractClaimIds,120),liveEvent,eventProgressById,eventCurrencyBalanceById,eventPrestigeBalanceById:numberRecord(input.account?.eventPrestigeBalanceById,12),eventRepeatCacheClaimsById:numberRecord(input.account?.eventRepeatCacheClaimsById,12),eventActivityById,eventPeriodActivityById,eventAcceptedContractIds:stringList(input.account?.eventAcceptedContractIds,240),eventContractBaselines:numberRecord(input.account?.eventContractBaselines,240),eventObjectiveClaimIds:stringList(input.account?.eventObjectiveClaimIds,240),eventWeeklyClaimIds:stringList(input.account?.eventWeeklyClaimIds,160),eventDailyGiftClaimIds:stringList(input.account?.eventDailyGiftClaimIds,180),eventCommunityClaimIds:stringList(input.account?.eventCommunityClaimIds,80),eventDiscoveryCounts:numberRecord(input.account?.eventDiscoveryCounts,120),eventDiscoveryClaimIds:stringList(input.account?.eventDiscoveryClaimIds,120),eventShopPurchaseCounts:numberRecord(input.account?.eventShopPurchaseCounts),eventChoiceById:stringRecord(input.account?.eventChoiceById),eventContributionById:numberRecord(input.account?.eventContributionById,12),eventRewardClaimIds:stringList(input.account?.eventRewardClaimIds),unlockedEventSkinIds:legacyPetOwnership?[]:stringList(input.account?.unlockedEventSkinIds),unlockedCosmeticPetIds:legacyCosmeticPets,ownedBoostIds:legacyOwnedBoostIds,unlockedProfileBackgroundIds:stringList(input.account?.unlockedProfileBackgroundIds),unlockedProfileBorderIds:stringList(input.account?.unlockedProfileBorderIds),unlockedEmoteIds:stringList(input.account?.unlockedEmoteIds),unlockedTitleIds:stringList(input.account?.unlockedTitleIds)},
    settings:{
      language:isSupportedLanguage(input.settings?.language)?input.settings.language:'en',
      numberMode:input.settings?.numberMode||'abbreviated',
      reduceMotion:!!input.settings?.reduceMotion,
      textScale:input.settings?.textScale||1,
      autoEatThresholdPct:Number(input.settings?.autoEatThresholdPct ?? 40),
      stopCombatWhenOutOfFood:input.settings?.stopCombatWhenOutOfFood!==false,
      autoJoinWorldChat:input.settings?.autoJoinWorldChat!==false,
      defaultWorldChat:([1,2,3,4] as number[]).includes(Number(input.settings?.defaultWorldChat))?Number(input.settings.defaultWorldChat):1,
      quickNavDestinations:normalizeQuickNavDestinations(input.settings?.quickNavDestinations),
    }
  } as GameState;
  normalized.account={...normalized.account,...migrateLegacyCombatCompanionAccount(input),...normalizeCompanionRuntimeSave(input.account)} as GameState['account'];
  normalized.account.collectionPreferences=normalizeCollectionPreferences(input.account?.collectionPreferences);
  normalized.account.guideState=normalizeOnboardingGuideState(input.account?.guideState);
  normalized.account.arenaSquadCharacterIds=Array.isArray(input.account?.arenaSquadCharacterIds)
    ? [...new Set(input.account.arenaSquadCharacterIds.filter((id:unknown)=>typeof id==='string'))].slice(0,3) as string[]
    : undefined;
  if(input.otherCharacters!==undefined&&!Array.isArray(input.otherCharacters))throw new Error('Invalid account roster.');
  if(Array.isArray(input.otherCharacters)&&input.otherCharacters.length>4)throw new Error('Account roster exceeds the five-character limit.');
  const rosterIds=new Set<string>();
  const roster=Array.isArray(input.otherCharacters)?input.otherCharacters.filter((entry:any)=>entry?.character?.id).map((entry:any)=>{const id=String(entry.character.id);if(rosterIds.has(id))throw new Error('Duplicate account character.');rosterIds.add(id);return entry;}):[];
  if(character?.id&&rosterIds.has(character.id))throw new Error('Duplicate active account character.');
  normalized.otherCharacters=roster as GameState['otherCharacters'];
  normalized.account.unlockedCharacterSlots=Math.max(1,Math.min(5,Number(input.account?.unlockedCharacterSlots??1)));
  return discoverCharacterSkins(reconcileCombatCompanionUnlocks(normalized,normalized.createdAtMs));
}
