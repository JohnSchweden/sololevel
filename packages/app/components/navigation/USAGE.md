# NavigationAppHeader Usage Guide

## Overview
`NavigationAppHeader` bridges React Navigation's header API with the custom `AppHeader` component for Web, iOS, and Android.

## Basic Usage in `_layout.tsx`

### Static Header (Dev Routes)
```tsx
import { NavigationAppHeader } from '@app/components/navigation'

<Stack.Screen
  name="dev/pipeline-test"
  options={{
    title: 'Pipeline Test',
    headerShown: true,
    header: (props) => <NavigationAppHeader {...props} />,
  }}
/>
```

### Dynamic Header (Recording/Analysis Screens)
For screens with dynamic state (timer, mode changes), keep `headerShown: false` initially:
```tsx
<Stack.Screen
  name="index"
  options={{
    title: 'Camera Recording',
    headerShown: false, // Use overlay until migrated
  }}
/>
```

## Dynamic Header State from Screen

### Pattern 1: Update via `setOptions`
Inside your screen component:
```tsx
import { useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'

export default function CameraScreen() {
  const navigation = useNavigation()
  const isRecording = useCameraStore((s) => s.isRecording)
  const formattedDuration = useCameraStore((s) => s.formattedDuration)

  useLayoutEffect(() => {
    navigation.setOptions({
      // @ts-expect-error: custom appHeaderProps not in base type
      appHeaderProps: {
        mode: isRecording ? 'recording' : 'camera-idle',
        showTimer: isRecording,
        timerValue: formattedDuration,
        onMenuPress: () => setShowSideSheet(true),
        onBackPress: handleBackPress,
      },
    })
  }, [navigation, isRecording, formattedDuration])

  return (/* screen content */)
}
```

### Pattern 2: Per-Screen Header in `_layout.tsx`
For per-screen dynamic logic, wrap the header:
```tsx
<Stack.Screen
  name="video-analysis"
  options={{
    title: 'Video Analysis',
    headerShown: true,
    header: (props) => (
      <NavigationAppHeader
        {...props}
        // Override defaults for this route only
      />
    ),
  }}
/>
```

## Available Header Props (via `appHeaderProps`)
```ts
{
  title?: string               // Override static title
  mode?: AppHeaderMode         // 'default' | 'camera' | 'recording' | 'analysis' | 'videoSettings'
  showTimer?: boolean          // Display timer instead of title
  timerValue?: string          // '00:05:23'
  onMenuPress?: () => void     // Right menu button action
  onBackPress?: () => void     // Custom back (overrides navigation.goBack)
  onNotificationPress?: () => void
  notificationBadgeCount?: number
  cameraProps?: { isRecording?: boolean }
}
```

## Migration Checklist (from Overlay to Nav Header)

### Step 1: Switch `_layout.tsx` Route
```diff
<Stack.Screen
  name="your-route"
  options={{
    title: 'Your Title',
-   headerShown: false,
+   headerShown: true,
+   header: (props) => <NavigationAppHeader {...props} />,
  }}
/>
```

### Step 2: Remove Overlay Header from Screen
```diff
- <CameraContainer
-   header={<AppHeader ... />}
- >
+ <CameraContainer>
```

### Step 3: Add Dynamic State Updates
```diff
+ import { useNavigation } from 'expo-router'
+ import { useLayoutEffect } from 'react'

+ useLayoutEffect(() => {
+   navigation.setOptions({
+     appHeaderProps: { mode, showTimer, timerValue, onMenuPress }
+   })
+ }, [navigation, mode, showTimer, timerValue])
```

### Step 4: Validate
- Back button shows when expected; gesture works on iOS
- Timer updates without flicker
- Menu/notification actions fire correctly
- Safe area handled on notched devices
- No layout overlap or double spacing

## Platform Notes
- **iOS/Android**: Native animations and back gestures work out of the box
- **Web**: Uses same header; SSR-safe; no hydration warnings
- **Safe Area**: Handled by React Navigation container; no manual padding needed
- **Height**: Fixed at 56px horizontal stack; AppHeader content adapts inside

## When NOT to Use This
- For screens that need absolute positioning (full-screen camera overlays with transparent header)
- If header state changes >60fps (use overlay with internal state instead)
- Complex animations synchronized with scroll (use custom header via `header` option)

