const {withAndroidManifest,withStringsXml}=require('expo/config-plugins');

const PLAY_GAMES_APP_ID='com.google.android.gms.games.APP_ID';

function projectId(){
  return (process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID||'').trim();
}

module.exports=function withVeldrynGoogleServices(config){
  const id=projectId();

  config=withAndroidManifest(config,config=>{
    const application=config.modResults.manifest.application?.[0];
    if(!application)throw new Error('VELDRYN Google Services: Android application manifest entry is missing.');

    application['meta-data']=(application['meta-data']||[])
      .filter(item=>item.$?.['android:name']!==PLAY_GAMES_APP_ID);

    if(id){
      application['meta-data'].push({$:{
        'android:name':PLAY_GAMES_APP_ID,
        'android:value':'@string/game_services_project_id',
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
