# Mobile-First Testing & Package Optimization

## Completed Tasks
- [x] Audit current testing infrastructure [Both]
- [x] Review package management setup [Both]
- [x] Identify mobile-first priorities [Native]
- [x] Configure Jest for Expo React Native [Native]
- [x] Configure Vitest for shared packages [Both]

## In Progress Tasks
- [ ] Create basic component test for Tamagui component [Native]
  - Next: Set up test file structure and write first test
  - Platform: React Native with Jest
  - File: `apps/expo/__tests__/components/MyComponent.test.tsx`
- [ ] Create test utilities and mocks [Both]
  - Next: Implement React Native, Supabase, and Expo mocks
  - Platform: Shared test helpers for both web and native
  - Files: `packages/app/test-utils/`, `apps/expo/__tests__/setup.ts`

## Future Tasks
- [ ] Set up Jest test files for Expo React Native components [Native] [S]
  - Component tests for Tamagui components
  - Navigation tests for Solito routing
  - State management tests for Zustand
- [ ] Create Vitest test files for shared packages and utilities [Both] [S]
  - Business logic tests
  - API integration tests for Supabase
  - Utility function tests
- [ ] Configure Detox for React Native E2E testing on mobile devices [Native] [M]
  - Device testing setup
  - Critical user flow coverage (login → dashboard)
  - Integration with EAS Build for CI
- [ ] Set up test coverage reporting for both Jest and Vitest [Both] [S]
  - Coverage thresholds (80% target)
  - Reporting integration
  - Separate reports for web and native
- [ ] Add performance testing for React Native components [Native] [M]
  - Bundle size monitoring
  - React Native performance metrics
  - Memory leak testing
  - Startup time optimization
- [ ] Integrate testing into CI/CD pipeline with GitHub Actions [Both] [M]
  - Automated test runs on PRs
  - Performance regression detection
  - Test results reporting
- [ ] Audit current package management setup for mobile-first optimization [Native] [M]
  - Bundle size analysis
  - Native dependencies audit
  - Unused dependency cleanup
- [ ] Optimize React Native dependencies and bundle size [Native] [M]
  - Tree shaking setup
  - Metro bundler optimization
  - Version alignment across Expo SDK

## Testing Pipeline
- [ ] Unit tests for components (apps/expo/__tests__/components/)
  - Tamagui component tests with Jest
  - Mock React Native modules properly
- [ ] Integration tests for features (packages/app/features/*/tests/)
  - Zustand state management tests
  - Supabase integration tests
  - Navigation flow tests
- [ ] E2E tests for critical flows (e2e/flows/)
  - Detox setup for mobile E2E
  - User journey tests on real devices
  - Authentication and data flow tests
- [ ] Performance benchmarks (tests/performance/)
  - Bundle size monitoring
  - Startup performance tests
  - Memory usage tests
- [ ] Coverage reports (80% target)
  - Jest coverage for React Native
  - Vitest coverage for web/shared code
  - Combined reporting

## Relevant Files
- `apps/expo/jest.config.js` — Jest configuration for React Native [x]
- `packages/app/vitest.config.mts` — Vitest configuration for web [x]
- `apps/expo/__tests__/setup.ts` — Jest test setup and mocks [ ]
- `packages/app/test-utils/` — Shared test utilities [ ]
- `packages/ui/src/MyComponent.tsx` — First Tamagui component to test [ ]
- `packages/app/features/home/screen.tsx` — First feature to test [ ]
- `e2e/` — Detox E2E test directory [ ]
- `tests/performance/` — Performance test directory [ ]
- `.github/workflows/test.yml` — CI/CD workflow [ ]
- `bundle-analyzer/` — Bundle size analysis tools [ ]
