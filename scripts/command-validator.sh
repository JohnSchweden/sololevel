#!/bin/bash

# Command validator for Cursor rules
# Usage: source this script to enable command blocking
#
# SECURITY: Blocks commands that can modify environment files (.env*)
# This prevents accidental overwriting of sensitive configuration like:
# - echo "SUPABASE_SERVICE_ROLE_KEY=..." > .env
# - echo "..." >> .env

# Function to load blocked commands from .cursorrules
load_blocked_commands() {
    local rules_file=".cursorrules"
    if [[ ! -f "$rules_file" ]]; then
        echo "Error: $rules_file not found"
        return 1
    fi

    # Use Node.js to parse JSON and extract blocked commands
    local commands
    commands=$(node -e "
        try {
            const fs = require('fs');
            const rules = JSON.parse(fs.readFileSync('$rules_file', 'utf8'));
            const blocked = rules.commandRules?.block || [];
            console.log(blocked.join('\n'));
        } catch (e) {
            console.error('Error parsing .cursorrules:', e.message);
            process.exit(1);
        }
    " 2>/dev/null)

    if [[ $? -ne 0 ]]; then
        echo "Failed to parse .cursorrules"
        return 1
    fi

    # Convert to bash array
    BLOCKED_COMMANDS=()
    while IFS= read -r line; do
        if [[ -n "$line" ]]; then
            BLOCKED_COMMANDS+=("$line")
        fi
    done <<< "$commands"

    return 0
}

# Function to check if command is blocked
is_blocked() {
    local cmd="$1"

    # Load blocked commands if not already loaded
    if [[ ${#BLOCKED_COMMANDS[@]} -eq 0 ]]; then
        load_blocked_commands
        if [[ $? -ne 0 ]]; then
            return 1
        fi
    fi

    for blocked in "${BLOCKED_COMMANDS[@]}"; do
        if [[ "$cmd" == "$blocked"* ]]; then
            return 0
        fi
    done
    return 1
}

# Override echo command for .env protection
echo() {
    local full_cmd="echo $@"
    if is_blocked "$full_cmd"; then
        echo "🚫 BLOCKED: '$full_cmd' is not allowed"
        echo "   This command would modify environment files (.env*)"
        echo "   Use a text editor instead to modify .env files"
        echo ""
        return 1
    fi
    command echo "$@"
}

# Override yarn command
yarn() {
    local full_cmd="yarn $@"
    if is_blocked "$full_cmd"; then
        echo "⚠️  WARNING: '$full_cmd' is flagged by .cursorrules"
        echo "   This command modifies workspace dependencies"
        echo ""
        read -p "Do you want to proceed anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Command cancelled."
            return 1
        fi
        echo "Proceeding with command..."
    fi
    command yarn "$@"
}

# Override supabase command for database operations
supabase() {
    local full_cmd="supabase $@"
    if is_blocked "$full_cmd"; then
        echo "⚠️  WARNING: '$full_cmd' is flagged by .cursorrules"
        echo "   This command can modify or reset your database"
        echo "   Database operations are potentially destructive"
        echo ""
        read -p "Do you want to proceed anyway? (yes/no): " -r
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            echo "Command cancelled."
            return 1
        fi
        echo "Proceeding with database command..."
    fi
    command supabase "$@"
}

echo "Command validator loaded. Blocked commands will require confirmation."
