const { withDangerousMod, AndroidConfig } = require('@expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const PROGUARD_RULES = `
# expo-image: Prevent R8 from optimizing image helper classes
# Fixes IncompatibleClassChangeError with ResourceDrawableIdHelper.getResourceDrawableUri
# This error occurs when R8 optimizes method calls incorrectly in production builds,
# changing static method calls to instance calls or vice versa
-keep class expo.modules.image.** { *; }
-keep class com.facebook.react.views.imagehelper.** { *; }

# Keep ResourceDrawableIdHelper class and all its members completely intact
# This prevents R8 from changing method signatures (static vs instance)
-keep class com.facebook.react.views.imagehelper.ResourceDrawableIdHelper {
    *;
}

# Specifically preserve the getResourceDrawableUri method signature
# This method is called by expo-image and must remain exactly as defined
# The -keepclassmembers rule ensures R8 doesn't change static/instance method calls
-keepclassmembers class com.facebook.react.views.imagehelper.ResourceDrawableIdHelper {
    android.net.Uri getResourceDrawableUri(android.content.Context, java.lang.String);
}
`

/**
 * Adds custom ProGuard rules to prevent R8 from over-optimizing expo-image
 * @param {import('@expo/config-plugins').ExportedConfig} config
 * @returns {import('@expo/config-plugins').ExportedConfig}
 */
const withProguardRules = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const proguardPath = path.join(
        config.modRequest.platformProjectRoot,
        'app',
        'proguard-rules.pro'
      )

      // Read existing ProGuard rules
      let proguardContent = ''
      if (fs.existsSync(proguardPath)) {
        proguardContent = fs.readFileSync(proguardPath, 'utf8')
      }

      // Only add if not already present
      if (!proguardContent.includes('expo-image: Prevent R8')) {
        proguardContent += '\n' + PROGUARD_RULES
        fs.writeFileSync(proguardPath, proguardContent, 'utf8')
        console.log('✅ Added custom ProGuard rules for expo-image')
      } else {
        console.log('ℹ️  Custom ProGuard rules already present')
      }

      return config
    },
  ])
}

module.exports = withProguardRules
