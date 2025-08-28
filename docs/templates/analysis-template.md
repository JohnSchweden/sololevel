# [FeatureName] Wireframe Analysis

> **Instructions**: Copy this template to `docs/features/[feature-name]/analysis.md` and complete all sections systematically before implementation.

## Visual Analysis Phase
- [ ] **Layout Structure**: Identify main containers and map them 1:1 with the wirefrime (headers, content areas, navigation, paddings, margins, and spaces uses between elements to make it responsive)
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

## Component Architecture Phase
- [ ] **Component Hierarchy**: Parent/child component structure
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
- [ ] **Props Interface**: TypeScript interfaces for component communication
- [ ] **Styling Strategy**: Theme tokens, responsive design, animations
- [ ] **Testing Strategy**: Unit tests, integration tests, E2E scenarios

## Cross-Platform Validation Phase
- [ ] **Web Implementation**: Next.js routing, SEO considerations
- [ ] **Native Implementation**: Expo Router, platform-specific gestures
- [ ] **Shared Logic**: Business logic in packages/app/features
- [ ] **Performance Testing**: Bundle size, render performance, memory usage

## Quality Gates
- [ ] **Visual Parity**: Web and native render identically
- [ ] **Interaction Parity**: Gestures and clicks work consistently
- [ ] **Accessibility Compliance**: WCAG 2.2 AA standards met
- [ ] **Performance Benchmarks**: Load times, interaction times within targets

## Documentation Requirements
- [ ] **Storybook Stories**: All component states documented
- [ ] **API Documentation**: Endpoint schemas and validation
- [ ] **Testing Coverage**: Unit/integration/E2E test completion
- [ ] **Accessibility Notes**: Screen reader testing results
