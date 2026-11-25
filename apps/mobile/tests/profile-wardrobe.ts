import {createCharacter,newGame} from '../src/core/game';
import {
 applyWardrobeEquipped,profileWardrobe,wardrobeEquipped,wardrobeLockTag,wardrobeProgress,wardrobeSelection,wardrobeChanges,
 WARDROBE_KINDS,type WardrobeAssets,
} from '../src/core/profile-wardrobe';
import {isHexColor,NAME_COLOR_PALETTE,nameColorPaletteMatch,normalizeHexColor} from '../src/core/player-name-style';
import {profileFrameCorner,profileFrameSegments} from '../src/core/profile-frame-layout';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

const assets:WardrobeAssets={
 scenes:[{id:'asterfall-night',name:'Asterfall Night'},{id:'bg_veilbreak',name:'Veilbreak Gothic Moonruins'}],
 frames:['frame_gloamward','guild-border-silver','cosmetic:gloamward:arcane-frame','cosmetic:frostbound:chime-frame','cosmetic:amberglass:loop-frame','cosmetic:briarbound:verdant-frame'],
 effects:[{id:'effect_gloamward_wisps',name:'Arcane Wisps'},{id:'effect_frostbound_winter_veil',name:'Winter Veil'},{id:'effect_amberglass_ember_motes',name:'Ember Motes'},{id:'effect_briarbound_verdant_whispers',name:'Verdant Whispers'}],
};
let state=createCharacter(newGame(0),'IRONWARDEN','Wardrobe Test');

const releasedCategories=profileWardrobe(state,assets);
ok(!releasedCategories.some(row=>row.kind==='effect'),'unreleased animated effects stay out of the player wardrobe');
const categories=profileWardrobe(state,assets,{includeUnreleasedEffects:true});
equal(categories.length,WARDROBE_KINDS.length,'every cosmetic family becomes one chip');
equal(categories.map(row=>row.kind).join(','),WARDROBE_KINDS.join(','),'chips keep their authored order');
for(const category of categories){
 ok(category.total>0,category.kind+' chip must count at least one row');
 ok(category.owned<=category.total,category.kind+' owned count cannot exceed its total');
 ok(category.rows.every(row=>row.kind===category.kind),category.kind+' rows must belong to their own family');
 ok(category.rows.filter(row=>row.clear).length<=1,category.kind+' may offer at most one clear choice');
}

// A fresh character owns the starter sets and nothing event-gated.
const icons=categories.find(row=>row.kind==='icon')!;
ok(icons.owned>=9,'starter portraits stay available from the start');
ok(icons.total>icons.owned,'locked portraits remain visible as goals');
ok(icons.rows.filter(row=>row.equipped).length===1,'exactly one icon reads as equipped');

// Locked rows explain themselves without a tap.
const locked=categories.flatMap(row=>row.rows).filter(row=>!row.unlocked);
ok(locked.length>0,'a fresh account must have something left to unlock');
for(const row of locked){
 ok(!!row.lockTag,row.name+' must carry a short unlock tag for its tile');
 ok(!!row.sourceDetail,row.name+' must carry a full unlock explanation for the sheet');
 ok(!row.equipped,row.name+' must never read as equipped while locked');
}
equal(wardrobeLockTag('Guild'),'GUILD','guild unlocks print a guild tag');
equal(wardrobeLockTag('Character'),'LEVEL','level unlocks print a level tag');
equal(wardrobeLockTag(undefined),'LOCKED','an unknown source still prints a tag');

// Clear choices are selectable but never inflate collection progress.
const frames=categories.find(row=>row.kind==='frame')!;
const clear=frames.rows.find(row=>row.clear)!;
ok(clear.unlocked&&clear.equipped,'no-frame is the equipped default');
equal(frames.total,2,'unowned unreleased animated frames stay hidden even in the effect preview');
ok(!frames.rows.some(row=>row.id.startsWith('cosmetic:')),'previewing effects never bypasses the frame release fence');
const testerOwned={...state,account:{...state.account,entitlements:{...state.account.entitlements,profile_cosmetics_tester_v1:true},unlockedProfileBorderIds:assets.frames.filter(id=>id.startsWith('cosmetic:'))}};
const testerFrames=profileWardrobe(testerOwned,assets).find(row=>row.kind==='frame')!;
equal(testerFrames.total,assets.frames.length,'owned tester frames are visible, excluding the clear choice');
ok(testerFrames.rows.filter(row=>row.id.startsWith('cosmetic:')).every(row=>row.unlocked),'tester frames remain independently ownership gated');
const effects=categories.find(row=>row.kind==='effect')!;
equal(effects.total,assets.effects?.length??0,'the clear choice is excluded from the effect total');
ok(effects.rows.find(row=>row.clear)?.equipped,'no-effect is the equipped default');
ok(effects.rows.filter(row=>!row.clear).every(row=>!row.unlocked),'effects start locked until account ownership is granted');
const progress=wardrobeProgress(categories);
equal(progress.owned,categories.reduce((sum,row)=>sum+row.owned,0),'collection progress sums every family');
ok(progress.percent>0&&progress.percent<100,'a fresh account is partway through its collection');

