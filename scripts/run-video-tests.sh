#!/bin/bash

# Run tests for video recording components
echo "Running VideoStorageService tests..."
yarn workspace @my/app test --testPathPattern="videoStorageService.test.ts"

echo "Running VideoFilePicker tests..."
yarn workspace @my/ui test --testPathPattern="VideoFilePicker.native.test.tsx"

echo "Running CameraPreview tests..."
yarn workspace @my/ui test --testPathPattern="CameraPreview.native"

echo "All video recording tests completed!"
