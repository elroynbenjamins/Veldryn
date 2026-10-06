const {withAndroidManifest,withStringsXml}=require('expo/config-plugins');

const PLAY_GAMES_APP_ID='com.google.android.gms.games.APP_ID';
const PLAY_GAMES_PROVIDER='com.google.android.gms.games.provider.PlayGamesInitProvider';
const TOOLS_NS='http://schemas.android.com/tools';

function projectId(){
  return (process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID||'').trim();
}

module.exports=function withVeldrynGoogleServices(config){
  const id=projectId();

  config=withAndroidManifest(config,config=>{
    const manifest=config.modResults.manifest;
    manifest.$=manifest.$||{};
    manifest.$['xmlns:tools']=TOOLS_NS;
    const application=manifest.application?.[0];
    if(!application)throw new Error('VELDRYN Google Services: Android application manifest entry is missing.');

    application['meta-data']=(application['meta-data']||[])
      .filter(item=>item.$?.['android:name']!==PLAY_GAMES_APP_ID);
    application.provider=(application.provider||[])
      .filter(item=>item.$?.['android:name']!==PLAY_GAMES_PROVIDER);

    if(id){
      application['meta-data'].push({$:{
        'android:name':PLAY_GAMES_APP_ID,
        'android:value':'@string/game_services_project_id',
      }});
    }else{
      // play-services-games-v2 auto-registers this provider. Without a configured
      // project id, remove it so ordinary Google account sign-in remains usable.
      application.provider.push({$:{
        'android:name':PLAY_GAMES_PROVIDER,
        'tools:node':'remove',
      }});
    }
    return config;
  });

  config=withStringsXml(config,config=>{
    const resources=config.modResults.resources;
    resources.string=(resources.string||[])
      .filter(item=>item.$?.name!=='game_services_project_id');
    if(id){
      resources.string.push({
        $:{name:'game_services_project_id',translatable:'false'},
        _:id,
      });
    }
    return config;
  });

  return config;
};
