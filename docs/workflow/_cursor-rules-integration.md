# .cursor/ Rules Integration Map for Wireframe-to-Screen Workflow

## 🎯 Automatic Rule Application by Phase

This document maps exactly when and how each .cursor/ rule integrates with the wireframe-to-screen workflow.

## 📋 Phase 1: Wireframe Analysis

### Primary Rules Applied
- **`mobile-screen-patterns.mdc`** → Informs responsive/mobile analysis sections
- **`wireframe-to-code.mdc`** → Provides systematic mapping approach  
- **`ui-styling-tamagui.mdc`** → Guides component mapping decisions

### Integration Points
```bash
# During Visual Analysis Phase:
mobile-screen-patterns.mdc → 
  - Touch target sizing (44px minimum)
  - Safe area handling requirements
  - Mobile-first responsive breakpoints
  - One-handed usage considerations

wireframe-to-code.mdc →
  - Systematic component mapping process
  - Layout structure breakdown
  - Interactive element specification
  - Responsive behavior definition

ui-styling-tamagui.mdc →
  - Component selection (YStack, XStack, Button, etc.)
  - Theme token planning
  - Styling strategy decisions
  - Animation requirements
```

### Command Integration
```bash
"Apply mobile-screen-patterns.mdc during responsive analysis"
"Use wireframe-to-code.mdc for systematic component mapping"  
"Reference ui-styling-tamagui.mdc for Tamagui component decisions"
```

## 🏗️ Phase 2: Task Generation

### Primary Rules Applied
- **`task-lists.mdc`** → Feeds into enhanced task generation format
- **`quality/codegen-templates.mdc`** → Provides mobile templates for planning

### Integration Points
```bash
# During Task List Creation:
task-lists.mdc →
  - Atomic task breakdown structure
  - Platform tagging [Web], [Native], [Both]
  - Effort estimation [S/M/L]
  - Progress tracking methodology

quality/codegen-templates.mdc →
  - Mobile screen template planning
  - Component template selection
  - Form template requirements
  - List item template needs
```

### Command Integration
```bash
"Following task-lists.mdc format"
"Reference codegen-templates.mdc mobile templates for planning"
```

## 🚀 Phase 3: Implementation Execution

### Phase 3A: Mobile Foundation
```bash
# Rules Applied:
mobile-screen-patterns.mdc →
  - Safe area handling implementation
  - Touch optimization patterns
  - Mobile layout structure
  - Responsive design implementation

ui-styling-tamagui.mdc →
  - Theme token usage
  - Component styling
  - Responsive breakpoints
  - Animation implementation

wireframe-to-code.mdc →
  - Component creation patterns
  - Layout implementation
  - Interactive element creation

quality/codegen-templates.mdc →
  - Mobile screen template usage
  - Component scaffolding
  - TypeScript interface creation
```

### Phase 3B: Interactive Elements
```bash
# Rules Applied:
mobile-screen-patterns.mdc →
  - Touch interaction patterns
  - Gesture handling
  - Keyboard avoidance
  - Form optimization

features/navigation-expo-router.mdc →
  - Navigation implementation
  - Link component usage
  - Route parameter handling
  - Cross-platform navigation

ui-styling-tamagui.mdc →
  - Interactive states
  - Animation patterns
  - Touch feedback styling
```

### Phase 3C: Data Integration
```bash
# Rules Applied:
features/data-state-management.mdc →
  - TanStack Query implementation
  - Zustand store setup
  - State management patterns
  - Error handling

backend/supabase-database.mdc →
  - Database schema creation
  - RLS policy implementation
  - Migration management

backend/supabase-backend.mdc →
  - API integration patterns
  - Edge function usage
  - Authentication integration
```

### Phase 3D: Screen Integration
```bash
# Rules Applied:
features/navigation-expo-router.mdc →
  - Cross-platform routing
  - Screen component integration
  - Deep linking setup

ui/platform-specific.mdc →
  - Platform adaptations
  - Web vs native differences
  - Platform-specific optimizations
```

### Phase 3E: Platform Optimization
```bash
# Rules Applied:
quality/performance.mdc →
  - Performance optimization
  - Bundle size management
  - Memory optimization
  - Render performance

ui/platform-specific.mdc →
  - Platform-specific enhancements
  - iOS/Android adaptations
  - Web-specific features

quality/accessibility-wcag.mdc →
  - Accessibility compliance
  - Screen reader support
  - Keyboard navigation
  - ARIA implementation
```

### Phase 3F: Quality Assurance
```bash
# Rules Applied:
quality/testing-unified.mdc →
  - Testing strategy implementation
  - Unit test creation
  - Integration test setup
  - E2E test implementation

quality/storybook.mdc →
  - Component documentation
  - Story creation
  - Visual testing setup

quality/debugging.mdc →
  - Systematic debugging
  - Error handling
  - Performance debugging
```

## 📊 Phase 4: Cross-Platform Validation

### Primary Rules Applied
- **`ui/platform-specific.mdc`** → Platform parity validation
- **`mobile-screen-patterns.mdc`** → Mobile optimization validation
- **`quality/performance.mdc`** → Performance validation

