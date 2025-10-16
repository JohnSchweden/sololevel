# Coach AI UI/UX Analysis

## Test Scenarios (TDD Foundation)
- [ ] **Visual Component Tests**: Snapshot tests for each state (idle, loading, error, success); responsive breakpoints (mobile, tablet, desktop); theme token validation
- [ ] **User Interaction Tests**: Touch/click scenarios (tap, swipe, type, scroll); visual feedback (hover, press, focus); touch target size (44px minimum); gesture handling (pan, pinch, long press)
- [ ] **Accessibility Tests**: Screen reader navigation (semantic structure, ARIA labels); keyboard navigation (tab order, focus management); color contrast (WCAG 2.2 AA); dynamic type scaling

## Visual Design Analysis

### Layout Structure
```typescript
GlassBackground (full screen)
├── YStack (flex-1)
│   ├── Header: XStack padding="$4" justifyContent="space-between"
│   │   ├── Button (back navigation)
│   │   ├── Text "Coach AI" 
│   │   └── Spacer
│   ├── Avatar: YStack alignItems="center" marginBottom="$6"
│   │   └── Avatar (80x80) with typing indicator
│   ├── Messages: ScrollArea flex="1" padding="$6"
│   │   └── YStack gap="$4"
│   │       └── Message bubbles (user/coach)
│   └── Input Area: YStack padding="$6" gap="$4"
│       ├── Suggestions: Collapsible chips
│       │   └── XStack gap="$2" flexWrap="wrap"
│       └── Input Container: White background
│           └── XStack gap="$3" alignItems="start"
│               ├── Plus button (attachment)
│               ├── TextArea (flex-1)
│               └── XStack gap="$1.5" (voice buttons)
```

### Code Composition Pattern

- **Screen**: `packages/app/features/Coach/CoachScreen.tsx` - Orchestrator with callback props (`onBack?: () => void`, `onNavigateToSettings?: () => void`)
  - Hooks: Chat state management, message handling, voice input state
  - Render: UI components from @my/ui
  - NO business logic (delegated to hooks)
  - NO navigation logic (callback props only)
- **Route**: `apps/{expo,web}/app/coach.tsx` - Navigation handlers, AuthGate wrapper, platform-specific logic
- **Pattern**: Callback props in screens → handlers in route files → platform-specific (Linking/window.open)

### Component Mapping

- [ ] **Layout**: YStack, XStack, ScrollView, SafeAreaView
- [ ] **Interactive**: Button (back, suggestions, voice controls), TextArea, Avatar
- [ ] **Display**: Text, Sheet (collapsible suggestions), Message bubbles (custom styled YStack)
- [ ] **Overlay**: Toast (for errors/confirmations)
- [ ] **Custom**: CoachAvatar, MessageBubble, SuggestionChip, ChatInput, TypingIndicator

**Reusable from @my/ui**
- `GlassBackground` - existing component
- `Button` - standard UI button with variants (ghost, icon-only)
- Base layout primitives (YStack, XStack, ScrollView)

**New Components to Create**
- `CoachAvatar` - animated avatar with typing indicator
- `MessageBubble` - chat message with timestamp
- `SuggestionChip` - interactive suggestion button
- `ChatInput` - white container with textarea + action buttons
- `TypingIndicator` - animated dots

### Design Tokens

- [ ] **Colors**: Glass background with gradient overlay; message bubbles `rgba(255,255,255,0.2)` user, `rgba(255,255,255,0.1)` coach; white input container; text white on glass, dark gray on white
- [ ] **Typography**: Title fontSize="$6" (Josefin Sans Regular); message text fontSize="$3"; timestamp fontSize="$2" color="$color11"; input placeholder fontSize="$4"
- [ ] **Spacing**: Container padding `$6`; section gaps `$4`; element gaps `$2`, `$3`; message margins `$3`
- [ ] **Sizes**: Avatar 80x80px with 4px border; touch targets 44px minimum; input max height 120px; suggestion pills padding `$3` `$4`

