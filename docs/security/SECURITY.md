# Security Policy

## Vulnerability Management

This document outlines known security vulnerabilities in our dependencies and the recommended actions.

### Current Vulnerabilities

As of the latest audit (`yarn security:audit`), the following vulnerabilities have been addressed:

#### Fixed Vulnerabilities

1. **path-to-regexp (6.1.0)** - [GHSA-9wv6-86v2-598j](https://github.com/advisories/GHSA-9wv6-86v2-598j)
   - Issue: Outputs backtracking regular expressions
   - Used by: `@vercel/node@5.3.13`
   - Fixed by: Upgraded to `path-to-regexp@^6.3.0`

2. **undici (5.28.4)** - [GHSA-c76h-2ccp-4975](https://github.com/advisories/GHSA-c76h-2ccp-4975) & [GHSA-cxrh-j4jr-qwg3](https://github.com/advisories/GHSA-cxrh-j4jr-qwg3)
   - Issue: Use of insufficiently random values & DoS attack via bad certificate data
   - Used by: `@vercel/node@5.3.13`
   - Fixed by: Upgraded to `undici@^5.29.0`

3. **@types/react-native** (deprecation)
   - Issue: Stub types definition, unnecessary as React Native provides its own types
   - Fixed by: Removed from dependencies

#### Fixed Development Dependencies

We've also addressed the following vulnerabilities in development dependencies:

1. **esbuild (0.19.12)** - [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99)
   - Issue: Enables any website to send requests to the development server and read the response
   - Used by: `@tamagui/cli@npm:1.132.20` (development only)
   - Fixed by: Added deep resolution override `@tamagui/cli/**/esbuild": "^0.24.3"`
   - Additional mitigation: Only use in trusted development environments

2. **abab (2.0.6)** & **domexception (4.0.0)** (deprecation)
   - Issue: Deprecated packages, should use native browser APIs instead
   - Used by: `jsdom@npm:20.0.3` (testing environment only)
   - Fixed by: Added stub replacements via `jsdom/**/abab` and `jsdom/**/domexception` resolutions
   - Implementation: Created empty package with minimal type definitions

3. **path-match (1.2.4)** (deprecation)
   - Issue: Archived and no longer maintained
   - Used by: `@vercel/fun@npm:1.1.6` (development only)
   - Fixed by: Added resolution `@vercel/fun/**/path-match": "npm:path-to-regexp@latest"`
   - Implementation: Replaced with maintained path-to-regexp package

### Deprecated Packages

The following packages are deprecated but don't present immediate security risks:

1. **@types/react-native** - React Native provides its own types
2. **@xmldom/xmldom (0.7.13)** - Version no longer supported
3. **abab (2.0.6)** - Use platform's native atob() and btoa() methods instead
4. **domexception (4.0.0)** - Use platform's native DOMException instead
5. **glob (6.0.4)** - Versions prior to v9 are no longer supported
6. **inflight (1.0.6)** - Not supported and leaks memory
7. **path-match (1.2.4)** - Archived and no longer maintained
8. **rimraf (3.0.2)** - Versions prior to v4 are no longer supported

## Mitigation Strategies

### Current Approach

1. **Security Fix Script**: We've implemented `yarn security:fix` which:
   - Updates package resolutions to secure versions
   - Patches the yarn.lock file
   - Runs security audits to verify fixes

2. **Regular Audits**: Run `yarn security:audit` to check for new vulnerabilities

3. **Development-Only Restrictions**:
   - Remaining vulnerabilities are in development dependencies only
   - Use development servers only on trusted networks
   - Never expose development servers to public networks

### Future Improvements

1. **Dependency Upgrades**:
   - Update Tamagui CLI when a patched version becomes available
   - Replace jsdom with more modern testing utilities where possible
   - Monitor for updates to remaining vulnerable packages

2. **Development Practices**:
   - Run development servers behind firewalls
   - Use VPNs when working on untrusted networks
   - Keep security documentation updated

3. **CI/CD Integration**:
   - Added security scanning to CI pipeline via `yarn security:audit:ci`
   - Configured to fail builds only on high-severity vulnerabilities
   - Generates security reports with each build
   - Uses allowlist in `.npmauditrc.json` for known development-only vulnerabilities

## Reporting Security Issues

If you discover a security vulnerability, please report it by:

1. Opening a security advisory on GitHub
2. Emailing the security team at [security@example.com](mailto:security@example.com)

Please do not disclose security vulnerabilities publicly until they have been addressed.
