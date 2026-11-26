/** Small, visual-only screen transitions. Navigation and screen mounting stay immediate. */
export type ScreenTransitionKind='none'|'primary'|'detail'|'return'|'dungeon';

export const SCREEN_TRANSITION_PRESETS:Readonly<Record<ScreenTransitionKind,{durationMs:number;startOpacity:number}>>={
 none:{durationMs:0,startOpacity:1},
 primary:{durationMs:130,startOpacity:.78},
 detail:{durationMs:185,startOpacity:.62},
 return:{durationMs:155,startOpacity:.72},
 dungeon:{durationMs:245,startOpacity:.20},
};

const PRIMARY_ROUTES=new Set(['Home','Character','Skills','World','Inventory','More']);

/** Only the incoming content fades; top/bottom bars and chat never move. */
export function screenTransitionFor(from:string,to:string,back=false):ScreenTransitionKind {
 if(from===to)return 'none';
 if(back)return 'return';
 if(to==='Coop')return 'dungeon';
 if(PRIMARY_ROUTES.has(to))return 'primary';
 return 'detail';
}
