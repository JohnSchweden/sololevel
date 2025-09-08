# Wireframe-to-Screen Analyzer

## 🎯 Complete Step-by-Step Custom Mode

This document provides the comprehensive description for analyzing wireframes for production-ready cross-platform Tamagui screens.

## 📋 Phase 1: Initial Wireframe Analysis

### Command 1A: Generate Comprehensive Analysis

```bash
# Command to start wireframe analysis:
"
New wireframe received for [FeatureName]. Before implementation:

## Required Document References:
1. Review PRD: docs/spec/1_PRD.md for business context and requirements
2. Review TRD: docs/spec/2_TRD.md for technical architecture and constraints  
3. Review User Stories: docs/spec/user_stories/P0/[feature].md for acceptance criteria
4. Review Wireframes: docs/spec/wireframes/P0/[feature].png for UI, layout, and flow

## Setup & Analysis:
1. Create feature directory: mkdir -p docs/features/[feature-name]/{components,testing}
2. Create analysis using template: docs/features/[feature-name]/analysis.md
3. Apply mobile-screen-patterns.mdc rules during responsive analysis
4. Use wireframe-to-code.mdc for systematic component mapping
5. Reference ui-styling-tamagui.mdc for Tamagui component decisions
6. Cross-reference with PRD/TRD requirements, user story acceptance criteria, and wireframe layout
7. Validate all technical requirements before task generation

Complete wireframe analysis systematically:

**Visual Analysis Phase:**
- Map layout structure to Tamagui components (YStack, XStack, ScrollView)
- Identify responsive breakpoints (mobile-first approach)
- Document interactive elements with 44px touch target requirements
- Plan navigation patterns using Expo Router

**Technical Requirements Phase (Cross-reference with TRD):**  
- Validate against TRD architecture: Supabase backend, Edge Functions, AI pipeline
- Define required database schema additions/modifications per TRD schema
- Plan state management (Zustand global + TanStack Query server state) per TRD patterns
- Identify platform-specific requirements (native vs web) against TRD tech stack
- Document performance requirements (< 10s analysis, < 3s launch per TRD)
- Validate security requirements (RLS, signed URLs, auth patterns per TRD)

**Component Architecture Phase:**
- Design component hierarchy and props interfaces per TRD component patterns
- Plan styling strategy with Tamagui theme tokens per TRD UI specifications
- Define testing strategy (unit + integration + E2E) per TRD testing approach
- Map components to existing packages/ui structure per TRD monorepo architecture

**User Story and Wireframe Compliance (Cross-reference with User Stories and Wireframes):**
- Map wireframe elements to specific user story acceptance criteria
- Identify missing user story coverage for wireframe elements
- Validate interaction patterns match user story expected behaviors
- Document accessibility requirements from user story non-functional requirements

Ask clarifying questions if any analysis section needs more information before proceeding.
Only stop after ALL analysis sections are complete and cross-referenced with PRD/TRD/User Stories/Wireframe.
"
```


### Command 1B: Validate Analysis Against User Stories and Wireframes

```bash
"
Validate generated analysis docs/features/[feature-name]/analysis.md against wireframe features and user stories:

1. Ensure all wireframe elements and user stories are covered in analysis
2. Verify technical requirements are addressed
3. Confirm cross-platform considerations are included
4. Check that mobile-first responsive approach is reflected 
5. Validate testing pipeline covers all analysis requirements
"
```