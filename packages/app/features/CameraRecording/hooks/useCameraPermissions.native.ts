import { useCameraPermissions as useExpoCameraPermissions } from "expo-camera";
import { PermissionResponse } from "expo-camera";
import { useCallback, useEffect, useState } from "react";
import { Alert, Linking, Platform } from "react-native";
import { useCameraRecordingStore } from "../../../stores/cameraRecording";

/**
 * Enhanced camera permissions hook that wraps Expo's useCameraPermissions
 * with additional UX features, error handling, and Zustand integration
 */
export interface UseCameraPermissionsResult {
  // Expo's original API
  permission: PermissionResponse | null;
  requestPermission: () => Promise<PermissionResponse>;

  // Enhanced features
  isLoading: boolean;
  error: string | null;
  canRequestAgain: boolean;

  // Actions
  requestPermissionWithRationale: () => Promise<boolean>;
  redirectToSettings: () => Promise<void>;
  clearError: () => void;
  retryRequest: () => Promise<boolean>;
}

/**
 * Configuration for the permissions hook
 */
export interface UseCameraPermissionsConfig {
  /** Show permission rationale modal before requesting */
  showRationale?: boolean;
  /** Enable automatic settings redirect for denied permissions */
  enableSettingsRedirect?: boolean;
  /** Custom rationale message for different platforms */
  customRationale?: {
    title: string;
    message: string;
    okButton?: string;
    cancelButton?: string;
  };
  /** Callback when permission status changes */
  onPermissionChange?: (status: PermissionResponse | null) => void;
  /** Callback when permission request fails */
  onError?: (error: string) => void;
}

/**
 * Custom camera permissions hook with enhanced UX
 * Wraps Expo's useCameraPermissions with additional features:
 * - Platform-specific rationale messages
 * - Settings redirect for permanently denied permissions
 * - Loading states and error handling
 * - Retry logic
 * - Zustand store integration
 */
