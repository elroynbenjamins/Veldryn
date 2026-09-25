import {compareAppVersions,evaluateAppRelease,type AppReleasePolicy} from '../src/core/app-release';

function fail(message:string):never{throw new Error(message)}
function equal(actual:unknown,expected:unknown,message:string){if(actual!==expected)fail(message+': expected '+String(expected)+', got '+String(actual))}

const policy:AppReleasePolicy={
  channel:'production',
  latestVersion:'1.4.2',
  minimumVersion:'1.3.8',
  updateTitle:'Update',
  updateMessage:'Update required',
  maintenanceMode:false,
  maintenanceTitle:'Maintenance',
  maintenanceMessage:'Back soon',
};

equal(compareAppVersions('1.4.2','1.4.2'),0,'equal versions compare equally');
equal(compareAppVersions('1.4.10','1.4.2'),1,'numeric version segments compare numerically');
equal(compareAppVersions('1.3.7','1.3.8'),-1,'older patch compares lower');
equal(evaluateAppRelease(policy,'1.3.7').status,'required','below-minimum build is blocked');
equal(evaluateAppRelease(policy,'1.3.8').status,'optional','supported older build gets a soft update state');
equal(evaluateAppRelease(policy,'1.4.2').status,'ok','latest semantic version stays open');
equal(evaluateAppRelease({...policy,latestBuild:12,minimumBuild:10},'1.4.2',Date.now(),9).status,'required','native build below minimum is blocked');
equal(evaluateAppRelease({...policy,latestBuild:12,minimumBuild:10},'1.4.2',Date.now(),10).status,'optional','supported native build below latest stays optional');
equal(evaluateAppRelease({...policy,latestBuild:12,minimumBuild:10},'1.4.2',Date.now(),12).status,'ok','latest native build stays open');
equal(evaluateAppRelease({...policy,forceAfterMs:2_000},'1.4.1',1_999).status,'optional','force-after stays soft before deadline');
equal(evaluateAppRelease({...policy,forceAfterMs:2_000},'1.4.1',2_000).status,'required','force-after blocks older latest versions at deadline');
equal(evaluateAppRelease({...policy,maintenanceMode:true},'1.4.2').status,'maintenance','maintenance overrides current version');

console.log('PASS: app release policy evaluation validates');
