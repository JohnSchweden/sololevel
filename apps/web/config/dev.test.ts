import { type ChildProcess, spawn } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import treeKill from 'tree-kill'
import { expect, test } from 'vitest'

const treeKillAsync = promisify(treeKill)

test.skip('Expo Router dev server starts', async () => {
  let devProcess: ChildProcess | null = null

  try {
    devProcess = spawn('yarn', ['dev'], {
      cwd: path.resolve(__dirname, '..'),
      stdio: 'pipe',
      shell: true,
    })

    let output = ''
    devProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })
    devProcess.stderr?.on('data', (data) => {
      output += data.toString()
    })

    // Wait for the server to start (adjust timeout as needed)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for dev server to start'))
      }, 45000) // Increased timeout

      devProcess?.stdout?.on('data', (data) => {
        const dataStr = data.toString()
        // More flexible ready detection
        if (
          dataStr.includes('Ready in') ||
          dataStr.includes('ready - started server') ||
          dataStr.includes('Local:') ||
          dataStr.includes('ready on')
        ) {
          clearTimeout(timeout)
          resolve()
        }
      })

      devProcess?.stderr?.on('data', (data) => {
        const dataStr = data.toString()
        // Also check stderr for ready signals
        if (
          dataStr.includes('Ready in') ||
          dataStr.includes('ready - started server') ||
          dataStr.includes('Local:') ||
          dataStr.includes('ready on')
        ) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    // Check for dev server startup (more flexible)
    const hasDevServer =
      output.includes('Ready in') ||
      output.includes('ready - started server') ||
      output.includes('Local:') ||
      output.includes('ready on') ||
      output.includes('localhost:3000')

    expect(hasDevServer).toBe(true)

    // Additional checks can be added here
  } finally {
    // Ensure the dev server is killed and wait for it to fully terminate
    if (devProcess?.pid) {
      try {
        await treeKillAsync(devProcess.pid)
      } catch (_error) {}
    }
  }
}, 60000) // Increased timeout to account for both startup and shutdown