export function useCameraPermissions(
  config: UseCameraPermissionsConfig = {},
): UseCameraPermissionsResult {
  const {
    showRationale = true,
    enableSettingsRedirect = true,
    customRationale,
    onPermissionChange,
    onError,
  } = config;

  // Use Expo's hook internally
  const [permission, requestPermission] = useExpoCameraPermissions();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Zustand store integration
  const { setPermissions, permissions: storePermissions } =
    useCameraRecordingStore();

  // Platform-specific rationale messages
  const getRationaleMessage = useCallback(() => {
    if (customRationale) return customRationale;

    if (Platform.OS === "ios") {
      return {
        title: "Camera Access Required",
        message:
          "SoloLevel needs camera access to record your form and provide real-time feedback. Your privacy is protected - videos are processed locally and can be deleted anytime.",
        okButton: "Allow Access",
        cancelButton: "Not Now",
      };
    }

    if (Platform.OS === "android") {
      return {
        title: "Camera Permission",
        message:
          "SoloLevel requires camera access to capture your movement and provide AI-powered coaching. Videos are processed securely and you can delete them anytime.",
        okButton: "Grant Permission",
        cancelButton: "Cancel",
      };
    }

    // Web
    return {
      title: "Enable Camera",
      message:
        'SoloLevel needs camera access to record your form. Click "Allow" when prompted by your browser.',
      okButton: "Continue",
      cancelButton: "Cancel",
    };
  }, [customRationale]);

  // Update Zustand store when permission changes
  useEffect(() => {
    if (permission) {
      // Map expo-camera permission response to API schema format
      const mappedStatus = permission.granted
        ? "granted"
        : permission.status === "denied"
        ? "denied"
        : permission.status === "undetermined"
        ? "undetermined"
        : permission.status === "granted"
        ? "granted" // Explicit check for granted status
        : "undetermined"; // Fallback for any other status

      setPermissions({
        camera: mappedStatus,
        microphone: storePermissions.microphone, // Keep existing microphone permission
      });
      onPermissionChange?.(permission);
    }
  }, [
    permission,
    setPermissions,
    storePermissions.microphone,
    onPermissionChange,
  ]);

  // Check if we can request permission again
  const canRequestAgain = permission?.canAskAgain ?? false;

  // Show permission rationale modal
  const showRationaleModal = useCallback(async (): Promise<boolean> => {
    if (!showRationale) return true;

    const rationale = getRationaleMessage();

    return new Promise((resolve) => {
      Alert.alert(rationale.title, rationale.message, [
        {
          text: rationale.cancelButton || "Cancel",
          style: "cancel",
          onPress: () => resolve(false),
        },
        {
          text: rationale.okButton || "OK",
          onPress: () => resolve(true),
        },
      ]);
    });
  }, [showRationale, getRationaleMessage]);

  // Redirect to app settings
  const redirectToSettings = useCallback(async () => {
    try {
      if (Platform.OS === "ios") {
        await Linking.openURL("app-settings:");
      } else if (Platform.OS === "android") {
        await Linking.openSettings();
      } else {
        // Web - show browser settings message
        Alert.alert(
          "Browser Settings",
          "Please enable camera access in your browser settings and refresh the page.",
          [{ text: "OK" }],
        );
      }
    } catch (err) {
      const errorMessage =
        "Unable to open settings. Please manually enable camera access in your device settings.";
      setError(errorMessage);
      onError?.(errorMessage);
    }
  }, [onError]);

  // Request permission with enhanced UX
  const requestPermissionWithRationale = useCallback(
    async (): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        // Show rationale modal first (if enabled)
        const shouldProceed = await showRationaleModal();
        if (!shouldProceed) {
          setIsLoading(false);
          return false;
        }

        // Request permission using Expo's hook
        const result = await requestPermission();

        // Handle different permission states
        if (result.granted) {
          return true;
        }

        if (!result.canAskAgain) {
          // Permanently denied - offer settings redirect
          if (enableSettingsRedirect) {
            Alert.alert(
              "Permission Required",
              "Camera access was denied. You can enable it in Settings.",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Open Settings", onPress: redirectToSettings },
              ],
            );
          }
          return false;
        }

        // Permission denied but can ask again later
        if (result.status === "denied") {
          const errorMessage =
            "Camera permission was denied. Please try again later.";
          setError(errorMessage);
          onError?.(errorMessage);
        }

        return false;
      } catch (err) {
        const errorMessage = err instanceof Error
          ? err.message
          : "Permission request failed";
        setError(errorMessage);
        onError?.(errorMessage);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [
      requestPermission,
      showRationaleModal,
      enableSettingsRedirect,
      redirectToSettings,
      onError,
    ],
  );

  // Retry permission request
  const retryRequest = useCallback(async (): Promise<boolean> => {
    setError(null);
    return requestPermissionWithRationale();
  }, [requestPermissionWithRationale]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // Expo's original API
    permission,
    requestPermission,

    // Enhanced features
    isLoading,
    error,
    canRequestAgain,

    // Enhanced actions
    requestPermissionWithRationale,
    redirectToSettings,
    clearError,
    retryRequest,
  };
}

/**
 * Hook for checking if camera permissions are granted
 */
export function useCameraPermissionStatus() {
  const { permission } = useCameraPermissions();
  return {
    isGranted: permission?.granted ?? false,
    isDenied: permission?.status === "denied",
    isUndetermined: permission?.status === "undetermined",
    canAskAgain: permission?.status === "undetermined" || !permission?.granted,
  };
}

/**
 * Hook for handling permission modal visibility
 */
export function usePermissionModal() {
  const { setPermissionModalOpen, showPermissionModal } =
    useCameraRecordingStore();

  const openModal = useCallback(() => {
    setPermissionModalOpen(true);
  }, [setPermissionModalOpen]);

  const closeModal = useCallback(() => {
    setPermissionModalOpen(false);
  }, [setPermissionModalOpen]);

  return {
    isVisible: showPermissionModal,
    openModal,
    closeModal,
  };
}
