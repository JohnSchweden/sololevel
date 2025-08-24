#!/bin/bash
TIMEOUT=600
ELAPSED=0

echo "Waiting for emulator to boot..."
echo "Checking for available devices..."
adb devices

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Check if device exists first
  DEVICE_EXISTS=$(adb devices | grep emulator-5554 | wc -l)
  
  if [ "$DEVICE_EXISTS" -eq 0 ]; then
    echo "Device emulator-5554 not found, waiting..."
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    continue
  fi
  
  # Check boot completion
  BOOT_COMPLETE=$(adb -s emulator-5554 shell getprop sys.boot_completed 2>&1 | tr -d '\r')
  
  if [ "$BOOT_COMPLETE" = "1" ]; then
    echo "Emulator booted successfully"
    echo "Final device status:"
    adb devices
    exit 0
  fi
  
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "Waiting... ($ELAPSED seconds elapsed)"
  
  # Show device status every 30 seconds
  if [ $((ELAPSED % 30)) -eq 0 ]; then
    echo "Current devices:"
    adb devices
  fi
done

echo "Emulator boot timeout after $TIMEOUT seconds"
echo "Final device status:"
adb devices
exit 1
