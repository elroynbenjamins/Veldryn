export type CoopMode='qmode'|'live';
export interface CoopRouteOptionView {nodeId:string;title:string;kind:string;risk:string;reward:string;votes?:number;hidden?:boolean;}
export interface CoopRunView {runId:string;mode:CoopMode;modeLabel?:string;phase:string;syncedLevel:number;roleSlots:Array<{role:'tank'|'damage'|'support';name:string;echo:boolean;ready?:boolean}>;options:CoopRouteOptionView[];rewardText?:string;stateVersion?:number;decisionId?:string;decisionRevision?:number;resolvesAtMs?:number;}
export function validateCoopRunView(view:CoopRunView):void{
 if(view.roleSlots.length!==4||view.roleSlots.filter(slot=>slot.role==='tank').length!==1||view.roleSlots.filter(slot=>slot.role==='damage').length!==2||view.roleSlots.filter(slot=>slot.role==='support').length!==1)throw new Error('invalid_role_slots');
 if(!Number.isInteger(view.syncedLevel)||view.syncedLevel<1||view.roleSlots.some(slot=>!slot.name.trim()))throw new Error('invalid_run_summary');
 if(view.options.length>0&&view.options.length<3&&!(view.options.length===1&&view.options[0].kind==='boss'))throw new Error('insufficient_route_options');
 if(new Set(view.options.map(option=>option.nodeId)).size!==view.options.length||view.options.some(option=>!option.nodeId.trim()||!option.title.trim()||!option.kind.trim()||!option.risk.trim()||!option.reward.trim()))throw new Error('invalid_route_options');
 if(view.mode==='qmode'&&view.options.some(option=>option.votes!==undefined))throw new Error('qmode_cannot_show_votes');
}
export function liveAffordances(mode:CoopMode):{ready:boolean;votes:boolean;chat:boolean}{return mode==='live'?{ready:true,votes:true,chat:true}:{ready:false,votes:false,chat:false};}
