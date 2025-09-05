# Standardized Wireframe Analysis Workflow Commands

## 🎯 Copy-Paste Commands for Each Phase

These standardized commands ensure consistent application of the
wireframe-to-screen workflow with proper .cursor/ rule integration.

## 📋 Phase 1: Initial Wireframe Analysis

### Command 1A: Start New Wireframe Analysis

```bash
"New wireframe received for [FeatureName]. Before implementation:

1. Create feature directory: mkdir -p docs/features/[feature-name]/{components,testing}
2. Save wireframe image as: docs/features/[feature-name]/wireframe.png
3. Create analysis using template: cp docs/templates/analysis-template.md docs/features/[feature-name]/analysis.md  
3. Apply mobile-screen-patterns.mdc rules during responsive analysis
4. Use wireframe-to-code.mdc for systematic component mapping
5. Reference ui-styling-tamagui.mdc for Tamagui component decisions
6. Validate all technical requirements before task generation

Only proceed to task generation after analysis is complete and all sections checked off."
```

### Command 1B: Complete Systematic Analysis

```bash
"Complete wireframe analysis systematically for [FeatureName]:

**Visual Analysis Phase (apply mobile-screen-patterns.mdc):**
- Map layout structure to Tamagui components (YStack, XStack, ScrollView)
- Identify responsive breakpoints with mobile-first approach
- Document interactive elements with 44px touch target requirements
- Plan navigation patterns using Expo Router

**Technical Requirements Phase (apply wireframe-to-code.mdc):**  
- Define Supabase schema and API endpoints needed
- Plan state management (Zustand global + TanStack Query server state)
- Identify platform-specific requirements (native vs web)
- Document performance and accessibility requirements

**Component Architecture Phase (apply ui-styling-tamagui.mdc):**
- Design component hierarchy and props interfaces
- Plan styling strategy with theme tokens
- Define testing strategy (unit + integration + E2E)

Ask clarifying questions if any analysis section needs more information."
```

## 🏗️ Phase 2: Enhanced Task Generation

### Command 2A: Generate Comprehensive Task List

```bash
"Based on completed wireframe analysis in docs/features/[feature-name]/analysis.md:

1. Create detailed task list using docs/templates/tasks-template.md
2. Save as docs/features/[feature-name]/tasks.md following task-lists.mdc format
3. Include mobile-first implementation phases
4. Add cross-platform testing pipeline
5. Reference analysis file in task list context section
6. Apply 6-phase implementation approach:
   - Phase 1: Mobile Foundation
   - Phase 2: Interactive Elements  
   - Phase 3: Data Integration
   - Phase 4: Screen Integration
   - Phase 5: Platform Optimization
   - Phase 6: Quality Assurance

Generate tasks with [Web], [Native], [Both] platform tags and [S/M/L] effort estimates."
```

### Command 2B: Validate Task List Against Analysis

```bash
"Validate generated task list docs/features/[feature-name]/tasks.md against analysis:

1. Ensure all wireframe elements from analysis are covered in tasks
2. Verify technical requirements are addressed in implementation phases
3. Confirm cross-platform considerations are included
4. Check that mobile-first approach is reflected in task ordering
5. Validate testing pipeline covers all analysis requirements

Reference: docs/features/[feature-name]/analysis.md for validation."
```

## 🚀 Phase 3: Implementation Execution

### Command 3A: Implement Foundation Phase

```bash
"
Implement Phase 1 (Mobile Foundation) from docs/features/[feature-name]/tasks.md:

## Required Document References:
1. Review Analysis: docs/features/[feature-name]/analysis.md for component mapping.
2. Review User Stories: docs/specification/user_stories/P0/[feature].md for acceptance criteria
3. Review Wireframes: docs/specification/wireframes/P0/[feature].png for UI, layout, and flow

**Fetch These Rules:**
- mobile-screen-patterns.mdc: Touch optimization, safe areas, gestures
- ui-styling-tamagui.mdc: Responsive design, theme tokens, animations
- wireframe-to-code.mdc: Systematic component creation patterns
- codegen-templates.mdc: Use mobile templates for scaffolding

**Quality Standards:**
- Test on mobile viewport sizes (375px, 414px, 390px widths)
- Ensure 44px minimum touch targets
- Implement proper safe area handling with useSafeAreaInsets
- Add accessibility labels and navigation support

**Validation:**
- Test interactions on both web and native
- Verify touch targets meet 44px minimum
- Confirm accessibility labels work with screen readers

**Progress Tracking:**
- Update task status as you complete each item
- Move completed tasks including sub-elements to 'Completed Tasks' section immediately
- Document any blockers or changes needed
"
```

### Command 3B: Implement Interactive Elements Phase

