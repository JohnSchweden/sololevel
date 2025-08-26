# Documentation Structure

This directory contains all documentation for the wireframe-to-screen development workflow.

## 📁 Directory Structure

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

## 🎯 How to Use

### For New Features
1. **Create Feature Directory**: `mkdir -p docs/features/[feature-name]/{components,testing}`
2. **Save Wireframe**: Place wireframe image as `docs/features/[feature-name]/wireframe.png`
3. **Create Analysis**: Copy `docs/templates/analysis-template.md` to `docs/features/[feature-name]/analysis.md`
4. **Create Tasks**: Copy `docs/templates/tasks-template.md` to `docs/features/[feature-name]/tasks.md`

### For Understanding the Process
- **Read**: `docs/workflow/integrated-workflow.md` for complete process understanding
- **Reference**: `docs/workflow/commands.md` for copy-paste commands
- **Integration**: `docs/workflow/cursor-rules-integration.md` for .cursor/ rule application

## 🔗 Quick Start Commands

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

## 📊 Benefits of Feature-Based Organization

1. **Cohesive Documentation** - All related artifacts for a feature in one place
2. **Improved Collaboration** - Team members can focus on a feature directory
3. **Better Traceability** - Direct path from wireframe to implementation
4. **Simplified References** - Clear relationship between wireframe, analysis, and tasks
5. **Easier Maintenance** - Feature evolution clearly visible in one location

## 🔄 Migration from Old Structure

The documentation has been migrated from the previous structure:
- `docs/analysis/` → `docs/features/[feature-name]/analysis.md`
- `docs/tasks/` → `docs/features/[feature-name]/tasks.md`
- `docs/prompts/` → `docs/workflow/`
- Templates updated to reference feature-based paths

All workflow commands and .cursor/ rules have been updated to work with the new structure.
