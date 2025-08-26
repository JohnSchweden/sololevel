# User Profile Screen - Wireframe Analysis Example

> **Note**: This is a reference example showing how to complete wireframe analysis systematically.

## Visual Analysis Phase
- [x] **Layout Structure**: 
  - Header: Back button + "Profile" title + Settings icon (60px fixed height)
  - Content Area: Avatar section + User info card + Settings list (scrollable)
  - Navigation: Bottom tab bar with 4 tabs (80px fixed height)
  - Safe areas: Top notch + bottom home indicator handled

- [x] **Component Mapping**:
  - Header → `XStack` with `Button` (back) + `H1` (title) + `Button` (settings)
  - Avatar section → `YStack` with `Avatar` + `H2` (name) + `Text` (role)
  - User info card → `YStack` with rounded background, padding, shadow
  - Settings list → `FlatList` with custom `ListItem` components
  - Bottom tabs → `XStack` with 4 `Button` components, active state styling

- [x] **Responsive Breakpoints**:
  - Mobile (xs: 0-428px): Bottom tabs, single column, full-width cards
  - Tablet (sm: 429-768px): Side navigation option, two-column settings
  - Desktop (md+: 769px+): Sidebar navigation, multi-column layout

- [x] **Interactive Elements**:
  - Back button: 44x44px touch target, haptic feedback
  - Settings icon: 44x44px touch target, opens modal/drawer
  - Avatar: Tappable to edit profile picture
  - Settings list items: 60px height, press feedback, navigation
  - Bottom tabs: 44px height, active/inactive states

- [x] **Content Types**:
  - Primary text: User name (H2, $6 fontSize, bold)
  - Secondary text: User role (Text, $4 fontSize, $gray10)
  - List labels: Setting names (Text, $4 fontSize, medium weight)
  - Icons: Lucide React icons, 20px size, consistent style

- [x] **Navigation Patterns**:
  - Back navigation: `router.back()` or specific route
  - Settings modal: Full-screen on mobile, centered on tablet+
  - Tab navigation: Expo Router tab layout
  - Deep linking: `/profile/[userId]` route structure

## Technical Requirements Phase
- [x] **Data Requirements**:
  - API Endpoints:
    - `GET /api/users/:id` - User profile data
    - `GET /api/users/:id/settings` - User preferences
    - `PUT /api/users/:id` - Update profile
  - Supabase Tables:
    - `users`: id, name, email, avatar_url, role, created_at
    - `user_settings`: user_id, theme, notifications, privacy
  - Real-time: User status updates, profile changes

- [x] **State Management**:
  - Server State (TanStack Query):
    - `useUser(userId)` - Profile data with caching
    - `useUserSettings(userId)` - Settings with optimistic updates
  - Local State:
    - Modal visibility (useState)
    - Form state (react-hook-form)
  - Global State (Zustand):
    - Current user session
    - Theme preferences

- [x] **Platform Considerations**:
  - Native-specific:
    - Safe area insets handling
    - Native image picker for avatar
    - Haptic feedback on interactions
    - Platform-specific animations
  - Web-specific:
    - Hover states for interactive elements
    - Keyboard navigation support
    - SEO meta tags for profile pages
    - File upload for avatar

- [x] **Performance Needs**:
  - Image optimization: Avatar lazy loading, WebP format
  - List virtualization: Not needed (< 20 settings items)
  - Bundle splitting: Profile screen as separate chunk
  - Caching: User data cached for 5 minutes

- [x] **Accessibility**:
  - Screen reader: All interactive elements labeled
  - Keyboard navigation: Tab order, focus management
  - Color contrast: WCAG 2.2 AA compliance
  - Touch targets: Minimum 44px for all buttons
  - Voice control: Proper accessibility hints

## Component Architecture Phase
- [x] **Component Hierarchy**:
  ```
  UserProfileScreen
  ├── ProfileHeader (back button, title, settings)
  ├── ScrollView
  │   ├── ProfileAvatarSection (avatar, name, role)
  │   ├── ProfileInfoCard (bio, stats, actions)
  │   └── SettingsList (preferences, account, support)
  └── BottomTabNavigation (if mobile)
  ```

