# Data Controls UI/UX Analysis

> **Purpose**: Visual design and component mapping for Data Controls screen - manages user data sharing preferences, data export, and account data deletion.

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: 
  - Snapshot tests for default state with all toggles
  - Glass morphism styling consistency
  - Section header icon alignment
  - Responsive breakpoints (mobile → tablet → desktop)
  - Theme token validation (glass background, borders, shadows)
- [ ] **User Interaction Tests**: 
  - Toggle switches (Analytics Data, Crash Reports)
  - Export Data button navigation
  - Clear All Data confirmation flow
  - Touch target validation (44px minimum for all interactive elements)
  - Back button navigation
- [ ] **Accessibility Tests**: 
  - Screen reader labels for all switches and buttons
  - Keyboard navigation (tab order: back → toggles → export → delete)
  - Destructive action confirmation (Clear All Data)
  - Color contrast for red warning text (WCAG 2.2 AA)
  - Focus indicators on all interactive elements

## Visual Layout Structure
```typescript
// Screen Structure Pattern (packages/app/features/DataControls/DataControlsScreen.tsx)
export function DataControlsScreen(props: DataControlsScreenProps) {
  const navigation = useNavigation()
  
  // Configure AppHeader
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'Data Controls',
        mode: 'default',
        onBack: props.onBack,
      }
    })
  }, [navigation, props.onBack])

  const { analyticsEnabled, crashReportsEnabled } = useDataControlsStore()

  return (
    <YStack flex={1} backgroundColor="$background">
      <ScrollView flex={1}>
        <YStack padding="$4" gap="$6">
          {/* Data Sharing Section */}
          <SettingsSectionHeader 
            icon={Database}
            title="Data Sharing"
          />
          <YStack gap="$4">
            <SettingsToggleItem
              title="Analytics Data"
              description="Share app usage data to improve experience"
              checked={analyticsEnabled}
              onCheckedChange={handleAnalyticsToggle}
            />
            <SettingsToggleItem
              title="Crash Reports"
              description="Automatically send crash reports"
              checked={crashReportsEnabled}
              onCheckedChange={handleCrashReportsToggle}
            />
          </YStack>

          {/* Data Export Section */}
          <SettingsSectionHeader 
            icon={Download}
            title="Data Export"
          />
          <SettingsNavigationItem
            icon={Download}
            iconColor="$blue10"
            iconBackground="$blue3"
            title="Export Data"
            description="Download all your personal data"
            onPress={handleDataExport}
          />

          {/* Data Deletion Section */}
          <SettingsSectionHeader 
            icon={Trash2}
            title="Data Deletion"
            variant="destructive"
          />
          <YStack gap="$3">
            <Text fontSize="$3" color="$red11">
              This will permanently delete all your app data including preferences, history, and saved items.
            </Text>
            <Button
              variant="destructive"
              size="$4"
              icon={Trash2}
              onPress={handleClearAllData}
            >
              Clear All Data
            </Button>
          </YStack>
        </YStack>
      </ScrollView>
      <SafeAreaView edges={['bottom']} />
    </YStack>
  )
}

// Visual Hierarchy:
YStack: flex={1} backgroundColor="$background" (full screen with glass morphism)
├── AppHeader: title="Data Controls" (configured via navigation.setOptions)
├── ScrollView: flex={1} (scrollable content)
│   └── YStack: padding="$4" gap="$6" (main container)
│       ├── SettingsSectionHeader (Data Sharing) + icon
│       ├── YStack gap="$4" (toggle group)
│       │   ├── SettingsToggleItem (Analytics Data)
│       │   └── SettingsToggleItem (Crash Reports)
│       ├── SettingsSectionHeader (Data Export) + icon
│       ├── SettingsNavigationItem (Export Data) + chevron
│       ├── SettingsSectionHeader (Data Deletion) variant="destructive"
│       └── YStack gap="$3" (deletion section)
│           ├── Text (warning message)
│           └── Button variant="destructive" (Clear All Data)
└── SafeAreaView edges={['bottom']}
```

- [x] **Component Mapping**
  - **Layout**: YStack, ScrollView, SafeAreaView
  - **Headers**: SettingsSectionHeader (reusable from Settings)
  - **Interactive**: SettingsToggleItem (reusable), SettingsNavigationItem (reusable), Button
  - **Display**: Text (warning message)
  - **Icons**: Database, Download, Trash2, ChevronRight (lucide-react-native)
  - **Glass Morphism**: Applied via `$background` with backdrop blur/gradient overlays
  - **Custom Components**: None needed - reuse Settings components

- [x] **Design Tokens**: Map wireframe to theme tokens
  - **Colors**:
    - Background: `$background` (glass morphism base)
    - Section headers: `$gray11` (default), `$red10` (destructive)
    - Toggle items: `$color` (title), `$gray10` (description)
    - Export button: `$blue10` (icon), `$blue3` (background)
    - Delete button: `$red10` (text), `$red3` (background), `$red6` (border)
    - Warning text: `$red11`
  - **Typography**:
    - Section headers: `fontSize="$4"` fontWeight="600"
    - Item titles: `fontSize="$4"` fontWeight="500"
    - Item descriptions: `fontSize="$3"` color="$gray10"
    - Warning text: `fontSize="$3"` color="$red11"
  - **Spacing**:
    - Screen padding: `$4` (16px)
    - Section gap: `$6` (24px)
    - Item gap: `$4` (16px)
    - Internal gap: `$3` (12px)
  - **Borders/Shadows**:
    - Section dividers: `borderBottomWidth={1}` borderColor="$borderColor"
    - Button borders: `borderWidth={1}` borderColor="$red6"
    - Glass overlay: backdrop-filter blur with gradient overlays

