# Empty Package

This package provides empty implementations and type definitions for deprecated dependencies.

## Purpose

This package is used to replace deprecated dependencies in the project with minimal stubs that satisfy the dependency requirements without introducing security vulnerabilities.

## Usage

The package is referenced in the root package.json's resolutions field:

```json
"resolutions": {
  "jsdom/**/abab": "npm:@types/empty-package@1.0.0",
  "jsdom/**/domexception": "npm:@types/empty-package@1.0.0"
}
```

## Implementations

The package provides minimal implementations for:

1. **abab** - Provides stub implementations for `atob()` and `btoa()` functions
2. **domexception** - Provides a minimal `DOMException` class implementation

These implementations are just enough to satisfy the type requirements and prevent runtime errors, but they are not intended to be fully functional replacements.
