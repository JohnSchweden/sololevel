# Give Feedback UI/UX Analysis

> Feature for users to submit feedback (bugs, suggestions, complaints, other) with type selection and message input.

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: Snapshot tests for idle/loading/success/error states; responsive grid layout (2x2 on mobile, 4-column on desktop); theme token validation for glass background
- [ ] **User Interaction Tests**: Feedback type selection (button press feedback); textarea input (focus, typing, character count); submit button (disabled when empty, enabled with text); back button navigation
- [ ] **Accessibility Tests**: Screen reader labels for feedback types; keyboard navigation (tab through types → textarea → submit); color contrast on glass background; touch targets (44px minimum)

## Visual Design Analysis Phase

### Layout Structure
**Root Container**: Full-screen glass background with fixed header and scrollable content

**Code Composition Pattern**:
- **Screen**: `packages/app/features/GiveFeedback/GiveFeedbackScreen.tsx`
  - Hooks: `useState` for feedbackType and message; TanStack Query mutation for submit
  - Render: GlassBackground, FeedbackTypeSelector, TextArea, Button from @my/ui
  - Props: `onBack?: () => void`, `onSuccess?: () => void`
- **Route**: `apps/{expo,web}/app/settings/give-feedback.tsx`
  - Handler: `router.back()` or `navigation.goBack()`
  - Success handler: Show toast + navigate back

**Visual Layout Structure**:
```typescript
GlassBackground (full screen)
├── AppHeader (back button, "Give Feedback" title, spacer)
├── ScrollView paddingTop={headerHeight}
│   ├── Introduction: YStack align="center" gap="$4" marginBottom="$6"
│   │   ├── IconContainer: Avatar size="$8" circular bg="gradient"
│   │   │   └── MessageSquare icon
│   │   ├── Heading: Text fontSize="$7" fontWeight="600"
│   │   └── Description: Text fontSize="$4" color="$gray11" textAlign="center"
│   │
│   ├── FeedbackForm: YStack gap="$6" paddingHorizontal="$4"
│   │   ├── TypeSection: YStack gap="$3"
│   │   │   ├── Label: Text fontSize="$5" color="$gray12"
│   │   │   └── TypeGrid: XStack flexWrap="wrap" gap="$3"
│   │   │       ├── FeedbackTypeButton (Bug)
│   │   │       ├── FeedbackTypeButton (Suggestion)
│   │   │       ├── FeedbackTypeButton (Complaint)
│   │   │       └── FeedbackTypeButton (Other)
│   │   │
│   │   ├── MessageSection: YStack gap="$3"
│   │   │   ├── Label: Text fontSize="$5" color="$gray12"
│   │   │   ├── TextArea minHeight={140} placeholder="Tell us..."
│   │   │   └── CharCount: Text fontSize="$3" color="$color11" (conditional)
│   │   │
│   │   └── SubmitSection: YStack gap="$3" paddingTop="$4" borderTopWidth={1} borderColor="$borderColor"
│   │       └── Button variant="primary" disabled={!message} icon={<Send />}
│   │
└── SafeAreaView edges={['bottom']}
```

**AppHeader Configuration**:
```typescript
navigation.setOptions({
  appHeaderProps: {
    leftAction: { icon: 'arrow-left', onPress: onBack },
    title: 'Give Feedback',
  }
})
```

### Component Mapping

**Existing Components**:
- Layout: `YStack`, `XStack`, `ScrollView` from @my/ui
- Interactive: `Button`, `TextArea` (needs creation/import), `Avatar` from @my/ui
- Display: `Text` from @my/ui
- Icons: `MessageSquare`, `Send`, `ArrowLeft` from lucide-react-native

**New Components Needed**:
1. **FeedbackTypeButton**: `packages/ui/src/components/Feedback/FeedbackTypeButton.tsx`
   - Props: `id`, `label`, `icon` (emoji), `color` (red/blue/orange/purple), `selected`, `onPress`
   - Variants: Default (bg-white/5, border-white/30), Selected (color-specific with opacity)
   - Layout: Vertical (icon + label), pressable with scale animation
   - Size: Flex-1 in 2-column grid, min-height 88px (44px touch target × 2 for visual balance)

2. **TextArea**: `packages/ui/src/components/Form/TextArea.tsx` (if not exists)
   - Props: `value`, `onChange`, `placeholder`, `minHeight`, `maxHeight`, `disabled`
   - Styling: Glass effect (bg-white/5), border (white/30), focus states
   - Features: Auto-grow, character count support

### Design Tokens

**Colors**:
- Background: Glass effect with `$backgroundTransparent` + custom gradients
- Text: `$color` (white/$gray12), `$gray11` (secondary text), `$color11` (tertiary)
- Borders: `$borderColor` (white/30 equivalent)
- Type Colors: `$red9`, `$blue9`, `$orange9`, `$purple9` with opacity variants

