# Security Settings UI/UX Analysis

> **Source**: SecurityScreen.tsx from Figma export  
> **Target**: Settings/Security sub-screen implementation  
> **Status**: Analysis Phase

## Test-Driven UI Component Analysis Phase
- [x] **Visual Component Test Scenarios**: Define component rendering and styling tests
  - [ ] Write snapshot tests for SecurityScreen (idle state with all sections)
  - [ ] Write tests for Switch toggle states (on/off for App Lock and Biometric Login)
  - [ ] Write tests for navigation item press states (Active Sessions, Login History)
  - [ ] Test theme integration: GlassBackground, section headers, and icon colors
  - [ ] Document animation: Page transition (slide in from right), switch toggle animation
- [x] **User Interaction Test Scenarios**: Define what users should be able to do
  - [ ] Test back navigation (AppHeader back button)
  - [ ] Test switch toggles (App Lock, Biometric Login) with visual feedback
  - [ ] Test navigation items (Active Sessions, Login History) - press and navigate
  - [ ] Define expected visual feedback: Switch animation, button press opacity
  - [ ] Touch target size validation: All interactive elements ≥ 44px
- [x] **Accessibility Test Scenarios**: Ensure inclusive design
  - [ ] Screen reader navigation: Section headers ("Authentication", "Session Management")
  - [ ] Switch accessibility labels: "App Lock toggle", "Biometric Login toggle"
  - [ ] Navigation item labels: "Active Sessions", "Login History"
  - [ ] Keyboard navigation: Tab order through sections and items
  - [ ] Color contrast validation: White text on glass background (check WCAG 2.2 AA)
  - [ ] Dynamic type scaling: Text should scale with system font size

## Visual Design Analysis Phase
- [x] **Layout Structure**: Identified main containers and mapped to wireframe

**Root Container**: Full-screen vertical layout with GlassBackground and scrollable content

