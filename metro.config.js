const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Support .cjs files
defaultConfig.resolver.sourceExts.push('cjs');

module.exports = defaultConfig;