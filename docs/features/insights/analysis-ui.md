# Insights UI/UX Analysis

> **Status**: Analysis phase - visual design and component mapping completed
> **Source**: `/Users/yevgenschweden/Downloads/Figma Make Code v1/Components/InsightsScreen.tsx`

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: 
  - Snapshot tests for stat cards, progress bars, achievement cards, focus area cards
  - Empty state (no data available)
  - Loading state (skeleton screens)
  - Error state (failed to load data)
  - Responsive breakpoints (mobile 320px, tablet 768px, desktop 1024px)
  - Theme validation (light/dark mode color tokens)
- [ ] **User Interaction Tests**: 
  - Back button navigation (tap → callback fired)
  - Scroll performance (smooth scrolling through sections)
  - Touch targets (44px minimum for all interactive elements)
  - Section expansion/collapse if implemented
  - Pull-to-refresh functionality
- [ ] **Accessibility Tests**: 
  - Screen reader navigation (section headers, stat labels, achievement descriptions)
  - ARIA labels for progress bars (percentage values)
  - Color contrast (WCAG 2.2 AA for all text)
  - Semantic structure (proper heading hierarchy)
  - Dynamic type scaling (stat numbers, labels)

## Visual Design Analysis Phase

### Layout Structure
**Root Container**: Full-screen glass morphism background with scrollable content and fixed header

**Visual Layout Structure**:
```typescript
GlassBackground (full screen)
├── Content: ScrollView flex={1} padding="$4"
│   ├── WeeklyOverviewSection: YStack gap="$4" marginBottom="$8"
│   │   ├── SectionHeader: XStack gap="$2" (reuse SettingsSectionHeader)
│   │   ├── StatsGrid: XStack gap="$4" (2 columns)
│   │   │   ├── StatCard: Total Sessions
│   │   │   └── StatCard: Improvement (with trend icon)
│   │   ├── ProgressCard: Weekly Progress
│   │   │   ├── Label + Percentage: XStack justifyContent="space-between"
│   │   │   └── Progress: height="$1" backgroundColor="$gray4"
│   │   └── ActivityChart: Daily bars visualization
│   ├── FocusAreasSection: YStack gap="$3" marginBottom="$8"
│   │   ├── SectionHeader: XStack gap="$2"
│   │   └── FocusCards: YStack gap="$3"
│   │       └── FocusCard × 3
│   │           ├── Header: XStack justifyContent="space-between"
│   │           │   ├── Title: Text fontSize="$3"
│   │           │   └── PriorityBadge: Badge variant based on priority
│   │           └── Progress: height="$2"
│   ├── AchievementsSection: YStack gap="$3" marginBottom="$8"
│   │   ├── SectionHeader: XStack gap="$2"
│   │   └── AchievementCards: YStack gap="$3"
│   │       └── AchievementCard × 3
│   │           ├── Icon: 40×40px with colored background
│   │           └── Content: YStack flex={1}
│   │               ├── Title: Text fontSize="$3" fontWeight="500"
│   │               └── Date: Text fontSize="$2" color="$textSecondary"
│   └── QuickStatsSection: YStack gap="$4"
│       ├── SectionHeader: XStack gap="$2"
│       └── StatsGrid: XStack gap="$4" (2 columns)
│           ├── StatCard: Streak Days
│           └── StatCard: Avg Session Time
└── SafeAreaView edges={['bottom']}
```

**AppHeader**: Back button navigation with centered title, no bottom navigation visible

### Component Mapping

**Existing Reusable Components:**
- `GlassBackground` → Already exists (`packages/ui/src/components/GlassBackground/`)
- `SettingsSectionHeader` → Reuse for section headers with icons (`packages/ui/src/components/Settings/SettingsSectionHeader/`)

**New Components Needed:**

