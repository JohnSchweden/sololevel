#!/usr/bin/env node

/**
 * Remove storage table definitions and functions from baseline migration
 * Keeps: storage bucket INSERTs and storage policies
 * Removes: storage.* table definitions, functions, GRANTs, indexes
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const baselineFile = path.join(projectRoot, 'supabase/migrations/20251204215816_initial_baseline.sql');

console.log('🧹 Cleaning storage.* definitions from baseline...');

const content = fs.readFileSync(baselineFile, 'utf-8');
const lines = content.split('\n');
const output = [];
let i = 0;

while (i < lines.length) {
  const line = lines[i];
  
  // Skip storage schema creation
  if (/^\s*CREATE SCHEMA IF NOT EXISTS "storage"/.test(line)) {
    while (i < lines.length && (
      /^\s*ALTER SCHEMA "storage"/.test(lines[i]) ||
      /^\s*COMMENT ON SCHEMA "storage"/.test(lines[i]) ||
      lines[i].trim() === ''
    )) {
      i++;
    }
    continue;
  }
  
  // Skip storage functions
  if (/^\s*CREATE OR REPLACE FUNCTION "storage"\./.test(line)) {
    while (i < lines.length && !/^\s*\$\$;/.test(lines[i])) {
      i++;
    }
    if (i < lines.length) i++; // Skip the $$;
    // Skip ALTER FUNCTION and COMMENT
    while (i < lines.length && (
      /^\s*ALTER FUNCTION "storage"/.test(lines[i]) ||
      /^\s*COMMENT ON FUNCTION "storage"/.test(lines[i]) ||
      lines[i].trim() === ''
    )) {
      i++;
    }
    continue;
  }
  
  // Skip storage table definitions
  if (/^\s*CREATE TABLE IF NOT EXISTS "storage"\./.test(line)) {
    while (i < lines.length && !/^\s*\);/.test(lines[i])) {
      i++;
    }
    if (i < lines.length) i++; // Skip the );
    // Skip ALTER TABLE and COMMENT
    while (i < lines.length && (
      /^\s*ALTER TABLE "storage"/.test(lines[i]) ||
      /^\s*COMMENT ON/.test(lines[i]) ||
      lines[i].trim() === ''
    )) {
      i++;
    }
    continue;
  }
  
  // Skip storage constraints/indexes
  if (/^\s*ALTER TABLE ONLY "storage"\./.test(line) ||
      /^\s*CREATE.*INDEX.*"storage"/.test(line) ||
      /^\s*CREATE UNIQUE INDEX.*"storage"/.test(line)) {
    while (i < lines.length && (
      /^\s*ALTER TABLE.*"storage"/.test(lines[i]) ||
      /^\s*CREATE.*INDEX.*"storage"/.test(lines[i]) ||
      /^\s*CREATE UNIQUE INDEX.*"storage"/.test(lines[i]) ||
      lines[i].trim() === ''
    )) {
      i++;
    }
    continue;
  }
  
  // Skip storage GRANTs
  if (/^\s*GRANT.*ON.*"storage"\./.test(line)) {
    while (i < lines.length && /^\s*GRANT.*ON.*"storage"/.test(lines[i])) {
      i++;
    }
    continue;
  }
  
  // Skip ALTER DEFAULT PRIVILEGES for storage
  if (/^\s*ALTER DEFAULT PRIVILEGES.*IN SCHEMA "storage"/.test(line)) {
    while (i < lines.length && /^\s*ALTER DEFAULT PRIVILEGES.*IN SCHEMA "storage"/.test(lines[i])) {
      i++;
    }
    continue;
  }
  
  // Keep everything else (including storage bucket INSERTs and policies)
  output.push(line);
  i++;
}

fs.writeFileSync(baselineFile, output.join('\n'));

console.log(`✅ Cleaned baseline: ${lines.length} → ${output.length} lines (removed ${lines.length - output.length})`);
console.log(`📁 File: ${baselineFile}`);