```typescript
// Code Composition Pattern (Following @my/app feature structure)
// =====================================================

// 1. SCREEN FILE: packages/app/features/Settings/SecurityScreen.tsx
//    - Orchestrator: Composes hooks + UI components
//    - Configures AppHeader via navigation.setOptions()
//    - NO business logic (delegated to hooks)
//    - NO UI implementation (delegated to @my/ui components)

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
        rightAction: 'none',
        onBackPress: () => router.back(),
      }
    })
  }, [navigation, router])

  // Hooks: Security settings state
  const { 
    appLock, 
    biometricLogin, 
    toggleAppLock, 
    toggleBiometricLogin 
  } = useSecuritySettings()

  // Render: UI components from @my/ui
  return (
    <GlassBackground backgroundColor="$background" testID="security-screen">
      <YStack flex={1} paddingTop={headerHeight} paddingHorizontal="$4">
        {/* AppHeader rendered automatically by Expo Router _layout.tsx */}
        
        <ScrollView flex={1} showsVerticalScrollIndicator={false}>
          <YStack gap="$6" paddingVertical="$4">
            {/* Authentication Section */}
            <SecuritySection 
              title="Authentication"
              icon={Shield}
              items={[
                {
                  id: 'app-lock',
                  icon: Shield,
                  iconColor: '$blue9',
                  iconBgColor: '$blue3',
                  title: 'App Lock',
                  description: 'Require authentication to open app',
                  type: 'toggle',
                  value: appLock,
                  onToggle: toggleAppLock,
                },
                {
                  id: 'biometric',
                  icon: Fingerprint,
                  iconColor: '$green9',
                  iconBgColor: '$green3',
                  title: 'Biometric Login',
                  description: 'Use fingerprint or face recognition',
                  type: 'toggle',
                  value: biometricLogin,
                  onToggle: toggleBiometricLogin,
                },
              ]}
            />
            
            {/* Session Management Section */}
            <SecuritySection 
              title="Session Management"
              icon={Smartphone}
              items={[
                {
                  id: 'active-sessions',
                  icon: Smartphone,
                  iconColor: '$purple9',
                  iconBgColor: '$purple3',
                  title: 'Active Sessions',
                  description: 'Manage logged in devices',
                  type: 'navigation',
                  onPress: () => router.push('/settings/security/sessions'),
                },
                {
                  id: 'login-history',
                  icon: Clock,
                  iconColor: '$orange9',
                  iconBgColor: '$orange3',
                  title: 'Login History',
                  description: 'View recent login attempts',
                  type: 'navigation',
                  onPress: () => router.push('/settings/security/history'),
                },
              ]}
            />
          </YStack>
        </ScrollView>
        
        <SafeAreaView edges={['bottom']} />
      </YStack>
    </GlassBackground>
  )
}

// =====================================================
// VISUAL LAYOUT STRUCTURE (What user sees)
// =====================================================

YStack flex={1} backgroundColor="$background" (full screen with GlassBackground)
├── AppHeader height={60} (rendered by _layout.tsx, configured by screen)
│   ├── Left: Button icon={ArrowLeft} onPress={onBackPress}
│   ├── Center: Text "Security"
│   └── Right: Empty (no profile icon)
│
├── ScrollView flex={1} paddingHorizontal="$4" paddingTop="$4"
│   ├── YStack gap="$6" paddingVertical="$4"
│   │   ├── SecuritySection (Authentication)
│   │   │   ├── SectionHeader: XStack gap="$2" paddingBottom="$2" borderBottomWidth={1}
│   │   │   │   ├── Icon: Shield size={16} color="$gray11"
│   │   │   │   └── Text: "Authentication" fontSize="$4" color="$gray11"
│   │   │   └── YStack gap="$4" paddingTop="$4"
│   │   │       ├── SecuritySettingItem (App Lock - Toggle)
│   │   │       │   ├── XStack padding="$4" gap="$4" alignItems="center"
│   │   │       │   │   ├── IconContainer: YStack size={40} backgroundColor="$blue3" borderRadius="$3" borderColor="$blue5"
│   │   │       │   │   │   └── Icon: Shield size={20} color="$blue9"
│   │   │       │   │   ├── YStack flex={1}
│   │   │       │   │   │   ├── Text: "App Lock" fontSize="$5" color="$gray12"
│   │   │       │   │   │   └── Text: "Require authentication to open app" fontSize="$3" color="$gray10"
│   │   │       │   │   └── Switch value={appLock} onValueChange={toggleAppLock}
│   │   │       └── SecuritySettingItem (Biometric Login - Toggle)
│   │   │           └── [Same structure as App Lock, with Fingerprint icon and green colors]
│   │   │
│   │   └── SecuritySection (Session Management)
│   │       ├── SectionHeader: XStack gap="$2" paddingBottom="$2" borderBottomWidth={1}
│   │       │   ├── Icon: Smartphone size={16} color="$gray11"
│   │       │   └── Text: "Session Management" fontSize="$4" color="$gray11"
│   │       └── YStack gap="$3" paddingTop="$4"
│   │           ├── SecuritySettingItem (Active Sessions - Navigation)
│   │           │   ├── Pressable onPress={navigateToSessions}
│   │           │   │   └── XStack padding="$4" gap="$4" alignItems="center" hoverStyle={{ backgroundColor: "$gray3" }}
│   │           │   │       ├── IconContainer: YStack size={40} backgroundColor="$purple3" borderRadius="$3" borderColor="$purple5"
│   │           │   │       │   └── Icon: Smartphone size={20} color="$purple9"
│   │           │   │       ├── YStack flex={1}
│   │           │   │       │   ├── Text: "Active Sessions" fontSize="$5" color="$gray12"
│   │           │   │       │   └── Text: "Manage logged in devices" fontSize="$3" color="$gray10"
│   │           │   │       └── Icon: ChevronRight size={20} color="$gray10"
│   │           └── SecuritySettingItem (Login History - Navigation)
│   │               └── [Same structure as Active Sessions, with Clock icon and orange colors]
│   
└── SafeAreaView edges={['bottom']} (insets for gesture navigation)

// =====================================================
// COMPONENT BREAKDOWN
// =====================================================

1. SecuritySection (@my/ui/components/Settings/SecuritySection/)
   - Props: title, icon, items[]
   - Renders section header + list of SecuritySettingItems
   - Reusable for different security categories

2. SecuritySettingItem (@my/ui/components/Settings/SecuritySettingItem/)
   - Props: icon, iconColor, iconBgColor, title, description, type ('toggle' | 'navigation'), value?, onToggle?, onPress?
   - Conditional rendering based on type:
     - Toggle: Shows Switch component on right
     - Navigation: Shows ChevronRight icon on right, wraps in Pressable
   - Reusable for any settings item with icon + text + action

3. Switch (Tamagui native Switch)
   - Native switch component with platform-specific styling
   - Animated toggle transition
   - Accessible with proper labels

4. Icons (from @tamagui/lucide-icons)
   - Shield, Fingerprint, Smartphone, Clock, ChevronRight
   - Consistent sizing: 16px for section headers, 20px for items
```