1. **StatCard** (`packages/ui/src/components/Insights/StatCard/`)
   - Purpose: Display numeric stat with label and optional trend icon
   - Props: `value: string | number`, `label: string`, `icon?: ReactNode`, `trend?: 'up' | 'down'`
   - Variants: Default (left-aligned), Centered (for grid layout)
   - Container: YStack or Card with padding="$4" backgroundColor="$backgroundHover" borderRadius="$lg" borderWidth={1} borderColor="$borderColor"

2. **Progress** (`packages/ui/src/components/Insights/Progress/`)
   - Purpose: Progress bar indicator
   - Props: `value: number` (0-100), `max?: number`, `size?: 'sm' | 'md'`
   - Implementation: YStack (container) + YStack (filled portion) with percentage width
   - Colors: Container=$gray4, Fill=$primary

3. **Badge** (`packages/ui/src/components/Insights/Badge/`)
   - Purpose: Priority/status indicator
   - Props: `variant: 'primary' | 'secondary' | 'destructive'`, `children: string`
   - Variants: 
     - High priority: backgroundColor="$red4" color="$red11"
     - Medium priority: backgroundColor="$gray4" color="$gray11"
     - Low priority: backgroundColor="$blue4" color="$blue11"
   - Container: XStack paddingHorizontal="$2" paddingVertical="$1" borderRadius="$sm"

4. **ActivityChart** (`packages/ui/src/components/Insights/ActivityChart/`)
   - Purpose: Weekly activity bar chart
   - Props: `data: Array<{ day: string, sessions: number, quality?: number }>`
   - Layout: XStack with equal spacing, bars scale based on sessions count
   - Bar: YStack with dynamic height, backgroundColor="$gray6", borderRadius="$sm"

5. **AchievementCard** (`packages/ui/src/components/Insights/AchievementCard/`)
   - Purpose: Display achievement with icon, title, date
   - Props: `title: string`, `date: string`, `type: 'streak' | 'technique' | 'record'`, `icon: string` (emoji)
   - Layout: XStack gap="$3" padding="$4" backgroundColor="$backgroundHover" borderRadius="$lg"
   - Icon container: 40×40px with type-specific background color

6. **FocusCard** (`packages/ui/src/components/Insights/FocusCard/`)
   - Purpose: Goal/focus area with progress
   - Props: `title: string`, `progress: number`, `priority: 'high' | 'medium' | 'low'`
   - Layout: YStack gap="$2" padding="$4" backgroundColor="$backgroundHover" borderRadius="$lg"

### Design Tokens

**Colors:**
- Background: `$background` (main), `$backgroundHover` (cards/surfaces)
- Text: `$text` (primary), `$textSecondary` (labels, secondary info)
- Border: `$borderColor` (card borders, dividers)
- Progress/Primary: `$primary` (progress bars, active states)
- Status colors: `$red4`, `$red11` (high priority), `$green4`, `$green11` (improvement), `$blue4`, `$blue11` (info)
- Gray scale: `$gray4` (inactive progress), `$gray6` (chart bars), `$gray11` (text)

**Typography:**
- Screen title: fontSize="$6" (20px), fontWeight="400", fontFamily="Josefin Sans"
- Section headers: fontSize="$4" (16px), color="$textSecondary"
- Stat values: fontSize="$8" (24px), fontWeight="500"
- Stat labels: fontSize="$3" (14px), color="$textSecondary"
- Card titles: fontSize="$3" (14px), fontWeight="500"
- Secondary text: fontSize="$2" (12px), color="$textSecondary"

**Spacing:**
- Screen padding: `$4` (16px)
- Section gap: `$8` (32px) marginBottom
- Card gap: `$3` (12px) or `$4` (16px)
- Component padding: `$4` (16px)
- Element gap: `$2` (8px) or `$3` (12px)

**Sizes/Borders:**
- Card borderRadius: `$3` (12px)
- Badge borderRadius: `$1` (4px)
- Progress height: `$1` (4px) for thin, `$2` (8px) for medium
- Border width: 1px
- Achievement icon: 40×40px
- Back button: 44×44px minimum touch target

