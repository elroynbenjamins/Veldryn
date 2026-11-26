const {withAndroidManifest}=require('expo/config-plugins');

/** VELDRYN is a portrait-first MMORPG. Declare Android's native game category.
 * Expo prebuild regenerates AndroidManifest.xml for EAS builds.
 */
module.exports=function withVeldrynGameCategory(config){
 return withAndroidManifest(config,mod=>{
  const application=mod.modResults.manifest.application?.[0];
  if(!application)throw new Error('VELDRYN: Android application manifest entry is missing.');
  application.$={...(application.$??{}),'android:appCategory':'game'};
  // Portrait remains the preferred layout, but is not a Play hardware requirement.
  // This prevents a screenOrientation="portrait" activity from filtering out
  // devices such as fixed-landscape desktops during Play Console validation.
  const features=mod.modResults.manifest['uses-feature']??[];
  const portraitName='android.hardware.screen.portrait';
  const existing=features.find(feature=>feature.$?.['android:name']===portraitName);
  if(existing){
    existing.$={...existing.$,'android:required':'false'};
  }else{
    mod.modResults.manifest['uses-feature']=[
      ...features,
      {$:{'android:name':portraitName,'android:required':'false'}},
    ];
  }
  return mod;
 });
};
