# [FeatureName] UI/UX Analysis Template

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis-ui.md` and complete all sections systematically before implementation. This template focuses on visual design, component hierarchy, and user interactions. Cross-reference with `analysis-feature.md` for business logic integration.

## Test-Driven UI Component Analysis Phase

- [ ] **Visual Component Test Scenarios**: Define component rendering and styling tests
  - [ ] Write snapshot tests for each component state (idle, loading, error, success)
  - [ ] Define responsive breakpoint tests (mobile, tablet, desktop)
  - [ ] Test theme integration and token usage validation
  - [ ] Document animation and transition test scenarios
- [ ] **User Interaction Test Scenarios**: Define what users should be able to do
  - [ ] Write test scenarios for each user interaction (tap, swipe, type, scroll)
  - [ ] Define expected visual feedback for each interaction (hover, press, focus)
  - [ ] Identify touch target size requirements (44px minimum)
  - [ ] Document gesture handling tests (pan, pinch, long press)
- [ ] **Accessibility Test Scenarios**: Ensure inclusive design
  - [ ] Screen reader navigation tests (semantic structure, ARIA labels)
  - [ ] Keyboard navigation tests (tab order, focus management)
  - [ ] Color contrast validation tests (WCAG 2.2 AA compliance)
  - [ ] Dynamic type scaling tests (text size adjustments)

## Visual Design Analysis Phase

- [ ] **Layout Structure**: Identify main containers and map them 1:1 with the wireframe
**Example Root Container**: Full-screen vertical layout with AppHeader and safe area handling

**Code Composition Pattern**:
- **Screen**: `packages/app/features/[Feature]/[Feature]Screen.tsx` - Business logic orchestrator with callback props
  - Props: Navigation callbacks (`onNavigate?: (route: string) => void`, `onBack?: () => void`)
  - Hooks: Data fetching and state management
  - Render: UI components from @my/ui
  - NO business logic (delegated to hooks)
  - NO direct navigation imports (uses callback props for framework-agnostic testability)
- **Route**: `apps/{expo,web}/app/[route].tsx` - Navigation callback implementations, AuthGate wrapper, platform-specific logic
  - Provide navigation callbacks to screen (e.g., `onBack={() => router.back()}`)
  - Wrap with `<AuthGate>` for protected routes
  - Platform-specific handlers: `Linking.openURL()` (native) vs `window.open()` (web)
- **Pattern**: Screen callback props → route implements with router → platform-specific APIs

**Visual Layout Structure**:
```Typescript
GlassBackground (full screen)
├── Content: YStack/ScrollView paddingTop={headerHeight}
│   ├── Section1: YStack gap="$3" marginBottom="$6"
│   │   ├── SectionHeader: XStack justifyContent="space-between"
│   │   └── Content: Components specific to section
│   ├── Section2: YStack gap="$3" marginBottom="$6"
│   └── ...
└── SafeAreaView edges={['bottom']}
```

**AppHeader**: Configured via `navigation.setOptions({ appHeaderProps: {...} })` with callback fallbacks

- [ ] **Component Mapping**
  - Layout: YStack, XStack, ScrollView, SafeAreaView
  - Interactive: Button, Input, Switch, Slider
  - Display: Text, Image, Avatar, Card
  - Overlay: Sheet, Dialog, Popover, Toast
  - Custom: Document any custom components needed

- [ ] **Design Tokens**: Map wireframe to theme tokens (use numeric tokens from Tamagui defaultConfig)
  - Colors: $background, $backgroundHover, $text, $textSecondary, $primary, $borderColor
  - Grayscale: $gray1-$gray12 (neutral tones)
  - Color scale: $color1-$color12 (adaptive theme colors)
  - Semantic colors (1-12 each): $red, $blue, $green, $orange, $yellow, $purple, $violet, $pink, $teal, $cyan, $indigo
  - Typography: fontSize scale ($1-$10), fontWeight
  - Spacing: $1, $2, $3, $4, $6, $8 for margins/padding/gaps
  - Border Radius: $2 (small ~4px), $3 (medium ~8px), $5 (large ~12-16px)
  - Border Width: 1px (standard), 2px (emphasis)

- [ ] **Responsive Breakpoints**
  - Mobile (< 768px): Single column, touch-optimized
  - Tablet (768-1024px): Adaptive layout, larger touch targets
  - Desktop (> 1024px): Multi-column, hover states, keyboard shortcuts

## Interactive Elements

- [ ] **Buttons**: Define states (default, hover, pressed, disabled, loading) and variants (primary, secondary, destructive, icon-only with 44px touch targets)
- [ ] **Form Elements**: Text inputs (placeholder, validation, errors), selection controls (dropdown, radio, checkbox), file uploads (progress, preview)
- [ ] **Navigation**: Callback props in screen → implementations in route with router → platform-specific (Linking/window.open)
- [ ] **AppHeader**: Back button via callback prop, tab navigation, stack gestures (iOS swipe, Android back), modal sheets

## Animations & Loading States

- [ ] **Transitions**: Screen animations (slide, fade, modal), component animations, gesture feedback (swipe, pull-to-refresh)
- [ ] **Loading UI**: Skeleton screens, progress indicators (determinate/indeterminate), optimistic updates
- [ ] **Performance**: 60fps target, animation optimization

## Cross-Platform Considerations

- [ ] **Platform Adaptations**
  - iOS: Navigation patterns, system colors, haptics, safe areas (notch, home indicator)
  - Android: Material Design, system navigation, edge-to-edge display
  - Web: Hover states, keyboard shortcuts, URL handling, no safe area insets
- [ ] **Safe Area Handling**
  - AppHeader handles top insets automatically (status bar, notch)
  - Use `<SafeAreaView edges={['bottom']} />` at screen root
  - Full-screen: `edges={['left', 'right', 'bottom']}` when AppHeader hidden
- [ ] **Platform-Specific Components**
  - Native-only: Camera, file picker, notifications, haptics
  - Web-only: SEO meta tags, browser features, URL management
  - Shared: Business logic with platform-specific styling

## Quality Gates & Documentation

- [ ] **Testing**: Visual regression (screenshot comparison), accessibility (WCAG 2.2 AA), performance (render < 16ms, 60fps animations), cross-platform parity
- [ ] **Documentation**: Storybook stories for all component states, theme token usage examples, screen reader test results, animation timing/easing specs

## Navigation & App integration

- [ ] **Screen**: `packages/app/features/[Feature]/[Feature]Screen.tsx` - orchestrator with callback props
  - Props: `onNavigate?: (route: string) => void`, `onBack?: () => void`, other action callbacks
  - NO direct router/navigation imports (framework-agnostic pattern)
- [ ] **Routes**: `apps/{expo,web}/app/[route].tsx` with callback implementations + AuthGate + `_layout.tsx` update
  - Example: `<FeatureScreen onBack={() => router.back()} onNavigate={(route) => router.push(route)} />`
- [ ] **Navigation**: Callback props pattern (screen receives, route implements)
- [ ] **Platform**: Native=Linking.openURL, Web=window.open (implement in route callbacks)
- [ ] **Testing**: Mock callback props in screen tests (no need to mock router/navigation)

## Implementation Checklist

### Phase 1: Component Creation
- [ ] Create `packages/ui/src/components/Insights/` directory
- [ ] Implement `StatCard` component with tests
- [ ] Implement `Progress` component with tests
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

- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details
