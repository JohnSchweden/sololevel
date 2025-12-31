const { withDangerousMod, AndroidConfig } = require('@expo/config-plugins')
const fs = require('node:fs')
const path = require('node:path')

const PROGUARD_RULES = `
# expo-image: Prevent R8 from optimizing image helper classes
# Fixes IncompatibleClassChangeError with ResourceDrawableIdHelper.getResourceDrawableUri
# This error occurs when R8 optimizes method calls incorrectly in production builds,
# changing static method calls to instance calls or vice versa

# Preserve attributes needed to prevent method signature changes
-keepattributes Signature
-keepattributes *Annotation*
-keepattributes MethodParameters

# Disable optimizations that can convert methods between static and virtual
-optimizations !code/simplification/advanced,!code/simplification/cast,!method/inlining/*,!class/merging/*,!method/marking/static

# Keep ALL expo.modules.image classes completely intact
# Prevent any optimization, shrinking, or obfuscation
-keep,allowshrinking,allowobfuscation class expo.modules.image.** { *; }
-keep class expo.modules.image.** { *; }
-keepclassmembers class expo.modules.image.** { *; }

# Keep ALL com.facebook.react.views.imagehelper classes completely intact
-keep,allowshrinking,allowobfuscation class com.facebook.react.views.imagehelper.** { *; }
-keep class com.facebook.react.views.imagehelper.** { *; }
-keepclassmembers class com.facebook.react.views.imagehelper.** { *; }

# Specifically protect expo.modules.image.ResourceIdHelper
# This is the class that appears in the error stack trace
-keep class expo.modules.image.ResourceIdHelper {
    *;
}
-keepclassmembers class expo.modules.image.ResourceIdHelper {
    public <methods>;
    public <fields>;
    android.net.Uri getResourceDrawableUri(...);
    android.net.Uri getResourceUri(...);
}

# Specifically protect com.facebook.react.views.imagehelper.ResourceDrawableIdHelper
# This prevents R8 from changing method signatures (static vs instance)
-keep class com.facebook.react.views.imagehelper.ResourceDrawableIdHelper {
    *;
}
-keepclassmembers class com.facebook.react.views.imagehelper.ResourceDrawableIdHelper {
    public <methods>;
    public <fields>;
    android.net.Uri getResourceDrawableUri(android.content.Context, java.lang.String);
}

# Keep inner classes and nested classes
-keep class expo.modules.image.**$* { *; }
-keep class com.facebook.react.views.imagehelper.**$* { *; }

# Prevent R8 from devirtualizing or staticizing methods in these classes
-keepclasseswithmembers class expo.modules.image.** {
    <methods>;
}
-keepclasseswithmembers class com.facebook.react.views.imagehelper.** {
    <methods>;
}

# Glide library: Prevent R8 from breaking Glide's model provider and class initialization
# This is critical for expo-image-loader which uses Glide internally
-keep public class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.AppGlideModule {
    <init>(...);
}
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
    **[] $VALUES;
    public *;
}
-keep class com.bumptech.glide.load.data.ParcelFileDescriptorRewinder$InternalRewinder {
    *** rewind();
}

# Glide: Keep model loaders and their factories
-keep class * implements com.bumptech.glide.load.model.ModelLoader {
    *;
}
-keep class * implements com.bumptech.glide.load.model.ModelLoaderFactory {
    *;
}

# Glide: Prevent R8 from breaking reflection-based Glide configuration
-keepnames class * implements com.bumptech.glide.GeneratedAppGlideModule
-keep class com.bumptech.glide.GeneratedAppGlideModule
-keepnames class * extends com.bumptech.glide.GeneratedRequestManagerFactory

# Glide: Keep resource decoders and encoders
-keep class * implements com.bumptech.glide.load.ResourceDecoder {
    *;
}
-keep class * implements com.bumptech.glide.load.ResourceEncoder {
    *;
}

# Glide: Prevent issues with annotation processors
-dontwarn com.bumptech.glide.annotation.compiler.*

# expo-image-loader: Keep classes that interface with Glide
-keep class expo.modules.imageloader.** { *; }
-keepclassmembers class expo.modules.imageloader.** {
    public <methods>;
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
