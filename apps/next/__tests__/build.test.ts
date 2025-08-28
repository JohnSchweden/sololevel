import { type ChildProcess, exec } from "node:child_process";
import { afterAll, expect, test } from "vitest";
import path from "node:path";

let buildProcess: ChildProcess | null = null;

afterAll(() => {
  if (buildProcess?.pid) {
    try {
      process.kill(buildProcess.pid, 0); // Check if process exists
      process.kill(buildProcess.pid); // Kill the process if it exists
    } catch (error) {
      // Process doesn't exist or we don't have permission to kill it
      console.info("Process already terminated or cannot be killed.");
    }
  }
});

test("Next.js build completes", async () => {
  try {
    // Build inside the next-app workspace for deterministic output
    buildProcess = exec("yarn build", {
      cwd: path.resolve(__dirname, "../../.."),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test_anon_key",
      },
    });

    const buildOutput = new Promise<string>((resolve) => {
      let output = "";
      buildProcess?.stdout?.on("data", (data) => {
        output += data.toString();
      });
      buildProcess?.stderr?.on("data", (data) => {
        output += data.toString();
      });
      buildProcess?.on("close", (code) => {
        // Resolve regardless of exit code; assertions on output will validate success
        output += `\n[build-exit-code:${code}]\n`;
        resolve(output);
      });
    });

    const result = await buildOutput;

    // Core build signals
    expect(result).toContain("Next.js 15.5.2");
    expect(result).toContain("Creating an optimized production build");
    expect(result).toContain("Compiled successfully");
    expect(result).toContain("[build-exit-code:0]");
  } finally {
    // The process kill check has been moved to the afterAll block
  }
}, 120_000);