- [x] **Props Interface**:
  ```typescript
  interface UserProfileScreenProps {
    userId: string
    onNavigateBack?: () => void
    onSettingsPress?: () => void
    linkComponent?: React.ReactNode
  }
  
  interface ProfileAvatarSectionProps {
    user: User
    onAvatarPress: () => void
    isEditable: boolean
  }
  
  interface SettingsListProps {
    settings: UserSetting[]
    onSettingPress: (settingId: string) => void
  }
  ```

- [x] **Styling Strategy**:
  - Theme tokens: `$background`, `$backgroundSubtle`, `$text`, `$gray10`
  - Spacing: `$4` (16px) standard, `$2` (8px) tight, `$6` (24px) loose
  - Border radius: `$4` for cards, `$2` for buttons
  - Shadows: Tamagui elevation system
  - Typography: Semantic heading hierarchy

- [x] **Testing Strategy**:
  - Unit Tests:
    - ProfileAvatarSection component rendering
    - SettingsList interaction handling
    - Props validation and edge cases
  - Integration Tests:
    - User data loading and display
    - Navigation between profile sections
    - Settings updates and persistence
  - E2E Tests:
    - Complete profile viewing flow
    - Avatar upload process
    - Settings modification workflow

## Cross-Platform Validation Phase
- [x] **Web Implementation**:
  - Next.js page: `/pages/profile/[userId].tsx`
  - SEO: Dynamic meta tags with user name
  - Routing: Next.js router for navigation
  - File upload: Web-specific avatar upload component
  - Hover states: Interactive feedback for desktop users

- [x] **Native Implementation**:
  - Expo Router: `/app/profile/[userId].tsx`
  - Safe areas: `useSafeAreaInsets` for proper spacing
  - Image picker: `expo-image-picker` for avatar updates
  - Haptics: `expo-haptics` for touch feedback
  - Platform animations: Native spring animations

- [x] **Shared Logic**:
  - Business logic: `packages/app/features/profile/`
  - Data hooks: `packages/api/hooks/useUser.ts`
  - Validation: `packages/app/validation/profile.ts`
  - Types: `packages/app/types/user.ts`

- [x] **Performance Testing**:
  - Bundle size: Profile screen < 50KB gzipped
  - Render performance: < 100ms initial render
  - Memory usage: < 20MB for profile data
  - Network: Graceful handling of slow connections

## Quality Gates
- [x] **Visual Parity**: 
  - Web and native render identically ✅
  - Responsive breakpoints work consistently ✅
  - Theme tokens applied uniformly ✅

- [x] **Interaction Parity**:
  - Touch/click feedback consistent ✅
  - Navigation patterns work on both platforms ✅
  - Form interactions behave identically ✅

- [x] **Accessibility Compliance**:
  - WCAG 2.2 AA color contrast ratios ✅
  - Screen reader compatibility tested ✅
  - Keyboard navigation functional ✅
  - Touch targets meet 44px minimum ✅

- [x] **Performance Benchmarks**:
  - Initial load < 2 seconds on 3G ✅
  - Interaction response < 100ms ✅
  - Memory usage within acceptable limits ✅

## Documentation Requirements
- [x] **Storybook Stories**:
  - ProfileAvatarSection: Default, loading, error states
  - SettingsList: Various setting types, disabled states
  - UserProfileScreen: Complete screen with mock data

- [x] **API Documentation**:
  - User endpoint schemas with Zod validation
  - Error response formats documented
  - Rate limiting and caching policies

- [x] **Testing Coverage**:
  - Unit tests: 90%+ coverage for components
  - Integration tests: Critical user flows covered
  - E2E tests: Happy path and error scenarios

- [x] **Accessibility Notes**:
  - VoiceOver testing completed on iOS
  - TalkBack testing completed on Android
  - Keyboard navigation tested on web
  - Color contrast validated with tools

## Implementation References
- **Task List**: `docs/tasks/user-profile-screen.md`
- **Component Files**: `packages/ui/components/Profile/`
- **Screen Logic**: `packages/app/features/profile/ProfileScreen.tsx`
- **API Hooks**: `packages/api/hooks/useUser.ts`
- **Database Schema**: `supabase/migrations/001_user_profile.sql`

## Notes & Assumptions
- User avatars stored in Supabase Storage with CDN
- Settings changes require authentication
- Profile visibility controlled by privacy settings
- Offline support for viewing cached profile data
- Push notifications for profile-related updates
