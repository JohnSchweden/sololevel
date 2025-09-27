# Camera Implementation Switching - Troubleshooting Guide

## Overview
This guide helps troubleshoot issues with switching between VisionCamera and Expo Camera implementations.

## Quick Diagnosis

### Check Current Implementation
```bash
# Check which implementation is active
yarn flag:expo  # Shows current status
./scripts/toggles/toggle-camera.sh

# Check environment variable
cat .env.local
```

### Common Issues & Solutions

#### 1. Camera Not Working After Switch
**Symptoms**: Camera doesn't load, permission errors, or blank screen

**Solutions**:
```bash
# Clear Metro cache and restart
yarn native --clear

# Reset environment and restart
rm .env.local
./scripts/toggles/toggle-camera.sh vision  # or expo
yarn native
```

#### 2. Permission Issues
**Symptoms**: Camera permission denied or not requested

**Solutions**:
- **VisionCamera**: Check device permissions in Settings
- **Expo Camera**: Permissions handled automatically by Expo
- **Hybrid**: Switch implementations and try again

#### 3. Build Errors
**Symptoms**: Compilation fails after switching

**Solutions**:
```bash
# Clean all caches
yarn clean
rm -rf node_modules/.cache
yarn native --clear

# Reinstall dependencies
rm -rf node_modules yarn.lock
yarn install
```

#### 4. Expo Go Issues
**Symptoms**: App crashes or features don't work in Expo Go

**Solutions**:
- Expo Go always uses Expo Camera implementation
- Some VisionCamera features may not be available
- Check logs for specific errors

## Implementation-Specific Issues

### VisionCamera Issues
```bash
# Check if VisionCamera is properly linked
cd ios && pod install
cd android && ./gradlew clean

# Verify installation
yarn why react-native-vision-camera
```

### Expo Camera Issues
```bash
# Check Expo Camera version compatibility
yarn why expo-camera

# Update Expo SDK if needed
yarn expo install --fix
```

## Debug Commands

### Check Feature Flag State
```javascript
// In React DevTools or console
import { useFeatureFlagsStore } from './packages/app/stores/feature-flags'
log.info(useFeatureFlagsStore.getState().flags.useVisionCamera)
```

### Check Environment Variables
```bash
# Check all Expo environment variables
env | grep EXPO

# Check .env files
cat .env.local
cat .env.development
cat .env.expo-go
```

### Check Bundle Contents
```bash
# Check if correct implementation is bundled
grep -r "VisionCamera\|expo-camera" node_modules/.cache
```

## Performance Issues

### VisionCamera Performance
- **Expected**: Better performance, more features
- **Issues**: Higher battery usage, more complex setup
- **Solution**: Use for development, consider optimizations for production

### Expo Camera Performance
- **Expected**: Good performance, simpler setup
- **Issues**: Limited features, less control
- **Solution**: Use for quick testing, feature validation

## Environment Setup

### Development Environment (.env.development)
```bash
EXPO_PUBLIC_USE_VISION_CAMERA=true
```

### Expo Go Environment (.env.expo-go)
```bash
EXPO_PUBLIC_USE_VISION_CAMERA=false
```

### Local Override (.env.local)
```bash
EXPO_PUBLIC_USE_VISION_CAMERA=true   # Override for testing
```

## Testing Checklist

- [ ] Switch between implementations works
- [ ] Camera loads in both modes
- [ ] Permissions work correctly
- [ ] Recording functionality works
- [ ] No console errors
- [ ] Performance is acceptable
- [ ] Expo Go compatibility maintained

## Emergency Recovery

If everything breaks, reset to known good state:

```bash
# Reset everything
rm -rf node_modules .env.local
yarn install

# Start with Expo Camera (safer)
./scripts/toggles/toggle-camera.sh expo
yarn native --clear
```

## Support

1. Check this troubleshooting guide first
2. Review implementation-specific documentation
3. Check GitHub issues for similar problems
4. Create issue with:
   - Implementation used (VisionCamera/Expo Camera)
   - Error logs
   - Steps to reproduce
   - Environment details