- [x] **Tamagui Component Mapping**: Mapped each UI element to Tamagui components

  - [x] **Layout Components**: 
    - `YStack` - Root container, section containers, vertical item stacks
    - `XStack` - Section headers, horizontal item layouts (icon + text + action)
    - `ScrollView` - Scrollable content area for settings sections
    - `SafeAreaView` (from `react-native-safe-area-context`) - Bottom inset handling
    - `GlassBackground` - Root glass morphism container (existing component)
  
  - [x] **Interactive Components**: 
    - `Switch` - Native toggle for App Lock and Biometric Login (Tamagui)
    - `Pressable` - Wraps navigation items for Active Sessions and Login History (from Tamagui or RN)
    - `Button` - Back button in AppHeader (handled by AppHeader component)
  
  - [x] **Display Components**: 
    - `Text` - Section titles, item titles, descriptions
    - Icon components - Shield, Fingerprint, Smartphone, Clock, ChevronRight (from `@tamagui/lucide-icons`)
  
  - [x] **Navigation Hooks**: 
    - `useNavigation()` - Access navigation object for setOptions
    - `useLayoutEffect()` - Configure AppHeader before render
    - `useRouter()` - Navigation actions (back, push)
  
  - [x] **Custom Components**: 
    - `SecuritySection` - NEW: Section header + list of items (reusable)
    - `SecuritySettingItem` - NEW: Individual setting row with icon, text, and action (toggle or navigation)
    - Both should follow the pattern of existing `SettingsListItem` component

- [x] **Design System Integration**: Theme tokens and styling consistency

  - [x] **Colors**: 
    - Background: `$background` (glass morphism via GlassBackground)
    - Section header text: `$gray11` (subdued for hierarchy)
    - Item title text: `$gray12` (high contrast for readability)
    - Item description text: `$gray10` (lower contrast for secondary info)
    - Icon colors: Semantic colors based on item type
      - App Lock: `$blue9` (icon), `$blue3` (background), `$blue5` (border)
      - Biometric: `$green9` (icon), `$green3` (background), `$green5` (border)
      - Active Sessions: `$purple9` (icon), `$purple3` (background), `$purple5` (border)
      - Login History: `$orange9` (icon), `$orange3` (background), `$orange5` (border)
    - Hover state: `$gray3` (subtle highlight on navigation items)
    - Border: `$gray6` (section divider)
  
  - [x] **Typography**: 
    - Section header: `fontSize="$4"` (16px), `fontWeight="500"`
    - Item title: `fontSize="$5"` (18px), `fontWeight="400"`
    - Item description: `fontSize="$3"` (14px), `fontWeight="400"`
    - Font family: System default (San Francisco on iOS, Roboto on Android, -apple-system on web)
  
  - [x] **Spacing**: 
    - Section gap: `$6` (24px) - vertical spacing between sections
    - Item gap within section: `$4` (16px) for toggles, `$3` (12px) for navigation items
    - Item padding: `$4` (16px) - internal padding for touch targets
    - Icon gap: `$4` (16px) - space between icon and text
    - Section header padding bottom: `$2` (8px) - space before border
    - Content horizontal padding: `$4` (16px)
    - Content vertical padding: `$4` (16px)
  
  - [x] **Sizes**: 
    - Icon container: `40x40` - consistent square with rounded corners
    - Section header icons: `16x16` - smaller for hierarchy
    - Item icons: `20x20` - primary visual element
    - Chevron icon: `20x20` - matches item icons
    - Border radius for icon containers: `$3` (12px)
  
  - [x] **Borders**: 
    - Section header border bottom: `1px` solid `$gray6`
    - Icon container border: `1px` solid semantic color (e.g., `$blue5`)
    - Border radius: `$3` (12px) for icon containers

