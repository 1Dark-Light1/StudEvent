const { getDefaultConfig } = require('expo/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

// Добавляем поддержку .cjs, если нужно
defaultConfig.resolver.sourceExts.push('cjs');

module.exports = defaultConfig;