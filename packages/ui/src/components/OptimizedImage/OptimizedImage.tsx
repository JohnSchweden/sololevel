import { Image as ExpoImage, type ImageProps as ExpoImageProps } from 'expo-image'
import { type ComponentProps } from 'react'
import { type ImageStyle, Platform, Image as RNImage } from 'react-native'

/**
 * Maps expo-image contentFit to React Native resizeMode
 */
const contentFitToResizeMode = (
  contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
): 'cover' | 'contain' | 'stretch' | 'center' => {
  switch (contentFit) {
    case 'cover':
      return 'cover'
    case 'contain':
    case 'scale-down':
      return 'contain'
    case 'fill':
      return 'stretch'
    case 'none':
      return 'center'
    default:
      return 'cover'
  }
}

export type OptimizedImageProps = ExpoImageProps

/**
 * OptimizedImage - Platform-aware Image component
 *
 * - iOS: Uses expo-image (full feature set, works correctly)
 * - Android: Uses React Native Image (avoids expo-image crash with local resources)
 *
 * This is a workaround for expo-image calling ResourceDrawableIdHelper.getResourceDrawableUri
 * as a static method, which crashes on React Native 0.79+ where it's an instance method.
 */
export function OptimizedImage({
  source,
  style,
  contentFit = 'cover',
  transition,
  cachePolicy,
  priority,
  testID,
  accessibilityLabel,
  onLoad,
  onError,
  ...rest
}: OptimizedImageProps) {
  // iOS: Use expo-image (works correctly)
  if (Platform.OS === 'ios') {
    return (
      <ExpoImage
        source={source}
        style={style}
        contentFit={contentFit}
        transition={transition}
        cachePolicy={cachePolicy}
        priority={priority}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        onLoad={onLoad}
        onError={onError}
        {...rest}
      />
    )
  }

  // Android: Use React Native Image to avoid crash
  // Convert expo-image props to React Native Image props
  const resizeMode = contentFitToResizeMode(contentFit)

  // Handle different source types
  // expo-image accepts: number (require), { uri: string }, string
  // RN Image accepts: number (require), { uri: string }
  let rnSource: ComponentProps<typeof RNImage>['source']

  if (typeof source === 'number') {
    // Local require() - this is what causes the crash in expo-image
    rnSource = source
  } else if (typeof source === 'string') {
    // URL string - convert to { uri } format
    rnSource = { uri: source }
  } else if (source && typeof source === 'object' && 'uri' in source) {
    // Already { uri: string } format
    rnSource = source as { uri: string }
  } else {
    // Fallback for other formats
    rnSource = source as ComponentProps<typeof RNImage>['source']
  }

  return (
    <RNImage
      source={rnSource}
      style={style as ImageStyle}
      resizeMode={resizeMode}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      onLoad={onLoad ? () => onLoad({} as any) : undefined}
      onError={onError ? () => onError({} as any) : undefined}
      // Note: transition, cachePolicy, priority are expo-image specific
      // RN Image has built-in caching, no transition animation
    />
  )
}