```bash
"
Implement Phase 2 (Interactive Elements) from docs/features/[feature-name]/tasks.md:

## Required Document References:
1. Review Analysis: docs/features/[feature-name]/analysis.md for component mapping.
2. Review User Stories: docs/specification/user_stories/P0/[feature].md for acceptance criteria
3. Review Wireframes: docs/specification/wireframes/P0/[feature].png for UI, layout, and flow

**Fetch These Rules:**
- mobile-screen-patterns.mdc: Touch interactions, gesture handling
- features/navigation-expo-router.mdc: Navigation implementation
- ui-styling-tamagui.mdc: Interactive states, animations

**Focus Areas:**
- Form inputs with validation and keyboard avoidance
- Button interactions with proper touch feedback
- Modal/drawer components with platform-appropriate behavior
- Touch gestures for native platform
- Keyboard navigation for web platform

**Validation:**
- Test interactions on both web and native
- Verify touch targets meet 44px minimum
- Confirm accessibility labels work with screen readers

**Progress Tracking:**
- Update task status as you complete each item
- Move completed tasks including sub-elements to 'Completed Tasks' section immediately
- Document any blockers or changes needed
"
```

### Command 3C: Implement Data Integration Phase

```bash
"Implement Phase 3 (Data Integration) from docs/features/[feature-name]/tasks.md:

**Fetch These Rules:**
- features/data-state-management.mdc: State management patterns
- backend/supabase-database.mdc: Database implementation
- backend/supabase-backend.mdc: API integration

**Implementation Focus:**
- Create Supabase database tables with RLS policies
- Build TanStack Query hooks for data fetching
- Setup Zustand stores for complex state management
- Add optimistic updates and error handling
- Implement real-time subscriptions if needed

**Quality Checks:**
- Validate data schemas with Zod
- Test error states and loading states
- Verify offline functionality where applicable

**Validation:**
- Run type-check and lint after implementing each task.

**Progress Tracking:**
- Update task status as you complete each item
- Move completed tasks including sub-elements to 'Completed Tasks' section immediately
- Document any blockers or changes needed

Reference docs/features/[feature-name]/analysis.md for data requirements."
```

### Command 3D: Implement Screen Integration Phase

```bash
"Implement Phase 4 (Screen Integration) from docs/features/[feature-name]/tasks.md:

**Fetch These Rules:**
- features/navigation-expo-router.mdc: Cross-platform routing
- ui/platform-specific.mdc: Platform adaptations
- task-lists.mdc: Task-List managament

**Cross-Platform Validation:**
- Test navigation flows on both platforms
- Verify URL handling and deep links
- Confirm platform-specific optimizations

**Validation:**
- Run type-check and lint after the implemention.

Reference: docs/features/[feature-name]/analysis.md for validation."
```

### Command 3E: Implement Platform Optimization Phase

```bash
"Implement Phase 5 (Platform Optimization) from docs/features/[feature-name]/tasks.md:

**Apply These Rules:**
- quality/performance.mdc: Performance optimization
- ui/platform-specific.mdc: Platform-specific enhancements
- quality/accessibility-wcag.mdc: Accessibility compliance

**Optimization Focus:**
- Bundle size and performance optimization
- Platform-specific enhancements (iOS/Android/Web)
- Accessibility features (ARIA, screen reader support)
- Animations and micro-interactions
- Performance testing and memory optimization

**Quality Validation:**
- Performance benchmarks met
- Accessibility audit passed
- Cross-platform feature parity confirmed

Reference analysis for performance and accessibility requirements."
```

### Command 3F: Execute Quality Assurance Phase

```bash
"Implement Phase 6 (Quality Assurance) from docs/features/[feature-name]/tasks.md:

**Apply These Rules:**
- quality/testing-unified.mdc: Testing strategy
- quality/storybook.mdc: Component documentation
- quality/debugging.mdc: Systematic debugging

**Testing Implementation:**
- Unit tests for all components
- Integration tests for screen flows
- E2E tests for critical user paths
- Cross-platform visual regression tests
- Accessibility testing and compliance

**Documentation:**
- Complete Storybook stories
- Update API documentation
- Document accessibility testing results

Final validation against docs/features/[feature-name]/analysis.md requirements."
```

## 📊 Phase 4: Cross-Platform Validation

### Command 4A: Validate Visual Parity

```bash
"Validate cross-platform visual parity for [FeatureName]:

**Visual Consistency Check:**
- Web and native render identically
- Responsive breakpoints work consistently across platforms
- Theme tokens applied uniformly
- Typography hierarchy matches wireframe specifications

**Testing Process:**
- Screenshot comparison between web and native
- Test on multiple device sizes and orientations
- Verify color contrast and accessibility compliance
- Validate against original wireframe design

Reference docs/features/[feature-name]/analysis.md for visual requirements.
Update task list with validation results."
```

### Command 4B: Validate Interaction Parity

```bash
"Validate cross-platform interaction parity for [FeatureName]:

**Interaction Consistency Check:**
- Touch/click feedback consistent across platforms
- Navigation patterns work identically on web and native
- Form interactions behave consistently
- Gesture support appropriate for each platform
- Keyboard navigation functional on web

**Testing Process:**
- Test all interactive elements on both platforms
- Verify touch targets meet 44px minimum requirement
- Confirm accessibility navigation works with screen readers
- Test form validation and submission flows

Update task completion status with interaction validation results."
```

