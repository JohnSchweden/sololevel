# Account Screen UI/UX Analysis

## Visual Layout Structure

```typescript
GlassBackground (full screen with glassmorphism effects)
├── AppHeader: XStack justifyContent="space-between" padding="$4"
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
        ├── SettingsSectionHeader: title + Trash2 icon (red variant)
        └── SettingsNavigationItem: Delete Account (Trash2 icon, red)
```

## Component Mapping

### Reusable Components (from @my/ui)
- ✅ `ProfileSection` - Avatar, name, email display (exists)
- ✅ `SettingsSectionHeader` - Section titles with icons (exists)
- ✅ `SettingsNavigationItem` - Navigation items with colored icon containers (exists)
- ✅ `SettingsToggleItem` - Toggle switch items with icons (exists)

### Additional Components Needed
- **None** - All components exist in `@my/ui/Settings`

## Design Tokens

**Colors:**
- Profile & Security icons: Blue (`$blue10`, `$blue2`, `$blue4`)
- Change Password: Green (`$green10`, `$green2`, `$green4`)
- Two-Factor Auth: Purple (`$purple10`, `$purple2`, `$purple4`)
- Notifications: Orange (`$orange10`, `$orange2`, `$orange4`)
- Danger Zone: Red (`$red10`, `$red2`, `$red4`)

**Typography:**
- Header: fontSize="$6" fontWeight="400"
- Profile name: fontSize="$8" fontWeight="500"
- Profile email: fontSize="$4" color="$textSecondary"

**Spacing:**
- Container padding: `$4` horizontal, `$6` vertical
- Section gap: `$4`
- Section margin: `$8`

## Interactive Elements

**Buttons:**
- Back button: ArrowLeft icon, 44px touch target
- Navigation items: Full-width pressable with ChevronRight, scale 0.98 on press
- Toggle: Standard Switch component

**States:**
- Default: Transparent background
- Hover: `backgroundColor: 'rgba(255, 255, 255, 0.05)'`
- Press: Scale 0.98 + hover background
- Disabled: opacity 0.5

## Platform Considerations

**Safe Areas:**
- AppHeader handles top insets automatically
- Use `<SafeAreaView edges={['bottom']} />` at screen root

**Scrolling:**
- ScrollView with vertical scroll for content overflow
- Header remains fixed via AppHeader

## Implementation Notes

1. **ProfileSection Enhancement**: Current component only shows avatar + name. Account screen needs email field below name:
   - Option A: Enhance ProfileSection with optional `email` prop
   - Recommended: Add optional email prop to existing component for reusability
2. **Section Headers**: Standard SettingsSectionHeader, Danger Zone uses red color tokens
3. **Navigation Items**: Color-coded icon containers differentiate sections (blue/green/purple/orange/red)
4. **Glassmorphism**: Handled by GlassBackground wrapper (existing component)

## Screen File Structure

- **Screen**: `packages/app/features/Account/AccountScreen.tsx`
- **Routes**: 
  - `apps/expo/app/(tabs)/settings/account.tsx`
  - `apps/web/app/(tabs)/settings/account.tsx`
- **Update**: `apps/{expo,web}/app/(tabs)/settings/_layout.tsx` for navigation

## Callback Props Pattern

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

Route handlers implement platform-specific navigation (Linking/window.open).

