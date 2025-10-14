# Security Screen UI/UX Analysis

> **Status**: Analysis Phase - Pre-Implementation
> **Designer**: Figma Make Code v1
> **Reference Screen**: `/Users/yevgenschweden/Downloads/Figma Make Code v1/Components/SecurityScreen.tsx`
> **Reference Implementation**: `packages/app/features/Settings/SettingsScreen.tsx`

## Test-Driven UI Component Analysis Phase
- [ ] **Visual Component Test Scenarios**: Define component rendering and styling tests
  - [ ] Write snapshot tests for each component state (idle, loading, error, success)
  - [ ] Define responsive breakpoint tests (mobile, tablet, desktop)
  - [ ] Test theme integration and token usage validation
  - [ ] Document animation and transition test scenarios
  - [ ] Test glass background rendering and overlay effects
  - [ ] Test switch toggle states (on/off/disabled)
  - [ ] Test navigation list item hover and press states
- [ ] **User Interaction Test Scenarios**: Define what users should be able to do
  - [ ] Write test scenarios for back navigation (tap back button, swipe from edge)
  - [ ] Define switch toggle interaction tests (tap to toggle, disabled state)
  - [ ] Test navigation to "Active Sessions" and "Login History"
  - [ ] Identify touch target size requirements (44px minimum for all interactive elements)
  - [ ] Document haptic feedback tests for switch toggles
- [ ] **Accessibility Test Scenarios**: Ensure inclusive design
  - [ ] Screen reader navigation tests (section headers, switch states, navigation items)
  - [ ] Keyboard navigation tests (tab order, focus management, enter to toggle)
  - [ ] Color contrast validation tests (WCAG 2.2 AA compliance for white text on glass)
  - [ ] Dynamic type scaling tests (text size adjustments for all labels)
  - [ ] Verify switch components have proper accessibility labels

## Visual Design Analysis Phase
- [x] **Layout Structure**: Identify main containers and map them 1:1 with the wireframe

### Root Container Structure
```typescript
// Design Pattern: Matches SettingsScreen.tsx implementation
// =====================================================

// SCREEN FILE: packages/app/features/Security/SecurityScreen.tsx
// - Orchestrator: Composes hooks + UI components
// - Configures AppHeader via navigation.setOptions()
// - NO business logic (delegated to hooks)
// - NO UI implementation (delegated to @my/ui components)

export function SecurityScreen(props: SecurityScreenProps) {
  const navigation = useNavigation()
  const router = useRouter()
  
  // Configure AppHeader via Expo Router navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Security',
        mode: 'default',
        leftAction: 'back',
        rightAction: 'none', // No profile icon on security screen
        onBackPress: () => router.back(),
      }
    })
  }, [navigation, router])

  // Hooks: Security settings state
  const { settings, updateSetting, isLoading } = useSecuritySettings()

  // Render: UI components from @my/ui
  return (
    <GlassBackground backgroundColor="$color3" testID="security-screen">
      <YStack
        flex={1}
        position="relative"
        paddingTop={headerHeight}
        paddingHorizontal="$4"
        marginVertical="$4"
        paddingBottom={140}
        overflow="hidden"
      >
        {/* Content sections */}
      </YStack>
    </GlassBackground>
  )
}
```

