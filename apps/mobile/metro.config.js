const fs = require('node:fs');
const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backendSource = path.resolve(__dirname, '../../backend/src');

// Local development can reuse shared source modules from backend/src.
// EAS builds upload apps/mobile as the project root, so backend/src may not
// exist in the build workspace. Only register it with Metro when present.
if (fs.existsSync(backendSource)) {
  config.watchFolders = [...new Set([
    ...(config.watchFolders || []),
    backendSource,
  ])];
}

module.exports = config;
