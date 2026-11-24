/** Draconic Dominion: private grant-only Ultra Luxe II. */
export const DRACONIC_IDS={
 background:'ascendant-draconic-dominion-of-ash',
 border:'ascendant-draconic-throne-of-embers',
 pet:'ascendant-draconic-vharaxis',
 showcase:'ascendant-draconic-awakening-of-the-dragon',
 badge:'ascendant_draconic_sovereign',
} as const;
export const DRACONIC_COLLECTION={
 id:'ascendant-draconic-dominion',
 name:'Draconic Dominion',
 backgroundName:'Dominion of Ash',
 borderName:'Throne of Embers',
 petName:'Vharaxis, the Eternal Flame',
 showcaseName:'Awakening of the Dragon',
 badgeName:'Dragon Sovereign',
} as const;
export const DRACONIC_STAGE={width:340,height:205,minWidth:300,maxWidth:480,maxFontScale:1.1} as const;
export const DRACONIC_BOXES={
 dragon:{x:24,y:50,w:125,h:106},
 ring:{x:28,y:141,w:116,h:21},
 alternate:{x:63,y:79,w:46,h:46},
 glow:{x:65,y:122,w:42,h:10},
 flames:{x:22,y:49,w:128,h:116},
 portrait:{x:182,y:61,w:39,h:39},
 badges:{x:226,y:69,w:77,h:27},
 identity:{x:182,y:103,w:122,h:40},
 plate:{x:175,y:59,w:133,h:86},
 guild:{x:188,y:146,w:113,h:19},
} as const;
export function draconicPair(background:string|null|undefined,border:string|null|undefined){
 return background===DRACONIC_IDS.background&&border===DRACONIC_IDS.border;
}
export function draconicPetMode(pet:string|null|undefined,alternateArt:boolean){
 return pet===DRACONIC_IDS.pet?'matching':pet&&alternateArt?'alternate':'none';
}
export function draconicStageSupported(width:number,fontScale:number){
 return Number.isFinite(width)&&width>=300&&width<=480&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=DRACONIC_STAGE.maxFontScale;
}
