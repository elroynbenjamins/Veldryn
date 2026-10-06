const fs = require('node:fs');
const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backendSource = path.resolve(__dirname, '../../backend/src');
const appNodeModules = path.resolve(__dirname, 'node_modules');

// Shared backend source is bundled by the mobile app in some runtime paths.
// EAS does not install backend/node_modules, so any package imported by that
// shared source must resolve from the mobile app's installed dependencies.
config.resolver.nodeModulesPaths = [...new Set([
  ...(config.resolver.nodeModulesPaths || []),
  appNodeModules,
])];

// Only watch backend source when it is present in the build workspace.
// Never add backend/node_modules: EAS intentionally does not upload/install it.
if (fs.existsSync(backendSource)) {
  config.watchFolders = [...new Set([
    ...(config.watchFolders || []),
    backendSource,
  ])];
}

module.exports = config;
