# ProfileHeader Component Documentation

## Overview
Header component for the user profile screen with back navigation, title, and settings access.

## Component Specification

### Props Interface
```typescript
interface ProfileHeaderProps {
  title: string
  onBackPress?: () => void
  onSettingsPress?: () => void
  showSettings?: boolean
}
```

### Visual Requirements
- Fixed height: 60px + safe area top
- Back button: 44x44px touch target with ChevronLeft icon
- Title: Centered, H1 typography, $6 fontSize
- Settings button: 44x44px touch target with Settings icon
- Border bottom: 1px, $borderColor

### Implementation Location
- Component: `packages/ui/components/Profile/ProfileHeader.tsx`
- Stories: `packages/ui/components/Profile/ProfileHeader.stories.tsx`
- Tests: `packages/ui/components/Profile/__tests__/ProfileHeader.test.tsx`

### Cross-Platform Considerations
- Web: Hover states for buttons
- Native: Haptic feedback on button press
- Both: Proper safe area handling

### Accessibility
- Back button: "Go back" accessibility label
- Settings button: "Open settings" accessibility label
- Title: Proper heading role for screen readers

## References
- Analysis: `docs/features/user-profile/analysis.md`
- Tasks: `docs/features/user-profile/tasks.md`
