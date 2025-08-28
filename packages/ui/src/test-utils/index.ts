/**
 * Shared Test Utilities for UI Package
 * Centralized utilities for testing Tamagui components
 */

// Re-export commonly used testing library functions
export * from "@testing-library/react";
export * from "@testing-library/jest-dom";

// Import types
import type { ReactElement } from "react";
import type { TamaguiConfig } from "tamagui";

// Re-export for convenience
export type { ReactElement, TamaguiConfig };

// Export all mock utilities
export * from "./mocks";
export * from "./TestProvider";
export * from "./setup";
