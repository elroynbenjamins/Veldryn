import {createCharacter,newGame} from '../src/core/game';
import {
 applyWardrobeEquipped,profileWardrobe,wardrobeEquipped,wardrobeLockTag,wardrobeProgress,wardrobeSelection,
 WARDROBE_KINDS,type WardrobeAssets,
} from '../src/core/profile-wardrobe';
import {isHexColor,NAME_COLOR_PALETTE,nameColorPaletteMatch,normalizeHexColor} from '../src/core/player-name-style';
import {profileFrameCorner,profileFrameSegments} from '../src/core/profile-frame-layout';

function fail(message:string):never{throw new Error(message)}
function ok(value:unknown,message:string){if(!value)fail(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

const assets:WardrobeAssets={
 scenes:[{id:'asterfall-night',name:'Asterfall Night'},{id:'bg_veilbreak',name:'Veilbreak Gothic Moonruins'}],
 frames:['frame_gloamward','guild-border-silver'],
};
let state=createCharacter(newGame(0),'IRONWARDEN','Wardrobe Test');

const categories=profileWardrobe(state,assets);
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
equal(frames.total,assets.frames.length,'the clear choice is excluded from the frame total');
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
const titled=wardrobeSelection(equipped,{kind:'title',id:'pathfinder',name:'Pathfinder'});
equal(titled.title,'Pathfinder','titles are stored by their display name');

const applied=applyWardrobeEquipped(state,next);
equal(applied.character!.profileBackgroundId,'bg_veilbreak','applying writes the character record');
equal(applied.character!.profileBorderId,undefined,'an empty frame clears rather than stores an empty id');
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
