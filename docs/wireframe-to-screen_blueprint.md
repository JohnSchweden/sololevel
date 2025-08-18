# Cursor Wireframe-to-Screen Implementation Blueprint

## Phase 1: Initial Analysis Prompt

```
Planner Mode

I need to implement a new cross-platform screen based on this wireframe screenshot. Before starting, please:

1. Analyze the wireframe and identify all UI components, layout patterns, and interactive elements
2. Map these to appropriate Tamagui components and layout strategies
3. Identify any custom components that need to be created in packages/ui
4. Determine the data requirements and TanStack Query hooks needed
5. Plan the navigation integration with Solito
6. Identify any platform-specific considerations (.native.tsx needs)

After your analysis, ask me clarifying questions about:
- Data sources and API endpoints
- User interactions and navigation flows
- Any platform-specific behaviors required
- Performance or accessibility requirements
- Integration with existing app state/navigation

Then provide a comprehensive implementation plan.
```

## Phase 2: Implementation Prompts

### Step 2A: Component Structure
```
Following the approved plan, start implementation:

1. Create the main screen component in packages/app/features/[FeatureName]/[ScreenName]Screen.tsx
2. Follow our Solito navigation patterns from navigation-solito.mdc
3. Use Tamagui components exclusively (no StyleSheet) per ui-styling-tamagui.mdc
4. Implement the layout structure first, then add styling
5. Include proper TypeScript types following typescript-standards.mdc

Focus on component structure and layout - we'll add data integration next.
```

### Step 2B: Data Integration
```
Now integrate the data layer:

1. Create TanStack Query hooks in packages/api following data-state-management.mdc
2. Add Zod schemas for type validation
3. Implement proper loading/error states per error-handling.mdc
4. Add any Zustand store updates needed for global state
5. Follow Supabase integration patterns from supabase-backend.mdc

Test the data flow before moving to final polish.
```

### Step 2C: Cross-Platform Polish
```
Final implementation phase:

1. Test on both web and native platforms
2. Add platform-specific optimizations if needed (.native.tsx)
3. Implement accessibility props following ui-styling-tamagui.mdc
4. Add animations/transitions using Tamagui's animation APIs
5. Optimize performance following performance.mdc guidelines
6. Add comprehensive tests following testing-unified.mdc

Run the full test suite and verify cross-platform consistency.
```

## Phase 3: Quality Assurance Prompt

```
Debugger Mode

Let's verify the implementation:

1. Test the screen on both web (yarn workspace @repo/web dev) and native (yarn workspace @repo/mobile start)
2. Check for any console errors or warnings
3. Validate responsive behavior across different screen sizes
4. Test all interactive elements and navigation flows
5. Verify data loading/error states work correctly

If you find any issues, follow the debugging workflow to identify and fix them systematically.
```

## Advanced Wireframe Analysis Template

When sharing your wireframe, include this context:

```
## Wireframe Context

**Screen Purpose:** [Brief description]
**User Flow:** [How user reaches this screen and where they go next]
**Data Requirements:** [What data needs to be displayed/collected]
**Platform Notes:** [Any web vs native specific behaviors]
**Existing Components:** [Reference any similar screens already built]
**Priority Level:** [MVP feature vs nice-to-have]

## Technical Constraints
- Must work on [iOS/Android/Web - specify which]
- Performance requirements: [any specific needs]
- Accessibility requirements: [any specific needs]
- Integration points: [other screens/features this connects to]

[Attach wireframe image]

Please analyze this wireframe and follow the implementation blueprint wireframe-to-screen_blueprint.md.
```

## Pro Tips for Better Results

### 1. **Iterative Refinement**
```
After initial implementation, use:
"Review the current implementation against the wireframe. What's missing or incorrect? Update accordingly."
```

### 2. **Platform-Specific Testing**
```
"Test this screen on [iOS simulator/Android emulator/web browser] and report any platform-specific issues or improvements needed."
```

### 3. **Performance Validation**
```
"Analyze this screen for performance bottlenecks. Check for unnecessary re-renders, expensive computations, or memory leaks."
```

### 4. **Accessibility Audit**
```
"Audit this screen for accessibility compliance. Add missing accessibility props and test with screen readers."
```

## Common Wireframe Patterns → Implementation

### **List/Grid Views**
- Tamagui `YStack`/`XStack` with `FlatList` for performance
- Use `SolitoImage` for thumbnails
- Implement pull-to-refresh and pagination

### **Forms**
- React Hook Form + Zod validation
- Tamagui `Input`, `TextArea`, `Button` components
- Platform-appropriate keyboard handling

### **Navigation Elements**
- Solito `Link` components, never direct navigation
- Consistent header patterns across platforms
- Tab/drawer navigation via Solito routing

### **Data Display**
- TanStack Query for loading states
- Skeleton loading with Tamagui components
- Error boundaries for failed data loads

## Quality Checklist

Before considering the screen complete:
- [ ] Works identically on web and native
- [ ] Follows all Tamagui styling rules
- [ ] Proper TypeScript types throughout
- [ ] TanStack Query integration for data
- [ ] Accessibility props included
- [ ] Error handling implemented
- [ ] Loading states designed
- [ ] Tests written (unit + component)
- [ ] Performance optimized
- [ ] Navigation properly integrated

This blueprint ensures Cursor builds screens that perfectly match your architecture while maintaining code quality and cross-platform consistency.