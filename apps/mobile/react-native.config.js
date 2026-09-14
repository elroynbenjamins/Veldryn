// Expo's Android namespace is expo.core, but its ReactPackage class lives in
// expo.modules. Keep autolinking explicit when resolving pnpm package symlinks.
module.exports = {
  dependencies: {
    expo: {
      platforms: {
        android: { packageImportPath: 'import expo.modules.ExpoModulesPackage;' },
      },
    },
  },
};
