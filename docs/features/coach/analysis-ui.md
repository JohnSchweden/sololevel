# Coach AI UI/UX Analysis

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

### Component Mapping

**Layout Components (Tamagui)**
- `YStack` - vertical containers
- `XStack` - horizontal containers  
- `ScrollView` - messages area
- `SafeAreaView` - bottom edge

**Interactive Components**
- `Button` - back, suggestions, voice controls
  - Variants: ghost, icon-only (44px touch target)
  - States: default, pressed, disabled
- `TextArea` - message input with auto-resize
- `Avatar` - coach image with fallback

**Display Components**
- `Text` - messages, timestamps, labels
- `Sheet` - collapsible suggestions
- Message bubbles - custom styled YStack

**Reusable from @my/ui**
- `GlassBackground` - existing component
- `Button` - standard UI button
- Base layout primitives (YStack, XStack, ScrollView)

**New Components Needed**
- `CoachAvatar` - animated avatar with typing indicator
- `MessageBubble` - chat message with timestamp
- `SuggestionChip` - interactive suggestion button
- `ChatInput` - white container with textarea + action buttons
- `TypingIndicator` - animated dots

### Design Tokens

**Colors**
- Background: Glass effect with gradient overlay
- Message bubbles: `rgba(255,255,255,0.2)` user, `rgba(255,255,255,0.1)` coach
- Input container: White (`#FFFFFF`)
- Text: White on glass, dark gray on white input

**Typography**
- Title: Josefin Sans Regular, fontSize="$6"
- Message text: fontSize="$3", lineHeight="relaxed"
- Timestamp: fontSize="$2", color="$gray10"
- Input placeholder: fontSize="$4"

**Spacing**
- Container padding: `$6`
- Section gaps: `$4`
- Element gaps: `$2`, `$3`
- Message margins: `$3` (between bubbles)

**Sizes**
- Avatar: 80x80px, border 4px
- Touch targets: 44px minimum (icon buttons 32px with padding)
- Input max height: 120px
- Suggestion pills: auto height, padding `$3` `$4`

### Interactive Elements

**Buttons**
- Back button: Icon-only, hover: white
- Avatar: Clickable → navigate to settings, scale animation
- Suggestion chips: Tap to send, disabled during typing
- Attachment (Plus): Ghost button, left in input
- Voice (Mic): Toggle red when active
- Voice Mode (Headphones): Ghost button

**Form Elements**
- TextArea: Auto-resize (32px-120px), Enter to send, Shift+Enter for newline
- Placeholder: "Message your coach"

**Animations**
- Avatar pulse: when AI typing
- Typing indicator: 3 bouncing dots (staggered delay)
- Suggestions: Collapse/expand with height transition
- Button feedback: scale(1.05) hover, scale(0.95) active
- Auto-scroll: smooth scroll to new messages

### Cross-Platform Considerations

**iOS**
- Safe area: Top handled by AppHeader, bottom by SafeAreaView
- Keyboard: Dismiss on scroll, shift input up

**Android**
- System navigation: Honor back button
- Keyboard: Similar behavior to iOS

**Web**
- Hover states: On all interactive elements
- Keyboard shortcuts: Enter to send, Shift+Enter for newline
- No safe area insets

## Navigation & Integration

**Screen Location**: `packages/app/features/Coach/CoachScreen.tsx`

**Props**:
```typescript
interface CoachScreenProps {
  onBack?: () => void;
  onNavigateToSettings?: () => void;
}
```

**Routes**: 
- Native: `apps/expo/app/coach.tsx`
- Web: `apps/web/app/coach.tsx`

**Pattern**: Callback props → handlers in route files

**Update**: `apps/{expo,web}/app/(tabs)/settings/_layout.tsx` for navigation

## Test Scenarios

- [ ] Visual: Glass background renders, avatar displays, messages layout correctly
- [ ] Interaction: Send message, toggle voice, collapse suggestions, click avatar
- [ ] Keyboard: Enter sends, Shift+Enter newline, auto-focus input
- [ ] States: Loading (typing indicator), disabled inputs during typing
- [ ] Accessibility: Screen reader announces messages, keyboard navigation
- [ ] Responsive: Mobile layout, textarea auto-resize

