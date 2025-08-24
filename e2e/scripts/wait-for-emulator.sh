#!/bin/bash
TIMEOUT=600
ELAPSED=0

echo "Waiting for emulator to boot..."
while [ $ELAPSED -lt $TIMEOUT ]; do
  BOOT_COMPLETE=$(adb -s emulator-5554 shell getprop sys.boot_completed 2>&1 | tr -d '\r')
  
  if [ "$BOOT_COMPLETE" = "1" ]; then
    echo "Emulator booted successfully"
    exit 0
  fi
  
  sleep 5
  ELAPSED=$((ELAPSED + 5))
  echo "Waiting... ($ELAPSED seconds elapsed)"
done

echo "Emulator boot timeout"
exit 1
