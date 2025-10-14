# HistoryProgress UI/UX Analysis

> **Status**: Analysis Complete  
> **Wireframe**: `docs/spec/wireframes/P0/03a_side_sheet.png`  
> **User Stories**: `docs/spec/user_stories/P0/04_history_and_progress_tracking.md`  
> **Screen Type**: Full-screen navigation destination (side sheet/drawer style)

## Test-Driven UI Component Analysis Phase

- [x] **Visual Component Test Scenarios**: Define component rendering and styling tests
  - [x] Write snapshot tests for each component state (idle, loading, error, success)
    - Empty state: No videos or coaching sessions
    - Loading state: Skeleton placeholders for thumbnails and list items
    - Success state: Populated with 3+ video thumbnails and 4+ coaching session items
    - Error state: Error message with retry action
  - [x] Define responsive breakpoint tests (mobile, tablet, desktop)
    - Mobile (<768px): Single column, full-width thumbnails, vertical scroll
    - Tablet (768-1024px): Larger thumbnails, optimized spacing
    - Desktop (>1024px): Multi-column grid for thumbnails if needed
  - [x] Test theme integration and token usage validation
    - Dark theme: $background (dark gray), $gray10 text, $gray1 header
    - Light theme: $background (light), $gray12 text, white header
    - Validate all color tokens map to theme system
  - [x] Document animation and transition test scenarios
    - Stack navigation transition (platform-native slide/fade)
    - Thumbnail press animation: scale down to 0.95
    - List item press animation: opacity 0.7
    - Pull-to-refresh animation with activity indicator

- [x] **User Interaction Test Scenarios**: Define what users should be able to do
  - [x] Write test scenarios for each user interaction (tap, swipe, type, scroll)
    - Tap back button (AppHeader): Navigate back to camera recording screen
    - Tap profile avatar (AppHeader): Navigate to settings/profile screen
    - Tap "See all" link: Navigate to full Videos screen
    - Tap video thumbnail: Navigate to Video Analysis Screen (history mode)
    - Tap coaching session item: Navigate to coaching session detail (future)
    - Vertical scroll: Smooth scroll through coaching sessions
    - Horizontal scroll: Swipe through video thumbnails
    - Pull-to-refresh: Reload history data from backend
  - [x] Define expected visual feedback for each interaction (hover, press, focus)
    - Thumbnail press: Scale animation + overlay shadow
    - "See all" press: Underline color change
    - List item press: Background color change ($gray3)
    - Button press: Opacity reduction to 0.7
  - [x] Identify touch target size requirements (44px minimum)
    - Back button (AppHeader): 48x48px
    - Profile avatar (AppHeader): 56x56px (larger for visual emphasis)
    - "See all" link: 44px height with padding
    - Video thumbnails: 180x280px (tap area)
    - Coaching session list items: Full-width, 80px height
  - [x] Document gesture handling tests (pan, pinch, long press)
    - Horizontal pan: Scroll video thumbnails
    - Vertical pan: Scroll coaching sessions list
    - Long press on video: Show context menu (delete, share) - P1 feature
    - Long press on session: Show context menu - P1 feature

- [x] **Accessibility Test Scenarios**: Ensure inclusive design
  - [x] Screen reader navigation tests (semantic structure, ARIA labels)
    - Header: "App header with back to camera button and profile button"
    - Videos section: "Videos, horizontal scrollable list of 3 items, see all button"
    - Thumbnails: "Video thumbnail, [title], recorded on [date]"
    - Coaching sessions: "Coaching sessions list, vertical scrollable"
    - List items: "[Date], [Session title], coaching session"
  - [x] Keyboard navigation tests (tab order, focus management)
    - Tab order: Back button → Avatar → Videos header → See all → Thumbnails (left to right) → Sessions (top to bottom)
    - Focus management: AppHeader component handles its own focus states
    - Back navigation: Hardware back button (Android) or swipe (iOS) supported
  - [x] Color contrast validation tests (WCAG 2.2 AA compliance)
    - Text on dark background: White/light gray text (18:1 ratio)
    - "See all" link: Underlined with sufficient contrast
    - Date labels: $gray10 on $gray1 (minimum 4.5:1)
    - Session titles: White on dark gray (minimum 7:1)
  - [x] Dynamic type scaling tests (text size adjustments)
    - Support font scaling from 0.85x to 1.3x
    - Maintain layout integrity at all scale levels
    - Test with iOS Text Size and Android Font Size settings

## Visual Design Analysis Phase

- [x] **Layout Structure**: Identify main containers and map them 1:1 with the wireframe

