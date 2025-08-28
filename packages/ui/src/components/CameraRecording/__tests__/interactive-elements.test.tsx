/**
 * Interactive Elements Tests - LEGACY FILE
 *
 * ⚠️  MIGRATION NOTICE ⚠️
 *
 * All tests from this file have been migrated to focused test files for better organization:
 *
 * ✅ recording-state-machine.test.tsx - Recording State Machine tests
 * ✅ idle-controls.test.tsx - Idle Controls Component tests
 * ✅ recording-controls.test.tsx - Recording Controls Component tests
 * ✅ zoom-controls.test.tsx - Zoom Controls Component tests
 * ✅ camera-controls.test.tsx - Camera Controls Hook tests
 * ✅ navigation-dialog.test.tsx - Navigation Dialog Component tests
 * ✅ touch-targets.test.tsx - Touch Target Compliance tests
 * ✅ integration-tests.test.tsx - Integration Tests
 *
 * This file is kept for reference but should not contain active tests.
 * New tests should be added to the appropriate focused test file.
 */

import React from 'react'

// Import shared test utilities (includes all mocks and setup)
import '../../../test-utils/setup'

describe('Interactive Elements - LEGACY', () => {
  it('serves as migration reference', () => {
    // This file has been migrated to focused test files
    // See the migration notice at the top of this file
    expect(true).toBe(true)
  })

  it('provides test file organization guidance', () => {
    // Use focused test files for better organization:
    // - Component-specific tests in component-name.test.tsx
    // - Hook tests in hook-name.test.tsx
    // - Integration tests in integration-tests.test.tsx
    // - Touch targets in touch-targets.test.tsx

    const guidance = [
      'recording-state-machine.test.tsx',
      'idle-controls.test.tsx',
      'recording-controls.test.tsx',
      'zoom-controls.test.tsx',
      'camera-controls.test.tsx',
      'navigation-dialog.test.tsx',
      'touch-targets.test.tsx',
      'integration-tests.test.tsx',
    ]

    expect(guidance).toContain('recording-state-machine.test.tsx')
  })
})
