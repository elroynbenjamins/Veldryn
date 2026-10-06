const {withAndroidManifest,withStringsXml}=require('expo/config-plugins');

const PLAY_GAMES_APP_ID='com.google.android.gms.games.APP_ID';
const SUPPRESS_PROFILE_CREATION='com.google.android.gms.games.SUPPRESS_GAME_PROFILE_CREATION';

function projectId(){
  return (process.env.EXPO_PUBLIC_GOOGLE_PLAY_GAMES_PROJECT_ID||'').trim();
}

module.exports=function withVeldrynPlayGames(config){
  const id=projectId();

  config=withAndroidManifest(config,config=>{
    const application=config.modResults.manifest.application?.[0];
    if(!application)throw new Error('VELDRYN Play Games: Android application manifest entry is missing.');

    application['meta-data']=(application['meta-data']||[])
      .filter(item=>![PLAY_GAMES_APP_ID,SUPPRESS_PROFILE_CREATION].includes(item.$?.['android:name']));

    if(id){
      application['meta-data'].push(
        {$:{
          'android:name':PLAY_GAMES_APP_ID,
          'android:value':'@string/game_services_project_id',
        }},
        {$:{
          'android:name':SUPPRESS_PROFILE_CREATION,
          'android:value':'true',
        }},
      );
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
