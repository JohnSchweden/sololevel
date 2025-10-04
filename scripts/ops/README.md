# Code Review System

Modern, automated code review system following best practices for the Solo:Level AI Feedback Coach App.

## Quick Start

```bash
# Full code review (recommended for PRs)
yarn code-review

# Quick review (pre-commit)
yarn code-review:quick

# Security-focused review
yarn code-review:security

# Performance analysis
yarn code-review:performance

# Architecture compliance
yarn code-review:architecture

# Memory management & resource cleanup
yarn code-review:memory

# Graceful exit & error handling
yarn code-review:exit

# CI/CD pipeline validation
yarn code-review:ci
```

## Features

### Automated Quality Checks
- **Linting**: Biome code quality and formatting
- **Type Safety**: TypeScript compilation and type checking
- **Testing**: Unit, integration, and critical test execution
- **Security**: Vulnerability scanning and security pattern detection
- **Performance**: Bundle analysis and performance metrics
- **Architecture**: Monorepo structure and import boundary validation
- **Memory Management**: Resource cleanup and memory leak detection
- **Graceful Exit**: Error handling and application shutdown patterns
- **Documentation**: Code documentation completeness checks

### Review Modes

#### Quick Review (`--quick`)
- Linting and formatting
- TypeScript type checking
- Critical test execution
- Git hooks validation
- **Duration**: ~30 seconds

#### Full Review (`--full`)
- All quality checks
- Security vulnerability scanning
- Performance analysis
- Architecture compliance
- Documentation completeness
- **Duration**: ~5 minutes

#### Security Review (`--security`)
- Security vulnerability audit
- Security pattern detection
- TypeScript type checking
- Security-focused linting
- **Duration**: ~2 minutes

#### Performance Review (`--performance`)
- Bundle size analysis
- Build performance metrics
- TypeScript type checking
- Performance-focused checks
- **Duration**: ~3 minutes

#### Architecture Review (`--architecture`)
- Monorepo structure validation
- Import boundary checks
- Package dependency analysis
- TypeScript type checking
- **Duration**: ~1 minute

#### Pre-commit Review (`--pre-commit`)
- Linting and formatting
- TypeScript type checking
- Critical test execution
- Git hooks validation
- **Duration**: ~1 minute

#### Memory Management Review (`--memory`)
- Memory leak detection
- Resource cleanup validation
- Graceful exit patterns
- TypeScript type checking
- **Duration**: ~2 minutes

#### Graceful Exit Review (`--exit`)
- Error handling patterns
- Application shutdown logic
- Memory management
- TypeScript type checking
- **Duration**: ~2 minutes

#### CI Review (`--ci`)
- Full quality checks
- Security scanning
- Build validation
- Test execution
- **Duration**: ~10 minutes

## Exit Codes

- `0`: All checks passed
- `1`: Failed checks detected (action required)
- `2`: Warnings detected (review recommended)

## Integration

### Pre-commit Hooks
Add to `.git/hooks/pre-commit`:
```bash
#!/bin/sh
yarn code-review:pre-commit
```

### CI/CD Pipeline
Add to GitHub Actions workflow:
```yaml
- name: Code Review
  run: yarn code-review:ci
```

### IDE Integration
Configure your IDE to run:
```bash
yarn code-review:quick
```

## Manual Review Guidelines

See [code-review-guidelines.md](./code-review-guidelines.md) for comprehensive manual review guidelines covering:

- Code quality and standards
- Security best practices
- Performance considerations
- Architecture compliance
- Testing requirements
- Documentation standards
- Cross-platform compatibility

## Configuration

The review system uses project configuration from:
- `biome.json` - Linting and formatting rules
- `tsconfig.json` - TypeScript configuration
- `package.json` - Scripts and dependencies
- `turbo.json` - Build configuration

## Troubleshooting

### Common Issues

#### Timeout Errors
Increase timeout in script configuration or run specific checks:
```bash
yarn code-review:quick  # Faster execution
```

#### Permission Errors
Ensure script is executable:
```bash
chmod +x scripts/ops/code-review.mjs
```

#### Missing Dependencies
Install all dependencies:
```bash
yarn install
```

### Debug Mode
Run with verbose output:
```bash
DEBUG=1 yarn code-review
```

## Contributing

To extend the code review system:

1. Add new checks to the `CodeReviewer` class
2. Update configuration in the `config` object
3. Add corresponding CLI options
4. Update documentation

## Best Practices

### For Reviewers
- Run automated checks before manual review
- Focus on business logic and user experience
- Provide constructive, specific feedback
- Consider security and performance implications

### For Developers
- Run quick review before committing
- Address automated check failures
- Write clear commit messages
- Keep changes focused and atomic

## Support

For issues or questions:
1. Check troubleshooting section
2. Review project documentation
3. Create issue in project repository
4. Contact development team
