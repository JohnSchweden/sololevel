# [FeatureName] Wireframe Analysis

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis.md` and complete all sections systematically before implementation. Follow TDD principles: write tests first, then implement components.

## Test-Driven Component Analysis Phase
- [ ] **User Behavior Test Scenarios**: Define what users should be able to do
  - [ ] Write test scenarios for each user interaction (tap, swipe, type, etc.)
  - [ ] Define expected outcomes and edge cases for each interaction
  - [ ] Identify accessibility requirements as test cases (screen reader, keyboard nav)
  - [ ] Document error states and loading states as test scenarios
- [ ] **Component Contract Tests**: Define component interfaces through tests
  - [ ] Props interface validation tests (required vs optional props)
  - [ ] State management test scenarios (loading, error, success states)
  - [ ] Error boundary test cases for component failures
  - [ ] Cross-platform behavior test contracts (web vs native differences)
- [ ] **Integration Test Scenarios**: Define component interaction tests
  - [ ] Parent-child component communication tests
  - [ ] Data flow validation tests (props down, events up)
  - [ ] Performance regression test cases (render time, memory usage)
  - [ ] Accessibility integration tests (focus management, ARIA labels)

## Visual Analysis Phase
- [ ] **Layout Structure**: Identify main containers and map them 1:1 with the wireframe (headers, content areas, navigation, paddings, margins, and spaces used between elements to make it responsive)
**Example Root Container**: Full-screen vertical layout with safe area handling
```typescript
// Root Layout Structure (Both States)
YStack flex={1} backgroundColor="$background"
├── Header: XStack height={60} paddingHorizontal="$4" alignItems="center"
│   ├── Left: Button chromeless size={44x44} (hamburger/back)
│   ├── Center: Text/Timer (screen title or recording duration)
│   └── Right: Button chromeless size={44x44} (notifications)
├── CameraArea: YStack flex={1} position="relative"
│   ├── CameraPreview: Camera component (full background)
│   ├── PoseOverlay: SVG/Canvas overlay (transparent, non-blocking)
│   └── CameraControls: Positioned absolute bottom
│       ├── IDLE STATE:
│       │   ├── UploadButton: Button icon={Upload} size={60x60}
│       │   ├── RecordButton: Button variant="primary" size={80x80} (main CTA)
│       │   └── CameraSwapButton: Button icon={RotateCcw} size={60x60}
│       └── RECORDING STATE:
│           ├── CameraSettings: Button icon={Settings} size={44x44}
│           ├── ZoomControls: XStack gap="$2"
│           │   ├── ZoomButton: Button "1x" variant={active ? "primary" : "chromeless"}
│           │   ├── ZoomButton: Button "2x" variant={active ? "primary" : "chromeless"}
│           │   └── ZoomButton: Button "3x" variant={active ? "primary" : "chromeless"}
│           ├── PauseStopButton: Button size={60x60} icon={Pause/Square}
│           └── CameraSwapButton: Button icon={RotateCcw} size={44x44}
└── BottomNavigation: XStack height={80} justifyContent="space-between" paddingHorizontal="$4"
    ├── CoachTab: Button chromeless flex={1} icon={MessageCircle}
    ├── RecordTab: Button variant="primary" flex={1} icon={Circle} (active)
    └── InsightsTab: Button chromeless flex={1} icon={BarChart}
```
- [ ] **Component Mapping**: Map each UI element 1:1 to Tamagui components
- [ ] **Responsive Breakpoints**: Identify mobile/tablet/desktop variations
- [ ] **Interactive Elements**: Buttons, inputs, dropdowns, gestures
- [ ] **Content Types**: Text hierarchy, images, icons, data displays
- [ ] **Navigation Patterns**: Links, modals, overlays, drawer/tab patterns

## Technical Requirements Phase
- [ ] **Data Requirements**: API endpoints, Supabase tables, real-time needs
- [ ] **State Management**: Local vs global state, form state, loading states
- [ ] **Platform Considerations**: Native vs web differences, platform APIs
- [ ] **Performance Needs**: Lazy loading, virtualization, optimization
- [ ] **Accessibility**: Screen reader support, keyboard navigation, contrast

## Component Architecture Phase (TDD-Driven)
- [ ] **Test-First Component Design**: Start with failing tests
  - [ ] Write component tests before implementation (Red phase)
  - [ ] Define component boundaries through test contracts
  - [ ] Use tests to drive prop interface design
  - [ ] Ensure 1:2 test-to-code ratio is maintained
- [ ] **Component Hierarchy**: Parent/child structure driven by test scenarios
### Example
```typescript
RecordScreen
├── RecordHeader
│   ├── MenuButton
│   ├── ScreenTitle
│   └── NotificationButton
├── CameraPreview
│   ├── CameraView (platform-specific)
│   └── RecordingOverlay
│       ├── UploadButton
│       ├── RecordButton
│       └── CameraSwapButton
└── BottomNavigation
    ├── CoachTab
    ├── RecordTab (active)
    └── InsightsTab
