const {withAndroidManifest}=require('expo/config-plugins');

/** VELDRYN is a portrait-first MMORPG. Declare Android's native game category.
 * Expo prebuild regenerates AndroidManifest.xml for EAS builds.
 */
module.exports=function withVeldrynGameCategory(config){
 return withAndroidManifest(config,mod=>{
  const application=mod.modResults.manifest.application?.[0];
  if(!application)throw new Error('VELDRYN: Android application manifest entry is missing.');
  application.$={...(application.$??{}),'android:appCategory':'game'};
  return mod;
 });
};
