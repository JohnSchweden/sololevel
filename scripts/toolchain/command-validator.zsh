#!/usr/bin/env zsh

# Zsh-compatible command validator for Cursor rules
# Source this file in zsh sessions to enable confirmation prompts for blocked commands
#
# ENFORCED BLOCKS:
#   - npx * (use yarn instead)
#   - npm * (use yarn instead)
#   - pnpm * (use yarn instead)
#   - tsc * (use yarn type-check instead)
#   - perl -i * (in-place file editing)
#   - yarn workspace add/remove
#   - supabase db reset variants
#
# DOCUMENTED BUT NOT ENFORCED (technical limitations):
#   - cat * > * (shell parses redirection before function sees it)
#   - echo * > .env* (shell parses redirection before function sees it)
#   - python * (can't detect file writes without parsing script)
#   These rely on AI assistant following .cursorrules
#
# To enable: source /path/to/command-validator.zsh in your .zshrc

typeset -ga BLOCKED_COMMANDS=()
typeset -gi COMMAND_RULES_LOADED=0
typeset -g COMMAND_RULES_DIR=""

find_rules_file() {
  local dir="$PWD"
  while [[ "$dir" != "/" ]]; do
    if [[ -f "$dir/.cursorrules" ]]; then
      COMMAND_RULES_DIR="$dir"
      echo "$dir/.cursorrules"
      return 0
    fi
    dir="${dir:h}"
  done
  return 1
}

load_blocked_commands() {
  local rules_file
  rules_file=$(find_rules_file)
  if [[ -z "$rules_file" ]]; then
    echo "Error: .cursorrules not found (searched up from $PWD)"
    return 1
  fi

  local commands
  commands=$(node -e '
    try {
      const fs = require("fs");
      const rules = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
      const blocked = (rules.commandRules && rules.commandRules.block) || [];
      console.log(blocked.join("\n"));
    } catch (e) {
      console.error("Error parsing .cursorrules:", e.message);
      process.exit(1);
    }
  ' "$rules_file" 2>&1) || {
    echo "Failed to execute Node.js command"
    return 1
  }

  BLOCKED_COMMANDS=()
  local line
  # Use process substitution instead of heredoc to avoid temp file issues
  while IFS=$'\n' read -r line; do
    [[ -n "$line" ]] && BLOCKED_COMMANDS+="$line"
  done < <(echo "$commands")

  COMMAND_RULES_LOADED=1

  return 0
}

is_blocked() {
  local cmd="$1"
  # Guard against unset variable in older shells: use ${+var} and defaults
  if (( ${+COMMAND_RULES_LOADED} == 0 || ! ${COMMAND_RULES_LOADED:-0} )); then
    load_blocked_commands || return 1
  fi
  if (( ${COMMAND_RULES_LOADED:-0} )); then
    local blocked
    for blocked in "${BLOCKED_COMMANDS[@]}"; do
      # Use glob pattern matching (treat * as wildcard)
      if [[ "$cmd" == $~blocked ]]; then
        return 0
      fi
    done
  fi
  return 1
}

# Wrap yarn
function yarn() {
  local full_cmd="yarn $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  WARNING: '$full_cmd' is flagged by .cursorrules"
    echo "   This command is potentially destructive or workspace-modifying"
    echo ""
    printf "Do you want to proceed anyway? (Y/n): "
    local reply
    read reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
      echo "Command cancelled."
      return 1
    fi
    echo "Proceeding with command..."
  fi
  command yarn "$@"
}

# Wrap supabase
function supabase() {
  local full_cmd="supabase $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  WARNING: '$full_cmd' is flagged by .cursorrules"
    echo "   This command can modify or reset your database"
    echo ""
    printf "Do you want to proceed anyway? (Y/n): "
    local reply
    read reply
    if [[ ! "$reply" =~ ^[Yy]$ ]]; then
      echo "Command cancelled."
      return 1
    fi
    echo "Proceeding with database command..."
  fi
  command supabase "$@"
}

# Wrap perl - only block in-place editing (-i flag)
function perl() {
  local full_cmd="perl $@"
  # Check if using in-place editing flag
  if [[ "$*" == *"-i"* ]]; then
    echo "⚠️  BLOCKED: 'perl -i' (in-place editing) is disallowed by .cursorrules"
    echo "   Use dedicated file editing tools instead (search_replace, write, edit_notebook)"
    echo ""
    echo "Command blocked."
    return 1
  fi
  command perl "$@"
}

# Wrap npx
function npx() {
  local full_cmd="npx $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  BLOCKED: '$full_cmd' is disallowed by .cursorrules"
    echo "   Use 'yarn' commands instead (e.g., 'yarn tsc' or 'yarn workspace <pkg> type-check')"
    echo ""
    echo "Command blocked."
    return 1
  fi
  command npx "$@"
}

# Wrap npm
function npm() {
  local full_cmd="npm $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  BLOCKED: '$full_cmd' is disallowed by .cursorrules"
    echo "   This project uses Yarn 4 exclusively. Use 'yarn' commands instead."
    echo ""
    echo "Command blocked."
    return 1
  fi
  command npm "$@"
}

# Wrap pnpm
function pnpm() {
  local full_cmd="pnpm $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  BLOCKED: '$full_cmd' is disallowed by .cursorrules"
    echo "   This project uses Yarn 4 exclusively. Use 'yarn' commands instead."
    echo ""
    echo "Command blocked."
    return 1
  fi
  command pnpm "$@"
}

# Wrap tsc
function tsc() {
  local full_cmd="tsc $@"
  if is_blocked "$full_cmd"; then
    echo "⚠️  BLOCKED: '$full_cmd' is disallowed by .cursorrules"
    echo "   Use 'yarn type-check' or 'yarn workspace <pkg> type-check' instead"
    echo ""
    echo "Command blocked."
    return 1
  fi
  command tsc "$@"
}

# Note: python/python3 not wrapped - can't reliably detect file editing without parsing script
# Relies on AI assistant following .cursorrules to not use python for code editing

echo "Zsh command validator loaded."