```typescript
// Code Composition Pattern (Following @my/app feature structure)
// =====================================================

// 1. ROUTE FILE: apps/expo/app/history-progress.tsx
//    - Wraps screen with AuthGate
//    - Provides navigation callbacks via props
//    - Manages Expo Router params with useLocalSearchParams()

export default function HistoryProgressRoute() {
  const router = useRouter()
  return (
    <AuthGate>
      <HistoryProgressScreen 
        onNavigateToVideoAnalysis={(analysisId) => router.push(`/video-analysis/${analysisId}`)}
        onNavigateToVideos={() => router.push('/videos')}
        onBack={() => router.back()}
      />
    </AuthGate>
  )
}

// 2. SCREEN FILE: packages/app/features/HistoryProgress/HistoryProgressScreen.tsx
//    - Orchestrator: Composes hooks + UI components
//    - Configures AppHeader via navigation.setOptions()
//    - NO business logic (delegated to hooks)
//    - NO UI implementation (delegated to @my/ui components)

export function HistoryProgressScreen(props: HistoryProgressScreenProps) {
  const navigation = useNavigation()
  
  // Configure AppHeader via Expo Router navigation options
  useLayoutEffect(() => {
    navigation.setOptions({
      appHeaderProps: {
        title: 'History & Progress',
        mode: 'default',  // AppHeader mode
        onBack: props.onBack,
        onProfilePress: () => router.push('/settings'),
      }
    })
  }, [navigation, props.onBack])

  // Hook: Data fetching and state management
  const { 
    analysisJobs, 
    isLoading, 
    error, 
    refetch 
  } = useHistoryQuery()  // TanStack Query + Zustand cache

  // Hook: Pull-to-refresh logic
  const { refreshing, onRefresh } = useHistoryRefresh(refetch)

  // Render: UI components from @my/ui
  return (
    <YStack flex={1} backgroundColor="$background">
      {/* AppHeader rendered automatically by Expo Router _layout.tsx */}
      
      <ScrollView 
        flex={1} 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <HistoryLoadingSkeleton />  // @my/ui component
        ) : error ? (
          <ErrorState message={error.message} onRetry={refetch} />  // @my/ui component
        ) : (
          <>
            <VideosSection 
              videos={analysisJobs.slice(0, 3)}
              onVideoPress={(id) => props.onNavigateToVideoAnalysis?.(id)}
              onSeeAllPress={props.onNavigateToVideos}
            />  // @my/ui component
            
            <CoachingSessionsSection 
              sessions={mockCoachingSessions}  // P1: Replace with real data
              onSessionPress={(id) => log.info('Session', id)}
            />  // @my/ui component
          </>
        )}
      </ScrollView>
    </YStack>
  )
}

// 3. HOOKS: packages/app/features/HistoryProgress/hooks/
//    - useHistoryQuery.ts: TanStack Query for analysis_jobs data
//    - useHistoryRefresh.ts: Pull-to-refresh logic
//    - useHistoricalAnalysis.ts: Load specific analysis for history view

export function useHistoryQuery() {
  return useQuery({
    queryKey: ['analysis-jobs', 'user-history'],
    queryFn: async () => {
      const { data, error } = await getUserAnalysisJobs()  // @my/api
      if (error) throw error
      return data
    },
    staleTime: 5 * 60 * 1000,  // 5 minutes
  })
}

// 4. UI COMPONENTS: packages/ui/src/components/HistoryProgress/
//    - VideosSection.tsx: Section header + horizontal scroll
//    - VideoThumbnailCard.tsx: Thumbnail with play overlay
//    - CoachingSessionsSection.tsx: Section header + vertical list
//    - CoachingSessionItem.tsx: Date + title list item
//    - HistoryLoadingSkeleton.tsx: Loading state with shimmer

// 5. APP HEADER: Configured via navigation.setOptions() in screen
//    - AppHeader component rendered by apps/expo/app/_layout.tsx
//    - Props passed via navigation.setOptions({ appHeaderProps: {...} })
//    - Internal AppHeader structure (reference only):

AppHeader (from @my/ui/components/AppHeader/)
├── XStack height={60} paddingHorizontal="$4" paddingTop="$2" backgroundColor="$gray1"
│   ├── Left: Button icon={ArrowLeft} onPress={appHeaderProps.onBack}
│   ├── Center: Text text={appHeaderProps.title}
│   └── Right: Avatar onPress={appHeaderProps.onProfilePress}

// =====================================================
// VISUAL LAYOUT STRUCTURE (What user sees)
// =====================================================

YStack flex={1} backgroundColor="$background" (full screen)
├── AppHeader (rendered by _layout.tsx, configured by screen)
├── ContentArea: ScrollView flex={1} paddingHorizontal="$4" paddingTop="$4"
│   │
│   ├── VideosSection: YStack gap="$3" marginBottom="$6"
│   │   ├── SectionHeader: XStack justifyContent="space-between" alignItems="center" marginBottom="$3"
│   │   │   ├── Text fontSize="$6" fontWeight="500" color="$gray10" text="Videos"
│   │   │   └── Button chromeless size="$3" text="See all" color="$gray10" underline
│   │   └── VideosRow: ScrollView horizontal showsHorizontalScrollIndicator={false}
│   │       └── XStack gap="$3" paddingRight="$4"
│   │           ├── VideoThumbnailCard: Pressable width={180} height={280} borderRadius="$4"
│   │           │   ├── Image source={thumbnailUri} width={180} height={280} borderRadius="$4"
│   │           │   └── Overlay: YStack position="absolute" fullscreen justifyContent="center" alignItems="center"
│   │           │       └── PlayIcon: Circle size={56} backgroundColor="rgba(255,255,255,0.9)"
│   │           │           └── Icon name="play" size={24} color="$gray12"
│   │           ├── VideoThumbnailCard (duplicate structure)
│   │           └── VideoThumbnailCard (duplicate structure)
│   │
│   └── CoachingSessionsSection: YStack gap="$3"
│       ├── SectionHeader: Text fontSize="$6" fontWeight="500" color="$gray10" text="Coaching sessions" marginBottom="$3"
│       └── SessionsList: YStack gap="$2"
│           ├── SessionCard: Pressable backgroundColor="transparent" pressStyle={{backgroundColor: "$gray3"}} 
│           │   borderRadius="$3" padding="$4" gap="$2"
│           │   ├── DateLabel: Text fontSize="$3" color="$gray10" text="Today"
│           │   └── SessionTitle: Text fontSize="$5" fontWeight="400" color="$gray12" 
│           │       text="Muscle Soreness and Growth in Weightlifting"
│           ├── SessionCard: (duplicate structure with "Monday, Jul 28" date)
│           │   └── SessionTitle: "Personalised supplement recommendations"
│           ├── SessionCard (duplicate)
│           └── SessionCard (duplicate)
│
└── SafeAreaView edges={['bottom']} (insets for devices with notches/gestures)
```

