import { type ChildProcess, spawn } from 'node:child_process'
import path from 'node:path'
import { promisify } from 'node:util'
import treeKill from 'tree-kill'
import { expect, test } from 'vitest'

const treeKillAsync = promisify(treeKill)

test('Next.js dev server starts', async () => {
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

    // Wait for the server to start (adjust timeout as needed)
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timeout waiting for dev server to start'))
      }, 30000)

      devProcess?.stdout?.on('data', (data) => {
        if (data.toString().includes('Ready in')) {
          clearTimeout(timeout)
          resolve()
        }
      })
    })

    // Check for expected output
    expect(output).toContain('Next.js 15.5.2')
    expect(output).toContain('Local:')
    expect(output).toContain('Ready in')

    // Additional checks can be added here
  } finally {
    // Ensure the dev server is killed and wait for it to fully terminate
    if (devProcess?.pid) {
      try {
        await treeKillAsync(devProcess.pid)
      } catch (error) {}
    }
  }
}, 60000) // Increased timeout to account for both startup and shutdown
