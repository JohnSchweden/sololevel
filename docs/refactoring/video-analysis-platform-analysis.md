# VideoAnalysisScreen Platform-Specific Code Analysis

## Executive Summary

**Total Lines:** 1,131  
**Shared Code:** ~650 lines (57%)  
**Native-Only Code:** ~400 lines (35%)  
**Web-Only Code:** ~90 lines (8%)

**Recommendation:** Extract platform-specific code into `.native.tsx` and `.web.tsx` layout components to reduce main component complexity and improve bundle size.

---

## Platform Code Distribution

### Shared Code (Lines 1-352, 653-846) - ~650 lines (57%)

**Includes:**
- Imports and type definitions (lines 1-41)
- Animation constants and worklet functions (lines 43-128)
- Helper functions (`warmEdgeCache`, lines 134-155)
- Props interface (lines 157-164)
- Component function signature (lines 166-173)
- Hook orchestration (lines 174-318)
- State management (lines 308-318)
- Effect hooks (lines 680-706)
- Error state (line 708)
- Callback handlers (lines 710-844)

**Characteristics:**
- Platform-agnostic business logic
- Hook coordination
- State management
- Event handlers
- Data transformation

**Reusability:** HIGH - Can be shared across all platforms

---

### Native-Only Code (Lines 353-651, 847-1039) - ~400 lines (35%)

#### Section 1: Gesture Logic (Lines 353-582) - ~230 lines

**Purpose:** YouTube-style gesture delegation for video mode transitions

**Key Features:**
- Touch area detection (video vs feedback)
- Velocity-based swipe detection
- Direction-based gesture activation
- Scroll blocking coordination
- Pull-to-reveal gesture

**Dependencies:**
- `react-native-gesture-handler` (Gesture, GestureDetector)
- `react-native-reanimated` (SharedValue, worklets)

**Worklet Functions:**
```typescript
.onTouchesDown() - Touch position tracking
.onBegin() - Initial gesture activation logic
.onStart() - Gesture start confirmation
.onChange() - Continuous gesture updates (scroll manipulation)
.onEnd() - Snap to mode, re-enable ScrollView
.onFinalize() - Cleanup gesture state
```

**State Management:**
- `gestureIsActive: SharedValue<boolean>`
- `gestureDirection: SharedValue<'unknown' | 'up' | 'down'>`
- `gestureVelocity: SharedValue<number>`
- `feedbackScrollEnabled: boolean` (JS state)
- `blockFeedbackScrollCompletely: boolean` (JS state)

**Complexity:** HIGH - Complex responder chain coordination

---

#### Section 2: Animation Calculations (Lines 584-651) - ~70 lines

**Purpose:** Mode-based video height transitions with smooth interpolation

**Key Features:**
- Header height interpolation (max → normal → min)
- Collapse progress calculation (0 → 0.5 → 1)
- Pull-to-reveal expansion animation
- Animated styles for header, feedback section, pull indicator

**Dependencies:**
- `react-native-reanimated` (useDerivedValue, useAnimatedStyle, interpolate)

**Derived Values:**
```typescript
headerHeight - Interpolated video height based on scrollY
collapseProgress - Normalized collapse state (0-1)
headerStyle - Animated height style
feedbackSectionStyle - Animated height (fills remaining space)
pullIndicatorStyle - Animated opacity and translateY
```

**Interpolation Ranges:**
- Max mode: scrollY = 0, height = SCREEN_H (100%)
- Normal mode: scrollY = 40% of SCREEN_H, height = 60% of SCREEN_H
- Min mode: scrollY = 67% of SCREEN_H, height = 33% of SCREEN_H
- Pull-to-reveal: scrollY < 0, height > SCREEN_H (elastic expansion)

**Complexity:** MEDIUM - Mathematical interpolations, well-isolated

---

#### Section 3: Native Render Tree (Lines 847-1039) - ~190 lines

**Purpose:** Native UI structure with gesture and animation integration

**Key Components:**
```tsx
<GestureHandlerRootView>
  <VideoAnalysisProvider>
    <YStack>
      <UploadErrorState />
      <GestureDetector gesture={rootPan}>
        <Animated.View>
          {/* Collapsible Video Header */}
          <Animated.View style={headerStyle}>
            <VideoPlayerSection />
          </Animated.View>
          
          {/* Pull-to-Reveal Indicator */}
          <Animated.View style={pullIndicatorStyle}>
            {/* Indicator content (currently commented out) */}
          </Animated.View>
          
          {/* Scroll Container (disabled, for layout only) */}
          <Animated.ScrollView scrollEnabled={false}>
            <ProcessingIndicator />
          </Animated.ScrollView>
          
          {/* Feedback Section (absolutely positioned) */}
          <Animated.View style={feedbackSectionStyle}>
            <FeedbackSection scrollEnabled={feedbackScrollEnabled} />
          </Animated.View>
        </Animated.View>
      </GestureDetector>
    </YStack>
  </VideoAnalysisProvider>
</GestureHandlerRootView>
```

