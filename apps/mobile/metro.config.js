const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const backend = path.resolve(__dirname, '../../backend');
// The companion runtime reuses shared combat/domain modules outside this app.
// Watch only those sources and their dependencies, not generated build outputs.
config.watchFolders = [...new Set([
  ...(config.watchFolders || []),
  path.join(backend, 'src'),
  path.join(backend, 'node_modules'),
])];
config.resolver.nodeModulesPaths = [...new Set([
  ...(config.resolver.nodeModulesPaths || []),
  path.join(__dirname, 'node_modules'),
  path.join(backend, 'node_modules'),
])];

module.exports = config;
