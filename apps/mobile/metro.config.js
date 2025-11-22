// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require("path");

// Find the project and workspace directories
const projectRoot = __dirname;
// This can be replaced with `find-yarn-workspace-root`
const monorepoRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo and the local package
config.watchFolders = [
  path.resolve(monorepoRoot, "apps", "mobile"),
  // Add other specific packages you import
];
// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

// Add custom configuration for ESM packages
config.resolver = {
  ...config.resolver,
  sourceExts: [...config.resolver.sourceExts, "mjs", "cjs", "sql"],
};


module.exports = config;
