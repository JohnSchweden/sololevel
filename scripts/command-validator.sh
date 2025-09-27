#!/bin/bash

# Command validator shell integration for Cursor AI assistant
# Source this script to enable command validation in your shell

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to validate commands before execution
validate_command() {
    local cmd="$1"
    
    # Skip validation if override is set
    if [[ "$CURSOR_RULES_OVERRIDE" == "true" ]]; then
        echo -e "${YELLOW}⚠️  Override enabled - executing: $cmd${NC}"
        return 0
    fi
    
    # Check if command is blocked
    if node scripts/validate-command.js "$cmd" 2>/dev/null; then
        return 0
    else
        echo -e "${RED}❌ Command blocked for safety${NC}"
        echo -e "${YELLOW}To override, run: CURSOR_RULES_OVERRIDE=true $cmd${NC}"
        return 1
    fi
}

# Function to show blocked commands
show_blocked_commands() {
    echo -e "${YELLOW}Blocked commands:${NC}"
    node -e "
        const fs = require('fs');
        const cursorRules = JSON.parse(fs.readFileSync('.cursorrules', 'utf8'));
        const blocked = cursorRules.commandRules?.block || [];
        blocked.forEach(cmd => console.log('  -', cmd));
    "
}

# Function to test command validation
test_validation() {
    echo -e "${GREEN}Testing command validation...${NC}"
    
    # Test allowed command
    echo "Testing allowed command:"
    validate_command "yarn workspace list"
    
    echo ""
    
    # Test blocked command
    echo "Testing blocked command:"
    validate_command "yarn dlx supabase db reset"
}

# Export functions for use in shell
export -f validate_command
export -f show_blocked_commands
export -f test_validation

echo -e "${GREEN}✅ Command validator loaded${NC}"
echo -e "Available functions:"
echo -e "  ${YELLOW}validate_command <cmd>${NC} - Validate a command before execution"
echo -e "  ${YELLOW}show_blocked_commands${NC} - Show all blocked commands"
echo -e "  ${YELLOW}test_validation${NC} - Test the validation system"
echo -e ""
echo -e "Override with: ${YELLOW}CURSOR_RULES_OVERRIDE=true <command>${NC}"
