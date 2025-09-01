import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
export default defineConfig({
    test: {
        environment: "jsdom",
        globals: true,
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "dist/",
                "**/*.d.ts",
                "**/*.test.{ts,tsx}",
                "**/*.spec.{ts,tsx}",
                "**/test-utils/**",
                "**/__tests__/**",
                "**/__mocks__/**",
                "vitest.config.mts",
                "vitest.setup.ts",
            ],
            thresholds: {
                global: {
                    branches: 80,
                    functions: 80,
                    lines: 80,
                    statements: 80,
                },
            },
        },
    },
    optimizeDeps: {
        exclude: [
            "react-native-svg",
            "@testing-library/react-native",
            "react-native-safe-area-context",
            "expo-camera",
        ],
        include: ["expo-router", "expo-constants", "expo-linking", "@my/api"],
    },
    resolve: {
        alias: [
            { find: "react-native", replacement: "react-native-web" },
            {
                find: "react-native-svg",
                replacement: resolve(__dirname, "./__mocks__/react-native-svg.ts"),
            },
            {
                find: "react-native-safe-area-context",
                replacement: resolve(__dirname, "./__mocks__/react-native-safe-area-context.ts"),
            },
            { find: "@my/ui", replacement: resolve(__dirname, "../ui/src") },
            { find: "@my/config", replacement: resolve(__dirname, "../config/src") },
            { find: "app", replacement: resolve(__dirname, ".") },
        ],
    },
    define: {
        global: "globalThis",
    },
});
// TEMPORARY FIX: Exclude react-native-svg from test processing due to React 19 compatibility issues
// Issue: react-native-svg@15.12.1 has TypeScript syntax errors with React 19
// Solution: Add to inline deps to prevent processing until react-native-svg supports React 19
// TODO: Remove this exclusion when react-native-svg releases React 19 compatible version
