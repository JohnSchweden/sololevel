#!/usr/bin/env zsh

# Zsh-compatible command validator for Cursor rules
# Source this file in zsh sessions to enable confirmation prompts for blocked commands

typeset -ga BLOCKED_COMMANDS

load_blocked_commands() {
  local rules_file=".cursorrules"
  if [[ ! -f "$rules_file" ]]; then
    echo "Error: $rules_file not found"
    return 1
  fi

  local commands
  commands=$(node -e '
    try {
      const fs = require("fs");
      const rules = JSON.parse(fs.readFileSync(".cursorrules", "utf8"));
      const blocked = (rules.commandRules && rules.commandRules.block) || [];
      console.log(blocked.join("\n"));
    } catch (e) {
      console.error("Error parsing .cursorrules:", e.message);
      process.exit(1);
    }
  ' 2>&1) || {
    echo "Failed to execute Node.js command"
    return 1
  }

  BLOCKED_COMMANDS=()
  local line
  while IFS=$'\n' read -r line; do
    [[ -n "$line" ]] && BLOCKED_COMMANDS+="$line"
  done <<< "$commands"

  return 0
}

is_blocked() {
  local cmd="$1"
  if (( ${#BLOCKED_COMMANDS[@]} == 0 )); then
    load_blocked_commands || return 1
  fi
  local blocked
  for blocked in "${BLOCKED_COMMANDS[@]}"; do
    if [[ "$cmd" == ${blocked}* ]]; then
      return 0
    fi
  done
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

echo "Zsh command validator loaded."


