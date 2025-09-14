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
**Example Root Container**: Full-screen vertical layout with safe area handling
```typescript
// Root Layout Structure (Both States)
YStack flex={1} backgroundColor="$background"
├── Header: XStack height={60} paddingHorizontal="$4" alignItems="center"
│   ├── Left: Button chromeless size={44x44} (hamburger/back)
│   ├── Center: Text/Timer (screen title or recording duration)
│   └── Right: Button chromeless size={44x44} (notifications)
├── ContentArea: YStack flex={1} position="relative"
│   ├── MainContent: Component (varies by screen)
│   └── Overlays: Positioned absolute elements
└── BottomNavigation: XStack height={80} justifyContent="space-between"
    ├── Tab1: Button chromeless flex={1} icon={Icon1}
    ├── Tab2: Button variant="primary" flex={1} icon={Icon2} (active)
    └── Tab3: Button chromeless flex={1} icon={Icon3}
```

- [ ] **Tamagui Component Mapping**: Map each UI element 1:1 to Tamagui components
  - [ ] **Layout Components**: YStack, XStack, ScrollView, SafeAreaView
  - [ ] **Interactive Components**: Button, Input, Switch, Slider
  - [ ] **Display Components**: Text, Image, Avatar, Card
  - [ ] **Overlay Components**: Sheet, Dialog, Popover, Toast
  - [ ] **Custom Components**: Identify components needing custom implementation

- [ ] **Design System Integration**: Theme tokens and styling consistency
  - [ ] **Colors**: Map wireframe colors to theme tokens ($primary, $secondary, etc.)
  - [ ] **Typography**: Map text styles to theme typography scale
  - [ ] **Spacing**: Map margins/padding to theme space tokens ($1, $2, $4, etc.)
  - [ ] **Sizes**: Map component sizes to theme size tokens
  - [ ] **Borders**: Map border radius and stroke to theme tokens

- [ ] **Responsive Design Requirements**: Breakpoint behavior analysis
  - [ ] **Mobile (< 768px)**: Single column, touch-optimized, bottom navigation
  - [ ] **Tablet (768px - 1024px)**: Adaptive layout, larger touch targets
  - [ ] **Desktop (> 1024px)**: Multi-column, hover states, keyboard shortcuts

## Interactive Elements Analysis Phase
- [ ] **Button States and Variants**: Define all button interactions
  - [ ] **Primary Actions**: Main CTAs with prominent styling
  - [ ] **Secondary Actions**: Supporting actions with subtle styling
  - [ ] **Destructive Actions**: Delete/remove actions with warning colors
  - [ ] **Icon Buttons**: Touch targets, accessibility labels, visual feedback
  - [ ] **State Variations**: Default, hover, pressed, disabled, loading

- [ ] **Form Elements**: Input fields and validation
  - [ ] **Text Inputs**: Placeholder text, validation states, error messages
  - [ ] **Selection Controls**: Dropdowns, radio buttons, checkboxes
  - [ ] **File Inputs**: Upload areas, progress indicators, preview states
  - [ ] **Form Validation**: Real-time validation, error presentation

- [ ] **Navigation Elements**: Screen transitions and routing
  - [ ] **Tab Navigation**: Active states, badge indicators, accessibility
  - [ ] **Stack Navigation**: Header configurations, back button behavior
  - [ ] **Modal Navigation**: Sheet presentations, overlay interactions
  - [ ] **Deep Linking**: URL handling for web, universal links for native

## Animation and Micro-interactions Phase
- [ ] **Transition Animations**: Screen and component transitions
  - [ ] **Screen Transitions**: Slide, fade, modal presentations
  - [ ] **Component Animations**: Loading states, success feedback
  - [ ] **Gesture Animations**: Swipe actions, pull-to-refresh
  - [ ] **Performance Considerations**: 60fps targets, animation optimization

- [ ] **Loading States**: Progress indication and skeleton screens
  - [ ] **Skeleton Screens**: Content placeholders during loading
  - [ ] **Progress Indicators**: Determinate and indeterminate progress
  - [ ] **Optimistic Updates**: Immediate UI feedback before server response

## Cross-Platform UI Considerations Phase
- [ ] **Platform-Specific Adaptations**: Native feel on each platform
  - [ ] **iOS Adaptations**: Navigation patterns, system colors, haptics
  - [ ] **Android Adaptations**: Material Design elements, system navigation
  - [ ] **Web Adaptations**: Hover states, keyboard shortcuts, URL handling

- [ ] **Component Platform Variants**: When to use platform-specific implementations
  - [ ] **Native-Only Components**: Camera, file picker, notifications
  - [ ] **Web-Only Components**: SEO meta tags, browser-specific features
  - [ ] **Shared Components**: Business logic components with platform styling

## TDD UI Implementation Roadmap

### Phase 1: TDD Component Foundation [Native/Web]
- [ ] **Component Interface Tests**: Define props and styling contracts
- [ ] **Theme Integration Tests**: Validate design system compliance
- [ ] **Responsive Layout Tests**: Ensure breakpoint behavior
- [ ] **Accessibility Foundation Tests**: Basic WCAG compliance

### Phase 2: TDD Interactive Elements [Native/Web]
- [ ] **User Interaction Tests**: Validate touch/click behavior
- [ ] **Form Validation Tests**: Input handling and error states
- [ ] **Navigation Tests**: Screen transitions and routing
- [ ] **Animation Tests**: Transition timing and performance

### Phase 3: TDD Cross-Platform Parity [Native/Web]
- [ ] **Visual Parity Tests**: Identical rendering across platforms
- [ ] **Interaction Parity Tests**: Consistent behavior patterns
- [ ] **Performance Tests**: Render timing and memory usage
- [ ] **Accessibility Tests**: Platform-specific accessibility features

## Quality Gates
- [ ] **Visual Regression Testing**: Screenshot comparison tests
- [ ] **Accessibility Compliance**: WCAG 2.2 AA validation
- [ ] **Performance Benchmarks**: Render time < 16ms, smooth animations
- [ ] **Cross-Platform Consistency**: Identical user experience

## Documentation Requirements
- [ ] **Storybook Stories**: All component states and variants documented
- [ ] **Design System Usage**: Theme token usage and component patterns
- [ ] **Accessibility Documentation**: Screen reader testing results
- [ ] **Animation Documentation**: Transition timing and easing functions

## Cross-References
- **Feature Logic**: See `analysis-feature.md` for state management and business logic
- **Backend Integration**: See `analysis-backend.md` for data requirements
- **Platform Specifics**: See `analysis-platform.md` for implementation details