**Responsive Breakpoints:**
- Mobile (< 768px): Single column, full-width cards, 2-column stat grids
- Tablet (768-1024px): Single column with larger cards, 2-column stat grids
- Desktop (> 1024px): Consider 2-column layout for sections, 4-column stat grids

## Interactive Elements

### Buttons
- **Back Button**: 
  - Passed as callback prop `onBack?: () => void`
  - Implemented in route file with router.back()
  - Screen can call when needed (no direct router imports)

### Navigation
- **Pattern**: Callback props in screen → implementations in route with router
- **Implementation**: Screen receives callbacks, route provides implementations
- **No navigation imports in screen component** (framework-agnostic, testable)

### ScrollView
- **Scroll behavior**: Smooth vertical scroll
- **Pull-to-refresh**: Consider adding if data updates are expected
- **Scroll indicators**: Platform default (iOS bounce, Android glow)

## Animations & Loading States

### Transitions
- **Screen entry**: Slide from right (iOS), fade (Android/Web)
- **Card animations**: Stagger fade-in on mount (50ms delay between cards)
- **Progress bars**: Animated width transition on value change (200ms ease-out)

### Loading UI
- **Initial load**: Skeleton screens for all stat cards and sections
- **Refresh**: Pull-to-refresh with loading indicator
- **Empty state**: "No data available yet. Complete workouts to see insights." message with illustration

### Performance
- **Target**: 60fps for scrolling and animations
- **Optimization**: Virtualized lists if achievement/focus lists grow large (>20 items)

## Cross-Platform Considerations

### Platform Adaptations
- **iOS**: 
  - Swipe-from-left back gesture enabled
  - SF Pro font fallback for Josefin Sans
  - Haptic feedback on back button press
  - Status bar: light-content for dark glass background
- **Android**: 
  - System back button support
  - Roboto font fallback for Josefin Sans
  - Material ripple effect on cards
  - Edge-to-edge display with status bar transparency
- **Web**: 
  - Hover states on cards (subtle opacity increase)
  - Browser back button support
  - No safe area insets needed
  - Mouse wheel scrolling

### Safe Area Handling
- **Top**: AppHeader handles automatically (status bar, notch)
- **Bottom**: `<SafeAreaView edges={['bottom']} />` for home indicator
- **Sides**: Consider for landscape on notched devices

### Platform-Specific Components
- **Chart rendering**: May need platform-specific implementation if using canvas/SVG
- **Font loading**: Josefin Sans needs to be included in font loading
- **Icons**: Use lucide-react-native for cross-platform compatibility

## Quality Gates & Documentation

### Testing
- [ ] **Visual regression**: Screenshot comparison for all sections
- [ ] **Accessibility**: 
  - WCAG 2.2 AA color contrast verified
  - Screen reader navigation tested (VoiceOver, TalkBack, NVDA)
  - Semantic HTML/React Native structure
- [ ] **Performance**: 
  - Render time < 16ms per frame
  - Smooth 60fps scrolling
  - First contentful paint < 1s
- [ ] **Cross-platform parity**: iOS, Android, Web visual consistency

### Documentation
- [ ] **Storybook stories**: 
  - Empty state
  - Loading state
  - Filled state (with mock data)
  - Error state
  - Dark mode variant
- [ ] **Theme token usage**: Document all tokens used in component props
- [ ] **Screen reader testing**: Video recording of navigation flow
- [ ] **Animation specs**: Timing (200ms), easing (ease-out), stagger delay (50ms)

## Navigation & App Integration

### Screen Implementation
- **Path**: `packages/app/features/Insights/InsightsScreen.tsx`
- **Pattern**: Functional component with callback props (battle-tested pattern from AccountScreen, SettingsScreen)
- **Props**: 
  - Navigation: `onBack?: () => void` (optional for testing/flexibility)
  - Additional callbacks as needed for screen actions
- **Hooks**: 
  - Data fetching: `useInsightsData()` (performance metrics, achievements, goals)
  - Loading state: `isLoading`, `isError`, `refetch`
