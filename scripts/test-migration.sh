#!/bin/bash

# Test Migration Script for Expo Router TDD Approach
# 
# This script runs the TDD test suite to validate the Expo Router migration.
# Tests will FAIL initially and guide the migration process.

set -e

echo "🧪 Running TDD Tests for Expo Router Migration"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run tests and capture results
run_test_suite() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "\n${YELLOW}Running: $test_name${NC}"
    echo "Command: $test_command"
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ PASSED: $test_name${NC}"
        return 0
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        return 1
    fi
}

# Track test results
failed_tests=()
passed_tests=()

echo -e "\n${YELLOW}Phase 1: Navigation Behavior Tests (Vitest)${NC}"
if run_test_suite "Navigation Logic Tests" "yarn workspace app test __tests__/navigation.test.ts"; then
    passed_tests+=("Navigation Logic")
else
    failed_tests+=("Navigation Logic")
fi

echo -e "\n${YELLOW}Phase 2: React Native Deep Linking Tests (Jest)${NC}"
if run_test_suite "Deep Linking Tests" "(cd apps/expo && yarn test __tests__/deep-linking.test.tsx)"; then
    passed_tests+=("Deep Linking")
else
    failed_tests+=("Deep Linking")
fi

echo -e "\n${YELLOW}Phase 3: UI Component Integration Tests (Jest)${NC}"
if run_test_suite "Navigation Components" "(cd packages/ui && yarn test src/__tests__/navigation-components.test.tsx)"; then
    passed_tests+=("Navigation Components")
else
    failed_tests+=("Navigation Components")
fi

echo -e "\n${YELLOW}Phase 4: Router Integration Tests (Jest)${NC}"
if run_test_suite "Router Integration" "(cd apps/expo && yarn test __tests__/router-integration.test.tsx)"; then
    passed_tests+=("Router Integration")
else
    failed_tests+=("Router Integration")
fi

echo -e "\n${YELLOW}Phase 5: E2E Migration Tests (Playwright)${NC}"
if run_test_suite "E2E Migration Tests" "yarn playwright test e2e/expo-router-migration.spec.ts --project=chromium"; then
    passed_tests+=("E2E Migration")
else
    failed_tests+=("E2E Migration")
fi

# Summary
echo -e "\n${YELLOW}=============================================="
echo "TDD Migration Test Summary"
echo "=============================================="

if [ ${#passed_tests[@]} -gt 0 ]; then
    echo -e "${GREEN}✅ PASSED TESTS (${#passed_tests[@]}):${NC}"
    for test in "${passed_tests[@]}"; do
        echo "  - $test"
    done
fi

if [ ${#failed_tests[@]} -gt 0 ]; then
    echo -e "\n${RED}❌ FAILED TESTS (${#failed_tests[@]}):${NC}"
    for test in "${failed_tests[@]}"; do
        echo "  - $test"
    done
    
    echo -e "\n${YELLOW}🎯 TDD Next Steps:${NC}"
    echo "1. Fix the failing tests by implementing Expo Router migration"
    echo "2. Install expo-router: yarn workspace next-app add expo-router"
    echo "3. Update file structure: move pages/ to app/"
    echo "4. Update navigation calls to use Expo Router API"
    echo "5. Re-run this script to validate fixes"
    
    exit 1
else
    echo -e "\n${GREEN}🎉 ALL TESTS PASSED! Migration is complete.${NC}"
    exit 0
fi
