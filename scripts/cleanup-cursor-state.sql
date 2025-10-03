-- Safe Cursor State Database Cleanup
-- This script removes large, non-essential data while preserving important settings

-- Remove AI code tracking data (largest consumer - 1.95MB)
DELETE FROM ItemTable WHERE key = 'aiCodeTrackingLines';
DELETE FROM ItemTable WHERE key = 'aiCodeTrackingScoredCommits';
DELETE FROM ItemTable WHERE key = 'aiCodeTrackingStartTime';

-- Remove old terminal history (863KB)
DELETE FROM ItemTable WHERE key = 'terminal.history.entries.commands';
DELETE FROM ItemTable WHERE key = 'terminal.history.entries.dirs';

-- Remove old chat pane states (safe to regenerate)
DELETE FROM ItemTable WHERE key LIKE 'workbench.panel.composerChatViewPane.%';

-- Remove old workspace transfer data
DELETE FROM ItemTable WHERE key = 'chat.workspaceTransfer';

-- Vacuum to reclaim space
VACUUM;