- **No business logic in screen**: Delegate to hooks
- **No navigation imports**: Uses callback props (framework-agnostic, testable pattern)

### Routes
- **Native**: `apps/expo/app/insights.tsx` 
  - Import: `InsightsScreen` from `@my/app`
  - Provide callbacks: `onBack={() => router.back()}`
  - Wrap: `<AuthGate>` for protected route
  - Configure: `_layout.tsx` add to stack
- **Web**: `apps/web/app/insights.tsx` 
  - Same pattern as native (callback implementations)
  - Additional: SEO meta tags

### Navigation Pattern
```typescript
// Screen (packages/app/features/Insights/InsightsScreen.tsx)
export interface InsightsScreenProps {
  onBack?: () => void
  // Additional callbacks as needed
}

export function InsightsScreen({ onBack }: InsightsScreenProps) {
  const { data, isLoading, isError, refetch } = useInsightsData()
  // No router imports - uses callback props for framework-agnostic testability
  return (
    <GlassBackground>
      {/* Screen content - can call onBack when needed */}
    </GlassBackground>
  )
}

// Route (apps/expo/app/insights.tsx)
export default function InsightsRoute() {
  const router = useRouter()
  
  return (
    <AuthGate>
      <InsightsScreen onBack={() => router.back()} />
    </AuthGate>
  )
}
```

### Platform-Specific Navigation
- **Native**: `Linking.openURL()` for external links (wrap in callback passed to screen if needed)
- **Web**: `window.open()` for external links (wrap in callback passed to screen if needed)
- **Testing**: Mock callback props in screen tests (no need to mock router/navigation hooks)

## Data Requirements

### API Integration
See `analysis-backend.md` for:
- Performance metrics endpoint
- Weekly stats aggregation
- Focus areas/goals tracking
- Achievements system
- Real-time updates via Supabase Realtime

### State Management
- **TanStack Query**: Cache insights data, stale-while-revalidate pattern
- **Refresh interval**: 5 minutes for stats, real-time for achievements
- **Optimistic updates**: For marking achievements as seen

## Implementation Checklist

### Phase 1: Component Creation
- [ ] Create `packages/ui/src/components/Insights/` directory
- [ ] Implement `StatCard` component with tests
- [ ] Implement `Progress` component with tests
- [ ] Implement `Badge` component with tests
- [ ] Implement `ActivityChart` component with tests
- [ ] Implement `AchievementCard` component with tests
- [ ] Implement `FocusCard` component with tests
- [ ] Add all components to `packages/ui/src/components/Insights/index.ts`

### Phase 2: Screen Implementation
- [ ] Create `packages/app/features/Insights/InsightsScreen.tsx`
- [ ] Create `useInsightsData` hook for data fetching
- [ ] Implement loading/error/empty states
- [ ] Add screen tests with mock data
- [ ] Verify all accessibility requirements

### Phase 3: Route Integration
- [ ] Create `apps/expo/app/insights.tsx` with AuthGate
- [ ] Create `apps/web/app/insights.tsx` with AuthGate
- [ ] Update `_layout.tsx` files to include insights route
- [ ] Configure AppHeader with back button
- [ ] Test navigation flow from Settings or Home

### Phase 4: Polish
- [ ] Add animations (card stagger, progress transitions)
- [ ] Test on iOS, Android, Web
- [ ] Verify safe area handling
- [ ] Performance profiling (60fps target)
- [ ] Accessibility audit (screen readers, color contrast)

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management, data fetching patterns
- **Backend Integration**: See `analysis-backend.md` for API contracts, real-time updates
- **Platform Specifics**: See `analysis-platform.md` for iOS/Android/Web implementation details

## Notes
- Glass morphism design requires careful performance testing on mid-range devices
- Consider lazy loading achievement/focus lists if they grow beyond 10 items
- Josefin Sans font must be loaded before rendering (add to font loading config)
- Chart bars should have minimum 4px width for touch targets
- Empty state illustration should align with app's visual style
- Consider adding "Share insights" feature for social engagement