- [x] **Responsive Design Requirements**: Breakpoint behavior analysis

  - [x] **Mobile (< 768px)**: 
    - Single column layout (default)
    - Touch-optimized: All interactive elements ≥ 44px
    - Padding: `$4` (16px) horizontal for comfortable thumb reach
    - Full-width sections and items
    - Bottom safe area inset for gesture navigation
  
  - [x] **Tablet (768px - 1024px)**: 
    - Same layout as mobile (settings screens are typically single column)
    - Increased padding: `$6` (24px) horizontal for larger screen
    - Potentially larger touch targets: Consider `$5` (20px) padding for items
  
  - [x] **Desktop (> 1024px)**: 
    - Same layout structure (settings are typically single column even on desktop)
    - Hover states: `backgroundColor: "$gray3"` on navigation items
    - Larger padding: `$8` (32px) horizontal
    - Consider max-width container: `maxWidth={600}` `alignSelf="center"` for readability
    - Keyboard shortcuts: Not applicable for settings (mostly toggle/navigation)

## Interactive Elements Analysis Phase
- [x] **Button States and Variants**: Define all button interactions

  - [x] **Primary Actions**: N/A (no primary CTAs in this screen)
  
  - [x] **Secondary Actions**: 
    - Back button in AppHeader (handled by AppHeader component)
    - Consistent with existing AppHeader implementation
  
  - [x] **Destructive Actions**: N/A (no delete/remove actions in this screen)
  
  - [x] **Icon Buttons**: 
    - Back button (ArrowLeft) in AppHeader
    - Touch target: ≥ 44px (handled by AppHeader)
    - Accessibility label: "Back" or "Go back"
    - Visual feedback: Opacity 0.6 on press
  
  - [x] **State Variations**: 
    - Switch (Toggle):
      - Default: Off state (unchecked)
      - Checked: On state (filled)
      - Disabled: N/A (not needed for these settings)
      - Loading: N/A (toggle changes are immediate)
    - Navigation items (Pressable):
      - Default: No background
      - Hover (web): `backgroundColor: "$gray3"`
      - Pressed: `opacity: 0.7`
      - Disabled: N/A

