# [FeatureName] UI/UX Analysis Template

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis-ui.md` and complete all sections systematically before implementation. This template focuses on visual design, component hierarchy, and user interactions. Cross-reference with `analysis-feature.md` for business logic integration.

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: Snapshot tests for each state (idle, loading, error, success); responsive breakpoints (mobile, tablet, desktop); theme token validation
- [ ] **User Interaction Tests**: Touch/click scenarios (tap, swipe, type, scroll); visual feedback (hover, press, focus); touch target size (44px minimum); gesture handling (pan, pinch, long press)
- [ ] **Accessibility Tests**: Screen reader navigation (semantic structure, ARIA labels); keyboard navigation (tab order, focus management); color contrast (WCAG 2.2 AA); dynamic type scaling

## Visual Design Analysis Phase
- [ ] **Layout Structure**: Identify main containers and map them 1:1 with the wireframe
**Example Root Container**: Full-screen vertical layout with AppHeader and safe area handling

**Code Composition Pattern**:
- **Screen**: `packages/app/features/[Feature]/[Feature]Screen.tsx` - Orchestrator with callback props (`onAction?: () => void`)
  - Hooks: Data fetching and state management
  - Render: UI components from @my/ui
  - NO business logic (delegated to hooks)
  - NO navigation logic (callback props only)
- **Route**: `apps/{expo,web}/app/[route].tsx` - Navigation handlers, AuthGate wrapper, platform-specific logic
- **Pattern**: Callback props in screens → handlers in route files → platform-specific (Linking/window.open)


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

- [ ] **Design Tokens**: Map wireframe to theme tokens
  - Colors: $primary, $secondary, $background, $gray1-12
  - Typography: fontSize scale ($1-$10), fontWeight
  - Spacing: $1, $2, $3, $4, $6, $8 for margins/padding/gaps
  - Sizes/Borders: Component sizes and border radius tokens

- [ ] **Responsive Breakpoints**
  - Mobile (< 768px): Single column, touch-optimized
  - Tablet (768-1024px): Adaptive layout, larger touch targets
  - Desktop (> 1024px): Multi-column, hover states, keyboard shortcuts

## Interactive Elements
- [ ] **Buttons**: Define states (default, hover, pressed, disabled, loading) and variants (primary, secondary, destructive, icon-only with 44px touch targets)
- [ ] **Form Elements**: Text inputs (placeholder, validation, errors), selection controls (dropdown, radio, checkbox), file uploads (progress, preview)
- [ ] **Navigation**: Callback props in screens → handlers in route files → platform-specific (Linking/window.open). AppHeader configuration via `navigation.setOptions()`, tab states, stack gestures (iOS swipe, Android back), modal sheets

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

## Existing App Integration
- [ ] **Screen**: `packages/app/features/[Feature]/[Feature]Screen.tsx` with callback props
- [ ] **Routes**: `apps/{expo,web}/app/[route].tsx` with handlers + AuthGate
- [ ] **Platform**: Native=Linking.openURL, Web=window.open
- [ ] **Testing**: Mock callback props for testability

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details
