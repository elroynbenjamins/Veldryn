const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backendSource = path.resolve(__dirname, '../../backend/src');

// The mobile runtime reuses shared source modules from backend/src.
// Keep only the source directory visible to Metro. backend/node_modules is
// intentionally excluded from EAS builds and must not be registered as a
// watch folder or resolver path.
config.watchFolders = [...new Set([
  ...(config.watchFolders || []),
  backendSource,
])];

module.exports = config;
