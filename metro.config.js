const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

// Add resolver for platform constants
config.resolver.platforms = ["native", "android", "ios", "web"]

// Handle the PlatformConstants issue
config.resolver.alias = {
  ...config.resolver.alias,
  "react-native/Libraries/Utilities/Platform": "react-native/Libraries/Utilities/Platform.js",
}

// Add support for additional file extensions
config.resolver.assetExts.push("db", "mp3", "ttf", "obj", "png", "jpg")

// Ensure proper handling of native modules
config.transformer.minifierConfig = {
  keep_fnames: true,
  mangle: {
    keep_fnames: true,
  },
}

module.exports = config