- [x] **Responsive Breakpoints**
  - **Mobile (< 768px)**: Single column, full-width toggles, padding `$4`
  - **Tablet (768-1024px)**: Increased padding `$6`, larger touch targets
  - **Desktop (> 1024px)**: Max width 600px centered, hover states on all interactive elements

## Interactive Elements
- [x] **Switches** (Data Sharing):
  - Analytics Data toggle: State managed in `useDataControlsStore()`
  - Crash Reports toggle: State managed in `useDataControlsStore()`
  - States: default (on/off), disabled (if account restrictions)
  - Touch target: 44px minimum height
  
- [x] **Navigation Button** (Data Export):
  - Export Data: Triggers data export flow (navigate to export screen or trigger download)
  - States: default, hover (web), pressed
  - Visual: Blue icon in circle + chevron right
  - Touch target: 44px minimum height

- [x] **Destructive Button** (Data Deletion):
  - Clear All Data: Triggers confirmation dialog → deletion flow
  - Variant: "destructive" (red background, red border, red text)
  - States: default, hover, pressed, loading (during deletion)
  - Touch target: 44px minimum height
  - Icon: Trash2 (left aligned)

- [x] **Back Button** (Header):
  - Configured via AppHeader `onBack` prop
  - Standard navigation pattern

## Animations & Loading States
- [x] **Transitions**:
  - Screen entry: Slide from right (iOS), slide from bottom (Android modal)
  - Toggle switches: Spring animation (0.3s, `type: spring`, `damping: 15`)
  - Button press: Scale down 0.97 with 150ms duration
  - Export button: Subtle hover lift on web (`translateY: -1px`)

- [x] **Loading UI**:
  - Toggle changes: Optimistic update, revert on error
  - Export Data: Loading spinner + "Preparing export..." text
  - Clear All Data: Button shows Spinner + disabled state during deletion
  - Confirmation dialog: Modal sheet with secondary "Cancel" and destructive "Delete" buttons

- [x] **Performance**:
  - 60fps target: Use `React.memo` for SettingsToggleItem to prevent unnecessary re-renders
  - Animation optimization: Native driver for all animations
  - Throttle toggle changes: 300ms debounce to prevent rapid toggling

## Cross-Platform Considerations
- [x] **Platform Adaptations**
  - **iOS**: 
    - Toggle switches: iOS-style switch design
    - Haptic feedback on toggle changes (light impact)
    - Safe area handling for notch/home indicator
    - Navigation: Swipe from left edge to go back
  - **Android**: 
    - Toggle switches: Material Design switch
    - Ripple effect on button press
    - System back button support
    - Edge-to-edge display
  - **Web**: 
    - Hover states on all interactive elements
    - Keyboard navigation: Tab through toggles, Enter to activate
    - Focus indicators: Blue outline on focused elements
    - No safe area insets needed

- [x] **Safe Area Handling**
  - AppHeader handles top insets (status bar, notch)
  - `<SafeAreaView edges={['bottom']} />` at screen root for home indicator
  - Scrollable content respects safe areas
  - Button padding adjusted for bottom safe area

- [x] **Platform-Specific Features**
  - **Native-only**: 
    - Haptic feedback on toggle/button interactions
    - Native share sheet for data export (iOS/Android)
  - **Web-only**: 
    - Download link for data export
    - Browser confirmation for destructive actions
  - **Shared**: 
    - Same visual design and layout
    - Confirmation dialogs use platform-native modals

## Quality Gates & Documentation
- [ ] **Testing**:
  - Visual regression: Screenshot tests for default state, toggled states, responsive breakpoints
  - Accessibility: 
    - WCAG 2.2 AA color contrast validation (especially red warning text)
    - Screen reader labels for all switches
    - Keyboard navigation flow
    - Focus management after dialog dismissal
  - Performance: Render < 16ms, toggle animations at 60fps
  - Cross-platform parity: Identical layout on iOS/Android/Web

- [ ] **Documentation**:
  - Storybook stories:
    - DataControlsScreen (default state)
    - DataControlsScreen (with toggles off)
    - DataControlsScreen (loading state during deletion)
  - Component usage examples in `packages/ui/src/components/Settings/README.md`
  - Screen reader test results documented
  - Animation timing specs: Toggle (0.3s spring), Button press (0.15s ease-out)

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for data controls store, export logic, deletion flow
- **Backend Integration**: See `analysis-backend.md` for analytics tracking, data export API, account deletion
- **Reusable Components**: 
  - `SettingsSectionHeader`: `packages/ui/src/components/Settings/SettingsSectionHeader/`
  - `SettingsToggleItem`: `packages/ui/src/components/Settings/SettingsToggleItem/`
  - `SettingsNavigationItem`: `packages/ui/src/components/Settings/SettingsNavigationList/`
- **Security Feature**: Similar pattern to SecurityScreen for destructive actions

