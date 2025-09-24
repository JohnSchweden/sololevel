#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')

// eslint-disable-next-line no-console
const logger = console

/**
 * Command validator that respects .cursorrules
 * Usage: node scripts/validate-command.js "command to validate"
 */

const RULES_FILE = '.cursorrules'

function loadRules() {
  try {
    const rulesPath = path.join(process.cwd(), RULES_FILE)
    const content = fs.readFileSync(rulesPath, 'utf8')
    const rules = JSON.parse(content)
    return rules.commandRules || { allow: [], block: [] }
  } catch (error) {
    logger.error(`Failed to load ${RULES_FILE}:`, error.message)
    process.exit(1)
  }
}

function isCommandBlocked(command, blockedCommands) {
  return blockedCommands.some((blocked) => {
    // Exact match
    if (command === blocked) return true

    // Starts with blocked command
    if (command.startsWith(blocked + ' ')) return true

    // Check for workspace-specific patterns like "yarn workspace @my/app add"
    // This catches patterns like: yarn workspace <workspace> add/remove
    const workspacePattern = /yarn workspace [^\s]+ (add|remove)/
    if (blocked.includes('workspace') && blocked.includes('add')) {
      return workspacePattern.test(command)
    }
    if (blocked.includes('workspace') && blocked.includes('remove')) {
      return workspacePattern.test(command)
    }

    return false
  })
}

function validateCommand(command) {
  const rules = loadRules()
  const { block = [] } = rules

  if (isCommandBlocked(command, block)) {
    logger.warn(`⚠️  WARNING: '${command}' is flagged by .cursorrules`)
    logger.warn('   This command modifies workspace dependencies.')

    // For programmatic use, allow override via environment variable
    if (process.env.CURSOR_RULES_OVERRIDE === 'true') {
      logger.log('Override enabled, proceeding...')
      logger.log(`✅ ALLOWED (override): '${command}'`)
      process.exit(0)
    }

    logger.log('')
    logger.log('To proceed with this command, you have these options:')
    logger.log('1. Use CURSOR_RULES_OVERRIDE=true before the command')
    logger.log('2. Temporarily modify .cursorrules to allow it')
    logger.log('3. Use the shell validator for interactive confirmation')
    logger.log('')
    logger.log(`Example: CURSOR_RULES_OVERRIDE=true ${command}`)
    process.exit(1)
  }

  // Command is allowed
  logger.log(`✅ ALLOWED: '${command}'`)
  process.exit(0)
}

// Main execution
const command = process.argv.slice(2).join(' ')
if (!command) {
  logger.error('Usage: node scripts/validate-command.js "command to validate"')
  process.exit(1)
}

validateCommand(command)