**Typography**:
- Heading: `fontSize="$7"` (18-20px), `fontWeight="600"`
- Body: `fontSize="$5"` (16px), `fontWeight="400"`
- Label: `fontSize="$5"` (16px), `fontWeight="500"`
- Caption: `fontSize="$3"` (12px), `fontWeight="400"`

**Spacing**:
- Section gaps: `$6` (24px)
- Element gaps: `$3` (12px), `$4` (16px)
- Content padding: `$4` (16px horizontal), `$6` (24px vertical)
- Grid gap: `$3` (12px)

**Sizes**:
- Icon container: `$8` (48px) circular avatar
- TextArea min-height: 140px
- Button height: `$5` (48px) with full-width
- Touch targets: Minimum 44px

### Responsive Breakpoints
- **Mobile (< 768px)**: 2×2 grid for feedback types, full-width button, vertical scroll
- **Tablet (768-1024px)**: Same 2×2 grid, increased padding (`$6` horizontal)
- **Desktop (> 1024px)**: 4-column horizontal grid for types, max-width 640px centered

## Interactive Elements

**Buttons**:
- **Back Button**: Icon-only (ArrowLeft), 44px touch target, callback to route handler
- **Feedback Type**: Pressable with scale animation (0.95 on press), color-coded borders/backgrounds when selected
- **Submit Button**: Primary variant, disabled when message empty, loading state on submission

**Form Elements**:
- **TextArea**: Focus state (brighter background/border), validation (required, max 1000 chars), error display below input
- **Type Selector**: Single selection (radio behavior), visual feedback (border + background color change), emoji + label layout

**Navigation**:
- Screen prop: `onBack?: () => void` → Route handler: `router.back()` or `navigation.goBack()`
- Success callback: `onSuccess?: () => void` → Route handler: Show toast + navigate back

## Animations & Loading States

**Transitions**:
- Screen: Default stack slide animation
- Type selection: Scale press animation (pressStyle={{ scale: 0.95 }}), border/bg color fade (300ms)
- Submit button: Loading spinner replaces Send icon

**Loading UI**:
- Submit button: Disabled state + loading indicator, no full-screen loader
- Success: Toast notification → navigate back with 500ms delay

**Performance**:
- Debounce character count updates (avoid re-render on every keystroke)
- Memoize feedback type buttons to prevent unnecessary re-renders

## Cross-Platform Considerations

**Platform Adaptations**:
- iOS: Native keyboard dismiss on scroll, haptic feedback on type selection
- Android: Material ripple effect on buttons (handled by Tamagui)
- Web: Hover states for buttons (opacity 0.8), focus rings for accessibility

**Safe Area Handling**:
- AppHeader: Auto-handles top insets (status bar)
- ScrollView: `paddingTop={headerHeight}` to avoid overlap
- Bottom: `<SafeAreaView edges={['bottom']} />` for home indicator

**Platform-Specific Components**:
- Keyboard handling: Native uses `KeyboardAvoidingView` behavior="padding", Web uses standard form
- TextArea: Native uses `TextInput` multiline, Web uses `textarea` element

## Quality Gates & Documentation

**Testing**:
- Visual regression: Screenshots for each feedback type selected state
- Accessibility: VoiceOver/TalkBack labels ("Bug Report button, not selected")
- Performance: Render time < 16ms, smooth scroll 60fps
- Cross-platform: Identical layout/behavior on iOS/Android/Web

**Documentation**:
- Storybook: FeedbackTypeButton component with all color variants
- Theme tokens: Document glass effect implementation pattern
- Character limits: Document 1000 char max in feedback API docs

## Existing App Integration

**File Structure**:
```
packages/app/features/GiveFeedback/
├── GiveFeedbackScreen.tsx        # Main screen component
├── hooks/
│   └── useFeedbackSubmit.ts      # TanStack Query mutation
└── types.ts                       # FeedbackType enum

packages/ui/src/components/
├── Feedback/
│   ├── FeedbackTypeButton.tsx
│   └── index.ts
└── Form/
    ├── TextArea.tsx (if needed)
    └── index.ts

apps/expo/app/settings/give-feedback.tsx  # Native route
apps/web/app/settings/give-feedback.tsx   # Web route
```

**Routes**:
- Native: `apps/expo/app/settings/give-feedback.tsx` with `router.back()`
- Web: `apps/web/app/settings/give-feedback.tsx` with SEO meta tags
- Both: Wrap screen with AuthGate

**Testing**:
```typescript
// Mock callback props for screen testing
<GiveFeedbackScreen 
  onBack={mockOnBack} 
  onSuccess={mockOnSuccess} 
/>

// Verify handlers called
fireEvent.press(backButton)
expect(mockOnBack).toHaveBeenCalled()
```

## Cross-References
- **Feature Logic**: Create `analysis-feature.md` for state management and submission API
- **Backend Integration**: Create `analysis-backend.md` for feedback storage schema

