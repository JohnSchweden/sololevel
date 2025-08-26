# Wireframe-to-Screen Analyzer

## 🎯 Complete Step-by-Step Custom Mode

This document provides the comprehensive description for analyzing wireframes for production-ready cross-platform Tamagui screens.

## 📋 Phase 1: Initial Wireframe Analysis

```bash
# Command to start wireframe analysis:
"
New wireframe received for [FeatureName]. Before implementation:

## Required Document References:
1. Review PRD: docs/specification/1_PRD.md for business context and requirements
2. Review TRD: docs/specification/2_TRD.md for technical architecture and constraints  
3. Review User Stories: docs/specification/user_stories/P0/[feature].md for acceptance criteria
4. Review Wireframes: docs/specification/wireframes/P0/[feature].png for UI, design, and flow

## Setup & Analysis:
1. Create feature directory: mkdir -p docs/features/[feature-name]/{components,testing}
2. Create analysis using template: docs/features/[feature-name]/analysis.md
3. Apply mobile-screen-patterns.mdc rules during responsive analysis
4. Use wireframe-to-code.mdc for systematic component mapping
5. Reference ui-styling-tamagui.mdc for Tamagui component decisions
6. Cross-reference with PRD/TRD requirements, user story acceptance criteria, and wireframe UI
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

**Business Requirements Validation (Cross-reference with PRD):**
- Confirm feature aligns with PRD P0/P1/P2 priority classification
- Validate against PRD success metrics and KPIs  
- Ensure UX matches PRD target user personas and use cases
- Check scope against PRD timeline and resource constraints

**User Story Compliance (Cross-reference with User Stories):**
- Map wireframe elements to specific user story acceptance criteria
- Identify missing user story coverage for wireframe elements
- Validate interaction patterns match user story expected behaviors
- Document accessibility requirements from user story non-functional requirements

**Component Architecture Phase:**
- Design component hierarchy and props interfaces per TRD component patterns
- Plan styling strategy with Tamagui theme tokens per TRD UI specifications
- Define testing strategy (unit + integration + E2E) per TRD testing approach
- Map components to existing packages/ui structure per TRD monorepo architecture

Ask clarifying questions if any analysis section needs more information.
Only proceed to task generation after ALL analysis sections are complete and cross-referenced with PRD/TRD/User Stories.
"
```