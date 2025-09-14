# Specification Process Overview

1. ⁠PRD
2. TRD
3. ⁠⁠User stories + Wireframes
4. ⁠Prioritization (MVP (P0), v2 (P1))
5. ⁠Detailed Technical Analysis / per  Wireframes connected to user stories
6. ⁠Task-List ⁠based plan for implementation







## Prompts

### Single Wireframe -> component-based User Stories

*AI Model: claude-4-sonnet (Thinking)*

*Proceeed per single wire frame*

```bash
"
1. Read my rules and this mode @designer.md
2. Read these user stories @03e_feedback_video_insights.md 
3. Analyse this wireframe @03e_video_feedback_insights.png 
4. Create new file in the folder @P0/ 
5. Create component-based User Stories with clear dependencies on other components,
isolated functionality, and testing scope with the same format as in @tasks.md for each Wireframe.
"
```

### User Stories per Wireframe -> All User Stories & Wireframes (Screen/Feature with multiple components)

*AI Model: claude-4-sonnet (Thinking)*

```bash
"
Merge the component-based User stories for the single wireframes into one coherent document for the future Screen (Feature with multiple components).
"
```

### All User Stories & Wireframes -> Domain-focused Analysis (UI, Feature, Backend, Platform)

*AI Model: claude-4-sonnet (Thinking)*

#### Command 1A: Generate UI/UX Analysis

```bash
# Command to start UI/UX wireframe analysis:
"
New wireframes received for [FeatureName] UI/UX wireframe analysis. 
Before implementation, analyze the visual design and user interactions.

## *Required Documents to process:*
1. Read User Stories: @user_stories/P0/[feature].md for UI requirements
2. Read and parse Mermaid-Diagram: @user-interaction-flow.mermaid for User Interaction Flow
3. Analyze the Wireframe at: @wireframes/P0/[feature].png for visual layout
4. Reference @ui/theming.mdc for Tamagui theme tokens and color systems
5. Reference @ui/responsive.mdc for mobile-first breakpoint patterns
6. Reference @ui/mobile-ux.mdc for touch interactions and native feel
7. Reference @ui/platform-differences.mdc for web vs native implementations
8. Reference @quality/wireframe-to-code.mdc for systematic mapping

## Setup & Analysis:
1. Create feature directory: mkdir -p docs/features/[feature-name]/
2. Copy template: cp @templates/analysis-ui.md docs/features/[feature-name]/analysis-ui.md
3. Complete UI/UX analysis using the template

**Focus Areas for UI Analysis:**
- Visual component mapping to Tamagui components (YStack, XStack, Button, etc.)
- Layout structure with exact container hierarchy
- Interactive elements with 44px touch target requirements
- Responsive breakpoints (mobile-first approach)
- Animation and micro-interaction requirements
- Accessibility compliance (WCAG 2.2 AA)
- Cross-platform visual parity (native vs web)
- Theme token usage and design system integration

**Test-Driven UI Requirements:**
- Component rendering tests for all states
- User interaction tests for all touch/click events
- Visual regression tests for cross-platform consistency
- Accessibility tests for screen reader and keyboard navigation

Cross-reference with wireframes for exact visual specifications.
Complete ALL UI analysis sections before proceeding to other domain analyses.
"
```

#### Command 1B: Generate Feature Logic Analysis

```bash
# Command to start feature logic analysis:
"
Continue with [FeatureName] feature logic analysis.
Focus on business logic, state management, and user flows.

## *Required Documents to process:*
1. Read docs/features/[feature-name]/analysis-ui.md for UI integration points
2. Read User Stories: @user_stories/P0/[feature].md for business requirements
3. Read and parse Mermaid-Diagram: @architecture.mermaid for System Architecture
4. Read TRD: @TRD.md for state management patterns
5. Reference @features/data-state-management.mdc for Zustand/TanStack Query patterns

## Setup & Analysis:
1. Copy template: cp @templates/analysis-feature.md docs/features/[feature-name]/analysis-feature.md
2. Complete feature logic analysis using the template

**Focus Areas for Feature Analysis:**
- User flow mapping from wireframes to implementation
- Zustand store design with state transitions
- TanStack Query integration for server state
- Form state management and validation
- Error handling and recovery flows
- Business rule validation and constraints
- Performance optimization (memoization, debouncing)
- Cross-platform logic consistency

**Test-Driven Feature Requirements:**
- User flow tests for complete journeys
- State management tests for all transitions
- Business rule tests for domain logic validation
- Error handling tests for all failure scenarios
- Integration tests for component coordination

Cross-reference with analysis-ui.md for component integration requirements.
Complete ALL feature logic sections before proceeding.
"
```

#### Command 1C: Generate Backend Integration Analysis

