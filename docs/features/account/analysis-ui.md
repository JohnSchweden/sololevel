# Account Screen UI/UX Analysis

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: Snapshot tests for ProfileSection with/without email, all navigation items, toggle states, danger zone red variant
- [ ] **User Interaction Tests**: Back button navigation, navigation item press (5 items), toggle 2FA switch, scroll behavior, hover states (web), 44px touch targets
- [ ] **Accessibility Tests**: Screen reader announces "Account" title, all navigation items with icon + title + subtitle, toggle switch accessible label, color contrast for red danger zone text

## Visual Design Analysis Phase

### Layout Structure
**Code Composition Pattern**:
- **Screen**: `packages/app/features/Account/AccountScreen.tsx` - Orchestrator with callback props
  - Hooks: useAuth for user data, local state for 2FA toggle
  - Render: UI components from @my/ui (ProfileSection, SettingsNavigationItem, etc.)
  - NO business logic (delegated to hooks)
  - NO navigation logic (callback props only)
- **Route**: `apps/{expo,web}/app/(tabs)/settings/account.tsx` - Navigation handlers, AuthGate wrapper
- **Pattern**: Callback props in screens → handlers in route files → platform-specific (Linking/window.open)

**Visual Layout Structure**:
```typescript
GlassBackground (full screen with glassmorphism effects)
├── AppHeader: Configured via navigation.setOptions()
│   ├── Back Button (ArrowLeft icon)
│   ├── Title: "Account"
│   └── Spacer (for centering)
└── ScrollView: flex={1} paddingHorizontal="$4"
    ├── ProfileSection: YStack gap="$3" marginBottom="$8"
    │   ├── Avatar: 84x84 circle with border
    │   ├── Name: fontSize="$8" fontWeight="500"
    │   └── Email: fontSize="$4" color="$textSecondary"
    ├── Section 1: Profile & Security
    │   ├── SettingsSectionHeader: title + User icon
    │   └── YStack gap="$4"
    │       ├── SettingsNavigationItem: Edit Profile (User icon, blue)
    │       ├── SettingsNavigationItem: Change Password (Lock icon, green)
    │       └── SettingsToggleItem: Two-Factor Auth (Shield icon, purple)
    ├── Section 2: Notifications
    │   ├── SettingsSectionHeader: title + Mail icon
    │   └── SettingsNavigationItem: Email Preferences (Mail icon, orange)
    └── Section 3: Danger Zone
        ├── SettingsSectionHeader: title + Trash2 icon (red color scheme)
        └── SettingsNavigationItem: Delete Account (Trash2 icon, red)
```

**AppHeader**: Configured via `navigation.setOptions({ appHeaderProps: { title: 'Account', showBackButton: true } })`

### Component Mapping
- [x] **Layout**: YStack, XStack, ScrollView, SafeAreaView (from tamagui + react-native-safe-area-context)
- [x] **Interactive**: Button (within navigation items), Switch (for 2FA toggle)
- [x] **Display**: Text, Image (avatar), custom ProfileSection
- [x] **Custom Components** (all exist in @my/ui):
  - `ProfileSection` - needs optional `email` prop enhancement
  - `SettingsSectionHeader`
  - `SettingsNavigationItem`
  - `SettingsToggleItem`

### Design Tokens
**Colors:**
- Profile & Security icons: Blue (`$blue10`, `$blue2`, `$blue4`)
- Change Password: Green (`$green10`, `$green2`, `$green4`)
- Two-Factor Auth: Purple (`$purple10`, `$purple2`, `$purple4`)
- Notifications: Orange (`$orange10`, `$orange2`, `$orange4`)
- Danger Zone: Red (`$red10`, `$red2`, `$red4`)
- Text: `$text`, `$textSecondary`
- Borders: `$borderColor`

**Typography:**
- Header title: fontSize="$6" fontWeight="400"
- Profile name: fontSize="$8" fontWeight="500"
- Profile email: fontSize="$4" color="$textSecondary"
- Navigation title: fontSize="$5" fontWeight="400"
- Navigation subtitle: fontSize="$3"

**Spacing:**
- Container padding: `$4` horizontal, `$6` vertical
- Section gap: `$4`
- Section margin bottom: `$8`
- ProfileSection margin bottom: `$8`

**Sizes/Borders:**
- Avatar: 84x84px circle (borderRadius={42})
- Icon container: 40x40px with borderRadius="$3"
- Border width: 1px on icon containers and avatar

### Responsive Breakpoints
- [x] **Mobile (< 768px)**: Single column, touch-optimized (44px touch targets), full-width navigation items
- [x] **Tablet (768-1024px)**: Same layout, larger padding (`$6` horizontal), slightly larger avatar (96x96)
- [x] **Desktop (> 1024px)**: Max-width constraint (600px centered), hover states on navigation items, keyboard shortcuts (Esc to go back)