- [x] **Tamagui Component Mapping**: Map each UI element 1:1 to Tamagui components
  - [x] **Layout Components**: 
    - `YStack`: Root container, sections, list containers
    - `XStack`: Header, section headers, horizontal video row
    - `ScrollView`: Main content scroll (vertical), video thumbnails (horizontal)
    - `SafeAreaView`: Bottom edge handling for gesture navigation
  - [x] **Interactive Components**: 
    - `Button`: Hamburger menu, profile avatar, "See all" link
    - `Pressable`: Video thumbnails, coaching session cards
  - [x] **Display Components**: 
    - `Text`: All text labels (headers, dates, titles)
    - `Image`: Video thumbnails, profile avatar
    - `Avatar`: Profile picture with fallback icon
    - `Card`: Optional wrapper for coaching sessions (use YStack with styling)
  - [x] **Overlay Components**: 
    - Play icon overlay on thumbnails (absolute positioned YStack)
    - Sheet: For navigation drawer triggered by hamburger (future)
    - Toast: For error/success messages (pull-to-refresh feedback)
  - [x] **Custom Components**: 
    - `VideoThumbnailCard`: Composite component (Image + Play overlay + Pressable)
    - `CoachingSessionItem`: Composite component (Date + Title + Pressable wrapper)
    - `SectionHeader`: Reusable component (Title + optional action button)

