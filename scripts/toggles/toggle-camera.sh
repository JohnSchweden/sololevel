#!/bin/bash

# Camera implementation toggle script
# Usage: ./scripts/toggle-camera.sh [vision|expo]

# Function to update environment flag while preserving other variables
update_env_flag() {
  local flag="$1"
  local flag_name=$(echo "$flag" | cut -d'=' -f1)
  
  if [ -f ".env.local" ]; then
    if grep -q "^${flag_name}=" .env.local; then
      # Update existing flag
      sed -i '' "s/^${flag_name}=.*/${flag}/" .env.local
    else
      # Add new flag
      echo "$flag" >> .env.local
    fi
  else
    # Create new file with flag
    echo "$flag" > .env.local
  fi
}

if [ "$1" = "vision" ]; then
  update_env_flag "EXPO_PUBLIC_USE_VISION_CAMERA=true"
  echo "✅ Switched to VisionCamera (dev build)"
  echo "   - Full camera features"
  echo "   - Requires native build"
  echo "   - Better performance"
elif [ "$1" = "expo" ]; then
  update_env_flag "EXPO_PUBLIC_USE_VISION_CAMERA=false"
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
