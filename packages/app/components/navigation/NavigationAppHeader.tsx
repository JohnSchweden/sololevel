import type { NativeStackHeaderProps } from '@react-navigation/native-stack'
import { AppHeader, type AppHeaderProps } from '@ui/components/AppHeader'
import { useMemo } from 'react'
import { Platform, StyleSheet, View, useColorScheme } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'tamagui'

/**
 * Custom header options extended onto React Navigation options
 */
export type NavAppHeaderOptions = {
  appHeaderProps?: Partial<AppHeaderProps>
}

/**
 * NavigationAppHeader
 * Adapter that bridges React Navigation's header API with the custom AppHeader component
 * Works on Web, iOS, and Android without absolute positioning or fake safe-area hacks
 *
 * Usage in _layout.tsx:
 * ```tsx
 * <Stack.Screen
 *   name="route-name"
 *   options={{
 *     headerShown: true,
 *     header: (props) => <NavigationAppHeader {...props} />,
 *   }}
 * />
 * ```
 *
 * Dynamic state updates from screen:
 * ```tsx
 * useLayoutEffect(() => {
 *   navigation.setOptions({
 *     appHeaderProps: { mode, showTimer, timerValue, onMenuPress }
 *   })
 * }, [deps])
 * ```
 */
export function NavigationAppHeader(props: NativeStackHeaderProps) {
  const { navigation, back, options, route } = props
  const navOptions = options as unknown as NavAppHeaderOptions
  const colorScheme = useColorScheme()

  const tintColor = options.headerTintColor ?? undefined
  const isTransparent = options.headerTransparent ?? false
  const headerStyle = options.headerStyle
  const backgroundColor =
    typeof headerStyle === 'object' && headerStyle && 'backgroundColor' in headerStyle
      ? (headerStyle.backgroundColor ?? 'transparent')
      : 'transparent'
  const titleAlignment = options.headerTitleAlign === 'left' ? 'left' : 'center'

  const computedLeftAction = back ? 'back' : 'sidesheet'

  const appHeaderProps: AppHeaderProps = useMemo(() => {
    const override = navOptions.appHeaderProps ?? {}

    const leftSlot =
      override.leftSlot ??
      (options.headerLeft
        ? options.headerLeft({
            canGoBack: Boolean(back),
            label: options.headerBackTitle,
            tintColor,
          })
        : undefined)

    const rightSlot =
      override.rightSlot ??
      (options.headerRight
        ? options.headerRight({
            tintColor,
          })
        : undefined)

    const titleSlot =
      override.titleSlot ??
      (options.headerTitle && typeof options.headerTitle === 'function'
        ? options.headerTitle({
            children: typeof options.title === 'string' ? options.title : route.name,
            tintColor,
          })
        : undefined)

    return {
      title: typeof options.title === 'string' ? options.title : (override.title ?? route.name),
      mode: override.mode ?? 'default',
      showTimer: override.showTimer ?? false,
      timerValue: override.timerValue ?? '00:00:00',
      onBackPress: override.onBackPress ?? (back ? () => navigation.goBack() : undefined),
      onMenuPress: override.onMenuPress,
      onNotificationPress: override.onNotificationPress,
      notificationBadgeCount: override.notificationBadgeCount ?? 0,
      cameraProps: override.cameraProps,
      titleAlignment: override.titleAlignment ?? titleAlignment,
      leftAction: override.leftAction ?? (leftSlot ? 'none' : computedLeftAction),
      rightAction: override.rightAction ?? (rightSlot ? 'none' : 'auto'),
      themeName:
        override.themeName ?? (isTransparent && colorScheme === 'dark' ? 'dark' : undefined),
      leftSlot,
      rightSlot,
      titleSlot,
    }
  }, [
    navOptions.appHeaderProps,
    options.title,
    options.headerTitle,
    options.headerRight,
    options.headerLeft,
    options.headerBackTitle,
    isTransparent,
    tintColor,
    titleAlignment,
    navigation,
    route.name,
    back,
    colorScheme,
  ])

  return (
    <SafeAreaView
      edges={['top', 'left', 'right']}
      style={[styles.safeArea, { backgroundColor }]}
    >
      <View style={styles.wrapper}>
        <Stack>
          <AppHeader {...appHeaderProps} />
        </Stack>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 100,
  },
  wrapper: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web'
      ? {
          width: '100%',
        }
      : {}),
  },
})