- [x] **Design System Integration**: Theme tokens and styling consistency
  - [x] **Colors**: 
    - Background: `$background` (dark gray ~#2A2A2C or theme-based)
    - Header background: `$gray1` (darker gray)
    - Text primary: `$gray12` (white/near-white)
    - Text secondary: `$gray10` (light gray)
    - Link/accent: `$gray10` with underline (or `$blue10` for branded links)
    - Press overlay: `$gray3` (subtle highlight)
  - [x] **Typography**: 
    - App title: `fontSize="$7"` (24px), `fontWeight="600"`
    - Section headers: `fontSize="$6"` (20px), `fontWeight="500"`
    - Session titles: `fontSize="$5"` (18px), `fontWeight="400"`
    - Date labels: `fontSize="$3"` (14px), `fontWeight="400"`
    - "See all" link: `fontSize="$4"` (16px), `fontWeight="400"`
  - [x] **Spacing**: 
    - Screen padding: `paddingHorizontal="$4"` (16px)
    - Header padding: `paddingHorizontal="$4"`, `paddingTop="$2"` (8px)
    - Section gaps: `marginBottom="$6"` (24px between sections)
    - Card gaps: `gap="$2"` (8px) for internal spacing
    - Thumbnail gaps: `gap="$3"` (12px) in horizontal scroll
  - [x] **Sizes**: 
    - Hamburger button: `size="$4"` (48px)
    - Profile avatar: `size="$5"` (56px), inner image 48px
    - Play icon circle: 56px diameter
    - Video thumbnails: 180x280px (9:14 aspect ratio)
    - Session card height: ~80px (auto-sized by content)
  - [x] **Borders**: 
    - Card radius: `borderRadius="$4"` (12px)
    - Thumbnail radius: `borderRadius="$4"` (12px)
    - Avatar radius: Circular (50%)

- [x] **Responsive Design Requirements**: Breakpoint behavior analysis
  - [x] **Mobile (< 768px)**: 
    - Single column layout
    - Full-width horizontal scroll for thumbnails
    - Touch-optimized spacing (16px minimum between interactive elements)
    - Bottom navigation (if applicable)
    - Video thumbnails: 160-180px width
  - [x] **Tablet (768px - 1024px)**: 
    - Wider content area (max-width: 640px centered)
    - Larger thumbnails (200px width)
    - Increased padding ($5 instead of $4)
    - Hover states for interactive elements
  - [x] **Desktop (> 1024px)**: 
    - Multi-column grid for coaching sessions (2 columns)
    - Video thumbnails in 2-row grid instead of horizontal scroll
    - Hover effects: thumbnail scale (1.02), cursor pointer
    - Keyboard shortcuts: Arrow keys for navigation, Enter to activate
    - Full-screen navigation with browser back button support

## Interactive Elements Analysis Phase

- [x] **Button States and Variants**: Define all button interactions
  - [x] **Primary Actions**: 
    - "See all" link: Text button, underline, press → `opacity: 0.7`
  - [x] **Secondary Actions**: 
    - Back button (AppHeader): Icon button, chromeless, press → `opacity: 0.7`, navigates to camera
    - Profile avatar (AppHeader): Icon button, chromeless, press → `scale: 0.95`, navigates to settings
  - [x] **Destructive Actions**: 
    - Delete video (P1): Context menu option, red text, confirmation dialog
  - [x] **Icon Buttons**: 
    - Back button: `accessibilityLabel="Back to camera"`, `accessibilityRole="button"`
    - Profile: `accessibilityLabel="Open settings"`, `accessibilityRole="button"`
    - Play icon: Overlay decoration (not a button itself, thumbnail is clickable)
  - [x] **State Variations**: 
    - Default: Normal styling with theme tokens
    - Hover (web): `opacity: 0.8`, cursor pointer
    - Pressed: `opacity: 0.7` or `scale: 0.95`
    - Disabled: `opacity: 0.4`, not pressable
    - Loading: Replace with ActivityIndicator in button area

- [x] **Form Elements**: Input fields and validation
  - [x] **Text Inputs**: Not applicable for this screen (no forms)
  - [x] **Selection Controls**: Not applicable
  - [x] **File Inputs**: Not applicable
  - [x] **Form Validation**: Not applicable

- [x] **Navigation Elements**: Screen transitions and routing
  - [x] **Tab Navigation**: 
    - Not visible in this screen (history is a full-screen stack navigation)
    - Tab navigation visible when returning to camera screen
  - [x] **Stack Navigation**: 
    - Standard screen navigation (not a sheet/modal)
    - Header: AppHeader component with back button to camera recording
    - Platform back gesture support (iOS swipe, Android hardware button)
    - Deep linking: `/history-progress` route
  - [x] **Modal Navigation**: 
    - Not applicable for this screen (uses standard stack navigation)
    - History screen is a full-screen destination, not a modal overlay
  - [x] **Deep Linking**: 
    - Web: `/history-progress` URL
    - Native: `sololevel://history-progress` universal link
    - Individual video: `/history-progress?video=[id]` (opens video analysis)

## Animation and Micro-interactions Phase

- [x] **Transition Animations**: Screen and component transitions
  - [x] **Screen Transitions**: 
    - Stack push: Slide from right (iOS) or fade (Android), 300ms ease-out curve
    - Stack pop: Slide to right (iOS) or fade (Android), 250ms ease-in curve
    - Native platform transitions using Expo Router defaults
  - [x] **Component Animations**: 
    - Loading skeleton: Shimmer animation (1.5s loop) on placeholder cards
    - Pull-to-refresh: Spinner rotation at top of ScrollView
    - Success feedback: Fade-in of new content (200ms)
  - [x] **Gesture Animations**: 
    - Back swipe (iOS): Native edge swipe gesture to return to camera
    - Horizontal scroll: Natural scroll physics with momentum for video thumbnails
    - Press animations: Scale down to 0.95 on press, spring back on release (150ms)
  - [x] **Performance Considerations**: 
    - Use `transform` and `opacity` for animations (GPU-accelerated)
    - Avoid layout changes during animations
    - Target 60fps on all animations
    - Use `getItemLayout` for FlatList optimization

- [x] **Loading States**: Progress indication and skeleton screens
  - [x] **Skeleton Screens**: 
    - Video thumbnails: 3 gray rectangles (180x280px) with shimmer
    - Coaching sessions: 4 rows with gray rectangles for date/title
    - Shimmer animation: Left-to-right gradient sweep
  - [x] **Progress Indicators**: 
    - Pull-to-refresh: ActivityIndicator at top (indeterminate)
    - Initial load: Full-screen skeleton with no activity indicator (feels faster)
  - [x] **Optimistic Updates**: 
    - After recording: New video appears at start of list immediately
    - Delete action: Item fades out before API confirms (with rollback on error)

## Cross-Platform UI Considerations Phase

- [x] **Platform-Specific Adaptations**: Native feel on each platform
  - [x] **iOS Adaptations**: 
    - Navigation: Standard stack navigation with native slide transition
    - Back gesture: iOS edge swipe from left to return to camera
    - Haptics: Light impact on button press, medium on navigation
    - System colors: Use iOS semantic colors in light mode
    - Safe area: Respect notch and home indicator with AppHeader
  - [x] **Android Adaptations**: 
    - Navigation: Standard stack navigation with fade transition
    - Hardware back button: Navigates back to camera recording
    - Ripple effect: Material ripple on pressable items
    - System colors: Use Material You dynamic colors
    - Edge-to-edge: Transparent status bar with AppHeader handling insets
  - [x] **Web Adaptations**: 
    - Hover states: All interactive elements show cursor pointer + opacity change
    - Keyboard shortcuts: Arrow keys for list navigation, Enter to activate items
    - URL handling: `/history-progress` route updates browser history
    - Scroll behavior: Native smooth scroll with keyboard support
    - Focus indicators: Visible focus ring for keyboard navigation

- [x] **Component Platform Variants**: When to use platform-specific implementations
  - [x] **Native-Only Components**: 
    - Video thumbnails: Use `expo-video-thumbnails` for frame extraction
    - Safe area handling: `react-native-safe-area-context` integrated with AppHeader
    - Hardware back button: Platform-specific back button handling (Android)
  - [x] **Web-Only Components**: 
    - SEO meta tags: Title "History & Progress | SoloLvl"
    - Video thumbnails: Canvas API for frame extraction
    - Hover effects: CSS `:hover` pseudo-class
  - [x] **Shared Components**: 
    - All UI components use Tamagui for cross-platform styling
    - Business logic hooks are platform-agnostic
    - Theme system works identically across platforms

## TDD UI Implementation Roadmap

### Phase 1: TDD Component Foundation [Native/Web]
- [ ] **Component Interface Tests**: Define props and styling contracts
  - [ ] `VideoThumbnailCard.test.tsx`: Test thumbnail rendering, play overlay, press handling
  - [ ] `CoachingSessionItem.test.tsx`: Test date/title rendering, press handling
  - [ ] `SectionHeader.test.tsx`: Test title rendering, action button integration
  - [ ] `HistoryProgressScreen.test.tsx`: Test full screen layout and section rendering
- [ ] **Theme Integration Tests**: Validate design system compliance
  - [ ] Verify all color tokens resolve correctly in light/dark themes
  - [ ] Validate font sizes match typography scale
  - [ ] Test spacing tokens render correct pixel values
  - [ ] Snapshot test for theme switching behavior
- [ ] **Responsive Layout Tests**: Ensure breakpoint behavior
  - [ ] Test mobile layout (< 768px): Single column, horizontal thumbnails
  - [ ] Test tablet layout (768-1024px): Optimized spacing
  - [ ] Test desktop layout (> 1024px): Multi-column grid
- [ ] **Accessibility Foundation Tests**: Basic WCAG compliance
  - [ ] Verify all interactive elements have accessibility labels
  - [ ] Test screen reader navigation order
  - [ ] Validate color contrast ratios (automated with jest-axe)
  - [ ] Test keyboard navigation and focus management

### Phase 2: TDD Interactive Elements [Native/Web]
- [ ] **User Interaction Tests**: Validate touch/click behavior
  - [ ] Test video thumbnail press → navigate to analysis screen
  - [ ] Test "See all" press → navigate to videos screen
  - [ ] Test hamburger press → open navigation drawer (future)
  - [ ] Test profile avatar press → navigate to settings
  - [ ] Test coaching session press → navigate to detail (future)
- [ ] **Form Validation Tests**: Input handling and error states
  - [ ] Not applicable for this screen (no forms)
- [ ] **Navigation Tests**: Screen transitions and routing
  - [ ] Test navigation to history screen from camera
  - [ ] Test back navigation returns to camera
  - [ ] Test deep linking with `/history-progress` route
  - [ ] Test navigation with query params for specific video
- [ ] **Animation Tests**: Transition timing and performance
  - [ ] Test sheet slide-in animation completes
  - [ ] Test press animation scales down correctly
  - [ ] Test skeleton loading animation renders
  - [ ] Test pull-to-refresh animation triggers

### Phase 3: TDD Cross-Platform Parity [Native/Web]
- [ ] **Visual Parity Tests**: Identical rendering across platforms
  - [ ] Screenshot comparison: Native vs Web (jest-image-snapshot)
  - [ ] Layout parity: Verify spacing and sizing match
  - [ ] Typography parity: Font rendering consistency
- [ ] **Interaction Parity Tests**: Consistent behavior patterns
  - [ ] Press behavior identical on native and web
  - [ ] Navigation patterns work on both platforms
  - [ ] Scroll behavior feels native on each platform
- [ ] **Performance Tests**: Render timing and memory usage
  - [ ] Measure initial render time < 500ms
  - [ ] Measure list scroll performance (60fps)
  - [ ] Measure memory usage with 50+ items
  - [ ] Profile animation frame rates
- [ ] **Accessibility Tests**: Platform-specific accessibility features
  - [ ] iOS VoiceOver navigation test
  - [ ] Android TalkBack navigation test
  - [ ] Web screen reader (NVDA/JAWS) test
  - [ ] Keyboard navigation test on web

## Quality Gates
- [ ] **Visual Regression Testing**: Screenshot comparison tests
  - [ ] Baseline screenshots for all states (empty, loading, success, error)
  - [ ] Platform-specific baselines (iOS, Android, Web)
  - [ ] Theme-specific baselines (light, dark)
- [ ] **Accessibility Compliance**: WCAG 2.2 AA validation
  - [ ] Color contrast ratio ≥ 4.5:1 for normal text, ≥ 3:1 for large text
  - [ ] All interactive elements have accessible labels
  - [ ] Keyboard navigation works without mouse
  - [ ] Screen reader announces all content correctly
- [ ] **Performance Benchmarks**: Render time < 16ms, smooth animations
  - [ ] Initial render < 500ms
  - [ ] List scroll maintains 60fps with 50+ items
  - [ ] Animation frame time < 16ms (60fps target)
  - [ ] Memory usage < 50MB for screen
- [ ] **Cross-Platform Consistency**: Identical user experience
  - [ ] Visual parity within 5% margin (layout, spacing, colors)
  - [ ] Interaction patterns feel native on each platform
  - [ ] Navigation behavior consistent across platforms

## Documentation Requirements
- [ ] **Storybook Stories**: All component states and variants documented
  - [ ] `VideoThumbnailCard.stories.tsx`: Default, loading, error states
  - [ ] `CoachingSessionItem.stories.tsx`: Default, pressed, different dates
  - [ ] `HistoryProgressScreen.stories.tsx`: Empty, loading, success, error
- [ ] **Design System Usage**: Theme token usage and component patterns
  - [ ] Document all color tokens used with visual swatches
  - [ ] Document typography scale usage
  - [ ] Document spacing patterns and layout guidelines
- [ ] **Accessibility Documentation**: Screen reader testing results
  - [ ] Document VoiceOver/TalkBack navigation flows
  - [ ] Document keyboard shortcuts and navigation
  - [ ] Document ARIA label conventions
- [ ] **Animation Documentation**: Transition timing and easing functions
  - [ ] Document all animation durations and easing curves
  - [ ] Document gesture handling and animation triggers
  - [ ] Document performance optimization techniques

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management (TanStack Query, Zustand cache)
- **Backend Integration**: See `analysis-backend.md` for `getUserAnalysisJobs()` API
- **User Stories**: See `docs/spec/user_stories/P0/04_history_and_progress_tracking.md`
- **Wireframe**: See `docs/spec/wireframes/P0/03a_side_sheet.png`

## Implementation Notes

### Component File Structure (Composition Pattern)
```
# ROUTE LAYER (Navigation integration)
apps/expo/app/history-progress.tsx
├── AuthGate wrapper
├── useRouter for navigation callbacks
└── HistoryProgressScreen with injected navigation props

apps/next/app/history-progress.tsx
└── Similar pattern for web

# SCREEN LAYER (Orchestration - NO logic, NO UI implementation)
packages/app/features/HistoryProgress/
├── HistoryProgressScreen.tsx          # Orchestrator: hooks + UI composition
├── HistoryProgressScreen.test.tsx     # Integration tests (screen + hooks + UI)
├── types.ts                           # HistoryProgressScreenProps interface
└── hooks/                             # Business logic layer
    ├── useHistoryQuery.ts             # TanStack Query: fetch analysis_jobs
    ├── useHistoryQuery.test.ts        # Hook logic tests
    ├── useHistoryRefresh.ts           # Pull-to-refresh logic
    └── useHistoricalAnalysis.ts       # Load specific analysis (US-HI-02)

# UI LAYER (Presentation - NO logic, pure components)
packages/ui/src/components/HistoryProgress/
├── VideosSection/                     # Section: header + horizontal thumbnails
│   ├── VideosSection.tsx              # Main component
│   ├── VideosSection.test.tsx         # Component rendering tests
│   ├── VideosSection.stories.tsx      # Storybook: all states
│   └── index.ts                       # Named export
├── VideoThumbnailCard/                # Thumbnail with play overlay
│   ├── VideoThumbnailCard.tsx         # Pressable thumbnail + play button
│   ├── VideoThumbnailCard.test.tsx    # Interaction and rendering tests
│   ├── VideoThumbnailCard.stories.tsx # Default, pressed, loading states
│   └── index.ts                       # Named export
├── CoachingSessionsSection/           # Section: header + vertical list
│   ├── CoachingSessionsSection.tsx    # Main component
│   ├── CoachingSessionsSection.test.tsx
│   ├── CoachingSessionsSection.stories.tsx
│   └── index.ts                       # Named export
├── CoachingSessionItem/               # List item: date + title
│   ├── CoachingSessionItem.tsx        # Pressable item with date/title
│   ├── CoachingSessionItem.test.tsx   # Accessibility and interaction tests
│   ├── CoachingSessionItem.stories.tsx
│   └── index.ts                       # Named export
├── HistoryLoadingSkeleton/            # Loading state with shimmer
│   ├── HistoryLoadingSkeleton.tsx     # Skeleton placeholders
│   ├── HistoryLoadingSkeleton.test.tsx
│   ├── HistoryLoadingSkeleton.stories.tsx
│   └── index.ts                       # Named export
├── HistoryEmptyState/                 # Empty state with CTA
│   ├── HistoryEmptyState.tsx          # "Record first video" message + CTA
│   ├── HistoryEmptyState.test.tsx
│   ├── HistoryEmptyState.stories.tsx
│   └── index.ts                       # Named export
├── index.ts                           # Barrel export for all components
└── types.ts                           # Shared types and interfaces

# HEADER LAYER (Managed by _layout.tsx)
packages/ui/src/components/AppHeader/
└── AppHeader.tsx                      # Existing component (✅)
    # Configured via navigation.setOptions() in screen
    # Rendered automatically by apps/expo/app/_layout.tsx
```

### Key Technical Decisions
1. **Horizontal Scroll**: Use `ScrollView` with `horizontal` prop, not `FlatList` (3 items max)
2. **Vertical List**: Use `ScrollView` for simplicity (not virtualized initially, < 20 items expected)
3. **Thumbnails**: Generate from first video frame, cache in `video_recordings.thumbnail_url`
4. **Navigation**: Use Expo Router `router.push('/history-progress')` for standard stack navigation
5. **Header Integration**: Use existing AppHeader component (US-HI-04) with back button
6. **State Management**: TanStack Query for server state, no additional UI state needed
7. **Platform Detection**: Use `Platform.select()` for iOS/Android/Web differences
8. **Theme**: Support light/dark themes via Tamagui theme system

### Next Steps (Following Composition Pattern)

**Phase 1: UI Components (Presentation Layer)**
1. Create `packages/ui/src/components/HistoryProgress/VideoThumbnailCard/`
   - `VideoThumbnailCard.tsx`: Pure component with thumbnail image + play overlay
   - Props: `thumbnailUri`, `onPress`, `width`, `height`
   - `VideoThumbnailCard.test.tsx`: Test rendering, press interaction, accessibility
   - `VideoThumbnailCard.stories.tsx`: States (default, pressed, loading, error)
   - `index.ts`: `export { VideoThumbnailCard } from './VideoThumbnailCard'`
2. Create `packages/ui/src/components/HistoryProgress/CoachingSessionItem/`
   - `CoachingSessionItem.tsx`: Pure component with date label + session title
   - Props: `date`, `title`, `onPress`
   - `CoachingSessionItem.test.tsx`: Test rendering, accessibility labels, press
   - `CoachingSessionItem.stories.tsx`: Different date formats and titles
   - `index.ts`: Named export
3. Create `packages/ui/src/components/HistoryProgress/VideosSection/`
   - `VideosSection.tsx`: Composite - section header + horizontal scroll of thumbnails
   - Props: `videos[]`, `onVideoPress`, `onSeeAllPress`
   - `VideosSection.test.tsx`: Test empty state, 1 video, 3+ videos
   - `VideosSection.stories.tsx`: All video count variations
   - `index.ts`: Named export
4. Create `packages/ui/src/components/HistoryProgress/CoachingSessionsSection/`
   - `CoachingSessionsSection.tsx`: Composite - section header + vertical list
   - Props: `sessions[]`, `onSessionPress`
   - `CoachingSessionsSection.test.tsx`: Test rendering with different session counts
   - `CoachingSessionsSection.stories.tsx`: Empty, 1 session, many sessions
   - `index.ts`: Named export
5. Create `packages/ui/src/components/HistoryProgress/HistoryLoadingSkeleton/`
   - `HistoryLoadingSkeleton.tsx`: Skeleton placeholders with shimmer animation
   - `HistoryLoadingSkeleton.test.tsx`: Test skeleton renders for all sections
   - `HistoryLoadingSkeleton.stories.tsx`: Show loading state
   - `index.ts`: Named export
6. Create `packages/ui/src/components/HistoryProgress/HistoryEmptyState/`
   - `HistoryEmptyState.tsx`: "Record first video" message + CTA button
   - Props: `onRecordPress`
   - `HistoryEmptyState.test.tsx`: Test message, button, accessibility
   - `HistoryEmptyState.stories.tsx`: Default state
   - `index.ts`: Named export
7. Create `packages/ui/src/components/HistoryProgress/types.ts`
   - Shared interfaces: `VideoItem`, `SessionItem`, `HistoryProgressProps`
8. Create `packages/ui/src/components/HistoryProgress/index.ts`
   - Barrel export: re-export all components and types

**Phase 2: Business Logic (Hooks Layer)**
1. Create `packages/app/features/HistoryProgress/hooks/useHistoryQuery.ts`
   - TanStack Query hook for `getUserAnalysisJobs()` API
   - Cache-first strategy with 5min staleTime
   - Write hook tests (mock API, test data transformation)
2. Create `packages/app/features/HistoryProgress/hooks/useHistoryRefresh.ts`
   - Pull-to-refresh logic with refreshing state
   - Calls refetch from TanStack Query
3. Create `packages/app/features/HistoryProgress/hooks/useHistoricalAnalysis.ts`
   - Load specific analysis for history view (US-HI-02)
   - Detects history mode vs new analysis mode

**Phase 3: Screen Orchestration**
1. Create `packages/app/features/HistoryProgress/HistoryProgressScreen.tsx`
   - Import hooks from Phase 2
   - Import UI components from Phase 1
   - Configure AppHeader via `navigation.setOptions()`
   - Compose: hooks → state → UI components with callbacks
   - NO business logic (delegated to hooks)
   - NO UI implementation (delegated to @my/ui)
2. Create `packages/app/features/HistoryProgress/types.ts`
   - Define `HistoryProgressScreenProps` interface
3. Write integration tests: `HistoryProgressScreen.test.tsx`
   - Test screen renders UI components correctly
   - Test navigation callbacks work
   - Test loading/error/success states
   - Mock hooks (useHistoryQuery, useHistoryRefresh)

**Phase 4: Route Integration**
1. Create `apps/expo/app/history-progress.tsx`
   - Wrap with `AuthGate`
   - Use `useRouter` for navigation
   - Pass navigation callbacks as props to screen
2. Create `apps/next/app/history-progress.tsx`
   - Similar pattern for web
3. Update `apps/expo/app/_layout.tsx` if needed
   - Ensure AppHeader is configured in root layout

**Phase 5: Cross-Platform Testing**
1. Test on iOS simulator (VoiceOver, gestures, safe areas)
2. Test on Android emulator (TalkBack, hardware back button)
3. Test on web (keyboard nav, hover states, responsive)
4. Visual regression tests (screenshot comparison)
5. Performance profiling (scroll fps, memory usage)