### Responsive Breakpoints

- [ ] **Mobile (< 768px)**: Single column layout, touch-optimized with 44px minimum touch targets
- [ ] **Tablet (768-1024px)**: Similar to mobile with larger touch areas, adaptive input sizing
- [ ] **Desktop (> 1024px)**: Hover states on all interactive elements, keyboard shortcuts enabled (Enter/Shift+Enter)

## Interactive Elements

- [ ] **Buttons**: States (default, hover, pressed, disabled); variants (ghost for voice controls, icon-only for back/actions with 44px touch targets)
  - Back button: Icon-only, hover white color
  - Avatar: Clickable with scale animation → navigate to settings
  - Suggestion chips: Tap to send, disabled during typing, scale feedback
  - Attachment (Plus): Ghost variant, left position in input
  - Voice (Mic): Toggle state with red highlight when active
  - Voice Mode (Headphones): Ghost variant
- [ ] **Form Elements**: TextArea with auto-resize (32px-120px), Enter to send, Shift+Enter for newline, placeholder "Message your coach"
- [ ] **Navigation**: Callback props (`onBack`, `onNavigateToSettings`) → handlers in route files
- [ ] **AppHeader**: Not used (custom header in screen with back button)

## Animations & Loading States

- [ ] **Transitions**: Button feedback scale(1.05) hover, scale(0.95) active; suggestions collapse/expand with height/opacity transition
- [ ] **Loading UI**: Typing indicator (3 bouncing dots with staggered delay 0.1s, 0.2s); avatar pulse animation during AI typing
- [ ] **Performance**: Smooth scroll to new messages; 60fps target for animations

## Cross-Platform Considerations

- [ ] **Platform Adaptations**
  - iOS: Custom header (no AppHeader), SafeAreaView bottom edge, keyboard dismiss on scroll/shift input up, haptics on button press
  - Android: System back button support, material design feedback, keyboard behavior similar to iOS
  - Web: Hover states on all interactive elements, keyboard shortcuts (Enter/Shift+Enter), no safe area insets, focus management
- [ ] **Safe Area Handling**
  - Custom header instead of AppHeader (no top inset handling needed)
  - Use `<SafeAreaView edges={['bottom']} />` at screen root for input area
- [ ] **Platform-Specific Components**
  - Native-only: Voice input (speech recognition), haptics on interactions
  - Web-only: Keyboard shortcuts, focus visible styles
  - Shared: Chat UI with platform-specific styling (hover states web-only)

## Quality Gates & Documentation

- [ ] **Testing**: Visual regression (snapshot tests for message bubbles, input states); accessibility (WCAG 2.2 AA color contrast, keyboard navigation, screen reader message announcements); performance (render < 16ms, smooth 60fps animations); cross-platform parity (iOS/Android/Web)
- [ ] **Documentation**: Storybook stories for CoachAvatar (idle/typing), MessageBubble (user/coach), SuggestionChip (default/disabled), ChatInput (empty/filled/disabled); theme token usage examples; screen reader test results; animation timing specs (bounce delays, transition durations)

## Navigation & App Integration

- [ ] **Screen**: `packages/app/features/Coach/CoachScreen.tsx` with callback props
  ```typescript
  interface CoachScreenProps {
    onBack?: () => void;
    onNavigateToSettings?: () => void;
  }
  ```
- [ ] **Routes**: `apps/{expo,web}/app/coach.tsx` with handlers + AuthGate + `_layout.tsx` update
- [ ] **Navigation**: Callback props in screens → handlers in route files
- [ ] **Platform**: Native=Linking.openURL, Web=window.open (if external links needed)
- [ ] **Testing**: Mock callback props for testability

## Cross-References

- **Feature Logic**: See `analysis-feature.md` for chat state management, AI integration, and business logic
- **Backend Integration**: See `analysis-backend.md` for message storage, AI coach API requirements
- **Platform Specifics**: See `analysis-platform.md` for voice input, speech recognition implementation details

