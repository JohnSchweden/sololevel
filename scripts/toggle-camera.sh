#!/bin/bash

# Camera implementation toggle script
# Usage: ./scripts/toggle-camera.sh [vision|expo]

if [ "$1" = "vision" ]; then
  echo "EXPO_PUBLIC_USE_VISION_CAMERA=true" > .env.local
  echo "✅ Switched to VisionCamera (dev build)"
  echo "   - Full camera features"
  echo "   - Requires native build"
  echo "   - Better performance"
elif [ "$1" = "expo" ]; then
  echo "EXPO_PUBLIC_USE_VISION_CAMERA=false" > .env.local
  echo "✅ Switched to Expo Camera (Expo Go)"
  echo "   - Limited camera features"
  echo "   - Expo Go compatible"
  echo "   - Faster iteration"
else
  echo "Usage: ./scripts/toggle-camera.sh [vision|expo]"
  echo ""
  echo "Current status:"
  if [ -f ".env.local" ]; then
    grep "USE_VISION_CAMERA" .env.local 2>/dev/null || echo "No camera setting found"
  else
    echo "No .env.local file"
  fi
fi
