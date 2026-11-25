export {};
const fs=require('fs') as {readFileSync:(path:string,encoding:string)=>string};

function ok(value:boolean,message:string){if(!value)throw new Error(message)}

const app=fs.readFileSync('App.tsx','utf8');
const discard=fs.readFileSync('src/components/ProfileDiscardChangesModal.tsx','utf8');
const screen=fs.readFileSync('src/screens/ProfileCustomizeScreen.tsx','utf8');
const appearance=fs.readFileSync('src/components/ProfileEditor.tsx','utf8');
const look=fs.readFileSync('src/components/profile/ProfileLookPanel.tsx','utf8');
const stage=fs.readFileSync('src/components/profile/ProfileStage.tsx','utf8');
const unlock=fs.readFileSync('src/components/profile/ProfileUnlockSheet.tsx','utf8');
const identity=fs.readFileSync('src/components/profile/ProfileIdentityPanel.tsx','utf8');
const showcase=fs.readFileSync('src/components/profile/ProfileShowcasePanel.tsx','utf8');
const draft=fs.readFileSync('src/online/useProfileExtensionDraft.ts','utf8');
const releaseFlags=fs.readFileSync('src/core/release-flags.ts','utf8');
const socialClientGate=fs.readFileSync('src/online/social-identity-client-gate.ts','utf8');
const preview=fs.readFileSync('src/components/ProfileAudiencePreviewModal.tsx','utf8');
const cosmeticRuntime=fs.readFileSync('src/theme/profile-cosmetic-runtime-v1.ts','utf8');
const cosmeticMotion=fs.readFileSync('src/components/ProfileCosmeticMotion.tsx','utf8');
const appIndex=fs.readFileSync('index.js','utf8');
const cosmeticsStore=fs.readFileSync('src/screens/StoreScreen.tsx','utf8');
const cosmeticsCatalog=fs.readFileSync('src/content/profile-cosmetic-store.ts','utf8');

ok(app.includes('profileCustomizeDirty'),'App must track profile customization dirty state');
ok(app.includes('<ProfileDiscardChangesModal')&&discard.includes('Discard profile changes?')&&discard.includes('Keep editing')&&discard.includes('Discard changes'),'Leaving customization must require an explicit discard choice');
ok(app.includes("tab!=='ProfileCustomize'||!profileCustomizeDirty"),'Navigation guard must only intercept dirty Customize Profile exits');
ok(app.includes('onDirtyChange={setProfileCustomizeDirty}'),'Customize Profile must report dirty state to app navigation');
ok(app.includes("useState<'Look'|'Identity'|'Showcase'>('Look')"),'App deep links must address the redesigned Look/Identity/Showcase tabs');

// One shell, three tabs, one always-visible stage.
ok(screen.includes("const TABS:readonly Tab[]=['Look','Identity','Showcase']"),'Customize Profile must expose exactly the Look, Identity and Showcase tabs');
ok(screen.includes("section==='Appearance'?'Look'"),'Legacy Appearance deep links must still resolve to the Look tab');
ok(screen.includes('appearanceDirty||identityDirty'),'Wardrobe and identity drafts must both participate in dirty state');
ok(screen.includes("sectionHidden:{display:'none'}")&&screen.includes("tab==='Identity'?s.sectionShown:s.sectionHidden"),'Customization tabs must stay mounted instead of being destroyed on tab switches');
ok(screen.includes('<ProfileStage')&&screen.includes('collapsed={collapsed}')&&screen.includes('COLLAPSE_AT'),'The stage must stay on screen and collapse as the wardrobe scrolls');
ok(screen.includes('stickyHeaderIndices={[0]}'),'Stage and tabs must stay pinned while browsing cosmetics');
ok(screen.includes('onPreviewStateChange={setAppearancePreview}'),'Wardrobe draft must feed the stage and the audience preview');
ok(screen.includes('identityDraft={identityDraft}')&&screen.includes('draft.value?{...draft.value,bio:draft.bio}'),'Identity draft must feed the audience preview');
ok(screen.includes('Preview as others see me')&&screen.includes('ProfileAudiencePreviewModal'),'Customize Profile must expose the audience preview');
ok(screen.includes('notice.undo()')&&screen.includes('"UNDO"'),'An instant equip must be reversible from the screen');

