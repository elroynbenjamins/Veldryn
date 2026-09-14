import {normalizeAlchemyBatch,normalizePreparation} from './alchemy';
import {normalizeClassSkills,normalizeTrainingFocus} from './class-skills';
import {normalizeClassTrainingSnapshot} from './class-skill-snapshot';
import {QUESTS,MAIN_QUESTS} from '../content/quests';
import {GameState} from './types';
import {CLASSES} from '../content/classes';
import {characterSkinSetsFor} from '../content/character-skin-sets';
import {discoverCharacterSkins,equipmentSetSkinId} from './character-skins';
import {isSupportedLanguage} from '../i18n/languages';
import {normalizeQuickNavDestinations} from './quick-navigation';
import {WORLD_ZONES} from '../content/world-map';
import {ITEMS} from '../content/items';
import {ACCOUNT_SKILL_IDS,accountCharacters,recordAccountProgress,activeCharacterProgress} from './account-roster';
import {BASE_PERMANENT_MULTIPLIERS,PermanentMultipliers} from './bonus-types';
import {levelFromXp} from './progression';
import {COLLECTIBLES} from '../content/collectibles';
import {normalizeFaithPractice} from './faith';
import {faithLevel,normalizeCharacterFaith} from './faith-effects';
import {normalizeProgressLedger} from './quest-progress';
import {normalizeEventRecipeSlots} from './event-equipment';
import {legacyEquippedCombatCompanionId,migrateLegacyCombatCompanionAccount,sanitizeCombatCompanionState} from './combat-companions';

