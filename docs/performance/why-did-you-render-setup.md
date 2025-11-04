# why-did-you-render Setup for Expo

**Status:** ✅ Configured for Expo Router compatibility

## Configuration

### Setup File
**Location:** `packages/app/utils/whyDidYouRender.ts`

**Key Configuration:**
- `trackAllPureComponents: false` - Only track manually enabled components
- `include: null` - Don't auto-track anything
- `exclude: [...]` - Exclude Expo Router components that break navigation:
  - `Screen`, `Stack`, `Group` (Expo Router navigation)
  - `RootLayoutNav` (App root)
  - `Provider`, `QueryProvider`, `I18nProvider` (Provider components)
  - `WDYR.*` (why-did-you-render internal wrappers)

### Initialization
**Location:** `apps/expo/app/_layout.tsx` (lines 8-19)

**Critical:** Must be imported BEFORE React components are used to properly wrap them.

### Component Enablement
**Location:** `packages/app/features/VideoAnalysis/components/VideoAnalysisLayout.native.tsx` (lines 733-745)

```typescript
if (__DEV__) {
  ;(VideoAnalysisLayout as any).whyDidYouRender = {
    logOnDifferentValues: false, // Only log avoidable re-renders
    customName: 'VideoAnalysisLayout',
  }
}
```

## Why This Works

1. **Exclude Navigation Components:** Prevents why-did-you-render from wrapping Expo Router Screen/Stack components, which breaks navigation
2. **Manual Tracking Only:** Only tracks components explicitly enabled, avoiding interference with system components
3. **Early Initialization:** Initialized before any components are used, allowing proper wrapping

## Expected Output

When `VideoAnalysisLayout` re-renders unnecessarily, you'll see:
```
[why-did-you-render] VideoAnalysisLayout
  Re-rendered because:
  { feedback: { $$typeof: Symbol(react.element), ... } }
  Previous props were the same
```

## Troubleshooting

If you see "WDYRFunctionalComponent" errors:
1. Check that `exclude` patterns include the component causing issues
2. Verify `trackAllPureComponents: false`
3. Ensure initialization happens before component imports

## References

- [why-did-you-render GitHub](https://github.com/welldone-software/why-did-you-render)
- Works with React Native (per official docs)
- Compatible with Expo when properly configured