// Look tab: one level of categories, instant equip, locked tiles that explain themselves.
ok(look.includes('onDirtyChange?:(dirty:boolean)=>void')&&look.includes('onPreviewStateChange?:(preview:GameState)=>void'),'Look panel must expose draft/dirty callbacks');
const chips=fs.readFileSync('src/components/profile/ProfileWardrobeChips.tsx','utf8');
ok(look.includes('profileWardrobe(state,WARDROBE_ASSETS)')&&screen.includes('profileWardrobe(state,WARDROBE_ASSETS)'),'The wardrobe model must drive both the chips and the grid');
ok(chips.includes('row.owned')&&chips.includes('row.total'),'Category chips must carry their owned/total unlock counts');
const wardrobe=fs.readFileSync('src/core/profile-wardrobe.ts','utf8');
ok(wardrobe.includes("['icon','scene','frame','effect','pet','title']")&&wardrobe.includes("effect:'Effects'"),'Effects must be a first-class wardrobe family between Frames and Pets');
ok(releaseFlags.includes('PROFILE_ANIMATED_COSMETICS_RELEASED=false')&&wardrobe.includes("kind=>kind!=='effect'"),'Animated profile effects must remain hidden from the player wardrobe until the release gate is approved');
ok(look.includes("chip==='effect'?live.effect")&&look.includes('cosmeticArtByEffect'),'Effect selection must use its own equipped slot and themed static artwork');
ok(stage.includes('character.profileEffectId')&&(stage.includes('<ProfileSceneEffect')||stage.includes('<ProceduralProfileSceneEffect')),'The pinned stage must preview the selected showcase effect independently from the border');
ok(cosmeticRuntime.includes("T('snowflake',")&&cosmeticRuntime.includes("T('leaf',")&&cosmeticRuntime.includes("T('ember',")&&cosmeticRuntime.includes("T('arcane',"),'Native cosmetics fallback must keep distinct themed particle silhouettes');
ok(cosmeticMotion.includes('ProceduralProfileSceneEffect')&&cosmeticMotion.includes('ProceduralProfileBorderGlows'),'Native review must not depend on binary V3 imports');
ok(appIndex.includes("EXPO_PUBLIC_VISUAL_QA_SCREEN==='profile-cosmetics-store'")&&appIndex.includes("require('./src/dev/ProfileCosmeticsStoreReview').default"),'Hidden Cosmetics catalog must have a developer-only native review route');
ok(cosmeticsStore.includes("type StoreSection='Memberships'|'Cosmetics'")&&cosmeticsStore.includes('STORE_COSMETICS_VISIBLE=PROFILE_COSMETICS_STORE_RELEASED'),'The Store models Cosmetics as its second category but keeps it release-gated');
const cosmeticStorePreview=fs.readFileSync('src/components/StoreCosmeticsCatalog.tsx','utf8');
ok(cosmeticsCatalog.includes('checkoutEnabled:false as const')&&cosmeticsCatalog.includes("kind:'set' as const")&&cosmeticsCatalog.includes('...collection.set,collectionId:collection.id,checkoutEnabled:false as const')&&cosmeticStorePreview.includes('The Store does not sell any of the four set contents separately.')&&cosmeticStorePreview.includes('CHECKOUT OFF'),'Cosmetics catalog must define standard set-only products without an active checkout path');
const pager=fs.readFileSync('src/components/OptionPager.tsx','utf8');
ok(chips.includes('<OptionPager')&&chips.includes("{key:'badge'"),'Every cosmetic category, Badges included, must stay reachable from the pinned header');
ok(pager.includes('onPanResponderRelease')&&pager.includes('accessibilityRole="adjustable"')&&pager.includes('s.dotTarget'),'A category must be reachable by arrow, by drag and by its own dot, and the control must announce itself as adjustable');
ok(pager.includes('Math.abs(gesture.dx)>Math.abs(gesture.dy)*1.6'),'A vertical flick must keep scrolling the page instead of being eaten by the pager');
ok(screen.includes('<ProfileWardrobeChips'),'Category chips must live in the pinned header beside the stage');
ok(look.includes('COMMIT_DELAY_MS')&&look.includes('queueCommit(next)'),'Instant equip must batch its writes instead of committing once per tap');
ok(look.includes('useEffect(()=>()=>flush(),[flush])'),'A pending cosmetic write must be flushed when the wardrobe unmounts');
ok(look.includes('chainRef.current=chainRef.current.then'),'Cosmetic writes must be chained: a write computed against a state the previous write has not landed in is dropped as a no-op');
ok(look.includes("if(sentRef.current&&sentRef.current!==savedKey)return;"),'A state still catching up with our own write must not re-seed the selection and undo an undo');
ok(look.includes('if(!row.unlocked){setSheet(row);return}'),'Tapping a locked cosmetic must open its unlock source instead of failing silently');
ok(look.includes('onNotice?.({name:row.name,undo:'),'Equipping must offer an undo for the previous look');
ok(look.includes('row.lockTag')&&look.includes('<ProfileUnlockSheet'),'Locked tiles must print their unlock tag and open the unlock sheet');
ok(look.includes('JOURNAL_TITLES_V42')||fs.readFileSync('src/core/profile-wardrobe.ts','utf8').includes('JOURNAL_TITLES_V42'),"Earned Adventurer's Journal titles must remain selectable from Profile customization");
ok(unlock.includes('Try it on')&&unlock.includes('onNavigateSource'),'The unlock sheet must offer both a try-on and a route to the source');
ok(stage.includes('ProfileFrameOverlay')&&!stage.includes('minCorner'),'The stage must render the equipped frame and let the card size it, not carry a hand-tuned corner');
ok(stage.includes('!!frame&&s.identityFramed')&&stage.includes('!!frame&&s.surfaceFramed'),'A framed stage must tuck its art and identity inside the frame instead of being struck through by it');
ok(showcase.includes('<PlayerBadges identity={badges.identity}')&&stage.includes('<PlayerBadges identity={badges.identity}'),'Earned badges must show beside the name on the profile, on the stage and on the showcase card');
ok(preview.includes('playerBadges:badges.identity'),'The audience preview must hand its own badges to the public scene, which has no published identity to read offline');
ok(preview.includes('effectId:character.profileEffectId??null'),'Audience preview must project the character-scoped effect choice');