### Integration Points
```bash
# During Validation:
ui/platform-specific.mdc →
  - Cross-platform consistency checks
  - Platform-appropriate adaptations
  - Feature parity validation

mobile-screen-patterns.mdc →
  - Touch target validation
  - Safe area testing
  - Mobile performance checks
  - One-handed usage validation

quality/performance.mdc →
  - Performance benchmarking
  - Bundle size validation
  - Memory usage testing
  - Network resilience testing
```

## 🔄 Phase 5: Quality Assurance Pipeline

### Primary Rules Applied
- **`quality/testing-unified.mdc`** → Comprehensive testing
- **`quality/accessibility-wcag.mdc`** → Accessibility validation
- **`quality/performance.mdc`** → Performance validation

### Integration Points
```bash
# During Quality Assurance:
quality/testing-unified.mdc →
  - Test execution strategy
  - Coverage requirements
  - Cross-platform testing
  - Regression testing

quality/accessibility-wcag.mdc →
  - WCAG 2.2 AA compliance
  - Screen reader testing
  - Keyboard navigation testing
  - Color contrast validation

quality/performance.mdc →
  - Performance benchmarking
  - Optimization validation
  - Mobile performance testing
```

## 🔧 Rule Application Commands by Phase

### Analysis Phase Commands
```bash
# Visual Analysis with Mobile Focus
"Apply mobile-screen-patterns.mdc rules during wireframe analysis:
- Identify touch targets requiring 44px minimum
- Plan safe area handling for notched devices
- Map responsive breakpoints with mobile-first approach
- Consider one-handed usage patterns"

# Component Mapping
"Use wireframe-to-code.mdc for systematic component mapping:
- Map each wireframe element to specific Tamagui components
- Define component hierarchy and relationships
- Plan interactive element specifications
- Document responsive behavior requirements"

# Styling Strategy
"Reference ui-styling-tamagui.mdc for component decisions:
- Select appropriate Tamagui components
- Plan theme token usage
- Define styling strategy and animations
- Consider cross-platform styling needs"
```

### Implementation Phase Commands
```bash
# Foundation Implementation
"Apply mobile-screen-patterns.mdc + ui-styling-tamagui.mdc + wireframe-to-code.mdc:
- Implement safe area handling with useSafeAreaInsets
- Create mobile-first responsive layout
- Apply theme tokens consistently
- Follow systematic component creation patterns"

# Data Integration
"Apply features/data-state-management.mdc + backend/supabase-database.mdc:
- Implement TanStack Query hooks for server state
- Setup Zustand stores for global state
- Create Supabase tables with RLS policies
- Add proper error handling and loading states"

# Navigation Integration  
"Apply features/navigation-expo-router.mdc + ui/platform-specific.mdc:
- Implement cross-platform navigation patterns
- Add platform-specific adaptations
- Setup deep linking and URL handling
- Ensure navigation parity across platforms"
```

### Quality Assurance Commands
```bash
# Testing Implementation
"Apply quality/testing-unified.mdc + quality/storybook.mdc:
- Create comprehensive test suite (unit + integration + E2E)
- Build Storybook stories for all component states
- Implement cross-platform testing strategy
- Add visual regression testing"

# Performance Validation
"Apply quality/performance.mdc + mobile-screen-patterns.mdc:
- Validate performance benchmarks on mobile devices
- Test bundle size and loading performance
- Verify touch target and interaction performance
- Confirm memory usage within acceptable limits"

# Accessibility Validation
"Apply quality/accessibility-wcag.mdc:
- Validate WCAG 2.2 AA compliance
- Test screen reader compatibility
- Verify keyboard navigation functionality
- Confirm color contrast requirements met"
```

## 📋 Rule Priority Matrix

### High Priority (Always Applied)
- `mobile-screen-patterns.mdc` → Mobile-first approach
- `ui-styling-tamagui.mdc` → Component and styling consistency
- `task-lists.mdc` → Task management and tracking

### Medium Priority (Phase-Specific)
- `wireframe-to-code.mdc` → Analysis and mapping phases
- `features/navigation-expo-router.mdc` → Navigation implementation
- `features/data-state-management.mdc` → Data integration
- `quality/testing-unified.mdc` → Testing phases

### Context-Specific (As Needed)
- `backend/supabase-database.mdc` → Database implementation
- `quality/performance.mdc` → Performance optimization
- `quality/accessibility-wcag.mdc` → Accessibility compliance
- `ui/platform-specific.mdc` → Platform adaptations

## 🎯 Integration Validation Checklist

### Analysis Phase ✅
- [ ] mobile-screen-patterns.mdc applied to responsive analysis
- [ ] wireframe-to-code.mdc used for component mapping
- [ ] ui-styling-tamagui.mdc referenced for styling decisions

### Implementation Phase ✅
- [ ] Appropriate rules applied for each implementation phase
- [ ] Cross-platform considerations addressed
- [ ] Mobile-first approach maintained throughout

### Quality Assurance Phase ✅
- [ ] Testing rules applied comprehensively
- [ ] Performance rules validated
- [ ] Accessibility rules confirmed
- [ ] Platform-specific rules verified

This integration map ensures systematic application of all relevant .cursor/ rules throughout the wireframe-to-screen workflow, maintaining consistency and quality standards.
