/**
 * Narrow offline report only. A typical Galaxy S24+ portrait viewport is
 * around 384 logical pixels, so 384 and wider must retain the standard UI.
 * A smaller available window (including split-screen) can use the compact UI.
 */
export const COMPACT_OFFLINE_REPORT_BELOW_DP=384;

export function shouldUseCompactOfflineReport(welcomeBack:boolean,width:number):boolean{
 return welcomeBack&&Number.isFinite(width)&&width>0&&width<COMPACT_OFFLINE_REPORT_BELOW_DP;
}