// The Character screen keeps its own inline editor, so its contract still holds.
ok(appearance.includes("['All','Starter','Class','Combat','Event']")&&!appearance.includes("['All','Starter','Class','Companion','Combat','Event']"),'Profile icon filters must not expose the retired Companion tab');
ok(appearance.includes("const borderName=(id:string)=>profileRewardSource(state,'border',id).name")&&appearance.includes('name={borderName(key)}'),'Border cards must use their player-facing reward names');
ok(appearance.includes('style={s.petImage}')&&appearance.includes('petImage:{width:\'100%\',height:\'100%\'}'),'Pet cards must size visible art explicitly inside the gallery');

// Identity and Showcase are two tabs over one stored row.
ok(draft.includes('export function useProfileExtensionDraft')&&screen.includes('const draft=useProfileExtensionDraft(')&&draft.includes('identitySnapshot(')&&draft.includes('showcaseSnapshot(')&&draft.includes('const dirty=identityDirty||showcaseDirty'),'Identity and Showcase must share one draft with independently tracked account and character changes');
ok(draft.includes('masteryShowcaseActionIds:row.masteryShowcaseActionIds')&&draft.includes('showcaseSnapshot(value)')&&draft.includes('saveLegacyProfile(value,bio,fallbackCharacterId)'),'Mastery showcase selections must participate in dirty/save state');
const staleSaveGuards=(draft.match(/if\(!mounted\.current\|\|version!==requestVersion\.current\)return;/g)??[]).length;
const scopedBusyReleases=(draft.match(/if\(mounted\.current&&version===requestVersion\.current\)setBusy\(false\)/g)??[]).length;
ok(staleSaveGuards>=4&&scopedBusyReleases>=5,'Async identity, showcase and featured-hero saves must never overwrite a newer account or selection after a stale completion');
ok(draft.includes('current?.selectedCharacterId===characterId'),'Character showcase saves must not update another selected hero');
ok(releaseFlags.includes('export const ACCOUNT_SOCIAL_IDENTITY_RELEASED=false')&&socialClientGate.includes("process.env.EXPO_PUBLIC_RELEASE_CHANNEL==='staging'")&&socialClientGate.includes("process.env.EXPO_PUBLIC_SUPABASE_URL==='https://iqfmmpvwanvvmxcftfxw.supabase.co'")&&socialClientGate.includes("process.env.EXPO_PUBLIC_SOCIAL_NAMES_STAGING_PREVIEW==='true'")&&draft.includes('saveLegacyProfile(')&&draft.includes('ACCOUNT_SOCIAL_IDENTITY_RELEASED&&selected')&&identity.includes('active&&ACCOUNT_SOCIAL_IDENTITY_RELEASED')&&showcase.includes('ACCOUNT_SOCIAL_IDENTITY_RELEASED?<View style={s.featuredRow}')&&showcase.includes('disabled={guest||busy||characters.length<2}')&&draft.includes('if(!ACCOUNT_SOCIAL_IDENTITY_RELEASED){'),'Social V2 is staging-only, production v43 writes survive, and the legacy featured-character picker remains available');
ok(draft.includes('const revertIdentity=useCallback(')&&draft.includes('const revertShowcase=useCallback(')&&identity.includes('onPress={draft.revertIdentity}')&&showcase.includes('onPress={draft.revertShowcase}'),'Revert in either profile tab must preserve edits in the other');
ok(identity.includes('accessibilityRole="radiogroup"')&&identity.includes("{id:'guild'")&&identity.includes("{id:'public'"),'Identity must expose the three profile audiences as a single-choice control');
ok(identity.includes('<PlayerNameStyleEditor'),'Identity must host the player name-style editor');
ok(identity.includes('draft.bio.length')&&identity.includes('/160'),'Biography must keep its visible character budget');
ok(showcase.includes("picker==='mastery'")&&showcase.includes('professionMasteryMasteredRecords(state)'),'Showcase must keep a three-slot R50 mastery picker derived from owned records');
ok(showcase.includes('<SlotTrio')&&showcase.includes('cellEmpty'),'Showcase slots must read as filled or empty slots rather than dropdown counters');
ok(!showcase.includes('CharacterPortrait')&&showcase.includes('<ProfileIcon'),'The showcase character card must use the profile icon, not a retired character skin');

ok(preview.includes("id:'public'")&&preview.includes("id:'guild'")&&preview.includes("id:'self'"),'Audience preview must simulate public, guild and self viewers');
ok(preview.includes('profileAudienceCanView'),'Audience preview must use the shared privacy visibility rule');
ok(preview.includes('This preview never publishes or saves changes.'),'Audience preview must explain that it is non-destructive');
ok(preview.includes('WORLD MILESTONES HIDDEN'),'Audience preview must surface World Milestones opt-out state');
ok(preview.includes('masteryShowcaseActionIds')&&preview.includes('No featured R50 masteries'),'Audience preview must include the selected R50 mastery showcase row');

console.log('PASS: three profile tabs over one draft, instant equip with undo, locked tiles carry their source, unsafe exits guarded');
