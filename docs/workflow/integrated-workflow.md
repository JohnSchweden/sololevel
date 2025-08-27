# Integrated Wireframe-to-Screen Workflow

## 🎯 Complete Step-by-Step Implementation Process

This document provides the comprehensive workflow for transforming wireframes
into production-ready cross-platform Tamagui screens.

## 📋 Phase 1: Initial Wireframe Analysis

### Step 1: Create Project-Specific Analysis

```bash
# Command to start wireframe analysis:
"New wireframe received for [FeatureName]. Before implementation:

1. Create feature directory: mkdir -p docs/features/[feature-name]/{components,testing}
2. Save wireframe image as: docs/features/[feature-name]/wireframe.png
3. Create analysis using template: docs/features/[feature-name]/analysis.md  
3. Apply mobile-screen-patterns.mdc rules during responsive analysis
4. Use wireframe-to-code.mdc for systematic component mapping
5. Reference ui-styling-tamagui.mdc for Tamagui component decisions
6. Validate all technical requirements before task generation

Only proceed to task generation after analysis is complete and all sections checked off."
```

### Step 2: Systematic Analysis Process

```bash
# Use this structured approach:
"Complete wireframe analysis systematically:

**Visual Analysis Phase:**
- Map layout structure to Tamagui components (YStack, XStack, ScrollView)
- Identify responsive breakpoints (mobile-first approach)
- Document interactive elements with 44px touch target requirements
- Plan navigation patterns using Expo Router

**Technical Requirements Phase:**  
- Define Supabase schema and API endpoints needed
- Plan state management (Zustand global + TanStack Query server state)
- Identify platform-specific requirements (native vs web)
- Document performance and accessibility requirements

**Component Architecture Phase:**
- Design component hierarchy and props interfaces
- Plan styling strategy with theme tokens
- Define testing strategy (unit + integration + E2E)

Ask clarifying questions if any analysis section needs more information."
```

## 🏗️ Phase 2: Enhanced Task Generation

### Step 3: Create Comprehensive Task List

```bash
# Command for task list generation:
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

## 🚀 Phase 3: Implementation Execution

### Step 4: Phase-by-Phase Implementation

```bash
# Command for each implementation phase:
"Implement Phase [N] tasks from docs/features/[feature-name]/tasks.md with mobile-first approach:

**Apply These Rules:**
- mobile-screen-patterns.mdc: Touch optimization, safe areas, gestures
- ui-styling-tamagui.mdc: Responsive design, theme tokens, animations
- wireframe-to-code.mdc: Systematic component creation patterns
- codegen-templates.mdc: Use mobile templates for scaffolding

**Quality Standards:**
- Test on mobile viewport sizes (375px, 414px, 390px widths)
- Ensure 44px minimum touch targets
- Implement proper safe area handling
- Add accessibility labels and navigation support

**Progress Tracking:**
- Update task status as you complete each item
- Move completed tasks to 'Completed Tasks' section immediately
- Document any blockers or changes needed
- Ask before moving to next phase

Reference original analysis: docs/features/[feature-name]/analysis.md"
```

### Step 5: Cross-Platform Validation

```bash
# Command for platform parity validation:
"Validate cross-platform implementation:

**Visual Parity Check:**
- Web and native render identically
- Responsive breakpoints work consistently  
- Theme tokens applied uniformly
- Typography hierarchy matches wireframe

**Interaction Parity Check:**
- Touch/click feedback consistent across platforms
- Navigation patterns work on both web and native
- Form interactions behave identically
- Gesture support appropriate for each platform

**Performance Validation:**
- Bundle size within mobile-first targets
- Render performance < 100ms on mid-range devices
- Memory usage acceptable for image-heavy screens
- Network resilience tested under poor conditions

Update task list with validation results."
```

## 📊 Phase 4: Quality Assurance Pipeline

### Step 6: Mobile-Specific Testing

```bash
# Command for comprehensive mobile testing:
"Execute mobile-focused quality assurance:

**Device Testing:**
- iOS: Test on various screen sizes, notched devices, iPad
- Android: Test different manufacturers, Android versions
- Accessibility: VoiceOver, TalkBack, keyboard navigation

**Performance Testing:**
- Bundle size analysis for mobile networks
- Render performance profiling on lower-end devices  
- Memory usage testing for image-heavy screens
- Network failure handling and offline functionality

**Quality Metrics Validation:**
- Touch target minimum 44px verified ✅
- Safe area handling tested on notched devices ✅
- Loading states under 3G network conditions ✅
- Error states with actionable recovery options ✅
- Cross-platform visual consistency validated ✅

