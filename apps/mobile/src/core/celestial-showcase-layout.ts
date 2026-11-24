/** Geometry contract for the reviewed Celestial showcase. No entitlement or stat logic. */
export const CELESTIAL_STAGE={width:340,height:205,minWidth:300,maxWidth:480,maxFontScale:1.2} as const;
export const CELESTIAL_PET_BOX={
 matching:{x:244,y:76,width:70,height:99},
 alternate:{x:261,y:101,width:46,height:46},
 glow:{x:264,y:143,width:40,height:9},
} as const;
export type CelestialPetMode='matching'|'alternate'|'none';
/** Match by trusted equipped ID, never by owned status, display name or preview artwork. */
export function celestialPetMode(equippedPetId:string|null|undefined,matchingPetId:string,hasAlternateArt:boolean):CelestialPetMode{
 if(!equippedPetId)return 'none';
 if(matchingPetId&&equippedPetId===matchingPetId)return 'matching';
 return hasAlternateArt?'alternate':'none';
}
export function celestialStageSupported(width:number,fontScale:number){
 return Number.isFinite(width)&&width>=CELESTIAL_STAGE.minWidth&&width<=CELESTIAL_STAGE.maxWidth&&Number.isFinite(fontScale)&&fontScale>0&&fontScale<=CELESTIAL_STAGE.maxFontScale;
}
