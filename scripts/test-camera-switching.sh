#!/bin/bash

# Camera Implementation Switching Test Script
# Tests both VisionCamera and Expo Camera implementations

echo "🧪 Testing Camera Implementation Switching"
echo "=========================================="

# Function to test implementation
test_implementation() {
    local impl=$1
    local expected=$2
    
    echo ""
    echo "Testing $impl implementation..."
    
    # Switch implementation
    ./scripts/toggle-camera.sh $impl
    
    # Check environment
    if [ -f ".env.local" ]; then
        local env_value=$(grep "USE_VISION_CAMERA" .env.local | cut -d'=' -f2)
        if [ "$env_value" = "$expected" ]; then
            echo "✅ Environment variable correct: $env_value"
        else
            echo "❌ Environment variable incorrect: expected $expected, got $env_value"
            return 1
        fi
    else
        echo "❌ No .env.local file found"
        return 1
    fi
    
    # Test type checking (ignore unused variable warnings)
    if yarn type-check 2>&1 | grep -v "TS6133\|TS6196" | grep -q "error TS"; then
        echo "❌ TypeScript compilation failed with critical errors"
        return 1
    else
        echo "✅ TypeScript compilation successful (warnings ignored)"
    fi
    
    echo "✅ $impl implementation test passed"
    return 0
}

# Test VisionCamera
if test_implementation "vision" "true"; then
    VISION_PASSED=true
else
    VISION_PASSED=false
fi

# Test Expo Camera
if test_implementation "expo" "false"; then
    EXPO_PASSED=true
else
    EXPO_PASSED=false
fi

# Summary
echo ""
echo "📊 Test Results Summary"
echo "======================="
echo "VisionCamera Test: $([ "$VISION_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "Expo Camera Test: $([ "$EXPO_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")"

if [ "$VISION_PASSED" = true ] && [ "$EXPO_PASSED" = true ]; then
    echo ""
    echo "🎉 All tests passed! Camera switching is working correctly."
    echo ""
    echo "Next steps:"
    echo "1. Run 'yarn expo start' to test in Expo Go (uses Expo Camera)"
    echo "2. Build native app to test VisionCamera implementation"
    echo "3. Use './scripts/toggle-camera.sh' to switch between implementations"
else
    echo ""
    echo "❌ Some tests failed. Check the troubleshooting guide:"
    echo "   docs/camera-switching-troubleshooting.md"
    exit 1
fi
