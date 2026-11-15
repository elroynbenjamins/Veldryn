const fs = require('node:fs');
const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backendSource = path.resolve(__dirname, '../../backend/src');
const sharedPackages = path.resolve(__dirname, '../../packages');
const appNodeModules = path.resolve(__dirname, 'node_modules');

// Shared backend source is bundled by the mobile app in some runtime paths.
// EAS does not install backend/node_modules, so any package imported by that
// shared source must resolve from the mobile app's installed dependencies.
config.resolver.nodeModulesPaths = [...new Set([
  ...(config.resolver.nodeModulesPaths || []),
  appNodeModules,
])];

// The mobile bundle imports both backend source and the shared Guild Shop
// catalogue. EAS and Android CI must include those sources in the archive.
// Never watch backend/node_modules or other installed workspaces.
const sharedSources = [backendSource, sharedPackages].filter(folder => fs.existsSync(folder));
if (sharedSources.length) {
  config.watchFolders = [...new Set([
    ...(config.watchFolders || []),
    ...sharedSources,
  ])];
}

module.exports = config;