**Layout Strategy:**
- Absolute positioning for video header (z-index: 2)
- Absolute positioning for feedback section (z-index: 1, translateY: headerHeight)
- Gesture detector wraps entire layout
- ScrollView disabled (gesture controls scroll programmatically)

**Prop Wiring:**
- VideoPlayerSection: 25+ props (video state, handlers, bubble state, audio overlay)
- FeedbackSection: 15+ props (panel state, feedback items, handlers)

**Complexity:** HIGH - Complex layout with gesture/animation integration

---

### Web-Only Code (Lines 1042-1129) - ~90 lines (8%)

**Purpose:** Simplified web UI without gesture handling

**Key Components:**
```tsx
<VideoAnalysisProvider>
  <YStack flex={1}>
    <UploadErrorState />
    <YStack flex={1}>
      {/* Video Player Section */}
      <VideoPlayerSection />
      
      {/* Feedback Section */}
      <FeedbackSection />
    </YStack>
  </YStack>
</VideoAnalysisProvider>
```

**Differences from Native:**
- No GestureHandlerRootView
- No GestureDetector
- No Animated.View wrappers
- No gesture or animation props passed
- Simplified layout (flex-based, no absolute positioning)
- Static video height (no mode transitions)
- Social counts set to 0 (native has real values)

**Prop Wiring:**
- VideoPlayerSection: Same 25+ props (but gesture/animation ignored)
- FeedbackSection: Same 15+ props (but scrollEnabled always true)

**Complexity:** LOW - Standard React layout, no native dependencies

---

## Platform Divergence Points

### 1. Gesture Handling
**Native:** Full YouTube-style gesture delegation (230 lines)  
**Web:** None (relies on standard scroll behavior)

**Divergence Reason:** Web lacks native gesture responder chain; mouse/touch events handled differently

---

### 2. Animation System
**Native:** Reanimated worklets for 60fps UI-thread animations  
**Web:** CSS-based animations (not implemented in current code)

**Divergence Reason:** Reanimated is native-only; web uses CSS transitions/animations

---

### 3. Layout Strategy
**Native:** Absolute positioning with dynamic heights (gesture-driven)  
**Web:** Flex-based layout with static heights

**Divergence Reason:** Native needs precise control for gesture interactions; web uses standard flow layout

---

### 4. ScrollView Control
**Native:** Programmatic scroll control via `scrollTo()` worklet  
**Web:** Standard ScrollView with native scroll behavior

**Divergence Reason:** Native gesture system requires manual scroll control to prevent conflicts

---

### 5. Status Bar
**Native:** Hidden via `useStatusBar(true, 'fade')`  
**Web:** Not applicable (no native status bar)

**Divergence Reason:** Platform-specific UI chrome

---

### 6. Social Counts
**Native:** Real values (likes: 1200, comments: 89, etc.)  
**Web:** All set to 0

**Divergence Reason:** Unknown (possibly feature flag or MVP scope)

---

## Code Reuse Percentage

### Current Architecture
```
Total: 1,131 lines
├── Shared: ~650 lines (57%)
├── Native-only: ~400 lines (35%)
└── Web-only: ~90 lines (8%)
```

### After Refactoring (Proposed)
```
VideoAnalysisScreen.tsx: ~200 lines (100% shared)
├── Props → Orchestrator → Platform selection
├── useVideoAnalysisOrchestrator: ~150 lines (100% shared)
├── useGestureController.native.ts: ~230 lines (0% shared)
├── useAnimationController.native.ts: ~70 lines (0% shared)
├── VideoAnalysisLayout.native.tsx: ~190 lines (0% shared)
└── VideoAnalysisLayout.web.tsx: ~90 lines (0% shared)
```

**Benefits:**
- Main component: 100% shared (vs 57% currently)
- Platform code clearly separated
- Web bundle excludes native gesture/animation code (~300 lines)
- Improved testability (platform code tested independently)

---

## Bundler Resolution Strategy

### Metro (React Native/Expo)
Supports platform-specific file resolution:
```
.native.tsx → Native (iOS/Android)
.web.tsx → Web
.tsx → Fallback (all platforms)
```

**Recommendation:**
```typescript
// VideoAnalysisScreen.tsx (shared)
import { VideoAnalysisLayout } from './components/VideoAnalysisLayout'

// Metro resolves to:
// - VideoAnalysisLayout.native.tsx (iOS/Android)
// - VideoAnalysisLayout.web.tsx (Web)
```

---

## Platform-Specific Dependencies

### Native-Only Imports
```typescript
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  scrollTo,
  useAnimatedRef,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
```

**Bundle Impact:** ~500KB (gesture-handler + reanimated)  
**Web Impact:** Excluded from web bundle (automatic via Metro)

### Shared Imports
```typescript
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Dimensions, Platform } from 'react-native'
import { YStack } from 'tamagui'
```

**Bundle Impact:** Minimal (core React Native primitives)  
**Web Impact:** Included in web bundle (react-native-web polyfills)

---

## Testing Strategy by Platform

### Shared Code (VideoAnalysisScreen.tsx)
**Test Environment:** Jest + jsdom (web-like)  
**Focus:** Hook orchestration, prop passing, platform selection logic  
**Mocks:** Mock orchestrator hook, mock layout components