## Interactive Elements

### Buttons
- [x] **Back button**: ArrowLeft icon, 44px touch target, pressStyle scale 0.98
- [x] **Navigation items**: Full-width pressable, ChevronRight indicator
  - Default: Transparent background
  - Hover: `backgroundColor: 'rgba(255, 255, 255, 0.05)'`
  - Press: Scale 0.98 + hover background
  - Disabled: opacity 0.5
- [x] **Toggle switch**: Standard Tamagui Switch, size="$4", green when enabled

### Navigation
- [x] **Callback props pattern**: All navigation handled via optional callback props
- [x] **Routes implement handlers**: Platform-specific navigation logic in route files
- [x] **No direct navigation**: Screen component is fully testable with mock callbacks

### AppHeader
- [x] **Configuration**: `navigation.setOptions({ appHeaderProps: { title: 'Account', showBackButton: true, onBackPress } })`
- [x] **Back handling**: iOS swipe gesture, Android back button, custom back button press

## Animations & Loading States

### Transitions
- [x] **Screen entry**: Slide from right (stack push), fade on modal
- [x] **Navigation item press**: Scale 0.98 with spring animation (200ms)
- [x] **Toggle switch**: Thumb animation "quick" preset

### Loading UI
- [x] **ProfileSection**: Skeleton with spinner while loading user data
- [x] **No loading states for navigation items**: Static list

### Performance
- [x] **60fps target**: Minimal layout complexity, reusable components
- [x] **Optimization**: ProfileSection memoized, navigation items in FlatList if list grows

## Cross-Platform Considerations

### Platform Adaptations
- [x] **iOS**: Native swipe-back gesture, haptic feedback on toggle, safe area handling for notch
- [x] **Android**: Hardware back button support, Material ripple effects, edge-to-edge display
- [x] **Web**: Hover states on navigation items, keyboard navigation (Tab, Enter), no safe area insets, browser back button support

### Safe Area Handling
- [x] **AppHeader**: Handles top insets automatically (status bar, notch)
- [x] **Screen root**: `<SafeAreaView edges={['bottom']} />` for home indicator
- [x] **ScrollView**: Respects safe area padding

### Platform-Specific Components
- [x] **Shared**: All components pure Tamagui, work across platforms
- [x] **No platform files needed**: Single implementation for all platforms

## Quality Gates & Documentation

### Testing
- [x] **Visual regression**: Snapshot tests for all sections, light/dark themes, danger zone red variant
- [x] **Accessibility**: WCAG 2.2 AA color contrast (test red text), screen reader navigation flow
- [x] **Performance**: Render < 16ms, smooth scroll at 60fps
- [x] **Cross-platform parity**: Identical layout on iOS/Android/Web (except hover states)

### Documentation
- [x] **Storybook stories**: ProfileSection with email, all navigation item variants, toggle states
- [x] **Theme tokens**: Document color system for Settings components (blue/green/purple/orange/red)
- [x] **Screen reader flow**: Test account → profile section → navigation items → danger zone

## Navigation & App Integration

- [x] **Screen**: `packages/app/features/Account/AccountScreen.tsx` with callback props
- [x] **Routes**: 
  - `apps/expo/app/(tabs)/settings/account.tsx` - Native handlers
  - `apps/web/app/(tabs)/settings/account.tsx` - Web handlers
  - Update `apps/{expo,web}/app/(tabs)/settings/_layout.tsx` for navigation
- [x] **Navigation**: Callback props in screens → handlers in route files
- [x] **Platform**: Native uses Linking.openURL (edit profile external), Web uses window.open
- [x] **Testing**: Mock callback props for unit tests

### Callback Props Pattern
```typescript
interface AccountScreenProps {
  onBack?: () => void
  onEditProfile?: () => void
  onChangePassword?: () => void
  onEmailPreferences?: () => void
  onDeleteAccount?: () => void
  onToggle2FA?: (enabled: boolean) => void
}
```

## Implementation Notes

1. **ProfileSection Enhancement**: Add optional `email` prop to existing component
   ```typescript
   // Add to ProfileSectionProps
   email?: string
   ```
2. **Section Headers**: Standard SettingsSectionHeader, color tokens handle red variant automatically
3. **Navigation Items**: Color-coded icon containers use consistent pattern (iconColor, iconBackground, iconBorder)
4. **Glassmorphism**: GlassBackground wrapper handles all blur/gradient effects
5. **Component Reuse**: All Settings components follow same pattern, easily extendable

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for user data fetching and 2FA state management
- **Backend Integration**: See `analysis-backend.md` for user profile API, 2FA endpoints
- **Platform Specifics**: No platform-specific implementation needed (pure Tamagui)