### Visual Layout Hierarchy (What user sees)
```
GlassBackground (full screen with gradient overlay)
│
├── AppHeader (rendered by _layout.tsx, configured by screen)
│   ├── Left: Back button (ArrowLeft icon, white, 24px)
│   ├── Center: "Security" title (Josefin Sans, white, text-lg/xl/2xl responsive)
│   └── Right: Empty spacer (6x6 to maintain centering)
│
└── YStack (scrollable content area)
    ├── Section 1: Authentication
    │   ├── SectionHeader: XStack with Shield icon + "Authentication" label
    │   │   └── Border bottom (white/10% opacity)
    │   │
    │   ├── SettingsToggleItem: "App Lock"
    │   │   ├── XStack flex justifyContent="space-between" padding="$4"
    │   │   ├── Left: XStack with icon container + text
    │   │   │   ├── IconContainer: 40x40, bg-blue-500/20, border-blue-400/30
    │   │   │   │   └── Shield icon (20px, text-blue-300)
    │   │   │   └── TextStack:
    │   │   │       ├── Primary: "App Lock" (white)
    │   │   │       └── Secondary: "Require authentication to open app" (white/60, text-sm)
    │   │   └── Right: Switch component (default off)
    │   │
    │   └── SettingsToggleItem: "Biometric Login"
    │       ├── XStack flex justifyContent="space-between" padding="$4"
    │       ├── Left: XStack with icon container + text
    │       │   ├── IconContainer: 40x40, bg-green-500/20, border-green-400/30
    │       │   │   └── Fingerprint icon (20px, text-green-300)
    │       │   └── TextStack:
    │       │       ├── Primary: "Biometric Login" (white)
    │       │       └── Secondary: "Use fingerprint or face recognition" (white/60, text-sm)
    │       └── Right: Switch component (defaultChecked)
    │
    ├── Section 2: Session Management
    │   ├── SectionHeader: XStack with Smartphone icon + "Session Management" label
    │   │   └── Border bottom (white/10% opacity)
    │   │
    │   ├── SettingsNavigationItem: "Active Sessions"
    │   │   ├── XStack flex justifyContent="space-between" padding="$4"
    │   │   ├── Hover: bg-white/5, rounded-lg, 300ms transition
    │   │   ├── Left: XStack with icon container + text
    │   │   │   ├── IconContainer: 40x40, bg-purple-500/20, border-purple-400/30
    │   │   │   │   └── Smartphone icon (20px, text-purple-300)
    │   │   │   └── TextStack:
    │   │   │       ├── Primary: "Active Sessions" (white)
    │   │   │       └── Secondary: "Manage logged in devices" (white/60, text-sm)
    │   │   └── Right: ChevronRight (20px, white/60 → white/80 on hover)
    │   │
    │   └── SettingsNavigationItem: "Login History"
    │       ├── XStack flex justifyContent="space-between" padding="$4"
    │       ├── Hover: bg-white/5, rounded-lg, 300ms transition
    │       ├── Left: XStack with icon container + text
    │       │   ├── IconContainer: 40x40, bg-orange-500/20, border-orange-400/30
    │       │   │   └── Clock icon (20px, text-orange-300)
    │       │   └── TextStack:
    │       │       ├── Primary: "Login History" (white)
    │       │       └── Secondary: "View recent login attempts" (white/60, text-sm)
    │       └── Right: ChevronRight (20px, white/60 → white/80 on hover)
    │
    └── SafeAreaView edges={['bottom']} (insets for gesture navigation)
```

### Glass Background Analysis
The Figma design uses an extremely complex glassmorphic effect with:
1. **Base gradient**: `linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.05) 50%, rgba(0,0,0,0.08) 100%)`
2. **SVG radial gradient**: 12-stop gradient with complex transform matrix
3. **4 layered glass overlays**: Multiple directional gradients for depth
4. **Frosted texture**: Radial gradient dots at varying sizes
5. **Distortion effect**: Conic gradient with 1px blur

**Implementation Decision**: Simplify to use existing `GlassBackground` component with `backgroundColor="$color3"` and rely on the `glass-gradient.png` asset. The complex Figma effect is expensive to render and doesn't provide significant UX value over the existing system.

- [x] **Tamagui Component Mapping**: Map each UI element 1:1 to Tamagui components

### Component Mapping Table

| UI Element | Tamagui Component | Props/Styling |
|-----------|------------------|---------------|
| **Root Container** | `GlassBackground` | `backgroundColor="$color3"` |
| **Content Wrapper** | `YStack` | `flex={1}`, `paddingTop={headerHeight}`, `paddingHorizontal="$4"` |
| **Section Header** | `XStack` | `gap="$2"`, `borderBottomWidth={1}`, `borderColor="$borderColor"` |
| **Section Icon** | `lucide-react-native` | `size={16}`, `color="$textSecondary"` |
| **Section Title** | `Text` | `color="$textSecondary"`, `fontSize="$4"`, `marginBottom="$6"` |
| **Toggle Item Container** | `XStack` | `justifyContent="space-between"`, `alignItems="center"`, `padding="$4"`, `gap="$4"` |
| **Navigation Item Container** | `XStack` (as Button) | `pressStyle={{ backgroundColor: "$backgroundHover" }}`, `borderRadius="$md"` |
| **Icon Container** | `YStack` | `width={40}`, `height={40}`, `borderRadius="$md"`, `justifyContent="center"`, `alignItems="center"` |
| **Item Icon** | `lucide-react-native` | `size={20}`, themed color per item |
| **Text Container** | `YStack` | `gap="$1"`, `flex={1}` |
| **Primary Text** | `Text` | `color="$text"`, `fontSize="$5"` |
| **Secondary Text** | `Text` | `color="$textSecondary"`, `fontSize="$3"` |
| **Switch Toggle** | `Switch` (from Tamagui) | `size="$4"`, with custom styling |
| **Chevron Icon** | `ChevronRight` (lucide) | `size={20}`, `color="$textSecondary"` |
| **Spacer Section** | `YStack` | `height="$8"` (spacing between sections) |

### New Components Status

1. **SettingsToggleItem** (in `@my/ui`) — IMPLEMENTED
   - Combines icon container, text labels, and Switch
   - Props: `icon`, `iconColor`, `iconBackground`, `iconBorder`, `title`, `description`, `value`, `onValueChange`, `disabled`
   - Exported via `@my/ui`

