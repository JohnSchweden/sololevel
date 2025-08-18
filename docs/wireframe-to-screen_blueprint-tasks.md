# Integrated Planner Mode + Task List Workflow

## Enhanced Planner Mode Prompt

```
Planner Mode + Task Generation

I need to implement [feature/screen/component] based on [wireframe/requirements]. 

Please:
1. Analyze the requirements and existing code to map the full scope
2. Ask 4-6 clarifying questions based on your findings
3. Create a comprehensive plan following our monorepo rules
4. Generate a detailed task list in docs/tasks/[feature-name].md following our task-lists.mdc format and the feature-implementation.md template

The task list should include:
- Atomic tasks with platform tags [Web], [Native], [Both]
- Effort estimates [S/M/L] 
- Testing pipeline tasks
- Dependencies between tasks clearly marked
- Relevant files section with current status

After creating the plan and task list, ask for approval before implementing.
```

## Task List Integration Patterns

### Pattern 1: Feature Development
```markdown
# [Feature] Implementation Tasks

## Completed Tasks
- [x] Requirements analysis and planning [Both]
- [x] Create task breakdown in docs/tasks/feature-name.md [Both]

## In Progress Tasks
- [ ] Implement core Tamagui component structure [Both] [M]
  - Next: Define component props interface
  - File: packages/ui/components/FeatureName.tsx

## Future Tasks

### Phase 1: Foundation [Both]
- [ ] Setup TypeScript interfaces and types [Both] [S]
- [ ] Create Zod validation schemas [Both] [S]  
- [ ] Implement basic Tamagui component layout [Both] [M]

### Phase 2: Data Integration [Both]
- [ ] Create TanStack Query hooks [Both] [M]
- [ ] Setup Supabase database tables/RLS [Both] [L]
- [ ] Implement Zustand store updates [Both] [S]

### Phase 3: Platform Optimization
- [ ] Add web-specific keyboard navigation [Web] [S]
- [ ] Implement native gesture handling [Native] [M]
- [ ] Optimize performance with React.memo [Both] [S]

### Phase 4: Quality Assurance
- [ ] Unit tests with Vitest [Both] [M]
- [ ] Component tests with RTL [Both] [M]
- [ ] E2E tests (Detox + Playwright) [Both] [L]

## Testing Pipeline
- [ ] TypeScript checks passing
- [ ] Unit tests passing (packages/ui/components/Feature.test.tsx)
- [ ] Component integration tests (packages/app/features/Feature.test.tsx)
- [ ] E2E Native (e2e/Feature.test.ts) 
- [ ] E2E Web (tests/Feature.spec.ts)
- [ ] Cross-platform visual regression tests

## Relevant Files
- `docs/tasks/feature-name.md` — This task list [x]
- `packages/ui/components/FeatureName.tsx` — UI component [ ]
- `packages/app/features/Feature/FeatureScreen.tsx` — Screen implementation [ ]
- `packages/api/hooks/useFeature.ts` — Data hooks [ ]
- `supabase/migrations/xxx_feature_tables.sql` — Database schema [ ]
```

## Execution Workflow Commands

### Initial Planning
```
Based on this wireframe [attach image], use Planner Mode to:
1. Analyze all UI elements and map to Tamagui components
2. Identify data requirements and Supabase schema needs  
3. Plan cross-platform considerations
4. Generate tasks in docs/tasks/[feature].md following task-lists.mdc
5. Ask clarifying questions before implementation
```

### Phase Implementation  
```
Implement Phase 1 tasks from docs/tasks/[feature].md:
- Follow all monorepo rules (reference specific .mdc files as needed)
- Update task status as you complete each item
- Move completed tasks to "Completed Tasks" section immediately
- Test each component as you build it
- Ask before moving to next phase
```

### Quality Gates
```
Debugger Mode

Before marking Phase [X] complete:
1. Run yarn type-check for TypeScript validation
2. Run yarn test for unit/integration tests  
3. Test on both platforms (web + native)
4. Check for console errors/warnings
5. Validate against wireframe requirements
6. Update task list with current status

Report any issues found and implement fixes.
```

## Wireframe Analysis Framework

### UI Component Mapping
```
Analyze this wireframe and map each element to:

**Layout Components:**
- Tamagui Stack components (YStack, XStack, ZStack)
- ScrollView for long content
- SafeAreaView for mobile considerations

**Interactive Elements:**  
- Button variants (primary, secondary, ghost)
- Input/TextArea with proper validation
- Select/Dropdown components
- Toggle/Switch elements

**Display Components:**
- Text with typography tokens
- Image with SolitoImage
- Icon with Lucide React
- Card/Sheet components for grouped content

**Navigation Elements:**
- Solito Link components
- Header navigation patterns
- Tab/drawer integration points

For each element, specify:
- Tamagui component name
- Required props and styling tokens
- Platform-specific considerations
- Data binding requirements
```

## Progress Tracking Integration

### Daily Standup Format
```
Quick status update on [feature] implementation:

**Completed Yesterday:**
[Reference completed tasks from task list]

**Working Today:** 
[Reference in-progress tasks]

**Blockers:**
[Any blockers mentioned in task list]

**Platform Status:**
- Web: [status]
- Native: [status]  
- Shared: [status]
```

### PR Integration
```
When ready for PR, create commit referencing task completion:

git commit -m "feat: implement [feature] core component

Completes tasks:
- ✅ Setup Tamagui component structure [Both]
- ✅ Implement TypeScript interfaces [Both]  
- ✅ Add basic unit tests [Both]

Next phase: Data integration
Ref: docs/tasks/feature-name.md"
```

## Quality Metrics

Track these metrics in your task lists:
- **Cross-platform parity**: Does it work identically on web/native?
- **Rule compliance**: Does it follow all applicable .mdc rules?
- **Test coverage**: Unit + integration + E2E coverage complete?
- **Performance**: No unnecessary re-renders or memory leaks?
- **Accessibility**: Proper ARIA labels and navigation support?

This integrated approach ensures every feature is built systematically, tracked transparently, and maintains the high quality standards defined in your monorepo rules.