export function normalizeSave(input:any):GameState{
  if(!input || ![4,5,6,7,8,9,10,11,12,13].includes(input.version)) throw new Error('Unsupported VELDRYN save version');
  if(input.character&&!CLASSES.some(entry=>entry.id===input.character.classId))throw new Error('Unknown saved character class.');
  if(input.otherCharacters!==undefined&&!Array.isArray(input.otherCharacters))throw new Error('Invalid saved character roster.');
  if((input.otherCharacters?.length??0)>4)throw new Error('Too many saved characters.');
  const existing=new Map<string,any>((input.quests||[]).map((q:any)=>[q.questId,q]));
  const savedLevel=Math.max(0,Math.floor(Number(input.character?.level)||0));
  const mainIndex=new Map(MAIN_QUESTS.map((quest,index)=>[quest.id,index]));
  const quests=QUESTS.map(def=>{
    const old=existing.get(def.id);
    if(old&&['locked','active','complete','claimed'].includes(old.status))return {questId:def.id,status:old.status,progress:Math.max(0,Math.floor(Number(old.progress)||0))};
    if(def.category==='skill')return {questId:def.id,status:(def.autoStartLevel??Number.POSITIVE_INFINITY)<=savedLevel?'active':'locked',progress:0};
    const index=mainIndex.get(def.id)??0,previous=index>0?existing.get(MAIN_QUESTS[index-1].id):undefined;
    return {questId:def.id,status:index===0||previous?.status==='claimed'?'active':'locked',progress:0};
  });
  const classDef=input.character?CLASSES.find(c=>c.id===input.character.classId):undefined;
  const character=input.character?(()=>{
    const {customization:_legacyCustomization,profileAppearanceMode:_legacyProfileMode,profileEquipmentSnapshot:_legacyEquipmentSnapshot,ownedPetIds:_legacyPets,ownedBoostIds:_legacyBoosts,selectedCombatUnitId:_legacySelectedUnit,equippedCombatUnitId:_legacyEquippedUnit,combatUnitId:_legacyCombatUnit,equippedCompanionId:_legacyCompanion,...savedCharacter}=input.character;
    const classSkinSets=characterSkinSetsFor(input.character.classId);
    const validSkinIds=new Set(['starting',...classSkinSets.map(set=>equipmentSetSkinId(set.id))]);
    const eventSkinIds=new Set<string>([...(Array.isArray(input.character.unlockedEventSkinIds)?input.character.unlockedEventSkinIds:[]),...(input.version<7&&Array.isArray(input.account?.unlockedEventSkinIds)?input.account.unlockedEventSkinIds:[])].filter((id:unknown)=>typeof id==='string'));
    const earnedEventSetIds=classSkinSets.filter(set=>set.unlockEventSkinId&&eventSkinIds.has(set.unlockEventSkinId)).map(set=>equipmentSetSkinId(set.id));
    const unlockedSkinIds=['starting',...(Array.isArray(input.character.unlockedSkinIds)?input.character.unlockedSkinIds.filter((id:unknown)=>typeof id==='string'&&validSkinIds.has(id)):[]),...earnedEventSetIds];
    const gearIds=new Set(ITEMS.filter(item=>item.type==='gear').map(item=>item.id)),gemIds=new Set(ITEMS.filter(item=>item.type==='gem').map(item=>item.id));
    const gearEnhancements=Object.fromEntries(Object.entries(input.character.gearEnhancements??{}).filter(([id,value])=>gearIds.has(id)&&value&&typeof value==='object').map(([id,value]:[string,any])=>[id,{rank:Math.max(0,Math.min(10,Math.floor(Number(value.rank)||0))),failures:Math.max(0,Math.floor(Number(value.failures)||0)),gemIds:Array.isArray(value.gemIds)?value.gemIds.filter((gemId:unknown)=>typeof gemId==='string'&&gemIds.has(gemId)).slice(0,3):[]}])) as any;
    return {
    ...savedCharacter,
    activePreparation:normalizePreparation(input.character.activePreparation),
    classSkills:normalizeClassSkills(input.character.classId,input.character.classSkills),
    trainingFocus:normalizeTrainingFocus(input.character.trainingFocus),
    faith:normalizeCharacterFaith(input.character.faith,faithLevel(ACCOUNT_SKILL_IDS.map(skillId=>{const raw=Array.isArray(input.skills)?input.skills.find((entry:any)=>entry.skillId===skillId):undefined;const xp=Number.isFinite(raw?.xp)&&raw.xp>=0?raw.xp:0;return {skillId,xp,level:levelFromXp(xp)};}))),
    bodyPresentation:input.character.bodyPresentation==='female'?'female':'male',
    craftedNoviceItemIds:Array.isArray(input.character.craftedNoviceItemIds)?[...new Set(input.character.craftedNoviceItemIds.filter((id:unknown)=>typeof id==='string'))]:[],
    progressLedger:normalizeProgressLedger(input.character.progressLedger),
    unlockedEventSkinIds:[...eventSkinIds].filter(id=>classSkinSets.some(set=>set.unlockEventSkinId===id)),
    gearEnhancements,
    currentHp:Math.max(1,Number(input.character.currentHp ?? input.character.hp ?? classDef?.hp ?? 100)),
    equippedFoodId:input.character.equippedFoodId
    ,profileTitle:typeof input.character.profileTitle==='string'&&input.character.profileTitle.trim()?input.character.profileTitle.trim():'New Adventurer'
    ,profileBackgroundId:typeof input.character.profileBackgroundId==='string'&&input.character.profileBackgroundId.trim()?input.character.profileBackgroundId:'asterfall-night'
    ,profileBorderId:typeof input.character.profileBorderId==='string'&&input.character.profileBorderId.trim()?input.character.profileBorderId:undefined
    ,selectedCosmeticPetId:typeof input.character.selectedCosmeticPetId==='string'&&input.character.selectedCosmeticPetId.trim()?input.character.selectedCosmeticPetId:undefined,
    equippedCombatCompanionId:legacyEquippedCombatCompanionId(input.character)
    ,unlockedSkinIds:[...new Set(unlockedSkinIds)]
    ,selectedSkinId:classSkinSets.some(set=>set.appearanceId&&equipmentSetSkinId(set.id)===input.character.selectedSkinId)&&unlockedSkinIds.includes(input.character.selectedSkinId)?input.character.selectedSkinId:'starting'
  };})():null;
  if(input.activity?.brew!==undefined&&input.activity.kind!=='alchemy')throw new Error('Reserved brewing materials have an invalid activity owner. Keep the save backup.');
  if(input.activity?.faithPractice!==undefined&&input.activity.kind!=='faith')throw new Error('Reserved Holy Water has an invalid activity owner. Keep the save backup.');
  if((input.activity?.kind==='alchemy'||input.activity?.kind==='faith')&&(!character||!Number.isFinite(input.activity.startedAtMs)||!Number.isFinite(input.activity.lastClaimAtMs)||input.activity.startedAtMs<0||input.activity.lastClaimAtMs<input.activity.startedAtMs||
    (input.activity.progressFraction!==undefined&&(!Number.isFinite(input.activity.progressFraction)||input.activity.progressFraction<0||input.activity.progressFraction>=1))))throw new Error('Invalid reserved activity timeline. Keep the save backup.');
  const seasonIds=['spring','summer','autumn','winter'],weatherIds=['clear','rain','mist','storm','bloomwind','heatwave','harvest_wind','snow','frost'];
  const rawEnvironment=input.activity?.environment;
  const environment=rawEnvironment&&seasonIds.includes(rawEnvironment.seasonId)&&weatherIds.includes(rawEnvironment.weatherId)&&typeof rawEnvironment.zoneId==='string'&&Number.isFinite(rawEnvironment.capturedAtMs)?{seasonId:rawEnvironment.seasonId,weatherId:rawEnvironment.weatherId,zoneId:rawEnvironment.zoneId,capturedAtMs:rawEnvironment.capturedAtMs}:undefined;
  const savedBonus=input.activity?.bonusSnapshot;
  const bonusSnapshot=savedBonus&&typeof savedBonus==='object'?Object.fromEntries(Object.entries(BASE_PERMANENT_MULTIPLIERS).map(([key,base])=>[key,typeof savedBonus[key]==='number'&&Number.isFinite(savedBonus[key])?Math.max(.75,Math.min(2,savedBonus[key])):base])) as unknown as PermanentMultipliers:undefined;
  const activity=input.activity?{...input.activity,brew:input.activity.kind==='alchemy'?normalizeAlchemyBatch(input.activity.brew,input.activity.targetId):undefined,faithPractice:input.activity.kind==='faith'?normalizeFaithPractice(input.activity.faithPractice,input.activity.targetId):undefined,environment,bonusSnapshot,classTrainingSnapshot:normalizeClassTrainingSnapshot(input.activity.classTrainingSnapshot,input.activity,character?.classId),completedActions:input.activity.kind==='combat'||input.activity.kind==='training'?(Number.isSafeInteger(input.activity.completedActions)&&input.activity.completedActions>=0?input.activity.completedActions:0):undefined,progressFraction:Number.isFinite(input.activity.progressFraction)?Math.max(0,Math.min(1-Number.EPSILON,input.activity.progressFraction)):0}:null;
  const savedRegionId=typeof input.currentRegionId==='string'?input.currentRegionId:environment?.zoneId;
  const currentRegionId=WORLD_ZONES.some(zone=>zone.id===savedRegionId&&(character?.level??1)>=zone.minLevel)?savedRegionId:'GREENFIELDS';
  const rawLiveEvent=input.account?.liveEvent;
  const liveEvent=rawLiveEvent&&typeof rawLiveEvent.eventId==='string'&&typeof rawLiveEvent.enabled==='boolean'&&Number.isFinite(rawLiveEvent.startsAtMs)&&Number.isFinite(rawLiveEvent.endsAtMs)&&rawLiveEvent.endsAtMs>rawLiveEvent.startsAtMs?{eventId:rawLiveEvent.eventId,enabled:rawLiveEvent.enabled,startsAtMs:Number(rawLiveEvent.startsAtMs),endsAtMs:Number(rawLiveEvent.endsAtMs)}:undefined;
  const stringList=(value:unknown,limit=160)=>Array.isArray(value)?[...new Set(value.filter((id:unknown)=>typeof id==='string'))].slice(-limit):[];
  const permanentIds=(value:unknown)=>stringList(value,Number.MAX_SAFE_INTEGER);
  const legacyCharacters=[input.character,...(input.otherCharacters??[]).map((entry:any)=>entry?.character)].filter(Boolean);
  const legacyIds=(key:string)=>legacyCharacters.flatMap((entry:any)=>Array.isArray(entry[key])?entry[key]:[]);
  const numberRecord=(value:unknown,limit=240)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([id,amount])=>typeof id==='string'&&Number.isFinite(Number(amount))).slice(-limit).map(([id,amount])=>[id,Math.max(0,Math.floor(Number(amount)))]));
  const stringRecord=(value:unknown,limit=24)=>Object.fromEntries(Object.entries(value&&typeof value==='object'?value:{}).filter(([id,entry])=>typeof id==='string'&&typeof entry==='string').slice(-limit));
  const eventProgressById=numberRecord(input.account?.eventProgressById,12);
  const eventCurrencyBalanceById=numberRecord(input.account?.eventCurrencyBalanceById??eventProgressById,12);
  const eventActivityById=Object.fromEntries(Object.entries(input.account?.eventActivityById??{}).filter(([,entry])=>entry&&typeof entry==='object').slice(-12).map(([id,entry])=>[id,numberRecord(entry,4)]));
  const eventPeriodActivityById=Object.fromEntries(Object.entries(input.account?.eventPeriodActivityById??{}).filter(([,entry])=>entry&&typeof entry==='object').slice(-90).map(([id,entry])=>[id,numberRecord(entry,4)]));
  const combatCompanions=migrateLegacyCombatCompanionAccount(input);
  const normalized={
    ...input,
    version:13,
    character,
    otherCharacters:[],
    rewardRemainders:Object.fromEntries(Object.entries(input.rewardRemainders??{}).filter(([,value])=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<1)),
    skills:ACCOUNT_SKILL_IDS.map(skillId=>{const raw=Array.isArray(input.skills)?input.skills.find((entry:any)=>entry.skillId===skillId):undefined;const xp=Number.isFinite(raw?.xp)&&raw.xp>=0?raw.xp:0;return {skillId,xp,level:levelFromXp(xp)};}),
    activity,
    currentRegionId,
    inventory:{stacks:Array.isArray(input.inventory?.stacks)?input.inventory.stacks:[],capacity:Number(input.inventory?.capacity ?? 30)},
    bank:{stacks:Array.isArray(input.bank?.stacks)?input.bank.stacks:[],capacity:Number(input.bank?.capacity ?? 120)},
    overflow:{stacks:Array.isArray(input.overflow?.stacks)?input.overflow.stacks:[],expiresAtMs:input.overflow?.expiresAtMs ?? null},
    quests,
    unlockedMonsterIds:Array.isArray(input.unlockedMonsterIds)?input.unlockedMonsterIds:['MOSS_RAT'],
    defeatedBossIds:Array.isArray(input.defeatedBossIds)?input.defeatedBossIds:[],
    account:{
      unlockedCharacterSlots:Math.max(1,Math.min(5,Math.floor(Number(input.account?.unlockedCharacterSlots)||1))),
      nextCharacterOrdinal:Math.max(2,Math.floor(Number(input.account?.nextCharacterOrdinal)||2)),
      ...combatCompanions,
      ownedBoostIds:permanentIds([...(input.account?.ownedBoostIds??[]),...legacyIds('ownedBoostIds')]),
      entitlements:{vip:input.account?.entitlements?.vip===true,vipPlus:input.account?.entitlements?.vipPlus===true},
      premiumCurrencyBalance:Number.isSafeInteger(input.account?.premiumCurrencyBalance)&&input.account.premiumCurrencyBalance>=0?input.account.premiumCurrencyBalance:0,
      activeProfileBackgroundId:typeof input.account?.activeProfileBackgroundId==='string'?input.account.activeProfileBackgroundId:input.version<7?input.character?.profileBackgroundId:undefined,
      activeProfileBorderId:typeof input.account?.activeProfileBorderId==='string'?input.account.activeProfileBorderId:input.version<7?input.character?.profileBorderId:undefined,
      createdCharacterCount:Math.max(1,Number(input.account?.createdCharacterCount??1)),guildMember:!!input.account?.guildMember,patronTier:['bloom','crown'].includes(input.account?.patronTier)?input.account.patronTier:'none',guildContribution:Math.max(0,Number(input.account?.guildContribution??0)),guildProjectContribution:Math.max(0,Number(input.account?.guildProjectContribution??0)),guildPveWeekKey:typeof input.account?.guildPveWeekKey==='string'?input.account.guildPveWeekKey:undefined,guildProjectProgress:Math.max(0,Number(input.account?.guildProjectProgress??0)),guildBossHp:Math.max(0,Number(input.account?.guildBossHp??100000)),guildProjectClaimed:!!input.account?.guildProjectClaimed,guildJoinPolicy:['open','apply','invite'].includes(input.account?.guildJoinPolicy)?input.account.guildJoinPolicy:'open',guildMinimumLevel:Math.max(1,Number(input.account?.guildMinimumLevel??10)),guildApplicationStatus:['pending','accepted','declined'].includes(input.account?.guildApplicationStatus)?input.account.guildApplicationStatus:'none',seasonalContractClaimIds:stringList(input.account?.seasonalContractClaimIds,120),liveEvent,eventProgressById,eventCurrencyBalanceById,eventPrestigeBalanceById:numberRecord(input.account?.eventPrestigeBalanceById,12),eventWalletExpiresAtById:numberRecord(input.account?.eventWalletExpiresAtById,12),eventRecipeSlotsBySetId:normalizeEventRecipeSlots(input.account?.eventRecipeSlotsBySetId),eventRepeatCacheClaimsById:numberRecord(input.account?.eventRepeatCacheClaimsById,12),eventActivityById,eventPeriodActivityById,eventAcceptedContractIds:stringList(input.account?.eventAcceptedContractIds,240),eventContractBaselines:numberRecord(input.account?.eventContractBaselines,240),eventObjectiveClaimIds:stringList(input.account?.eventObjectiveClaimIds,240),eventWeeklyClaimIds:stringList(input.account?.eventWeeklyClaimIds,160),eventDailyGiftClaimIds:stringList(input.account?.eventDailyGiftClaimIds,180),eventCommunityClaimIds:stringList(input.account?.eventCommunityClaimIds,80),eventDiscoveryCounts:numberRecord(input.account?.eventDiscoveryCounts,120),eventDiscoveryClaimIds:stringList(input.account?.eventDiscoveryClaimIds,120),eventShopPurchaseCounts:numberRecord(input.account?.eventShopPurchaseCounts),eventChoiceById:stringRecord(input.account?.eventChoiceById),eventContributionById:numberRecord(input.account?.eventContributionById,12),eventRewardClaimIds:stringList(input.account?.eventRewardClaimIds),unlockedEventSkinIds:[],unlockedCosmeticPetIds:permanentIds([...(input.account?.unlockedCosmeticPetIds??[]),...legacyIds('ownedPetIds')]),unlockedProfileBackgroundIds:permanentIds(input.account?.unlockedProfileBackgroundIds),unlockedProfileBorderIds:permanentIds(input.account?.unlockedProfileBorderIds),unlockedEmoteIds:stringList(input.account?.unlockedEmoteIds),unlockedTitleIds:stringList(input.account?.unlockedTitleIds)},
    settings:{
      language:isSupportedLanguage(input.settings?.language)?input.settings.language:'en',
      numberMode:input.settings?.numberMode||'abbreviated',
      reduceMotion:!!input.settings?.reduceMotion,
      textScale:input.settings?.textScale||1,
      autoEatThresholdPct:Number(input.settings?.autoEatThresholdPct ?? 40),
      stopCombatWhenOutOfFood:input.settings?.stopCombatWhenOutOfFood!==false,
      autoJoinWorldChat:input.settings?.autoJoinWorldChat===true,
      defaultWorldChat:([1,2,3,4] as number[]).includes(Number(input.settings?.defaultWorldChat))?Number(input.settings.defaultWorldChat):1,
      quickNavDestinations:normalizeQuickNavDestinations(input.settings?.quickNavDestinations),
    }
  } as GameState;
  // Recursively normalize character-owned contexts without nesting account copies.
  normalized.otherCharacters=(input.otherCharacters??[]).map((entry:any)=>{
    if(!entry?.character)throw new Error('An inactive character is missing its identity.');
    const child=normalizeSave({...input,...entry,version:13,otherCharacters:[],account:{...normalized.account,unlockedEventSkinIds:[]}});
    normalized.account.unlockedCosmeticPetIds=permanentIds([...(normalized.account.unlockedCosmeticPetIds??[]),...(child.account.unlockedCosmeticPetIds??[])]);
    normalized.account.unlockedCombatCompanionIds=permanentIds([...(normalized.account.unlockedCombatCompanionIds??[]),...(child.account.unlockedCombatCompanionIds??[])]);
    normalized.account.combatCompanionProgress={...(normalized.account.combatCompanionProgress??{}),...(child.account.combatCompanionProgress??{})};
    normalized.account.ownedBoostIds=permanentIds([...(normalized.account.ownedBoostIds??[]),...(child.account.ownedBoostIds??[])]);
    return activeCharacterProgress(child)!;
  });
  accountCharacters(normalized); // Reject duplicate identities instead of dropping a valid context.
  if(!normalized.character&&(normalized.otherCharacters?.length??0))throw new Error('An account with characters must select an active character.');
  for(const kind of ['background','border'] as const){
    const selectedKey=kind==='background'?'activeProfileBackgroundId':'activeProfileBorderId';
    const ownedKey=kind==='background'?'unlockedProfileBackgroundIds':'unlockedProfileBorderIds';
    const id=normalized.account[selectedKey];
    if(!COLLECTIBLES.some(entry=>entry.id===id&&entry.kind===kind)||!normalized.account[ownedKey]?.includes(id!))normalized.account[selectedKey]=undefined;
  }
  // Keep old display consumers consistent; these mirrors never define ownership or power.
  const profile={profileBackgroundId:normalized.account.activeProfileBackgroundId??'asterfall-night',profileBorderId:normalized.account.activeProfileBorderId};
  const cleanPet=(id:string|undefined)=>id&&normalized.account.unlockedCosmeticPetIds?.includes(id)&&COLLECTIBLES.some(entry=>entry.kind==='pet'&&entry.id===id)?id:undefined;
  if(normalized.character)normalized.character={...normalized.character,...profile,selectedCosmeticPetId:cleanPet(normalized.character.selectedCosmeticPetId)};
  normalized.otherCharacters=(normalized.otherCharacters??[]).map(entry=>({...entry,character:{...entry.character,...profile,selectedCosmeticPetId:cleanPet(entry.character.selectedCosmeticPetId)}}));
  return recordAccountProgress(discoverCharacterSkins(sanitizeCombatCompanionState(normalized)));
}
