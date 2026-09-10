import {coopClient,type CoopEntryData} from './coop-client';

export interface CoopEntrySource{kind:'real'|'fixture';load:()=>Promise<CoopEntryData>}
export const realCoopEntrySource:CoopEntrySource={kind:'real',load:()=>coopClient.entry()};
