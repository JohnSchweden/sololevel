#!/usr/bin/env node
/**
 * Increments iOS buildNumber or Android versionCode in app.json based on platform
 * Prevents duplicate build submissions by ensuring unique build identifiers
 */

import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const appJsonPath = join(__dirname, '..', 'app.json');

const platform = process.argv[2]; // 'ios' or 'android' (optional, defaults to both for backward compatibility)

const appJson = JSON.parse(readFileSync(appJsonPath, 'utf8'));

if (platform === 'ios') {
  // Increment iOS buildNumber only
  const currentIosBuild = appJson.expo.ios?.buildNumber || '1';
  const newIosBuild = String(Number.parseInt(currentIosBuild, 10) + 1);
  appJson.expo.ios = appJson.expo.ios || {};
  appJson.expo.ios.buildNumber = newIosBuild;
  console.log(`✓ Incremented iOS buildNumber: ${currentIosBuild} → ${newIosBuild}`);
} else if (platform === 'android') {
  // Increment Android versionCode only
  const currentAndroidVersion = appJson.expo.android?.versionCode || 1;
  const newAndroidVersion = currentAndroidVersion + 1;
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = newAndroidVersion;
  console.log(`✓ Incremented Android versionCode: ${currentAndroidVersion} → ${newAndroidVersion}`);
} else {
  // Backward compatibility: increment both if no platform specified
  const currentIosBuild = appJson.expo.ios?.buildNumber || '1';
  const newIosBuild = String(Number.parseInt(currentIosBuild, 10) + 1);
  appJson.expo.ios = appJson.expo.ios || {};
  appJson.expo.ios.buildNumber = newIosBuild;

  const currentAndroidVersion = appJson.expo.android?.versionCode || 1;
  const newAndroidVersion = currentAndroidVersion + 1;
  appJson.expo.android = appJson.expo.android || {};
  appJson.expo.android.versionCode = newAndroidVersion;

  console.log(`✓ Incremented iOS buildNumber: ${currentIosBuild} → ${newIosBuild}`);
  console.log(`✓ Incremented Android versionCode: ${currentAndroidVersion} → ${newAndroidVersion}`);
}

// Write back to file with proper formatting
writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2) + '\n', 'utf8');