- [x] **Form Elements**: Input fields and validation

  - [x] **Text Inputs**: N/A (no text inputs in this screen)
  
  - [x] **Selection Controls**: 
    - Switch component for App Lock and Biometric Login
    - Native platform switches with Tamagui styling
    - Animated toggle transition (native animation)
    - Accessibility: Proper role and state for screen readers
  
  - [x] **File Inputs**: N/A
  
  - [x] **Form Validation**: N/A (toggle states don't require validation)

- [x] **Navigation Elements**: Screen transitions and routing

  - [x] **AppHeader Configuration**: 
    - Via `navigation.setOptions({ appHeaderProps: {...} })`
    - Title: "Security"
    - Left action: Back button (`leftAction: 'back'`)
    - Right action: None (`rightAction: 'none'`)
    - Mode: Default (`mode: 'default'`)
  
  - [x] **Tab Navigation**: N/A (not applicable to this screen)
  
  - [x] **Stack Navigation**: 
    - Platform back gestures: iOS swipe, Android hardware button (handled by Expo Router)
    - Back button in AppHeader: `router.back()`
    - Forward navigation to sub-screens:
      - Active Sessions: `router.push('/settings/security/sessions')`
      - Login History: `router.push('/settings/security/history')`
  
  - [x] **Modal Navigation**: N/A (no modals in this screen)
  
  - [x] **Deep Linking**: 
    - Route: `/settings/security`
    - Sub-routes: `/settings/security/sessions`, `/settings/security/history`
    - Universal links: `sololevel://settings/security` (for mobile)
    - Web URLs: `https://sololevel.app/settings/security` (for web)

## Animation and Micro-interactions Phase
- [x] **Transition Animations**: Screen and component transitions

  - [x] **Screen Transitions**: 
    - Entry: Slide in from right (iOS) or fade in (Android) - default Expo Router behavior
    - Exit: Slide out to right (iOS) or fade out (Android)
    - Duration: ~300ms (platform default)
    - Easing: Platform default (ease-in-out)
  
  - [x] **Component Animations**: 
    - Switch toggle: Native animation (smooth transition from off to on)
    - Navigation item press: Opacity change (0.7) on press, instant
    - Hover state (web): Background color change (transparent to `$gray3`), 200ms ease
  
  - [x] **Gesture Animations**: 
    - iOS swipe back gesture: Follows finger position, spring animation on release
    - Android hardware back: No gesture, instant transition
  
  - [x] **Performance Considerations**: 
    - 60fps target: Use native components (Switch) for smooth animations
    - Animation optimization: Avoid animating layout properties (use transform/opacity)
    - Avoid animating while scrolling: Keep animations simple and lightweight

- [x] **Loading States**: Progress indication and skeleton screens

  - [x] **Skeleton Screens**: 
    - Not needed for this screen (toggles and navigation items don't have loading states)
    - If needed in the future: Skeleton for icon + text rows
  
  - [x] **Progress Indicators**: N/A (toggle changes are immediate)
  
  - [x] **Optimistic Updates**: 
    - Toggle switches should update immediately (optimistic)
    - If backend call fails, revert toggle state and show error toast
    - Navigation items: No optimistic updates (navigate immediately)

## Cross-Platform UI Considerations Phase
- [x] **Platform-Specific Adaptations**: Native feel on each platform

  - [x] **iOS Adaptations**: 
    - Navigation: iOS-style slide transition, swipe-back gesture
    - Switch: iOS native switch component (rounded, fills on toggle)
    - Safe areas: Top inset for status bar/notch, bottom inset for home indicator
    - Haptics: Consider haptic feedback on toggle (light impact)
    - System colors: Use semantic colors that adapt to light/dark mode
  
  - [x] **Android Adaptations**: 
    - Navigation: Android fade transition, hardware back button support
    - Switch: Android native switch component (thumb slides, track fills)
    - Safe areas: Top inset for status bar, bottom inset for gesture navigation
    - Material Design: Consider elevation for navigation items (subtle shadow)
    - Edge-to-edge: Content extends to edges with proper insets
  
  - [x] **Web Adaptations**: 
    - Hover states: Background color change on navigation items (`$gray3`)
    - Keyboard shortcuts: Not needed for settings (focus management via Tab key)
    - URL handling: `/settings/security` route, browser back button support
    - No safe area insets: Web doesn't have notches/home indicators
    - Cursor: Pointer cursor on interactive elements (Pressable, Switch)

- [x] **Safe Area Handling**: Proper inset management for modern devices

  - [x] **AppHeader**: 
    - Handles top safe area automatically (status bar, notch, dynamic island)
    - Uses `useSafeAreaInsets()` from react-native-safe-area-context
    - Background extends to edges (no gap at top)
  
  - [x] **Bottom Insets**: 
    - Use `<SafeAreaView edges={['bottom']} />` at root level
    - Ensures content doesn't get clipped by home indicator (iOS) or gesture bar (Android)
  
  - [x] **Full-Screen Content**: 
    - Not applicable to this screen (AppHeader is always visible)
    - If needed in future: Use `edges={['left', 'right', 'bottom']}` for full-screen content
  
  - [x] **Web**: 
    - Safe area handling not needed (no notches/home indicators)
    - SafeAreaView components render but have no effect (doesn't break layout)

- [x] **Component Platform Variants**: When to use platform-specific implementations

  - [x] **Native-Only Components**: 
    - Biometric authentication: Use `expo-local-authentication` (iOS Face ID/Touch ID, Android Biometric)
    - Haptics: `expo-haptics` for toggle feedback (iOS/Android only)
  
  - [x] **Web-Only Components**: 
    - Hover states: Use Tamagui `hoverStyle` prop (only applies on web)
    - Cursor styles: Use `cursor="pointer"` (only applies on web)
  
  - [x] **Shared Components**: 
    - SecuritySection: Shared across all platforms (same layout)
    - SecuritySettingItem: Shared across all platforms (same layout, conditional hover)
    - Switch: Tamagui Switch component adapts to platform automatically

## TDD UI Implementation Roadmap

### Phase 1: TDD Component Foundation [Native/Web]
- [ ] **Component Interface Tests**: Define props and styling contracts
  - [ ] SecuritySection.test.tsx: Test props (title, icon, items), render section header + items
  - [ ] SecuritySettingItem.test.tsx: Test props (icon, title, description, type), render toggle vs navigation
  - [ ] Test theme integration: Verify color tokens are applied correctly ($blue9, $green9, etc.)
  - [ ] Test snapshot: SecurityScreen with all sections and items

- [ ] **Theme Integration Tests**: Validate design system compliance
  - [ ] Verify icon colors match semantic tokens ($blue9, $green9, $purple9, $orange9)
  - [ ] Verify background colors use semantic tokens ($blue3, $green3, etc.)
  - [ ] Verify text colors use gray scale tokens ($gray10, $gray11, $gray12)
  - [ ] Verify spacing uses theme tokens ($2, $3, $4, $6)
  - [ ] Verify border radius uses theme tokens ($3)

- [ ] **Responsive Layout Tests**: Ensure breakpoint behavior
  - [ ] Mobile: Single column, full-width sections, padding $4
  - [ ] Tablet: Same layout, padding $6
  - [ ] Desktop: Same layout, padding $8, max-width 600, centered

- [ ] **Accessibility Foundation Tests**: Basic WCAG compliance
  - [ ] Screen reader: Section headers have proper semantic structure
  - [ ] Switch accessibility: Proper role, state, and labels
  - [ ] Navigation items: Accessible labels and touch targets
  - [ ] Color contrast: White text on glass background (WCAG 2.2 AA)
  - [ ] Dynamic type: Text scales with system font size

### Phase 2: TDD Interactive Elements [Native/Web]
- [ ] **User Interaction Tests**: Validate touch/click behavior
  - [ ] Test back navigation: Press back button, verify router.back() called
  - [ ] Test switch toggle: Press switch, verify state change and callback invoked
  - [ ] Test navigation items: Press item, verify navigation to correct route
  - [ ] Test visual feedback: Verify opacity change on press, hover state on web

- [ ] **Form Validation Tests**: Input handling and error states
  - [ ] N/A (no form inputs in this screen)

- [ ] **Navigation Tests**: Screen transitions and routing
  - [ ] Test AppHeader configuration: Verify title, back button, no right action
  - [ ] Test route structure: `/settings/security`, `/settings/security/sessions`, `/settings/security/history`
  - [ ] Test back gesture: iOS swipe, Android hardware button
  - [ ] Test deep linking: Verify routes work with universal links and web URLs

- [ ] **Animation Tests**: Transition timing and performance
  - [ ] Test switch toggle animation: Verify smooth transition (native animation)
  - [ ] Test navigation item press: Verify opacity change is instant
  - [ ] Test hover state (web): Verify background color change is smooth (200ms)
  - [ ] Test screen transition: Verify slide/fade animation (platform default)

### Phase 3: TDD Cross-Platform Parity [Native/Web]
- [ ] **Visual Parity Tests**: Identical rendering across platforms
  - [ ] Compare snapshots: iOS, Android, Web
  - [ ] Verify layout structure is identical (YStack, XStack, spacing)
  - [ ] Verify colors are identical (theme tokens resolve correctly)
  - [ ] Verify typography is identical (font sizes, weights)

- [ ] **Interaction Parity Tests**: Consistent behavior patterns
  - [ ] Verify switch toggle works on all platforms (iOS, Android, Web)
  - [ ] Verify navigation items work on all platforms
  - [ ] Verify back navigation works on all platforms (swipe, hardware button, browser button)
  - [ ] Verify hover states only apply on web (no hover on mobile)

- [ ] **Performance Tests**: Render timing and memory usage
  - [ ] Measure render time: Should be < 16ms (60fps)
  - [ ] Test scroll performance: Should be smooth (60fps)
  - [ ] Test animation performance: Switch toggle should be smooth (native animation)
  - [ ] Test memory usage: No memory leaks on mount/unmount

- [ ] **Accessibility Tests**: Platform-specific accessibility features
  - [ ] iOS: VoiceOver navigation, semantic structure
  - [ ] Android: TalkBack navigation, semantic structure
  - [ ] Web: Keyboard navigation (Tab key), screen reader support
  - [ ] All platforms: Color contrast, dynamic type, touch target sizes

## Quality Gates
- [ ] **Visual Regression Testing**: Screenshot comparison tests
  - [ ] Snapshot tests for SecurityScreen (all sections and items)
  - [ ] Snapshot tests for SecuritySection component
  - [ ] Snapshot tests for SecuritySettingItem component (toggle and navigation variants)
  - [ ] Platform-specific snapshots (iOS, Android, Web)

- [ ] **Accessibility Compliance**: WCAG 2.2 AA validation
  - [ ] Color contrast: 4.5:1 for normal text, 3:1 for large text
  - [ ] Touch targets: ≥ 44px for all interactive elements
  - [ ] Screen reader: Proper labels and semantic structure
  - [ ] Keyboard navigation: Tab order and focus management

- [ ] **Performance Benchmarks**: Render time < 16ms, smooth animations
  - [ ] Initial render: < 16ms (60fps target)
  - [ ] Scroll performance: 60fps (no dropped frames)
  - [ ] Switch toggle animation: Smooth (native animation)
  - [ ] Navigation item press: Instant visual feedback (< 100ms)

- [ ] **Cross-Platform Consistency**: Identical user experience
  - [ ] Visual parity: Identical layout and styling
  - [ ] Interaction parity: Consistent behavior patterns
  - [ ] Navigation parity: Back gesture, hardware button, browser button all work

## Documentation Requirements
- [ ] **Storybook Stories**: All component states and variants documented
  - [ ] SecuritySection.stories.tsx: Show section with different items
  - [ ] SecuritySettingItem.stories.tsx: Show toggle and navigation variants
  - [ ] SecurityScreen.stories.tsx: Show full screen with all sections

- [ ] **Design System Usage**: Theme token usage and component patterns
  - [ ] Document color tokens: $blue9, $green9, $purple9, $orange9 for icons
  - [ ] Document spacing tokens: $2, $3, $4, $6 for padding and gap
  - [ ] Document typography tokens: $3, $4, $5 for font sizes
  - [ ] Document border radius tokens: $3 for icon containers

- [ ] **Accessibility Documentation**: Screen reader testing results
  - [ ] Document screen reader navigation flow
  - [ ] Document accessibility labels for all interactive elements
  - [ ] Document color contrast ratios
  - [ ] Document dynamic type scaling behavior

- [ ] **Animation Documentation**: Transition timing and easing functions
  - [ ] Switch toggle: Native animation (platform default)
  - [ ] Navigation item press: Instant opacity change
  - [ ] Hover state (web): 200ms ease background color change
  - [ ] Screen transition: 300ms slide/fade (platform default)

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details

## Implementation Notes

### Component Reusability
The SecurityScreen introduces two new reusable components that can be used for other settings sub-screens:

1. **SecuritySection** (`@my/ui/components/Settings/SecuritySection/`)
   - Renders a section header with icon + title
   - Renders a list of SecuritySettingItems
   - Props: `title`, `icon`, `items[]`
   - Can be renamed to `SettingsSection` for broader use

2. **SecuritySettingItem** (`@my/ui/components/Settings/SecuritySettingItem/`)
   - Renders a single setting row with icon, text, and action
   - Supports two types: `'toggle'` (shows Switch) and `'navigation'` (shows ChevronRight)
   - Props: `icon`, `iconColor`, `iconBgColor`, `title`, `description`, `type`, `value?`, `onToggle?`, `onPress?`
   - Can be renamed to `SettingsActionItem` for broader use

### Existing Components to Reference
- **SettingsListItem**: Existing component for settings navigation items (from main settings screen)
- **ProfileSection**: Existing component for profile display (from main settings screen)
- **SettingsFooter**: Existing component for footer links (from main settings screen)
- **LogOutButton**: Existing component for logout action (from main settings screen)

### State Management (to be analyzed in `analysis-feature.md`)
- `useSecuritySettings()` hook: Manages App Lock and Biometric Login state
- Should use Zustand store for local state (settings are stored in Supabase)
- Should use TanStack Query for fetching/updating settings from backend
- Should handle optimistic updates for toggle switches

### Backend Integration (to be analyzed in `analysis-backend.md`)
- Supabase table: `user_security_settings` (columns: `user_id`, `app_lock_enabled`, `biometric_enabled`)
- RLS policies: Users can only read/write their own settings
- Edge Function: Not needed (simple CRUD with RLS)

### Next Steps
1. Complete `analysis-feature.md` for business logic and state management
2. Complete `analysis-backend.md` for database schema and RLS policies
3. Complete `analysis-platform.md` for platform-specific implementations (biometric auth)
4. Implement components following TDD roadmap
5. Write Storybook stories for all components
6. Test on iOS, Android, and Web
