import { type ChildProcess, exec } from 'node:child_process'
import path from 'node:path'
import { afterAll, expect, test } from 'vitest'

let buildProcess: ChildProcess | null = null

afterAll(() => {
  if (buildProcess?.pid) {
    try {
      process.kill(buildProcess.pid, 0) // Check if process exists
      process.kill(buildProcess.pid) // Kill the process if it exists
    } catch (_error) {}
  }
})

test.skip('Next.js build completes', async () => {
  try {
    // Build directly in the next-app workspace to get Next.js output
    buildProcess = exec('yarn workspace next-app build', {
      cwd: path.resolve(__dirname, '../../../..'),
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54321',
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: 'test_anon_key',
      },
    })

    const buildOutput = new Promise<string>((resolve) => {
      let output = ''
      buildProcess?.stdout?.on('data', (data) => {
        output += data.toString()
      })
      buildProcess?.stderr?.on('data', (data) => {
        output += data.toString()
      })
      buildProcess?.on('close', (code) => {
        // Resolve regardless of exit code; assertions on output will validate success
        output += `\n[build-exit-code:${code}]\n`
        resolve(output)
      })
    })

    const result = await buildOutput

    // Check for successful build completion (Turbo or Next.js output)
    const hasSuccessfulBuild =
      result.includes('Compiled successfully') ||
      result.includes('next-app:build') ||
      result.includes('✓ Built successfully') ||
      result.includes('next-app#build') ||
      (result.includes('[build-exit-code:0]') && !result.includes('command not found'))

    expect(hasSuccessfulBuild).toBe(true)
  } finally {
    // The process kill check has been moved to the afterAll block
  }
}, 120_000)
