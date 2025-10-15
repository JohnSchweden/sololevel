# Personalisation UI/UX Analysis

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: Theme toggle 3-state (Light/Dark/Auto), language selector, switch states (on/off), section icons, glass background rendering
- [ ] **User Interaction Tests**: Theme selection feedback, language dropdown, switch toggles, scroll behavior, back navigation
- [ ] **Accessibility Tests**: Switch ARIA labels, touch targets ≥44px, keyboard navigation, screen reader for sections

## Visual Design Analysis Phase
- [x] **Layout Structure**: Full-screen with GlassBackground, AppHeader, scrollable sections

**Code Composition Pattern**:
- **Screen**: `packages/app/features/Personalisation/PersonalisationScreen.tsx`
  - Hooks: `useHeaderHeight()`, `useNavigation()`, `useLayoutEffect()` for AppHeader
  - Local state: Theme selection, language, accessibility toggles, interaction settings
  - Render: Sections from `@my/ui` (or create if needed)
  - Callback props: `onBack?: () => void`
- **Routes**: `apps/{expo,web}/app/settings/personalisation.tsx`
  - Handler: `router.back()` for navigation
  - AuthGate wrapper

**Visual Layout Structure**:
```typescript
GlassBackground (full screen)
├── YStack paddingTop={headerHeight + 30} paddingHorizontal="$4" gap="$6"
│   ├── Section: Appearance (YStack gap="$3" marginBottom="$6")
│   │   ├── SectionHeader: XStack gap="$2" with Palette icon + title
│   │   └── ThemeSelector: XStack gap="$3" with 3 theme buttons (Light/Dark/Auto)
│   ├── Section: Language & Region (YStack gap="$3" marginBottom="$6")
│   │   ├── SectionHeader: XStack gap="$2" with Globe icon + title
│   │   └── LanguageSelect: Select component
│   ├── Section: Accessibility (YStack gap="$3" marginBottom="$6")
│   │   ├── SectionHeader: XStack gap="$2" with Type icon + title
│   │   ├── SettingRow: Large Text (XStack with label + Switch)
│   │   └── SettingRow: Reduce Animations (XStack with label + Switch)
│   └── Section: Interaction (YStack gap="$3" marginBottom="$6")
│       ├── SectionHeader: XStack gap="$2" with Zap icon + title
│       ├── SettingRow: Sound Effects (XStack with icon + label + Switch)
│       └── SettingRow: Haptic Feedback (XStack with icon + label + Switch)
```

**AppHeader**: Configured via `navigation.setOptions({ appHeaderProps: { title: 'Personalisation', leftAction: 'back', onBackPress } })`

- [x] **Component Mapping**
  - Layout: `YStack`, `XStack`, `ScrollView` (implicit in YStack overflow)
  - Interactive: `Button` (theme selector), `Switch` (toggles), `Select`/`SelectTrigger`/`SelectContent`/`SelectItem` (language)
  - Display: `Text` (labels, descriptions), Icon components from `lucide-react-native`
  - Container: `GlassBackground` (from `@my/ui`)
  - Custom: 
    - `ThemeToggleButtons` - 3-button group for Light/Dark/Auto selection
    - `SettingRow` - Reusable component for label + switch (similar to SecurityScreen pattern)
    - `SectionHeader` - Icon + title with border-bottom divider

**Reusable from SecurityScreen/SettingsScreen**:
  - `GlassBackground` wrapper pattern
  - `YStack` layout with `headerHeight` offset
  - Section-based organization with icons
  - Callback props for navigation
  - `useLayoutEffect` for AppHeader configuration

- [x] **Design Tokens**
  - Colors: `$color3` (background), `$white` (text), `$gray10` (section headers), `$green5`, `$purple5` (icon backgrounds)
  - Typography: Title `$6` (20px), body `$4` (16px), description `$3` (14px) with `color="$gray10"`
  - Spacing: Section gap `$6`, row gap `$3`, horizontal padding `$4`, top padding `headerHeight + 30`
  - Borders: `borderBottomWidth={1}`, `borderColor="$gray6"` for section headers
  - Icon sizes: `size={20}` for section icons, `size={24}` for setting row icons

