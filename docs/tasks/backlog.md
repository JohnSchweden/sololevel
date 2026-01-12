Cross-Plattform

stale cache or race condition in video analysis.
new video analysis used cached or persistent audio files for new analyzed video.
seems to be working.


browse file on ios and android is not working like galery.
Working

iOS


Android

crash on normal persistent bar seek
working

camera open, switch to native android camer app, switch back, camera is unavailable on android because the given camera device is already in use 
working

on android video of 30 sec gets a dialog. and on ios it open native video preview with a trimmed section of 30 seconds.
Working
✅ IMPLEMENTED: Android now uses react-native-video-trim for native video trimming (same UX as iOS)
   - Requires: yarn workspace expo-app add react-native-video-trim
   - Requires: yarn workspace @my/app add react-native-video-trim
   - Requires: expo prebuild (native modules)
   - Type definitions added: packages/app/src/types/react-native-video-trim.d.ts