```bash
# Command to start backend integration analysis:
"
Continue with [FeatureName] backend integration analysis.
Focus on Supabase integration, AI pipeline, and data flow.

## *Required Documents to process:*
1. Read docs/features/[feature-name]/analysis-feature.md for data requirements
2. Read TRD: @TRD.md for backend architecture
3. Read docs/spec/architecture.mermaid for system architecture
4. Reference @backend/supabase-backend.mdc for Edge Functions patterns
5. Reference @backend/supabase-database.mdc for schema patterns

## Setup & Analysis:
1. Copy template: cp @templates/analysis-backend.md docs/features/[feature-name]/analysis-backend.md
2. Complete backend integration analysis using the template

**Focus Areas for Backend Analysis:**
- Database schema design with RLS policies
- Supabase Storage strategy for files and assets
- Edge Functions for AI pipeline integration
- Real-time subscriptions for live updates
- API contract definitions with error handling
- Security validation and authentication
- Performance optimization and caching
- AI pipeline integration (pose detection, LLM, TTS)

**Test-Driven Backend Requirements:**
- Database schema and RLS policy tests
- API contract tests with request/response validation
- Edge Function execution and error handling tests
- Real-time subscription and synchronization tests
- AI pipeline integration and quality tests

Cross-reference with analysis-feature.md for business logic integration.
Complete ALL backend integration sections before proceeding.
"
```

#### Command 1D: Generate Cross-Platform Analysis

```bash
# Command to start cross-platform analysis:
"
Complete [FeatureName] cross-platform analysis.
Focus on native vs web differences and deployment considerations.

## *Required Documents to process:*
1. Read all previous analyses: analysis-ui.md, analysis-feature.md, analysis-backend.md
2. Read TRD: @TRD.md for platform architecture
3. Reference @ui/platform-differences.mdc for platform-specific patterns
4. Reference @core/development-operations.mdc for build and deployment

## Setup & Analysis:
1. Copy template: cp @templates/analysis-platform.md docs/features/[feature-name]/analysis-platform.md
2. Complete cross-platform analysis using the template

**Focus Areas for Platform Analysis:**
- Platform-specific implementations (native vs web)
- Expo configuration for native features
- Next.js configuration for web optimization
- Component abstraction strategies
- Build and deployment configurations
- Performance parity across platforms
- Platform-specific API integrations
- CI/CD pipeline considerations

**Test-Driven Platform Requirements:**
- Platform parity tests for identical behavior
- Platform-specific API integration tests
- Build and deployment validation tests
- Performance benchmarking across platforms
- Cross-platform navigation and routing tests

Cross-reference with all previous analyses for complete feature coverage.
Validate that ALL four analyses work together cohesively.
"
```

#### Command 1E: Visual UI/UX Analysis

```bash
# Command to start cross-platform analysis:
"
Analyze @wireframe.png using the @wireframe-to-code.mdc rule. Provide:

1. Layout Structure Analysis:
   - Root container breakdown
   - Header/content/footer sections
   - Spacing and alignment specifications

2. Component Mapping:
   - Each UI element → Tamagui component
   - Props interface requirements
   - State management needs

3. Interactive Elements:
   - Touch targets (44px minimum)
   - Gesture specifications
   - Navigation patterns

4. Test Scenarios:
   - User interaction tests
   - Component contract tests
   - Accessibility test cases

Follow the TDD approach from the analysis template.
"
```

#### Command 1F: Merge Visual UI/UX Analysis with User Story UI/UX Analysis

```bash
# Command to start cross-platform analysis:
"
all these 5 Wireframes are part of one screen.
summerize and create one aligned output for the Video Analysis & Feedback System screen.

Here is the created UI analysis based on the user stories @analysis-ui.md 
update and extend with your wireframe analysis for the Video Analysis & Feedback System screen.
"
```

### User Stories & Analysis -> Tasks and Status

*AI Model: claude-4-sonnet (Thinking)*

```bash
# HINT: Step 3 is validation of already existing code. 
# For new code moving user stories to general tasks.md can be done manually.
"
1. Read and follow:
 - my rules
 - @analysis.md
 - @designer.md
2. Analyze this wireframe for [the recording state] @01b_recording.png 
3. Add User stories from @01b_recording.md to tasks @tasks.md following same format.
4. Analyze and validate the user stories against my implemented code.
5. Update project status with the state of the user stories in @status.md .
"
```

*AI Model: gpt-5 (Thinking)*

```bash
# Validation
"
1. Read @designer.md 
2. analyze @tasks.md ,  @status.md , and the wireframe @01b_recording.png 
3. validate against the implemented code and update the status.
"
```

### Tasks & Status -> Code

```bash
"
Following @developer.md and TDD methodology lets continue implementing [Userstory]
"
```


### Local Machine -> Remote Github

```bash
"
1. Review the current changes and suggest a commit strategy based on @core/github-integration.mdc.
2. Proceed with a fast forward merge.
"
```
