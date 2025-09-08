# Wireframe-to-Screen Analyzer

## 🎯 Complete Step-by-Step Custom Mode

This document provides the comprehensive description for analyzing wireframes for production-ready cross-platform Tamagui screens.

## 📋 Phase 1: Initial Wireframe Analysis

### Command 1A: Generate Comprehensive Analysis

```bash
# Command to start wireframe analysis:
"
Based on completed wireframe analysis in docs/features/[feature-name]/analysis.md:

## Required Document References:
1. Review User Stories: docs/spec/user_stories/P0/[feature].md for acceptance criteria
2. Review Wireframes: docs/spec/wireframes/P0/[feature].png for UI, layout, and flow

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

Generate tasks with [Web], [Native], [Both] platform tags and [S/M/L] effort estimates.

Ask clarifying questions if any analysis section needs more information before proceeding.
"
```


### Command 1B: Validate Analysis Against User Stories and Wireframes

```bash
"
Validate generated task list docs/features/[feature-name]/tasks.md against analysis:

1. Ensure all wireframe elements from analysis are covered in tasks
2. Verify technical requirements are addressed in implementation phases
3. Confirm cross-platform considerations are included
4. Check that mobile-first approach is reflected in task ordering
5. Validate testing pipeline covers all analysis requirements

Reference: docs/features/[feature-name]/analysis.md for validation.
"
```