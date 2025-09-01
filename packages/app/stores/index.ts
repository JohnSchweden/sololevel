// Export all stores
export { useAuthStore } from "./auth";
export type { AuthActions, AuthState, AuthStore } from "./auth";

export { useThemeStore } from "./theme";
export type { ThemeActions, ThemeMode, ThemeState, ThemeStore } from "./theme";

export { useFeatureFlagsStore } from "./feature-flags";
export type {
  FeatureFlags,
  FeatureFlagsActions,
  FeatureFlagsState,
  FeatureFlagsStore,
} from "./feature-flags";

export {
  useCameraRecordingSelectors,
  useCameraRecordingStore,
  useRecordingTimer,
} from "./cameraRecording";
export type {
  CameraPermissions,
  CameraRecordingStore,
  CameraSettings,
  RecordingMetrics,
} from "./cameraRecording";

export {
  useUploadProgressSelectors,
  useUploadProgressStore,
  useUploadTask,
} from "./uploadProgress";
export type {
  UploadProgressStore,
  UploadQueue,
  UploadTask,
} from "./uploadProgress";

export {
  useAnalysisJobByVideo,
  useAnalysisJobStatus,
  useAnalysisStatusSelectors,
  useAnalysisStatusStore,
} from "./analysisStatus";
export type {
  AnalysisJobState,
  AnalysisQueue,
  AnalysisStatusStore,
} from "./analysisStatus";

// Import stores for use in selectors
import { useAuthStore } from "./auth";
import { type FeatureFlags, useFeatureFlagsStore } from "./feature-flags";
import { useThemeStore } from "./theme";

// Re-export commonly used selectors
export const useAuth = () =>
  useAuthStore((state) => ({
    user: state.user,
    session: state.session,
    loading: state.loading,
    initialized: state.initialized,
  }));

export const useAuthActions = () =>
  useAuthStore((state) => ({
    signOut: state.signOut,
    initialize: state.initialize,
  }));

export const useTheme = () =>
  useThemeStore((state) => ({
    mode: state.mode,
    isDark: state.isDark,
  }));

export const useThemeActions = () =>
  useThemeStore((state) => ({
    setMode: state.setMode,
    toggleMode: state.toggleMode,
  }));

export const useFeatureFlag = <K extends keyof FeatureFlags>(key: K) =>
  useFeatureFlagsStore((state) => state.flags[key]);

export const useFeatureFlags = () =>
  useFeatureFlagsStore((state) => state.flags);

export const useFeatureFlagsActions = () =>
  useFeatureFlagsStore((state) => ({
    setFlag: state.setFlag,
    setFlags: state.setFlags,
    toggleFlag: state.toggleFlag,
    resetFlags: state.resetFlags,
    loadFlags: state.loadFlags,
  }));