// One tap writes one family and leaves the other four alone.
const equipped=wardrobeEquipped(state);
equal(equipped.scene,'asterfall-night','a new character starts on the default scene');
const next=wardrobeSelection(equipped,{kind:'scene',id:'bg_veilbreak',name:'Veilbreak Gothic Moonruins'});
equal(next.scene,'bg_veilbreak','selecting a scene replaces the scene');
equal(next.icon,equipped.icon,'selecting a scene must not disturb the icon');
equal(next.title,equipped.title,'selecting a scene must not disturb the title');
equal(next.effect,equipped.effect,'selecting a scene must not disturb the showcase effect');
const effectSelected=wardrobeSelection(equipped,{kind:'effect',id:'effect_gloamward_wisps',name:'Arcane Wisps'});
equal(effectSelected.effect,'effect_gloamward_wisps','selecting an effect changes only the effect slot');
equal(effectSelected.frame,equipped.frame,'effect selection is independent from the border');
const titled=wardrobeSelection(equipped,{kind:'title',id:'pathfinder',name:'Pathfinder'});
equal(titled.title,'Pathfinder','titles are stored by their display name');

const applied=applyWardrobeEquipped(state,next);
equal(applied.character!.profileBackgroundId,'bg_veilbreak','applying writes the character record');
equal(applied.character!.profileBorderId,undefined,'an empty frame clears rather than stores an empty id');
const effectOwned={...state,account:{...state.account,unlockedProfileEffectIds:['effect_gloamward_wisps']}};
const ownedEffects=profileWardrobe(effectOwned,assets,{includeUnreleasedEffects:true}).find(row=>row.kind==='effect')!;
ok(ownedEffects.rows.find(row=>row.id==='effect_gloamward_wisps')?.unlocked,'effect ownership is account-wide');
const effectApplied=applyWardrobeEquipped(effectOwned,effectSelected);
equal(effectApplied.character!.profileEffectId,'effect_gloamward_wisps','equipped effect is stored on this character');
equal(effectApplied.account.unlockedProfileEffectIds?.[0],'effect_gloamward_wisps','equipping never mutates account ownership');
equal(JSON.stringify(wardrobeEquipped(applied)),JSON.stringify(next),'applying then reading round-trips the selection');

// Undo restores the whole previous look in one write.
const reverted=applyWardrobeEquipped(applied,equipped);
equal(JSON.stringify(wardrobeEquipped(reverted)),JSON.stringify(equipped),'undo restores every family at once');

