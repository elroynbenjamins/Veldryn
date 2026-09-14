import {coopClient,type CoopEntryData} from './coop-client';
import {presentQModeRun} from '../core/coop-qmode';

export interface CoopEntrySource{kind:'real'|'fixture';load:()=>Promise<CoopEntryData>}
export const realCoopEntrySource:CoopEntrySource={kind:'real',load:async()=>{const entry=await coopClient.entry();return {...entry,activeRun:entry.activeRunProjection?presentQModeRun(entry.activeRunProjection):entry.activeRun};}};
