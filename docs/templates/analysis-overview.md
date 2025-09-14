## 4 Domain-Focused Analysis Templates**

### 1. **`analysis-ui.md`** - UI/UX Analysis Template
- **Focus**: Visual design, Tamagui components, user interactions
- **Key Sections**: Component mapping, responsive design, animations, accessibility
- **TDD Integration**: Visual regression tests, interaction tests, cross-platform parity

### 2. **`analysis-feature.md`** - Feature Logic Analysis Template  
- **Focus**: Business logic, state management (Zustand/TanStack Query), user flows
- **Key Sections**: User journeys, error handling, form validation, performance optimization
- **TDD Integration**: Business rule tests, state transition tests, integration tests

### 3. **`analysis-backend.md`** - Backend Integration Analysis Template
- **Focus**: Supabase integration, AI pipeline, database design, Edge Functions
- **Key Sections**: Schema design, RLS policies, file storage, real-time subscriptions
- **TDD Integration**: API contract tests, database tests, AI pipeline tests

### 4. **`analysis-platform.md`** - Cross-Platform Analysis Template
- **Focus**: Native vs web differences, deployment, platform-specific optimizations
- **Key Sections**: Expo/Next.js config, platform APIs, build processes, CI/CD
- **TDD Integration**: Platform parity tests, deployment tests, performance benchmarks

## 🎯 **Key Benefits of This Approach**

1. **AI-Friendly**: Each template is focused and digestible for AI models
2. **Domain Separation**: Clear boundaries matching your `@my/*` package structure
3. **Cross-References**: Templates link to each other for complete coverage
4. **TDD-First**: Each template maintains your 1:2 test-to-code ratio requirement
5. **Monorepo Aligned**: Matches your Expo/Next.js/Tamagui/Supabase architecture

## 🔗 **How They Work Together**

- **`analysis-ui.md`** → Defines what users see and interact with
- **`analysis-feature.md`** → Defines how the app behaves and manages state  
- **`analysis-backend.md`** → Defines data flow and AI processing
- **`analysis-platform.md`** → Defines deployment and platform differences

Each template cross-references the others, so you get complete coverage while maintaining focused, manageable documents that AI models can easily process.

The templates are now ready for use! When you analyze a new feature, you can copy the relevant templates to `docs/features/[feature-name]/` and fill them out systematically.