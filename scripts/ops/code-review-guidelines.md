# Code Review Guidelines - Modern Best Practices

## Overview

This document outlines comprehensive code review guidelines following modern best practices for the Solo:Level AI Feedback Coach App. These guidelines ensure code quality, security, performance, and maintainability.

## Automated Review Process

### Quick Review (Pre-commit)
```bash
yarn code-review --pre-commit
```
- Linting and formatting
- TypeScript type checking
- Critical test execution
- Git hooks validation

### Full Review (Pull Request)
```bash
yarn code-review --full
```
- All quality checks
- Security vulnerability scanning
- Performance analysis
- Architecture compliance
- Documentation completeness

### Specialized Reviews
```bash
yarn code-review --security    # Security-focused
yarn code-review --performance # Performance-focused
yarn code-review --architecture # Architecture compliance
yarn code-review --ci          # CI/CD pipeline validation
```

## Manual Review Checklist

### 1. Code Quality & Standards

#### TypeScript & Type Safety
- [ ] **Strict typing**: No `any` types without justification
- [ ] **Interface definitions**: Clear, well-documented interfaces
- [ ] **Generic usage**: Proper generic constraints and usage
- [ ] **Type guards**: Appropriate type narrowing and validation
- [ ] **Error handling**: Discriminated unions for error states

#### Code Style & Formatting
- [ ] **Biome compliance**: Code follows project linting rules
- [ ] **Consistent formatting**: Proper indentation, spacing, quotes
- [ ] **Import organization**: Clean import statements, no unused imports
- [ ] **Naming conventions**: Clear, descriptive variable and function names
- [ ] **File organization**: Logical file structure and exports

#### SOLID Principles
- [ ] **Single Responsibility**: Each function/class has one clear purpose
- [ ] **Open/Closed**: Code open for extension, closed for modification
- [ ] **Liskov Substitution**: Subtypes are substitutable for base types
- [ ] **Interface Segregation**: Small, focused interfaces
- [ ] **Dependency Inversion**: Depend on abstractions, not concretions

### 2. Security Review

#### Authentication & Authorization
- [ ] **JWT handling**: Proper token validation and extraction
- [ ] **RLS policies**: Row Level Security properly implemented
- [ ] **User isolation**: No cross-user data access possible
- [ ] **Session management**: Secure session handling and cleanup
- [ ] **Edge Function security**: Server-side user ID extraction

#### Data Protection
- [ ] **PII handling**: Personal data properly masked in logs
- [ ] **Environment variables**: No secrets in client code
- [ ] **Input validation**: All inputs properly validated and sanitized
- [ ] **SQL injection**: Parameterized queries, no string concatenation
- [ ] **XSS prevention**: Proper output encoding and CSP headers

#### File & Storage Security
- [ ] **Upload validation**: File type, size, and content validation
- [ ] **Signed URLs**: Short TTL for temporary access
- [ ] **Bucket policies**: Proper RLS on storage buckets
- [ ] **CORS configuration**: Restrictive CORS policies
- [ ] **Access controls**: Principle of least privilege

### 3. Performance Review

#### Bundle & Build Performance
- [ ] **Bundle size**: Web bundle ≤ 250KB gzipped
- [ ] **Code splitting**: Dynamic imports for large features
- [ ] **Tree shaking**: Unused code elimination
- [ ] **Asset optimization**: Compressed images and media
- [ ] **Build time**: Reasonable build duration

#### Runtime Performance
- [ ] **Memory usage**: No memory leaks or excessive allocations
- [ ] **Render optimization**: Proper memoization and state management
- [ ] **Network efficiency**: Minimal API calls, proper caching
- [ ] **Mobile performance**: Optimized for mobile devices
- [ ] **Pose detection**: Efficient real-time processing

#### Database Performance
- [ ] **Query optimization**: Efficient database queries
- [ ] **Index usage**: Proper database indexing
- [ ] **Connection pooling**: Efficient database connections
- [ ] **Caching strategy**: Appropriate caching mechanisms
- [ ] **Pagination**: Large dataset handling

### 4. Architecture Compliance

#### Monorepo Structure
- [ ] **Package boundaries**: Clear separation between packages
- [ ] **Import paths**: Use of proper path aliases (`@ui/`, `@app/`, `@api/`, `@config/`)
- [ ] **Dependency management**: Internal deps use `workspace:*`
- [ ] **Cross-platform**: Code works on both React Native and Web
- [ ] **Tamagui usage**: Proper cross-platform styling

#### AI Pipeline Integration
- [ ] **Pose detection**: Unified MoveNet Lightning across platforms
- [ ] **Video processing**: Efficient frame extraction and analysis
- [ ] **TTS integration**: Proper audio format handling (AAC/MP3)
- [ ] **Edge Functions**: Secure server-side AI processing
- [ ] **Realtime updates**: Efficient subscription management

#### State Management
- [ ] **Zustand stores**: Proper state organization and updates
- [ ] **TanStack Query**: Efficient server state management
- [ ] **React hooks**: Proper hook usage and dependencies
- [ ] **Error boundaries**: Comprehensive error handling
- [ ] **Loading states**: Proper loading and error states

### 5. Testing & Quality Assurance

#### Test Coverage
- [ ] **Unit tests**: Critical business logic tested
- [ ] **Integration tests**: Component interaction testing
- [ ] **E2E tests**: User flow validation
- [ ] **Test quality**: Tests target behavior, not implementation
- [ ] **Mock strategy**: Minimal mocking, external deps only

#### Test-Driven Development
- [ ] **TDD process**: Tests written before implementation
- [ ] **Test organization**: Clear test structure and naming
- [ ] **Assertion quality**: Meaningful assertions and error messages
- [ ] **Test isolation**: Tests don't depend on each other
- [ ] **Performance tests**: Critical performance paths tested