### Native Code (useGestureController, useAnimationController, Layout.native)
**Test Environment:** Jest + react-native testing environment  
**Focus:** Gesture logic, animation calculations, layout structure  
**Mocks:** Mock Reanimated worklets, mock gesture events

### Web Code (VideoAnalysisLayout.web)
**Test Environment:** Vitest + jsdom  
**Focus:** Layout structure, prop wiring, standard interactions  
**Mocks:** Standard React Testing Library mocks

---

## Migration Path

### Phase 1: Extract Gesture Logic
**File:** `useGestureController.native.ts`  
**Lines:** 353-582 (~230 lines)  
**Effort:** 2 hours  
**Benefit:** Isolated gesture testing, reduced main component by 20%

### Phase 2: Extract Animation Logic
**File:** `useAnimationController.native.ts`  
**Lines:** 584-651 (~70 lines)  
**Effort:** 1 hour  
**Benefit:** Isolated animation testing, reduced main component by 6%

### Phase 3: Extract Native Layout
**File:** `VideoAnalysisLayout.native.tsx`  
**Lines:** 847-1039 (~190 lines)  
**Effort:** 2 hours  
**Benefit:** Platform separation, reduced main component by 17%

### Phase 4: Extract Web Layout
**File:** `VideoAnalysisLayout.web.tsx`  
**Lines:** 1042-1129 (~90 lines)  
**Effort:** 1 hour  
**Benefit:** Platform separation, reduced main component by 8%

### Phase 5: Create Orchestrator
**File:** `useVideoAnalysisOrchestrator.ts`  
**Lines:** ~150 lines (new)  
**Effort:** 3 hours  
**Benefit:** Centralized hook coordination, simplified main component

**Total Effort:** ~9 hours  
**Total Reduction:** 1,131 → ~200 lines (83% reduction)

---

## Platform Feature Parity

### Implemented on Both Platforms ✅
- Video playback with controls
- Feedback panel with items
- Audio playback coordination
- Processing indicator
- Upload error state
- Context provider

### Native-Only Features 📱
- YouTube-style gesture delegation
- Video mode transitions (max/normal/min)
- Pull-to-reveal gesture
- Animated header height
- Status bar hiding
- Social action buttons (with real counts)

### Web-Only Features 🌐
- None (web is simplified subset of native)

### Missing on Web (Potential Future Work)
- Gesture-based video resizing (could use CSS transitions)
- Pull-to-reveal (could use scroll events)
- Social features (currently disabled, counts set to 0)

---

## Recommendations

### Immediate Actions (Task 38-42)
1. ✅ **Document platform divergence** (this file)
2. ⏭️ **Extract gesture logic** → `useGestureController.native.ts`
3. ⏭️ **Extract animation logic** → `useAnimationController.native.ts`
4. ⏭️ **Extract layouts** → `VideoAnalysisLayout.{native,web}.tsx`
5. ⏭️ **Create orchestrator** → `useVideoAnalysisOrchestrator.ts`

### Future Enhancements (Post-Refactoring)
1. **Web gesture support** - Implement CSS-based video resizing for web
2. **Social features parity** - Enable social actions on web
3. **Animation polish** - Add spring animations for smoother transitions
4. **Accessibility** - Ensure gesture alternatives for keyboard/screen reader users

---

## Summary

**Platform Code Separation:**
- Current: 57% shared, 35% native, 8% web (mixed in single file)
- Proposed: 100% shared main component, platform code in separate files

**Bundle Size Impact:**
- Native: No change (includes all features)
- Web: ~300 lines excluded (gesture + animation code)

**Maintainability:**
- Clear platform boundaries
- Independent testing strategies
- Easier to add platform-specific features

**Performance:**
- No runtime overhead (bundler resolves at build time)
- Web bundle smaller (excludes native dependencies)
- Native performance unchanged

---

## Appendix: Line Range Reference

| Section | Lines | Type | Description |
|---------|-------|------|-------------|
| Imports | 1-41 | Shared | All imports and type definitions |
| Constants | 43-78 | Shared | Animation constants, video modes |
| Worklets | 80-108 | Shared | Helper worklets (clamp, scrollToMode, etc.) |
| Helper Functions | 134-155 | Shared | warmEdgeCache function |
| Props Interface | 157-164 | Shared | VideoAnalysisScreenProps |
| Component Start | 166-318 | Shared | Hook orchestration, state management |
| Gesture Logic | 353-582 | **Native** | YouTube-style gesture delegation |
| Animation Logic | 584-651 | **Native** | Mode-based height interpolation |
| State/Effects | 653-844 | Shared | Callbacks, effects, error handling |
| Native Render | 847-1039 | **Native** | GestureDetector + Animated layout |
| Web Render | 1042-1129 | **Web** | Simplified flex layout |

**Total:** 1,131 lines  
**Shared:** ~650 lines (57%)  
**Native-Only:** ~400 lines (35%)  
**Web-Only:** ~90 lines (8%)

