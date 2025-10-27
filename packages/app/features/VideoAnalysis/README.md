# VideoAnalysis Feature

## Architecture

### Component Structure
- `VideoAnalysisScreen.tsx` - Integration layer (111 lines)
- `VideoAnalysisLayout.native.tsx` - Native render tree with gestures (370 lines)
- `VideoAnalysisLayout.web.tsx` - Web render tree (simplified, ~120 lines)

### Hook Orchestration
- `useVideoAnalysisOrchestrator` - Coordinates 14 hooks (597 lines)
- `useGestureController` - YouTube-style gesture delegation (native only, 450 lines)
- `useAnimationController` - Mode-based animation calculations (native only, 150 lines)
- `useAnalysisState` - Analysis data and state management
- `useVideoPlayback` - Video playback control
- `useVideoControls` - Video UI controls
- `useFeedbackAudioSource` - Audio feedback source management
- `useAudioController` - Audio playback control
- `useFeedbackCoordinator` - Feedback coordination and overlay management
- `useFeedbackPanel` - Panel state and interactions
- `useVideoAudioSync` - Video-audio synchronization
- `useAutoPlayOnReady` - Auto-play logic
- `useHistoricalAnalysis` - Historical analysis data
- `useStatusBar` - Status bar management

### Platform-Specific Code
- **Gesture handling**: Native only (`.native.tsx`)
- **Animation system**: Native only (Reanimated)
- **Web**: Simplified layout without gestures

## Refactoring Results

### Before Refactoring
- **VideoAnalysisScreen**: 1,131 lines
- **Complexity**: 14 hooks, gesture logic, animations, and UI layout mixed
- **Platform branching**: Native vs Web render trees in same file
- **Testing**: Required mocking 14 individual hooks

### After Refactoring
- **VideoAnalysisScreen**: 111 lines (90% reduction)
- **Architecture**: Clear separation - Props → Orchestrator → Layout
- **Platform separation**: `.native.tsx` / `.web.tsx` files
- **Testing**: Mock single orchestrator instead of 14 hooks

## Testing Strategy

### Orchestrator Testing
- Mock single `useVideoAnalysisOrchestrator` hook instead of 14 individual hooks
- Test hook coordination and state aggregation
- Verify platform-specific hook handling

### Layout Component Testing
- Test prop wiring and rendering
- Native: Verify gesture detector integration
- Web: Verify simplified layout structure

### Hook Testing
- Gesture/Animation hooks: Test in isolation with worklet scenarios
- Business logic hooks: Test with proper mocks
- Focus on user behavior, not implementation details

## Performance Considerations

### Bundle Size
- **Web bundle**: Excludes native gesture/animation code (~300 lines)
- **Native bundle**: Includes full gesture and animation system
- **Code splitting**: Platform-specific files loaded only when needed

### Runtime Performance
- **Gesture response**: < 16ms (60fps target)
- **Animation smoothness**: 60fps, no dropped frames
- **Memory usage**: Optimized with proper cleanup and memoization

## Development Patterns

### Adding New Features
1. **Business logic**: Add to appropriate hook in `hooks/` directory
2. **UI components**: Add to `components/` directory
3. **Platform-specific**: Use `.native.tsx` / `.web.tsx` pattern
4. **Orchestration**: Update `useVideoAnalysisOrchestrator` to include new hook

### Testing New Features
1. **Unit tests**: Test individual hooks in isolation
2. **Integration tests**: Test orchestrator coordination
3. **Component tests**: Test layout component prop wiring
4. **Platform tests**: Test both native and web variants

### Code Organization
- **Hooks**: Business logic and state management
- **Components**: UI rendering and user interactions
- **Types**: TypeScript interfaces and type definitions
- **Utils**: Pure utility functions and helpers

## File Structure

```
packages/app/features/VideoAnalysis/
├── README.md                           # This file
├── VideoAnalysisScreen.tsx             # Integration layer (111 lines)
├── components/
│   ├── VideoAnalysisLayout.native.tsx  # Native layout (370 lines)
│   └── VideoAnalysisLayout.web.tsx     # Web layout (~120 lines)
├── hooks/
│   ├── useVideoAnalysisOrchestrator.ts # Hook coordinator (597 lines)
│   ├── useGestureController.ts         # Gesture logic (450 lines)
│   ├── useAnimationController.ts       # Animation logic (150 lines)
│   └── [other hooks...]                # Business logic hooks
├── contexts/
│   └── VideoAnalysisContext.tsx        # React context
├── types/
│   └── index.ts                        # TypeScript definitions
└── utils/
    └── audioCache.ts                   # Utility functions
```

## Migration Guide

### From Old Architecture
If you were working with the old VideoAnalysisScreen:

1. **Hook calls**: Move to `useVideoAnalysisOrchestrator`
2. **Platform branching**: Use `.native.tsx` / `.web.tsx` files
3. **Testing**: Mock orchestrator instead of individual hooks
4. **State management**: Access through orchestrator return value

### Example Migration
```typescript
// Old way
const gesture = useGestureController(...)
const animation = useAnimationController(...)
const video = useVideoPlayback(...)
// ... 11 more hooks

// New way
const orchestrated = useVideoAnalysisOrchestrator(props)
const { gesture, animation, video } = orchestrated
```

## Related Documentation
- [Refactoring Plan](../docs/refactoring/video-analysis-refactoring-plan.md)
- [Dependency Analysis](../docs/refactoring/video-analysis-dependencies.mermaid)
- [Platform Analysis](../docs/refactoring/video-analysis-platform-analysis.md)