// The VIP+ colour picker: curated swatches plus an exact hex code.
ok(NAME_COLOR_PALETTE.length>=16,'the palette must offer a real choice of colours');
equal(new Set(NAME_COLOR_PALETTE.map(row=>row.id)).size,NAME_COLOR_PALETTE.length,'palette ids are unique');
equal(new Set(NAME_COLOR_PALETTE.map(row=>row.color.toUpperCase())).size,NAME_COLOR_PALETTE.length,'palette colours are unique');
for(const row of NAME_COLOR_PALETTE){
 ok(/^#[0-9A-F]{6}$/.test(row.color),row.id+' must be a full uppercase hex colour');
 equal(nameColorPaletteMatch(row.color),row.id,row.id+' must be recognised as the active swatch');
 equal(nameColorPaletteMatch(row.color.toLowerCase()),row.id,row.id+' must match regardless of case');
}
ok(isHexColor('#8F7CFF')&&isHexColor('8f7cff')&&isHexColor('#ABC'),'3 and 6 digit codes, with or without the hash, are valid');
ok(!isHexColor('')&&!isHexColor('#8F7C')&&!isHexColor('#GGGGGG'),'partial or non-hex input is rejected');
equal(normalizeHexColor('#abc'),'#AABBCC','short codes expand to a full colour');
equal(nameColorPaletteMatch('#123456'),undefined,'a typed colour outside the palette has no active swatch');

// Frames must survive the redesigned surfaces, not only the 16:9 card.
for(const [width,height,corner] of [[358,168,46],[104,104,27],[96,96,14],[480,270,36]] as const){
 const segments=profileFrameSegments(width,height,16/9,corner);
 equal(segments.length,16,`a ${width}x${height} surface keeps all 16 frame segments`);
 ok(segments.every(row=>row.width>=0&&row.height>=0),'no frame segment may have a negative size');
 const right=Math.max(...segments.map(row=>row.x+row.width)),bottom=Math.max(...segments.map(row=>row.y+row.height));
 ok(Math.abs(right-width)<.01&&Math.abs(bottom-height)<.01,`the frame must cover the whole ${width}x${height} surface`);
}
equal(profileFrameSegments(104,104,16/9,0).length,0,'a frame with no corner budget renders nothing instead of dividing by zero');
const stageCorner=profileFrameSegments(358,168,16/9,46)[0],tileCorner=profileFrameSegments(104,104,16/9,14)[0];
ok(stageCorner.width>tileCorner.width,'the stage frame uses a heavier corner than a wardrobe tile');

// Every surface that draws a frame, smallest to largest: a collection chip, the collapsed
// stage strip, a wardrobe tile, the customize stage, a phone showcase card and a tablet one.
// With no corner passed, the ornament has to come from the card itself.
const SURFACES=[[44,44],[358,58],[104,104],[358,168],[343,205],[480,270]] as const;
let previousCorner=0;
for(const [width,height] of SURFACES){
 const segments=profileFrameSegments(width,height);
 equal(segments.length,16,`a ${width}x${height} surface sizes its own frame`);
 const right=Math.max(...segments.map(row=>row.x+row.width)),bottom=Math.max(...segments.map(row=>row.y+row.height));
 ok(Math.abs(right-width)<.01&&Math.abs(bottom-height)<.01,`the self-sized frame must cover the whole ${width}x${height} surface`);
 const corner=segments[0];
 ok(corner.width<=width*.2501&&corner.height<=height*.2501,`a ${width}x${height} card must not be swallowed by its own frame corner`);
 ok(corner.height>previousCorner,`the frame corner has to grow with the card, not stay a constant (${width}x${height})`);
 previousCorner=corner.height;
}
equal(profileFrameCorner(0,168),0,'a card with no width has no corner to draw');
ok(profileFrameCorner(2000,1200)<=72,'a very large card stops growing its ornament');
ok(profileFrameCorner(30,30)>=11,'a tiny card still draws a visible corner');
const autoStage=profileFrameSegments(358,168)[0],lightStage=profileFrameSegments(358,168,16/9,20)[0];
ok(lightStage.height<autoStage.height*.6,'an explicit corner still overrides the self-sized one');

console.log('PASS: wardrobe chips, locked sources, one-family selection, colour picker and frame geometry');

const originalLook={icon:'starter:hooded-ranger',scene:'asterfall-night',frame:'',effect:'',pet:'',title:'Adventurer'};
const newLook={...originalLook,icon:'starter:runic-scholar'};
const backgroundEdit={...originalLook,scene:'bg_veilbreak'};
const rebasedLook={...newLook,...wardrobeChanges(originalLook,backgroundEdit)};
equal(rebasedLook.icon,newLook.icon,'stale background edit cannot replace account icon');
equal(rebasedLook.scene,'bg_veilbreak','requested background edit survives rebase');
equal(wardrobeChanges(newLook,originalLook).icon,originalLook.icon,'explicit undo still restores previous icon');


// Seasonal wardrobe rows are revealed only by the matching enabled event window.
const frostStart=Date.UTC(2026,11,3),frostEnd=Date.UTC(2026,11,27),frostGrace=Date.UTC(2026,11,29);
const frostRuntime={eventId:'EVT_ANNUAL_012_2026',enabled:true,startsAtMs:frostStart,endsAtMs:frostEnd,graceEndsAtMs:frostGrace};
const frostState={...state,account:{...state.account,liveEvent:frostRuntime}};
const frostAssets:WardrobeAssets={...assets,scenes:[...assets.scenes,{id:'bg_frostfall',name:'Aurora Winter Sky'}],frames:[...assets.frames,'frame_frostfall_aurora_bellframe']};
const seasonalIds=['bg_frostfall','frame_frostfall_aurora_bellframe','title_frostfall_guest','title_winter_light','title_hearth_guest','title_bellringer','title_aurora_walker'];
for(const [nowMs,reveal] of [[frostStart-1,false],[frostStart,true],[frostEnd,true],[frostGrace-1,true],[frostGrace,false]] as const){
 const rows=profileWardrobe(frostState,frostAssets,{nowMs}).flatMap(group=>group.rows);
 for(const id of seasonalIds)equal(rows.some(row=>row.id===id),reveal,'Frostfall visibility '+id+' at '+nowMs);
}
const frostOwned={...frostState,account:{...frostState.account,liveEvent:undefined,unlockedProfileBackgroundIds:['bg_frostfall'],unlockedProfileBorderIds:['frame_frostfall_aurora_bellframe'],unlockedTitleIds:['title_frostfall_guest']}};
const afterFrost=profileWardrobe(frostOwned,frostAssets,{nowMs:frostGrace}).flatMap(group=>group.rows);
for(const id of seasonalIds.slice(0,3))ok(afterFrost.some(row=>row.id===id&&row.unlocked),'Earned Frostfall wardrobe item persists '+id);
ok(!afterFrost.some(row=>row.id==='title_winter_light'),'Unearned title remains hidden after closure');
console.log('PASS: Frostfall scenes, frames and titles follow event boundaries and permanent ownership');
