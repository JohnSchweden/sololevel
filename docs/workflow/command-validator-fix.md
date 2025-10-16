# Command Validator Fix

## Issue Summary

The Cursor AI assistant was using `npx tsc --noEmit` commands despite having `"npx tsc *"` in the `.cursorrules` block list. Investigation revealed that the command validator was not enforcing these blocks.

## Root Cause

The Zsh command validator (`scripts/toolchain/command-validator.zsh`) only had wrapper functions for:
- `yarn`
- `supabase`
- `perl`

Commands like `npx`, `npm`, `pnpm`, and `tsc` were listed in `.cursorrules` but had no wrapper functions to intercept and validate them. Without wrappers, these commands executed directly without any validation.

## Solution Implemented

### 1. Added Wrapper Functions

Added four new wrapper functions to `scripts/toolchain/command-validator.zsh`:

- **`npx()`**: Blocks all npx commands, suggests using yarn instead
- **`npm()`**: Blocks all npm commands, enforces Yarn 4 exclusively
- **`pnpm()`**: Blocks all pnpm commands, enforces Yarn 4 exclusively
- **`tsc()`**: Blocks direct tsc usage, suggests `yarn type-check`

### 2. Updated .cursorrules Block List

**Added broader patterns for package managers:**
```json
"npx *",
"npm *",
"pnpm *",
"tsc *",
"node ./node_modules/.bin/tsc *"
```

**Fixed yarn workspace patterns** - Changed from overly specific:
```json
"yarn workspace add",
"yarn workspace @my/ui add",
"yarn workspace @my/app add",
...
```

To wildcard patterns that actually match real commands:
```json
"yarn workspace * add *",
"yarn workspace * remove *"
```

This reduces 12 patterns to 2 while actually working correctly.

### 3. Updated Documentation

Updated the header comment in `command-validator.zsh` to document the newly enforced blocks.

## Verification

### Before Fix
```bash
$ npx tsc --noEmit
# Command executed without any prompt or block
```

### After Fix
```bash
$ source scripts/toolchain/command-validator.zsh
$ npx tsc --noEmit
⚠️  BLOCKED: 'npx tsc --noEmit' is disallowed by .cursorrules
   Use 'yarn' commands instead (e.g., 'yarn tsc' or 'yarn workspace <pkg> type-check')

Command blocked.
```

## How It Works

1. When you source `command-validator.zsh`, it creates shell functions that override the built-in commands
2. Each wrapper function checks if the full command matches any pattern in `.cursorrules` block list
3. If blocked, it displays an error message and prevents execution
4. If allowed, it passes through to the original command using `command <cmd>`

## Pattern Matching

The validator uses Zsh glob pattern matching where `*` acts as a wildcard:
- `"npx *"` matches any npx command
- `"npm install *"` would only match npm install commands
- Patterns are evaluated left-to-right, first match wins

## Usage for AI Assistant

The AI assistant should follow these rules:
- ✅ Use `yarn workspace <pkg> type-check` for type checking
- ✅ Use `yarn <script>` for running scripts
- ❌ Never use `npx`, `npm`, or `pnpm`
- ❌ Never use `tsc` directly

## Manual Shell Usage

If you need to use these commands manually for legitimate reasons:
1. The validator will prompt for confirmation (for some commands)
2. Or you can temporarily unset the function: `unset -f npx`
3. Or use the full path: `/usr/local/bin/npx`

## Files Modified

- `scripts/toolchain/command-validator.zsh` - Added 4 new wrapper functions
- `.cursorrules` - Expanded block patterns from 1 to 5 entries
- `docs/workflow/command-validator-fix.md` - This documentation

## Related

- See `.cursorrules` for full list of blocked commands
- See `scripts/toolchain/command-validator.zsh` for implementation
- See `AGENTS.md` for command usage guidelines