### Command 4C: Validate Performance Parity

```bash
"Validate cross-platform performance parity for [FeatureName]:

**Performance Consistency Check:**
- Bundle size within mobile-first targets
- Render performance < 100ms on mid-range devices
- Memory usage acceptable for image-heavy screens
- Network resilience under poor conditions
- Loading states appropriate for mobile networks

**Testing Process:**
- Performance profiling on both platforms
- Memory usage testing with development tools
- Network throttling tests (3G conditions)
- Bundle size analysis and optimization verification

Document performance metrics and update task list with results."
```

## 🔄 Phase 5: Quality Assurance Pipeline

### Command 5A: Execute Mobile-Specific Testing

```bash
"Execute comprehensive mobile testing for [FeatureName]:

**Device Testing Matrix:**
- iOS: Test on various screen sizes, notched devices, iPad
- Android: Test different manufacturers, Android versions  
- Accessibility: VoiceOver, TalkBack, keyboard navigation

**Mobile Quality Validation:**
- Touch target minimum 44px verified ✅
- Safe area handling tested on notched devices ✅
- Loading states under 3G network conditions ✅
- Error states with actionable recovery options ✅
- One-handed usage patterns validated ✅

**Performance Testing:**
- Bundle size analysis for mobile networks
- Render performance profiling on lower-end devices
- Memory usage testing for image-heavy screens
- Network failure handling and offline functionality

Document all test results and update task completion status."
```

### Command 5B: Final Quality Gate Validation

```bash
"Execute final quality gate validation for [FeatureName]:

**Complete Quality Checklist:**
- [ ] All wireframe requirements implemented per analysis
- [ ] Cross-platform visual and interaction parity confirmed
- [ ] Mobile-first responsive design validated
- [ ] Touch targets meet 44px minimum requirement
- [ ] Safe area handling works on notched devices
- [ ] Accessibility compliance (WCAG 2.2 AA) verified
- [ ] Performance benchmarks met on target devices
- [ ] Testing pipeline complete (unit + integration + E2E)
- [ ] Storybook documentation complete
- [ ] Code review approval received

**Final Validation:**
- Compare implementation against docs/features/[feature-name]/analysis.md
- Verify all acceptance criteria met
- Confirm documentation is complete and accurate

Mark all tasks complete and archive analysis/task files for reference."
```

## 🔧 Maintenance & Updates Commands

### Command M1: Update Analysis for Requirement Changes

```bash
"Wireframe requirements updated for [FeatureName]:

1. Update docs/features/[feature-name]/analysis.md with changes
2. Document what changed and why in analysis notes
3. Update corresponding task list docs/features/[feature-name]/tasks.md to reflect new requirements
4. Identify implementation changes needed
5. Update affected components and tests

Ensure analysis remains the single source of truth for requirements."
```

### Command M2: Progress Update and Task Maintenance

```bash
"Update implementation progress for [FeatureName]:

1. Review current task status in docs/features/[feature-name]/tasks.md
2. Move completed items to 'Completed Tasks' section
3. Update 'In Progress Tasks' with current status and next steps
4. Document any blockers or requirement changes discovered
5. Validate progress against docs/features/[feature-name]/analysis.md

Maintain task list as accurate reflection of current implementation state."
```

## 🔧 Build Error Fixing Commands

### Quick Build Error Fix

```bash
"I've got some build errors. Run yarn type-check to see the TypeScript errors, then fix them, and then run yarn build until build passes."
```

### Pre-PR Validation

```bash
"Run yarn pre-pr to validate the build before committing. Fix any TypeScript or build errors that come up."
```

### Alternative Build Commands

- `yarn pre-pr` - Runs type-check + build (fast pre-PR validation)
- `yarn type-check` - TypeScript compilation only  
- `yarn build` - Full build across all packages
- `yarn lint:fix` - Fix linting issues

## 📋 Quick Reference Command Templates

### Analysis Phase

```bash
"New wireframe for [FEATURE]. Create feature structure: mkdir -p docs/features/[feature]/{components,testing}. Create analysis: docs/features/[feature]/analysis.md using mobile-screen-patterns.mdc + wireframe-to-code.mdc + ui-styling-tamagui.mdc rules."
```

### Task Generation Phase

```bash
"Generate tasks: docs/features/[feature]/tasks.md from analysis docs/features/[feature]/analysis.md using tasks-template.md + task-lists.mdc format."
```

### Implementation Phase

```bash
"Implement Phase [N] from docs/features/[feature]/tasks.md. Apply mobile-screen-patterns.mdc + ui-styling-tamagui.mdc + codegen-templates.mdc. Reference docs/features/[feature]/analysis.md."
```

### Validation Phase

```bash
"Validate [feature] against docs/features/[feature]/analysis.md. Check cross-platform parity + mobile optimization + accessibility compliance. Update task status."
```

These standardized commands ensure consistent application of your enhanced
wireframe-to-screen workflow with proper integration of all .cursor/ rules and
quality standards.