2. **SettingsSectionHeader** (in `@my/ui`) — IMPLEMENTED
   - Icon + title + bottom border
   - Exported via `@my/ui`

3. **SecuritySettings** types (in `@my/config`) — OPEN (P1)
   - To define state types/enums for `appLock`, `biometricLogin`

- [x] **Design System Integration**: Theme tokens and styling consistency

### Token Mapping

| Design Element | Token | Value/Usage |
|---------------|-------|-------------|
| **Colors** |
| Background | `$color3` | Glass background base |
| Primary text | `$text` | White (#FFFFFF) |
| Secondary text | `$textSecondary` | White 60% opacity (rgba(255,255,255,0.6)) |
| Border | `$borderColor` | White 10% opacity (rgba(255,255,255,0.1)) |
| Hover background | `$backgroundHover` | White 5% opacity (rgba(255,255,255,0.05)) |
| Icon backgrounds | Custom per item | Blue/Green/Purple/Orange with 20% opacity |
| Icon borders | Custom per item | Same color with 30% opacity |
| Icon colors | Custom per item | Same color with 300 tint |
| **Spacing** |
| Section gap | `$8` | 32px between sections |
| Item gap | `$6` | 24px between items in section |
| Content padding | `$4` | 16px horizontal |
| Item padding | `$4` | 16px all sides |
| Icon gap | `$4` | 16px between icon and text |
| Text stack gap | `$1` | 4px between primary/secondary text |
| **Typography** |
| Section title | `$4` | ~14px |
| Primary text | `$5` | ~16px |
| Secondary text | `$3` | ~12-14px |
| Header title | `$6` / `$8` / `$10` | Responsive 18px → 20px → 24px |
| **Sizes** |
| Icon container | `40px × 40px` | Fixed size |
| Section icon | `16px` | lucide icon size |
| Item icon | `20px` | lucide icon size |
| Chevron icon | `20px` | lucide icon size |
| Switch | `$4` | Tamagui Switch size prop |
| Touch target | `44px` min | Includes padding |
| **Borders** |
| Item border radius | `$md` | ~8px |
| Icon container radius | `$md` | ~8px |
| **Effects** |
| Transition duration | `300ms` | Hover state transitions |
| Shadow | None | Glass effect handles depth |

### Color System Extensions Needed

Add to `tamagui.config.ts`:
```typescript
// Security screen icon color system
const securityColors = {
  authBlue: {
    bg: 'rgba(59, 130, 246, 0.2)',   // bg-blue-500/20
    border: 'rgba(96, 165, 250, 0.3)', // border-blue-400/30
    icon: '#93C5FD',                   // text-blue-300
  },
  authGreen: {
    bg: 'rgba(34, 197, 94, 0.2)',     // bg-green-500/20
    border: 'rgba(74, 222, 128, 0.3)', // border-green-400/30
    icon: '#86EFAC',                   // text-green-300
  },
  sessionPurple: {
    bg: 'rgba(168, 85, 247, 0.2)',    // bg-purple-500/20
    border: 'rgba(192, 132, 252, 0.3)', // border-purple-400/30
    icon: '#C4B5FD',                   // text-purple-300
  },
  sessionOrange: {
    bg: 'rgba(249, 115, 22, 0.2)',    // bg-orange-500/20
    border: 'rgba(251, 146, 60, 0.3)', // border-orange-400/30
    icon: '#FDB87F',                   // text-orange-300
  },
}
```

**Note**: These colors should be added as semantic tokens, not direct values in components. Consider creating a `$securityIcon` token system.

- [x] **Responsive Design Requirements**: Breakpoint behavior analysis

### Responsive Behavior

| Breakpoint | Layout Adjustments | Token Changes |
|-----------|-------------------|---------------|
| **Mobile (< 768px)** | Single column, full width, bottom safe area | Base tokens |
| | Header title: `text-lg` (~18px) | `fontSize="$6"` |
| | Padding: 16px horizontal | `paddingHorizontal="$4"` |
| | Touch targets: 44px minimum (12px padding + 20px icon + 12px) | `padding="$4"` |
| **Tablet (768px - 1024px)** | Same layout, increased padding | |
| | Header title: `text-xl` (~20px) | `fontSize="$8"` |
| | Padding: 32px horizontal | `paddingHorizontal="$6"` (if added) |
| | Hover states visible on switch hovers | `hoverStyle` active |
| **Desktop (> 1024px)** | Same layout, max width constraint | |
| | Header title: `text-2xl` (~24px) | `fontSize="$10"` |
| | Max width: 768px, centered | `maxWidth={768}`, `alignSelf="center"` |
| | Hover effects on all interactive elements | Full `hoverStyle` support |
| | Keyboard navigation visible | Focus rings visible |

**Responsive Implementation Pattern**:
```typescript
// Use Tamagui's media queries for responsive sizing
<Text
  fontSize="$6"
  $md={{ fontSize: "$8" }}
  $lg={{ fontSize: "$10" }}
>
  Security
</Text>
```

## Interactive Elements Analysis Phase
- [x] **Button States and Variants**: Define all button interactions

### Interactive Elements Inventory

#### 1. Back Button (AppHeader)
- **Type**: Icon button
- **Component**: Part of AppHeader (configured via `navigation.setOptions`)
- **States**:
  - Default: ArrowLeft icon, white, 24px
  - Pressed: Opacity 80% (`pressStyle={{ opacity: 0.8 }}`)
  - Disabled: N/A (always enabled)
- **Action**: Navigate back to Settings screen (`router.back()`)
- **Touch Target**: 44px × 44px
- **Accessibility**: `accessibilityLabel="Go back"`, `accessibilityRole="button"`

#### 2. Switch Toggles (2 items)
- **Type**: Toggle switches
- **Component**: `Switch` from Tamagui
- **Items**:
  1. App Lock (default: off)
  2. Biometric Login (default: on)
- **States**:
  - Off: Background gray, thumb left
  - On: Background primary color, thumb right
  - Disabled: Reduced opacity, non-interactive
  - Loading: Spinner overlay (if async operation)
- **Actions**:
  - Tap to toggle
  - Haptic feedback on change (iOS/Android)
  - Async state update with optimistic UI
- **Touch Target**: 44px × 44px (switch + padding)
- **Accessibility**: 
  - `accessibilityRole="switch"`
  - `accessibilityState={{ checked: value }}`
  - `accessibilityLabel="[Item title]"`
  - `accessibilityHint="[Item description]"`

#### 3. Navigation Items (2 items)
- **Type**: Navigation buttons
- **Component**: Custom `SettingsNavigationItem` wrapping XStack
- **Items**:
  1. Active Sessions
  2. Login History
- **States**:
  - Default: Transparent background
  - Hover: `backgroundColor="$backgroundHover"` (white/5%)
  - Pressed: `scale: 0.98` (subtle press feedback)
  - Focus: Visible focus ring (keyboard navigation)
- **Actions**:
  - Navigate to respective screen
  - Haptic feedback on press
- **Touch Target**: Full width × 56px height (40px icon container + 8px padding each side)
- **Accessibility**:
  - `accessibilityRole="button"`
  - `accessibilityLabel="[Item title]"`
  - `accessibilityHint="[Item description]"`

### Interaction Flow Map
```
User enters screen
  ├─ Back button visible (top-left)
  │   └─ Tap → Navigate to Settings screen
  │
  ├─ Authentication section
  │   ├─ App Lock toggle
  │   │   └─ Tap → Toggle on/off → Save to backend → Haptic feedback
  │   └─ Biometric Login toggle
  │       └─ Tap → Toggle on/off → Check device biometric capability → Save → Haptic feedback
  │
  └─ Session Management section
      ├─ Active Sessions item
      │   └─ Tap → Navigate to /settings/security/active-sessions
      └─ Login History item
          └─ Tap → Navigate to /settings/security/login-history
```

- [x] **Form Elements**: Input fields and validation
  - **N/A**: No form inputs on this screen (only toggles and navigation)

- [x] **Navigation Elements**: Screen transitions and routing

### Navigation Structure

#### Route Definition
- **Path**: `/settings/security`
- **File Location**: `apps/expo/app/settings/security.tsx`
- **Parent**: `/settings` (SettingsScreen)
- **Children**: 
  - `/settings/security/active-sessions` (future)
  - `/settings/security/login-history` (future)

#### AppHeader Configuration
```typescript
useLayoutEffect(() => {
  navigation.setOptions({
    appHeaderProps: {
      title: 'Security',
      mode: 'default',
      leftAction: 'back',
      rightAction: 'none',
      onBackPress: () => router.back(),
    }
  })
}, [navigation, router])
```

#### Navigation Transitions
- **Enter**: Slide from right (native), fade in (web)
- **Exit**: Slide to right (native), fade out (web)
- **Platform Gestures**:
  - iOS: Swipe from left edge to go back
  - Android: Hardware back button or gesture navigation
  - Web: Browser back button, no swipe gesture

#### Deep Linking
- **Universal Link**: `sololevel://settings/security`
- **Web URL**: `https://app.sololevel.com/settings/security`

## Animation and Micro-interactions Phase
- [x] **Transition Animations**: Screen and component transitions

### Animation Inventory

#### 1. Screen Transitions
- **Entry**: Slide from right + fade in (300ms ease-out)
- **Exit**: Slide to right + fade out (250ms ease-in)
- **Platform**: Handled by Expo Router native stack

#### 2. Switch Toggle Animation
- **Duration**: 200ms
- **Easing**: Spring animation (native feel)
- **Properties**: `translateX` (thumb position), `backgroundColor` (track color)
- **Haptic**: Light impact on toggle change

#### 3. Navigation Item Hover/Press
- **Hover** (tablet/desktop):
  - Duration: 300ms
  - Properties: `backgroundColor` (transparent → white/5%)
  - Chevron color: white/60 → white/80
- **Press** (all platforms):
  - Duration: 100ms
  - Properties: `scale` (1.0 → 0.98)
  - Haptic: Selection feedback

#### 4. Section Reveal Animation
- **On Mount**: Stagger fade-in + slide up
  - Section 1: 0ms delay
  - Section 2: 100ms delay
  - Duration: 400ms each
  - Easing: ease-out
- **Implementation**: Use `react-native-reanimated` for smooth performance

### Performance Targets
- **Screen render**: < 16ms (60fps)
- **Switch toggle**: < 100ms perceived latency
- **Navigation transition**: 300ms (feels instant)
- **Scroll performance**: 60fps sustained

- [x] **Loading States**: Progress indication and skeleton screens

### Loading State Strategies

#### 1. Initial Load
- **Pattern**: Show content immediately with cached data
- **No Skeleton**: Settings are lightweight, no need for placeholder UI
- **If No Cache**: Show actual components with `isLoading` prop
  - Switches: Disabled state while loading
  - Navigation items: Grayed out, non-interactive

#### 2. Switch Toggle Loading
- **Optimistic Update**: Toggle immediately, show loading if operation fails
- **Pattern**:
  ```typescript
  const handleToggle = async (value: boolean) => {
    // 1. Update local state immediately (optimistic)
    setLocalValue(value)
    
    // 2. Save to backend
    try {
      await updateSecuritySetting('app_lock', value)
      // Success: Haptic feedback
      haptics.impact('light')
    } catch (error) {
      // 3. Revert on error, show toast
      setLocalValue(!value)
      toast.error('Failed to update setting')
    }
  }
  ```
- **Visual**: No spinner needed, toggle animates normally
- **Error Handling**: Toast notification + state revert

#### 3. Navigation Loading
- **Pattern**: Instant navigation, next screen handles loading
- **No Loading State**: Navigation items never show loading

## Cross-Platform UI Considerations Phase
- [x] **Platform-Specific Adaptations**: Native feel on each platform

### Platform Adaptation Matrix

| Feature | iOS | Android | Web |
|---------|-----|---------|-----|
| **Safe Areas** | Top + Bottom insets (notch + home indicator) | Top + Bottom (status bar + navigation) | None (no notches) |
| **Back Gesture** | Swipe from left edge | Hardware button + swipe gesture | Browser back button |
| **Switch Style** | iOS native Switch | Material Switch | Custom styled (iOS-like) |
| **Haptic Feedback** | `haptics.impact('light')` | `haptics.impact('light')` | None (not supported) |
| **Typography** | SF Pro (system font) | Roboto (system font) | System font stack |
| **Focus Rings** | Minimal (touch-first) | Minimal (touch-first) | Prominent (keyboard nav) |
| **Hover States** | None (no pointer) | None (no pointer) | Active (pointer device) |
| **Screen Title** | Josefin Sans (custom) | Josefin Sans (custom) | Josefin Sans (custom) |
| **Status Bar** | Light content (white icons) | Light content (white icons) | N/A |
| **Edge-to-Edge** | Full bleed with safe areas | Full bleed with safe areas | Constrained to viewport |

### iOS Specific
- **Biometric Login**: Use Face ID or Touch ID based on device capability
- **App Lock**: Use `LocalAuthentication` framework
- **Haptics**: Use `UIImpactFeedbackGenerator` for toggle changes
- **Swipe Back**: Native gesture handled by navigation stack

### Android Specific
- **Biometric Login**: Use `BiometricPrompt` API
- **App Lock**: Use `BiometricPrompt` for authentication
- **Haptics**: Use `Vibrator` service for toggle changes
- **System Navigation**: Support gesture navigation and button navigation

### Web Specific
- **Biometric Login**: WebAuthn API (if supported), otherwise disable
- **App Lock**: Session-based locking (no biometric support in most browsers)
- **No Haptics**: Skip haptic feedback calls
- **Hover States**: Full hover support for navigation items
- **Keyboard Navigation**: Tab order, Enter to toggle/navigate

- [x] **Safe Area Handling**: Proper inset management for modern devices

### Safe Area Implementation

#### Root Layout (YStack)
```typescript
<YStack
  flex={1}
  paddingTop={headerHeight} // AppHeader handles top safe area
  paddingBottom={140}        // Manual bottom padding (should be safe area aware)
  paddingHorizontal="$4"
>
  {/* Content */}
</YStack>
```

#### Recommended Changes
```typescript
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export function SecurityScreen() {
  const insets = useSafeAreaInsets()
  const headerHeight = useHeaderHeight()
  
  return (
    <GlassBackground>
      <YStack
        flex={1}
        paddingTop={headerHeight}
        paddingBottom={insets.bottom + 20} // Dynamic bottom inset + content padding
        paddingHorizontal="$4"
      >
        {/* Content */}
      </YStack>
    </GlassBackground>
  )
}
```

#### Platform Safe Area Matrix
| Device | Top Inset | Bottom Inset |
|--------|-----------|--------------|
| iPhone 15 Pro (notch) | 59px | 34px |
| iPhone SE (no notch) | 20px | 0px |
| iPad Pro | 20px | 0px |
| Android (Pixel 7) | 24px | 0-48px (gesture nav) |
| Web | 0px | 0px |

- [x] **Component Platform Variants**: When to use platform-specific implementations

### Component Platform Strategy

#### Single-File Components (Preferred)
Components that work cross-platform with Tamagui conditional styling:
- **SettingsSectionHeader**: Pure Tamagui (XStack, Text, icons)
- **SettingsToggleItem**: Pure Tamagui with platform-aware Switch
- **SecurityScreen**: Screen component with universal logic

#### Platform-Specific Files (When Needed)
Components requiring different implementations:

1. **Switch Component**:
   - Already handled by Tamagui (uses native Switch on iOS/Android, styled div on web)
   - No custom platform files needed

2. **Biometric Prompt**:
   - **Pattern**: Create platform-specific hooks
   - Files:
     - `hooks/useBiometricAuth.native.ts` (iOS/Android LocalAuthentication)
     - `hooks/useBiometricAuth.web.ts` (WebAuthn API or stub)
   - Usage:
     ```typescript
     const { authenticate, isSupported } = useBiometricAuth()
     
     const handleBiometricToggle = async (enabled: boolean) => {
       if (enabled && !isSupported) {
         toast.error('Biometric authentication not available')
         return
       }
       // ... rest of logic
     }
     ```

3. **App Lock**:
   - **Pattern**: Create platform-specific services
   - Files:
     - `services/appLock.native.ts` (Native module integration)
     - `services/appLock.web.ts` (Session storage + timer)

#### Platform Detection Pattern
```typescript
import { Platform } from 'react-native'

// Conditional rendering
{Platform.OS !== 'web' && <NativeFeature />}

// Conditional styling
<XStack
  $web={{ cursor: 'pointer' }}
  $native={{ activeOpacity: 0.7 }}
/>
```

## TDD UI Implementation Roadmap

### Phase 1: TDD Component Foundation [Native/Web]
- [ ] **Component Interface Tests**: Define props and styling contracts
  - [ ] Test `SettingsSectionHeader` props: `icon`, `title`
  - [ ] Test `SettingsToggleItem` props: `icon`, `iconColor`, `iconBackground`, `title`, `description`, `value`, `onValueChange`, `disabled`
  - [ ] Test `SecurityScreen` renders with correct AppHeader config
  - [ ] Verify all components use theme tokens (no hardcoded colors)

- [ ] **Theme Integration Tests**: Validate design system compliance
  - [ ] Verify `$text`, `$textSecondary`, `$borderColor` usage
  - [ ] Validate `$backgroundHover` on navigation items
  - [ ] Test switch colors match theme
  - [ ] Verify spacing tokens (`$4`, `$6`, `$8`) used correctly

- [ ] **Responsive Layout Tests**: Ensure breakpoint behavior
  - [ ] Test mobile layout (< 768px): Single column, base padding
  - [ ] Test tablet layout (768-1024px): Increased padding, hover states
  - [ ] Test desktop layout (> 1024px): Max width constraint, full hover support
  - [ ] Verify header title responsive sizing ($6 → $8 → $10)

- [ ] **Accessibility Foundation Tests**: Basic WCAG compliance
  - [ ] Verify all switches have `accessibilityRole="switch"`
  - [ ] Test navigation items have `accessibilityRole="button"`
  - [ ] Validate screen reader labels for all interactive elements
  - [ ] Test color contrast: white text on glass background meets WCAG AA (4.5:1)

### Phase 2: TDD Interactive Elements [Native/Web]
- [ ] **User Interaction Tests**: Validate touch/click behavior
  - [ ] Test switch toggle: Press → value changes → `onValueChange` called
  - [ ] Test navigation items: Press → navigation triggered
  - [ ] Test back button: Press → `router.back()` called
  - [ ] Verify hover effects (web only): Hover → background changes, chevron color changes
  - [ ] Test press feedback: Press → scale 0.98 → release → scale 1.0

- [ ] **Form Validation Tests**: Input handling and error states
  - [ ] N/A: No form inputs on this screen

- [ ] **Navigation Tests**: Screen transitions and routing
  - [ ] Test route navigation: Tap "Active Sessions" → navigate to `/settings/security/active-sessions`
  - [ ] Test route navigation: Tap "Login History" → navigate to `/settings/security/login-history`
  - [ ] Test back navigation: Tap back button → navigate to `/settings`
  - [ ] Test deep linking: Open `sololevel://settings/security` → screen renders

- [ ] **Animation Tests**: Transition timing and performance
  - [ ] Test screen entry animation: Slide from right + fade in (300ms)
  - [ ] Test switch toggle animation: Smooth transition (200ms spring)
  - [ ] Test navigation item press animation: Scale 0.98 (100ms)
  - [ ] Verify 60fps sustained during scroll (no frame drops)

### Phase 3: TDD Cross-Platform Parity [Native/Web]
- [ ] **Visual Parity Tests**: Identical rendering across platforms
  - [ ] Compare iOS vs Android: Switch styles match platform expectations
  - [ ] Compare Native vs Web: Layout identical, hover states only on web
  - [ ] Test safe area handling: iOS notch, Android gesture nav, web no insets
  - [ ] Verify icon colors consistent across platforms

- [ ] **Interaction Parity Tests**: Consistent behavior patterns
  - [ ] Test switch toggle: Works identically on iOS/Android/Web
  - [ ] Test navigation: Works identically across platforms (different gestures OK)
  - [ ] Test haptics: iOS/Android only, gracefully skipped on web
  - [ ] Verify keyboard navigation: Tab order correct on web, N/A on native

- [ ] **Performance Tests**: Render timing and memory usage
  - [ ] Test initial render: < 16ms (60fps)
  - [ ] Test switch toggle: < 100ms perceived latency
  - [ ] Test scroll performance: 60fps sustained
  - [ ] Verify memory stable: No leaks after repeated navigation

- [ ] **Accessibility Tests**: Platform-specific accessibility features
  - [ ] iOS: VoiceOver navigation test
  - [ ] Android: TalkBack navigation test
  - [ ] Web: Screen reader + keyboard navigation test
  - [ ] Verify dynamic type scaling: Text grows/shrinks with system settings

## Quality Gates
- [ ] **Visual Regression Testing**: Screenshot comparison tests
  - [ ] Capture screenshots for iOS (light/dark)
  - [ ] Capture screenshots for Android (light/dark)
  - [ ] Capture screenshots for Web (light/dark, mobile/tablet/desktop)
  - [ ] Compare against baseline, flag any pixel differences

- [ ] **Accessibility Compliance**: WCAG 2.2 AA validation
  - [ ] Color contrast: White text on glass background ≥ 4.5:1
  - [ ] Touch targets: All interactive elements ≥ 44px × 44px
  - [ ] Screen reader: All elements have proper labels and roles
  - [ ] Keyboard navigation: Tab order logical, focus visible

- [ ] **Performance Benchmarks**: Render time < 16ms, smooth animations
  - [ ] Initial render: < 16ms (measured via React DevTools Profiler)
  - [ ] Switch toggle: < 100ms perceived latency (measured via `performance.now()`)
  - [ ] Scroll: 60fps sustained (no dropped frames in React Native Debugger)
  - [ ] Memory: No memory leaks (measured via Xcode Instruments / Android Profiler)

- [ ] **Cross-Platform Consistency**: Identical user experience
  - [ ] Layout identical across iOS/Android/Web (modulo platform conventions)
  - [ ] Interactions feel native to each platform (iOS swipe back, Android hardware button)
  - [ ] Colors and spacing match design system
  - [ ] Animations smooth and performant on all platforms

## Documentation Requirements
- [ ] **Storybook Stories**: All component states and variants documented
  - [ ] Story: `SettingsSectionHeader` (with different icons)
  - [ ] Story: `SettingsToggleItem` (on/off/disabled states)
  - [ ] Story: `SecurityScreen` (full screen layout)
  - [ ] Add interaction controls for testing toggle/navigation

- [ ] **Design System Usage**: Theme token usage and component patterns
  - [ ] Document all theme tokens used: `$text`, `$textSecondary`, `$borderColor`, etc.
  - [ ] Document spacing system: `$4`, `$6`, `$8`
  - [ ] Document responsive patterns: `$md`, `$lg` breakpoint usage
  - [ ] Document color system extensions for security icons

- [ ] **Accessibility Documentation**: Screen reader testing results
  - [ ] Document VoiceOver test results (iOS)
  - [ ] Document TalkBack test results (Android)
  - [ ] Document screen reader test results (Web: NVDA/JAWS)
  - [ ] Document keyboard navigation flow

- [ ] **Animation Documentation**: Transition timing and easing functions
  - [ ] Document screen transition: 300ms ease-out slide
  - [ ] Document switch toggle: 200ms spring animation
  - [ ] Document navigation item press: 100ms scale animation
  - [ ] Document haptic feedback points

## Implementation Notes

### 1. Glass Background Simplification
**Decision**: Use existing `GlassBackground` component instead of replicating complex Figma effect.

**Rationale**:
- Figma design has 10+ layered gradients and effects
- Complex effects are expensive to render (60fps risk)
- Existing `glass-gradient.png` provides sufficient glassmorphic effect
- Users won't notice difference in fast-paced mobile UX

**Implementation**:
```typescript
<GlassBackground backgroundColor="$color3" testID="security-screen">
  {/* Content */}
</GlassBackground>
```

### 2. Switch Component Selection
**Decision**: Use Tamagui's built-in `Switch` component.

**Rationale**:
- Cross-platform by default (native Switch on iOS/Android, styled on web)
- Accessible by default (proper ARIA roles)
- Themeable via Tamagui tokens
- No custom platform files needed

**Customization Needed**:
- Override default colors to match design (may need custom theme)
- Ensure 44px touch target (add padding if needed)

### 3. Icon Color System
**Decision**: Create reusable icon color variants in theme system.

**Pattern**:
```typescript
// In tamagui.config.ts
const securityIconColors = {
  blue: { bg: '$blue2', border: '$blue4', icon: '$blue8' },
  green: { bg: '$green2', border: '$green4', icon: '$green8' },
  purple: { bg: '$purple2', border: '$purple4', icon: '$purple8' },
  orange: { bg: '$orange2', border: '$orange4', icon: '$orange8' },
}

// Usage in component
<YStack
  backgroundColor={theme.blue.bg}
  borderColor={theme.blue.border}
  borderWidth={1}
>
  <Shield color={theme.blue.icon} />
</YStack>
```

### 4. Biometric Authentication Platform Support (P1)
**Platform Matrix**:
| Platform | Capability | Implementation |
|----------|-----------|----------------|
| iOS | Face ID / Touch ID | `expo-local-authentication` |
| Android | Fingerprint / Face Unlock | `expo-local-authentication` |
| Web | WebAuthn (limited) | Disable or use stub |

**Implementation Strategy**:
- Use `expo-local-authentication` for native platforms
- Create platform-specific hooks: `useBiometricAuth.native.ts`, `useBiometricAuth.web.ts`
- Web: Show "Not available on web" message or hide option entirely

### 5. Settings Persistence Strategy (P1)
**Pattern**: Zustand store + Supabase user_metadata

**Store Structure**:
```typescript
interface SecuritySettings {
  appLock: boolean
  biometricLogin: boolean
}

const useSecurityStore = create<SecuritySettings>((set) => ({
  appLock: false,
  biometricLogin: false,
  setAppLock: (value) => set({ appLock: value }),
  setBiometricLogin: (value) => set({ biometricLogin: value }),
}))
```

**Persistence**:
- Save to Supabase `user_metadata.security_settings`
- Load on app start / auth state change
- Optimistic updates with revert on error

### 6. Future Sub-Screens (P1)
Based on navigation items, these screens will be needed:

#### Active Sessions Screen
- Path: `/settings/security/active-sessions`
- Displays: List of logged-in devices with:
  - Device name (iPhone 15 Pro, Chrome on Windows, etc.)
  - Last active timestamp
  - Location (if available)
  - "Sign out" button per device
- Actions: Sign out specific devices, sign out all other devices

#### Login History Screen
- Path: `/settings/security/login-history`
- Displays: List of recent login attempts with:
  - Timestamp
  - Device info
  - Location (if available)
  - Success / Failed indicator
- Optional: Filter by date range, success/failure

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic (TBD)
- **Backend Integration**: See `analysis-backend.md` for data requirements (TBD)
- **Platform Specifics**: See `analysis-platform.md` for implementation details (TBD)
- **Settings Screen Pattern**: `packages/app/features/Settings/SettingsScreen.tsx`
- **Design System**: `packages/ui/src/config/tamagui.config.ts`
- **Navigation**: `.cursor/rules/features/navigation-expo-router.mdc`

## Next Steps
1. [x] Review this analysis with product/design team
4. [x] Implement new UI components in `packages/ui`:
   - `SettingsSectionHeader`
   - `SettingsToggleItem`
5. [x] Implement `SecurityScreen` in `packages/app/features/Security`
6. [x] Create route file in `apps/expo/app/settings/security.tsx`
7. [x] Write tests following TDD roadmap (unit tests for new UI components)
9. [ ] Test on iOS, Android, and Web (pending manual QA)

## P1
2. [ ] Create `analysis-feature.md` for state management and business logic (P1)
3. [ ] Create `analysis-backend.md` for Supabase schema and API requirements (P1)
8. [ ] Add Storybook stories for new components (P1)
10. [ ] Plan and implement sub-screens (Active Sessions, Login History) (P1)
11. [ ] Add semantic tokens for security icon colors in `tamagui.config.ts` (P1)
12. [ ] Implement Zustand store + Supabase persistence for settings (P1)
13. [ ] Implement biometric auth hooks (`useBiometricAuth.native.ts` / `.web.ts`) (P1)
