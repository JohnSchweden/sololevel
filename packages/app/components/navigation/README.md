# Navigation Components

## NavigationAppHeader

Battle-tested wrapper that bridges React Navigation's header API with the custom `AppHeader` component for Web, iOS, and Android.

### Features
- Works identically on mobile (iOS/Android) and web
- No absolute positioning or safe-area hacks
- Preserves native animations, back gestures, and transitions
- Supports dynamic state updates via `navigation.setOptions()`
- Drop-in replacement for React Navigation's default header

### Files
- `NavigationAppHeader.tsx`: Core adapter component
- `index.ts`: Named exports
- `USAGE.md`: Comprehensive usage guide and migration checklist

### Quick Start
```tsx
// In _layout.tsx
import { NavigationAppHeader } from '@app/components/navigation'

<Stack.Screen
  name="your-route"
  options={{
    title: 'Your Title',
    headerShown: true,
    header: (props) => <NavigationAppHeader {...props} />,
  }}
/>
```

### Dynamic State
```tsx
// In your screen component
import { useNavigation } from 'expo-router'
import { useLayoutEffect } from 'react'

useLayoutEffect(() => {
  navigation.setOptions({
    // @ts-expect-error: custom appHeaderProps
    appHeaderProps: {
      mode: 'recording',
      showTimer: true,
      timerValue: '00:05:23',
      onMenuPress: () => {},
    },
  })
}, [navigation, /* dependencies */])
```

See `USAGE.md` for complete documentation and migration patterns.