### 6. Documentation & Maintainability

#### Code Documentation
- [ ] **JSDoc comments**: Public APIs properly documented
- [ ] **README files**: Package-level documentation
- [ ] **Type definitions**: Clear TypeScript interfaces
- [ ] **Error messages**: User-friendly error descriptions
- [ ] **Code comments**: Complex logic explained

#### Architecture Documentation
- [ ] **ADRs**: Architecture Decision Records for major changes
- [ ] **API documentation**: Edge Function APIs documented
- [ ] **Database schema**: Clear schema documentation
- [ ] **Deployment guides**: Clear deployment instructions
- [ ] **Troubleshooting**: Common issues and solutions

### 7. Cross-Platform Compatibility

#### React Native (Expo)
- [ ] **Native modules**: Proper native module usage
- [ ] **Platform-specific code**: `.native.ts` and `.web.ts` files
- [ ] **Performance**: Optimized for mobile devices
- [ ] **Permissions**: Proper permission handling
- [ ] **Camera integration**: Efficient camera usage

#### Web (Expo Router)
- [ ] **SSR compatibility**: Server-side rendering support
- [ ] **Browser APIs**: Proper browser API usage
- [ ] **SEO optimization**: Meta tags and structured data
- [ ] **Accessibility**: WCAG 2.2 AA compliance
- [ ] **Progressive enhancement**: Graceful degradation

### 8. Memory Management & Resource Cleanup

#### React Memory Management
- [ ] **useEffect cleanup**: All effects have proper cleanup functions
- [ ] **Timer cleanup**: setTimeout/setInterval properly cleared
- [ ] **Event listeners**: addEventListener paired with removeEventListener
- [ ] **Subscriptions**: All subscriptions have unsubscribe calls
- [ ] **State cleanup**: Large objects cleared on unmount

#### Native Resource Management
- [ ] **Camera resources**: Camera instances properly released
- [ ] **Audio/video players**: Media players destroyed on unmount
- [ ] **File handles**: File system resources properly closed
- [ ] **Native modules**: Native module instances disposed
- [ ] **Worklet threads**: Background threads terminated

#### Memory Leak Prevention
- [ ] **Closure optimization**: Avoid retaining large objects in closures
- [ ] **Dependency arrays**: useEffect dependencies properly specified
- [ ] **Callback optimization**: useCallback/useMemo used appropriately
- [ ] **Reference cleanup**: Object references nullified
- [ ] **Cache management**: Caches cleared when no longer needed

### 9. Graceful Exit & Error Handling

#### Application Shutdown
- [ ] **App state handling**: Proper background/foreground transitions
- [ ] **Resource disposal**: All resources released on shutdown
- [ ] **State persistence**: User data saved before exit
- [ ] **Operation cancellation**: Ongoing operations cancelled
- [ ] **Cleanup completion**: All cleanup operations completed

#### Error Management
- [ ] **Structured errors**: Consistent error format and handling
- [ ] **User experience**: User-friendly error messages
- [ ] **Logging**: Comprehensive structured logging
- [ ] **Correlation IDs**: Request tracing and debugging
- [ ] **Error boundaries**: Proper error containment

#### Monitoring & Debugging
- [ ] **Performance metrics**: Key performance indicators
- [ ] **Error tracking**: Comprehensive error monitoring
- [ ] **User analytics**: User behavior tracking
- [ ] **Health checks**: System health monitoring
- [ ] **Alerting**: Proactive issue detection

## Review Process

### 1. Automated Checks First
Always run automated checks before manual review:
```bash
yarn code-review --full
```

### 2. Manual Review Focus Areas
- **Business logic correctness**
- **User experience impact**
- **Security implications**
- **Performance considerations**
- **Maintainability and readability**

### 3. Review Comments
- **Be specific**: Point to exact lines and provide context
- **Be constructive**: Suggest improvements, not just problems
- **Be educational**: Explain why changes are needed
- **Be respectful**: Focus on code, not the person

### 4. Approval Criteria
- [ ] All automated checks pass
- [ ] Security review completed
- [ ] Performance impact assessed
- [ ] Architecture compliance verified
- [ ] Documentation updated
- [ ] Tests added/updated

## Common Issues to Watch For

### Security Issues
- Hardcoded secrets or API keys
- Missing input validation
- Insecure direct object references
- Missing authentication checks
- Improper error message exposure

### Performance Issues
- Unnecessary re-renders
- Large bundle sizes
- Inefficient database queries
- Memory leaks
- Blocking operations

### Architecture Issues
- Circular dependencies
- Tight coupling between modules
- Violation of package boundaries
- Inconsistent patterns
- Missing abstractions

### Code Quality Issues
- Complex functions (>20 lines)
- Deep nesting (>3 levels)
- Duplicate code
- Unclear variable names
- Missing error handling

## Tools and Resources

### Automated Tools
- **Biome**: Linting and formatting
- **TypeScript**: Type checking
- **Jest/Vitest**: Testing
- **Playwright**: E2E testing
- **Security audit**: Vulnerability scanning

### Manual Review Tools
- **GitHub/GitLab**: Code review interface
- **IDE extensions**: TypeScript, ESLint, Prettier
- **Browser dev tools**: Performance profiling
- **Database tools**: Query analysis

### Documentation
- **TRD.md**: Technical requirements
- **Architecture diagrams**: System design
- **API documentation**: Edge Function specs
- **User stories**: Feature requirements

## Conclusion

Effective code review is a collaborative process that ensures code quality, security, and maintainability. By following these guidelines and using the automated tools, we can maintain high standards while enabling rapid development.

Remember: The goal is not to find every possible issue, but to catch the most important ones that could impact users, security, or maintainability.