- [x] **Responsive Breakpoints**
  - Mobile (< 768px): Single column, full-width sections, touch-optimized switches
  - Tablet (768-1024px): Same layout, larger spacing
  - Desktop (> 1024px): Same layout (settings screens don't need multi-column)

## Interactive Elements
- [x] **Buttons**: 
  - Theme selector: 3 buttons in grid (Light/Dark/Auto), active state with `bg="$gray8"`, hover `bg="$gray7"`, 44px height
  - Variants: Glass-morphic with `backgroundColor="$gray2"`, `borderColor="$gray6"`, `borderRadius="$4"`
- [x] **Form Elements**: 
  - Switch: Native toggle for boolean settings (Large Text, Reduce Animations, Sound Effects, Haptic Feedback)
  - Select: Language dropdown with trigger + content overlay, styled to match glass theme
- [x] **Navigation**: 
  - Back button via AppHeader (configured in `useLayoutEffect`)
  - Callback prop: `onBack?: () => void` for testability
  - Route handler: `router.back()` in route file

## Animations & Loading States
- [x] **Transitions**: 
  - Theme selection: Fade/scale animation on button press
  - Switch toggle: Native platform animation
  - Select dropdown: Slide-up sheet on native, dropdown on web
- [x] **Loading UI**: 
  - No loading states needed (settings are local preferences)
  - Future: Skeleton for language list if fetched from API
- [x] **Performance**: 
  - 60fps target for switch animations
  - Debounce preference updates if persisting to storage

## Cross-Platform Considerations
- [x] **Platform Adaptations**
  - iOS: Native switch, swipe-to-go-back gesture, haptic feedback for toggles
  - Android: Native switch, back button handler, no haptics on all devices
  - Web: Custom switch styling, no haptics, keyboard shortcuts (Space for toggle)
- [x] **Safe Area Handling**
  - AppHeader handles top insets (status bar/notch)
  - Use `<SafeAreaView edges={['bottom']} />` if needed at screen root
- [x] **Platform-Specific Components**
  - Native-only: Haptic feedback toggle (hide on web)
  - Web-only: Keyboard shortcuts for theme selection (1/2/3 keys)
  - Shared: Theme/language/accessibility settings with platform-appropriate styling

## Quality Gates & Documentation
- [ ] **Testing**: 
  - Visual regression: Theme toggle states, switch on/off, language selector
  - Accessibility: WCAG 2.2 AA color contrast, switch labels, keyboard nav
  - Performance: Render < 16ms, smooth animations
  - Cross-platform: Test on iOS/Android/Web
- [ ] **Documentation**: 
  - Storybook stories for ThemeToggleButtons, SettingRow, SectionHeader
  - Theme token usage examples
  - Accessibility labels for screen readers

## Existing App Integration
- [ ] **Screen**: Create `packages/app/features/Personalisation/PersonalisationScreen.tsx` following SecurityScreen pattern
- [ ] **Routes**: Update `apps/{expo,web}/app/settings/personalisation.tsx` to use new screen
- [ ] **UI Components**: Create reusable components in `packages/ui/src/features/Personalisation/`
  - `ThemeToggleButtons.tsx` - 3-state theme selector
  - `SettingRow.tsx` - Icon + label + switch row (reusable pattern)
  - `SectionHeader.tsx` - Icon + title with divider (reusable pattern)
- [ ] **Testing**: Mock `onBack` prop, test theme selection, switch toggles, language selector

## Implementation Notes
- Figma design uses web components (`div`, `className`) → Convert to Tamagui (`YStack`, `XStack`, theme tokens)
- Glass morphism from Figma → Use existing `GlassBackground` component
- Section pattern matches SecurityScreen → Extract reusable `SectionHeader` component
- Setting rows match pattern → Create reusable `SettingRow` component
- Theme tokens: Map Figma colors to existing Tamagui theme (`$color3`, `$gray1-12`, etc.)

