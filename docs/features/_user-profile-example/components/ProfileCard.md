# ProfileCard Component Documentation

## Overview
Main profile information card displaying user avatar, name, role, and basic stats.

## Component Specification

### Props Interface
```typescript
interface ProfileCardProps {
  user: {
    id: string
    name: string
    role: string
    avatar_url?: string
    bio?: string
  }
  onAvatarPress?: () => void
  onEditPress?: () => void
  isEditable?: boolean
}
```

### Visual Requirements
- Card container: YStack with $background, $4 borderRadius, $4 padding
- Avatar: 80px diameter, fallback with initials
- Name: H2 typography, $6 fontSize, fontWeight 600
- Role: Text, $4 fontSize, $gray10 color
- Bio: Text, $3 fontSize, max 3 lines
- Edit button: "Edit Profile" with outlined variant

### Implementation Location
- Component: `packages/ui/components/Profile/ProfileCard.tsx`
- Stories: `packages/ui/components/Profile/ProfileCard.stories.tsx`
- Tests: `packages/ui/components/Profile/__tests__/ProfileCard.test.tsx`

### Cross-Platform Considerations
- Avatar press: Image picker on native, file upload on web
- Touch targets: Minimum 44px for all interactive elements
- Loading states: Skeleton while user data loads

### Accessibility
- Avatar: "Profile picture" accessibility label
- Edit button: "Edit profile information" accessibility label
- Bio: Proper text content for screen readers

## References
- Analysis: `docs/features/user-profile/analysis.md`
- Tasks: `docs/features/user-profile/tasks.md`