```
- [ ] **Props Interface**: TypeScript interfaces validated by tests
  - [ ] Required vs optional props defined through test contracts
  - [ ] Type safety enforced through test validation
  - [ ] Default values tested and documented
- [ ] **State Management**: Test-driven state design
  - [ ] Loading states tested and validated
  - [ ] Error states tested with proper error boundaries
  - [ ] Success states tested for user feedback
- [ ] **Styling Strategy**: Theme tokens, responsive design, animations
  - [ ] Cross-platform styling tests (web vs native)
  - [ ] Responsive breakpoint tests
  - [ ] Animation performance tests

## TDD Implementation Roadmap

### Phase 1: TDD Foundation & Component Structure [Native/Web]
- [ ] **Analysis Mapping**: Map wireframe components to test scenarios
- [ ] **Component Interface Tests**: Define props and behavior contracts
- [ ] **Layout Structure Tests**: Validate responsive design requirements
- [ ] **Theme Integration Tests**: Ensure design system compliance

### Phase 2: TDD Interactive Elements [Native/Web]
- [ ] **User Interaction Tests**: Map wireframe interactions to test cases
- [ ] **Platform-Specific Tests**: Define web vs native interaction differences
- [ ] **Accessibility Tests**: Ensure WCAG compliance for all interactions

### Phase 3: TDD Data Integration [Native/Web]
- [ ] **Data Requirements Tests**: Map wireframe data needs to API contracts
- [ ] **State Management Tests**: Define Zustand store behavior
- [ ] **Real-time Tests**: If applicable, define subscription behavior

### Phase 4: TDD Screen Integration [Native/Web]
- [ ] **Navigation Tests**: Map wireframe navigation to routing tests
- [ ] **Screen Composition Tests**: Validate complete screen behavior
- [ ] **Deep Linking Tests**: If applicable, define URL handling

### Phase 5: TDD Platform Optimization [Native/Web]
- [ ] **Performance Tests**: Define performance requirements from analysis
- [ ] **Animation Tests**: Map wireframe animations to test scenarios
- [ ] **Accessibility Tests**: Ensure full WCAG compliance

### Phase 6: TDD Quality Assurance [Native/Web]
- [ ] **Integration Tests**: Validate complete user flows from wireframe
- [ ] **Cross-Platform Tests**: Ensure feature parity
- [ ] **E2E Tests**: Test critical user journeys

## Cross-Platform Validation Phase
- [ ] **Web Implementation**: Expo Router routing, SEO considerations
- [ ] **Native Implementation**: Expo Router, platform-specific gestures
- [ ] **Shared Logic**: Business logic in packages/app/features
- [ ] **Performance Testing**: Bundle size, render performance, memory usage

## TDD Quality Gates
- [ ] **Test Coverage**: 1:2 test-to-code ratio maintained (never exceed 1:1)
- [ ] **Test-First Implementation**: All components have tests before implementation
- [ ] **Red-Green-Refactor Cycle**: Each component follows TDD process
  - [ ] Red: Write failing tests first
  - [ ] Green: Implement minimal code to pass tests
  - [ ] Refactor: Improve code while keeping tests green
- [ ] **User Behavior Validation**: Tests focus on user interactions, not implementation
- [ ] **Cross-Platform Test Parity**: Web and native tests validate identical behavior
- [ ] **Accessibility Test Coverage**: Screen reader and keyboard navigation tests
- [ ] **Performance Test Benchmarks**: Render time and memory usage within targets

## Quality Gates
- [ ] **Visual Parity**: Web and native render identically
- [ ] **Interaction Parity**: Gestures and clicks work consistently
- [ ] **Accessibility Compliance**: WCAG 2.2 AA standards met
- [ ] **Performance Benchmarks**: Load times, interaction times within targets

## Documentation Requirements
- [ ] **Storybook Stories**: All component states documented with test scenarios
- [ ] **API Documentation**: Endpoint schemas and validation
- [ ] **Testing Coverage**: Unit/integration/E2E test completion with TDD validation
- [ ] **Accessibility Notes**: Screen reader testing results
- [ ] **TDD Documentation**: Test scenarios and component contracts documented