Document results and update task completion status."
```

## 🔗 Integration Points with .cursor/ Rules

### Automatic Rule Application

The workflow automatically integrates these rules at specific phases:

#### **Phase 1: Analysis**

- **`mobile-screen-patterns.mdc`** → Informs responsive/mobile analysis sections
- **`wireframe-to-code.mdc`** → Provides systematic mapping approach
- **`ui-styling-tamagui.mdc`** → Guides component mapping decisions

#### **Phase 2: Task Generation**

- **`task-lists.mdc`** → Feeds into enhanced task generation format
- **`quality/codegen-templates.mdc`** → Provides mobile templates for planning

#### **Phase 3: Implementation**

- **`features/navigation-expo-router.mdc`** → Navigation implementation patterns
- **`features/data-state-management.mdc`** → State management integration
- **`backend/supabase-database.mdc`** → Database schema implementation

#### **Phase 4: Quality Assurance**

- **`quality/testing-unified.mdc`** → Testing strategy and execution
- **`quality/performance.mdc`** → Performance optimization patterns
- **`quality/storybook.mdc`** → Component documentation requirements

## 📁 File Structure Integration

### Analysis Files Reference Implementation Tasks

```markdown
# Example task list header with analysis reference:

# User Profile Screen Implementation

## Context & Analysis

- **Wireframe Image**: docs/features/user-profile/wireframe.png ✅
- **Wireframe Analysis**: docs/features/user-profile/analysis.md ✅
- **Technical Requirements**: Documented and validated ✅
- **Cross-Platform Considerations**: Mobile-first approach confirmed ✅

## Completed Tasks

- [x] Complete systematic wireframe analysis [Both]
- [x] Create comprehensive task breakdown [Both] ...
```

### Directory Structure

```
docs/
├── features/                          # Feature-based organization
│   ├── user-profile/                  # All user profile related docs
│   │   ├── wireframe.png              # Original wireframe image
│   │   ├── analysis.md                # Wireframe analysis document
│   │   ├── tasks.md                   # Implementation tasks
│   │   ├── components/                # Component documentation
│   │   │   ├── ProfileHeader.md       # Component-specific docs
│   │   │   └── ProfileCard.md
│   │   └── testing/                   # Testing documentation
│   │       ├── test-cases.md
│   │       └── performance.md
│   ├── dashboard/                     # Dashboard feature docs
│   └── onboarding/                    # Onboarding feature docs
├── templates/                         # Reusable templates
│   ├── analysis-template.md           # Template for analysis
│   └── tasks-template.md              # Template for tasks
└── workflow/                          # Workflow documentation
    ├── integrated-workflow.md         # Process documentation
    ├── commands.md                    # Command reference
    └── cursor-rules-integration.md    # Rule integration map
```

## 🎯 Standardized Commands Reference

### **Initial Analysis Command**

```bash
"New wireframe for [FeatureName]. Create feature directory: mkdir -p docs/features/[feature-name]/{components,testing}. Create systematic analysis using docs/templates/analysis-template.md, save as docs/features/[feature-name]/analysis.md. Apply mobile-screen-patterns.mdc and wireframe-to-code.mdc rules. Ask clarifying questions based on analysis gaps."
```

### **Task Generation Command**

```bash
"Based on completed analysis docs/features/[feature-name]/analysis.md, create comprehensive task list using docs/templates/tasks-template.md template. Save as docs/features/[feature-name]/tasks.md with mobile-first 6-phase approach."
```

### **Implementation Command**

```bash
"Implement Phase [N] from docs/features/[feature-name]/tasks.md. Apply mobile-screen-patterns.mdc, ui-styling-tamagui.mdc, and codegen-templates.mdc. Reference analysis docs/features/[feature-name]/analysis.md. Update task progress immediately."
```

### **Validation Command**

```bash
"Validate implementation against docs/features/[feature-name]/analysis.md requirements. Check cross-platform parity, mobile optimization, accessibility compliance. Update task completion status."
```

## ✅ Quality Gates Checklist

Before marking any phase complete:

### **Analysis Phase Complete**

- [ ] All wireframe analysis sections completed
- [ ] Technical requirements validated
- [ ] Cross-platform considerations documented
- [ ] Performance and accessibility requirements defined
- [ ] Analysis file saved in docs/analysis/

### **Task Generation Complete**

- [ ] Comprehensive task list created
- [ ] Analysis file referenced in task context
- [ ] Mobile-first 6-phase approach applied
- [ ] Platform tags and effort estimates included
- [ ] Testing pipeline defined

### **Implementation Phase Complete**

- [ ] All phase tasks completed and marked
- [ ] Code follows mobile-first principles
- [ ] Cross-platform parity validated
- [ ] Performance benchmarks met
- [ ] Accessibility requirements satisfied

### **Final Quality Assurance Complete**

- [ ] Device testing completed across platforms
- [ ] Performance testing passed
- [ ] Accessibility audit passed
- [ ] Documentation updated
- [ ] Analysis and task files archived for reference

## 🔄 Continuous Integration

### Analysis Updates

```bash
# When requirements change:
"Wireframe requirements updated. Update docs/features/[feature-name]/analysis.md with changes, then update corresponding task list docs/features/[feature-name]/tasks.md to reflect new requirements."
```

### Task List Maintenance

```bash
# Regular progress updates:
"Update task progress in docs/features/[feature-name]/tasks.md. Move completed items to 'Completed Tasks' section. Document any blockers or requirement changes. Reference analysis file for validation."
```

This integrated workflow ensures systematic, mobile-first, cross-platform screen
development with comprehensive quality assurance and proper documentation
throughout the entire process.
